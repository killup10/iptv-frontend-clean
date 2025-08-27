package play.teamg.store;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.core.content.ContextCompat;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.PlaybackException;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.source.MediaSource;
import com.google.android.exoplayer2.source.ProgressiveMediaSource;
import com.google.android.exoplayer2.source.dash.DashMediaSource;
import com.google.android.exoplayer2.source.hls.HlsMediaSource;
import com.google.android.exoplayer2.ui.PlayerView;
import com.google.android.exoplayer2.upstream.DataSource;
import com.google.android.exoplayer2.upstream.DefaultDataSource;
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource;
import com.google.android.exoplayer2.util.Util;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.util.Rational;

public class ExoPlayerActivity extends AppCompatActivity {

    private static final String TAG = "ExoPlayerActivity";
    
    private PlayerView playerView;
    private ExoPlayer player;
    private String videoUrl;
    private String videoTitle;
    private long startTime;
    
    private BroadcastReceiver controlReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getStringExtra("action");
            if (player == null) return;
            
            switch (action) {
                case "pause":
                    player.pause();
                    break;
                case "play":
                    player.play();
                    break;
                case "stop":
                    player.stop();
                    finish();
                    break;
                case "seek":
                    long position = intent.getLongExtra("position", 0);
                    player.seekTo(position * 1000); // Convertir a milisegundos
                    break;
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Pantalla completa
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // Ocultar barra de navegación
        View decorView = getWindow().getDecorView();
        int uiOptions = View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        decorView.setSystemUiVisibility(uiOptions);
        
        setContentView(R.layout.activity_exoplayer);
        
        // Obtener datos del intent
        videoUrl = getIntent().getStringExtra("video_url");
        videoTitle = getIntent().getStringExtra("video_title");
        startTime = getIntent().getLongExtra("start_time", 0);
        
        if (videoUrl == null) {
            Toast.makeText(this, "URL de video no válida", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        
        playerView = findViewById(R.id.player_view);
        
        // Registrar receiver para controles
        IntentFilter filter = new IntentFilter("VIDEO_PLAYER_CONTROL");
        ContextCompat.registerReceiver(this, controlReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        
        initializePlayer();
    }
    
    private void initializePlayer() {
        if (player == null) {
            player = new ExoPlayer.Builder(this).build();
            playerView.setPlayer(player);
            
            // Configurar listener para errores
            player.addListener(new Player.Listener() {
                @Override
                public void onPlayerError(PlaybackException error) {
                    Log.e(TAG, "Player error: " + error.getMessage());
                    Toast.makeText(ExoPlayerActivity.this, 
                        "Error de reproducción: " + error.getMessage(), 
                        Toast.LENGTH_LONG).show();
                }
                
                @Override
                public void onPlaybackStateChanged(int playbackState) {
                    if (playbackState == Player.STATE_READY && startTime > 0) {
                        player.seekTo(startTime * 1000); // Convertir a milisegundos
                        startTime = 0; // Solo buscar una vez
                    }
                }
            });
            
            // Crear MediaItem
            MediaItem mediaItem = MediaItem.fromUri(Uri.parse(videoUrl));
            
            // Configurar DataSource para manejar diferentes protocolos
            DataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(this,
                new DefaultHttpDataSource.Factory()
                    .setUserAgent(Util.getUserAgent(this, "TeamGPlay"))
                    .setConnectTimeoutMs(30000)
                    .setReadTimeoutMs(30000));
            
            // Crear MediaSource basado en el tipo de URL
            MediaSource mediaSource;
            String lowerUrl = videoUrl.toLowerCase();
            
            if (lowerUrl.contains(".m3u8")) {
                // HLS
                mediaSource = new HlsMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(mediaItem);
            } else if (lowerUrl.contains(".mpd")) {
                // DASH
                mediaSource = new DashMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(mediaItem);
            } else {
                // Progressive (MP4, MKV, etc.)
                mediaSource = new ProgressiveMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(mediaItem);
            }
            
            // Preparar y reproducir
            player.setMediaSource(mediaSource);
            player.prepare();
            player.setPlayWhenReady(true);
        }
    }
    
    @Override
    protected void onStart() {
        super.onStart();
        if (Util.SDK_INT > 23) {
            initializePlayer();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        if (Util.SDK_INT <= 23 || player == null) {
            initializePlayer();
        }
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        if (Util.SDK_INT <= 23) {
            releasePlayer();
        }
    }
    
    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Si tienes el tamaño real del video, ajusta el aspect ratio:
        // Player.VideoSize vs = player != null ? player.getVideoSize() : null;
        PictureInPictureParams params =
            new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9))
                .build();
        enterPictureInPictureMode(params);
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        playerView.setUseController(!inPip);
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (!isInPictureInPictureMode()) {
            releasePlayer();
        }
    }

    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(controlReceiver);
        } catch (Exception e) {
            Log.w(TAG, "Error unregistering receiver", e);
        }
        releasePlayer();
    }
    
    private void releasePlayer() {
        if (player != null) {
            player.release();
            player = null;
        }
    }
    
    @Override
    public void onBackPressed() {
        super.onBackPressed();
        releasePlayer();
    }
}
