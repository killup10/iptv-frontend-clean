package play.teamg.store;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.util.ArrayList;

public class VLCPlayerActivity extends AppCompatActivity {
    private static final String TAG = "VLCPlayerActivity";
    
    private LibVLC libVLC;
    private MediaPlayer mediaPlayer;
    private VLCVideoLayout videoLayout;
    private String videoUrl;
    private String videoTitle;
    private float startTime;
    private BroadcastReceiver commandReceiver;
    private BroadcastReceiver finishReceiver;
    private BroadcastReceiver killReceiver;
    private Handler progressHandler;
    private Runnable progressRunnable;
    private boolean isFinishing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "🔥 VLCPlayerActivity FINAL onCreate - Con cierre agresivo");

        // Verificar si venimos con intención de cerrar
        if (getIntent().getBooleanExtra("EXIT", false)) {
            Log.d(TAG, "EXIT flag detected - closing immediately");
            finish();
            return;
        }

        // Configurar layout
        FrameLayout frameLayout = new FrameLayout(this);
        frameLayout.setId(View.generateViewId());
        setContentView(frameLayout);

        videoLayout = new VLCVideoLayout(this);
        frameLayout.addView(videoLayout, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // Obtener datos del intent
        videoUrl = getIntent().getStringExtra("videoUrl");
        videoTitle = getIntent().getStringExtra("videoTitle");
        startTime = getIntent().getFloatExtra("startTime", 0);

        if (videoUrl == null) {
            Log.e(TAG, "No video URL provided");
            finish();
            return;
        }

        // Inicializar VLC
        initializeVLC();
        
        // Registrar receivers
        registerReceivers();
        
        // Configurar progress handler
        progressHandler = new Handler(Looper.getMainLooper());
    }

    private void initializeVLC() {
        try {
            ArrayList<String> options = new ArrayList<>();
            options.add("--aout=opensles");
            options.add("--audio-time-stretch");
            options.add("-vvv");
            options.add("--network-caching=1500");
            options.add("--file-caching=1500");

            libVLC = new LibVLC(this, options);
            mediaPlayer = new MediaPlayer(libVLC);
            mediaPlayer.attachViews(videoLayout, null, false, false);

            Media media = new Media(libVLC, Uri.parse(videoUrl));
            media.setHWDecoderEnabled(true, false);
            media.addOption(":network-caching=1500");
            media.addOption(":file-caching=1500");

            mediaPlayer.setMedia(media);
            media.release();

            // Event listeners
            mediaPlayer.setEventListener(event -> {
                switch (event.type) {
                    case MediaPlayer.Event.Playing:
                        Log.d(TAG, "VLC Started playing");
                        startProgressUpdates();
                        break;
                    case MediaPlayer.Event.Paused:
                        Log.d(TAG, "VLC Paused");
                        stopProgressUpdates();
                        break;
                    case MediaPlayer.Event.Stopped:
                        Log.d(TAG, "VLC Stopped - closing activity");
                        sendStoppedBroadcast();
                        finishAndCleanup();
                        break;
                    case MediaPlayer.Event.EndReached:
                        Log.d(TAG, "Video ended");
                        sendProgressUpdate(true);
                        finishAndCleanup();
                        break;
                    case MediaPlayer.Event.EncounteredError:
                        Log.e(TAG, "VLC Error encountered");
                        finishAndCleanup();
                        break;
                }
            });

            // Start playback
            mediaPlayer.play();
            
            // Seek to start time if provided
            if (startTime > 0) {
                mediaPlayer.setTime((long)(startTime * 1000));
            }

        } catch (Exception e) {
            Log.e(TAG, "Error initializing VLC", e);
            finishAndCleanup();
        }
    }

    private void registerReceivers() {
        // Command receiver para controles
        commandReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String command = intent.getStringExtra("command");
                Log.d(TAG, "Command received: " + command);
                
                if (command == null) return;
                
                switch (command) {
                    case "stop":
                        Log.d(TAG, "🛑 Stop command received - CERRANDO ACTIVIDAD");
                        finishAndCleanup();
                        break;
                    case "pause":
                        if (mediaPlayer != null) mediaPlayer.pause();
                        break;
                    case "resume":
                        if (mediaPlayer != null) mediaPlayer.play();
                        break;
                    case "seekForward":
                        int fSeconds = intent.getIntExtra("seconds", 10);
                        if (mediaPlayer != null) {
                            long newTime = mediaPlayer.getTime() + (fSeconds * 1000);
                            mediaPlayer.setTime(newTime);
                        }
                        break;
                    case "seekBackward":
                        int bSeconds = intent.getIntExtra("seconds", 10);
                        if (mediaPlayer != null) {
                            long newTime = Math.max(0, mediaPlayer.getTime() - (bSeconds * 1000));
                            mediaPlayer.setTime(newTime);
                        }
                        break;
                }
            }
        };

        // Finish receiver para cierre forzado
        finishReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "🔴 Received FORCE_FINISH broadcast - CERRANDO INMEDIATAMENTE");
                finishAndCleanup();
            }
        };

        // Kill receiver para cierre ultra-agresivo
        killReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "💀 Received KILL broadcast - TERMINANDO PROCESO");
                finishAndCleanup();
                // Terminar el proceso completamente
                android.os.Process.killProcess(android.os.Process.myPid());
            }
        };

        // Registrar todos los receivers
        IntentFilter commandFilter = new IntentFilter("VLC_COMMAND");
        IntentFilter finishFilter = new IntentFilter("FORCE_FINISH_VLC_ACTIVITY");
        IntentFilter killFilter = new IntentFilter("KILL_VLC_NOW");
        
        registerReceiver(commandReceiver, commandFilter);
        registerReceiver(finishReceiver, finishFilter);
        registerReceiver(killReceiver, killFilter);
    }

    private void startProgressUpdates() {
        stopProgressUpdates(); // Asegurar que no hay duplicados
        
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                    sendProgressUpdate(false);
                    progressHandler.postDelayed(this, 1000); // Update every second
                }
            }
        };
        progressHandler.post(progressRunnable);
    }

    private void stopProgressUpdates() {
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
        }
    }

    private void sendProgressUpdate(boolean completed) {
        if (mediaPlayer == null) return;
        
        try {
            float currentTime = mediaPlayer.getTime() / 1000f;
            float duration = mediaPlayer.getLength() / 1000f;
            
            Intent intent = new Intent("VLC_PROGRESS_UPDATE");
            intent.putExtra("currentTime", currentTime);
            intent.putExtra("duration", duration);
            intent.putExtra("completed", completed);
            sendBroadcast(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error sending progress update", e);
        }
    }

    private void sendStoppedBroadcast() {
        try {
            Intent intent = new Intent("VLC_STOPPED");
            sendBroadcast(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error sending stopped broadcast", e);
        }
    }

    private void finishAndCleanup() {
        if (isFinishing) {
            Log.d(TAG, "Already finishing, skipping cleanup");
            return;
        }
        
        isFinishing = true;
        Log.d(TAG, "🧹 finishAndCleanup called - Limpiando TODO");
        
        // Detener actualizaciones de progreso
        stopProgressUpdates();
        
        // Limpiar VLC
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.detachViews();
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cleaning up media player", e);
        }
        
        try {
            if (libVLC != null) {
                libVLC.release();
                libVLC = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing LibVLC", e);
        }
        
        // Desregistrar receivers
        try {
            if (commandReceiver != null) {
                unregisterReceiver(commandReceiver);
                commandReceiver = null;
            }
        } catch (Exception e) {
            // Ignorar si ya fue desregistrado
        }
        
        try {
            if (finishReceiver != null) {
                unregisterReceiver(finishReceiver);
                finishReceiver = null;
            }
        } catch (Exception e) {
            // Ignorar si ya fue desregistrado
        }
        
        try {
            if (killReceiver != null) {
                unregisterReceiver(killReceiver);
                killReceiver = null;
            }
        } catch (Exception e) {
            // Ignorar si ya fue desregistrado
        }
        
        // Finalizar la actividad
        finish();
        
        // Asegurar que se cierra completamente
        overridePendingTransition(0, 0);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Si recibimos un nuevo intent con EXIT, cerrar
        if (intent.getBooleanExtra("EXIT", false)) {
            Log.d(TAG, "EXIT flag in new intent - closing");
            finishAndCleanup();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "onPause called");
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
        }
        stopProgressUpdates();
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "onResume called");
        if (mediaPlayer != null && !mediaPlayer.isPlaying()) {
            mediaPlayer.play();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        Log.d(TAG, "⚠️ onStop called - Cerrando VLC completamente");
        // Cuando la actividad se detiene (app en background), cerrar todo
        finishAndCleanup();
    }

    @Override
    protected void onDestroy() {
        Log.d(TAG, "💥 onDestroy called");
        finishAndCleanup();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        Log.d(TAG, "Back button pressed - closing VLC");
        finishAndCleanup();
        super.onBackPressed();
    }
}
