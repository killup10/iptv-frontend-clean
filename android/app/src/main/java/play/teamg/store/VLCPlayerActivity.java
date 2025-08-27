package play.teamg.store;

import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.app.AlertDialog;
import android.os.Looper;
import android.media.AudioManager;
import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.util.Rational;

import android.util.Log;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.util.ArrayList;

public class VLCPlayerActivity extends AppCompatActivity implements GestureDetector.OnGestureListener {

    private static final String TAG = "VLCPlayerActivity";

    // Player components
    private LibVLC libVlc;
    private MediaPlayer mediaPlayer;
    private VLCVideoLayout videoLayout;

    // UI Controls
    private SeekBar seekBar;
    private TextView currentTime, totalDuration;
    private ImageButton playPauseButton, rewindButton, forwardButton, tracksButton, channelsButton, aspectRatioButton;
    private View controlsContainer;
    private ProgressBar brightnessBar, volumeBar;

    private Handler controlsHandler = new Handler(Looper.getMainLooper());

    // Media data
    private String currentVideoUrl;
    private long lastPosition = 0L;

    // Gesture control
    private GestureDetector gestureDetector;
    private AudioManager audioManager;
    private float currentBrightness;
    private final Handler indicatorHandler = new Handler(Looper.getMainLooper());
    private final Runnable hideBrightnessBarRunnable = () -> brightnessBar.setVisibility(View.GONE);
    private final Runnable hideVolumeBarRunnable = () -> volumeBar.setVisibility(View.GONE);

    // Gesture values
    private float gestureInitialBrightness;
    private int gestureInitialVolume;

    // Aspect Ratio
    private final String[] aspectRatioModes = {"Ajustar", "Rellenar", "16:9", "4:3"};
    private int currentAspectRatioIndex = 0;

    private ArrayList<String> chapterTitles;
    private ArrayList<String> chapterUrls;
    private ArrayList<Integer> chapterSeasonNumbers;
    private ArrayList<Integer> chapterNumbers;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_vlc_player);
        enterFullScreenMode();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        videoLayout = findViewById(R.id.videoLayout);
        controlsContainer = findViewById(R.id.controls_container);
        seekBar = findViewById(R.id.seekBar);
        currentTime = findViewById(R.id.currentTime);
        totalDuration = findViewById(R.id.totalDuration);
        playPauseButton = findViewById(R.id.play_pause_button);
        rewindButton = findViewById(R.id.rewind_button);
        forwardButton = findViewById(R.id.forward_button);
        tracksButton = findViewById(R.id.tracks_button);
        aspectRatioButton = findViewById(R.id.aspect_ratio_button);
        channelsButton = findViewById(R.id.channels_button);
        brightnessBar = findViewById(R.id.brightness_bar);
        volumeBar = findViewById(R.id.volume_bar);

        currentVideoUrl = getIntent().getStringExtra("video_url");
        lastPosition = getIntent().getLongExtra("start_time", 0L);

        gestureDetector = new GestureDetector(this, this);
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);

        currentBrightness = getWindow().getAttributes().screenBrightness;
        if (currentBrightness < 0) {
            try {
                currentBrightness = android.provider.Settings.System.getInt(getContentResolver(), android.provider.Settings.System.SCREEN_BRIGHTNESS) / 255f;
            } catch (android.provider.Settings.SettingNotFoundException e) {
                currentBrightness = 0.5f;
            }
        }

        chapterTitles = getIntent().getStringArrayListExtra("chapter_titles");
        chapterUrls = getIntent().getStringArrayListExtra("chapter_urls");
        chapterSeasonNumbers = getIntent().getIntegerArrayListExtra("chapter_season_numbers");
        chapterNumbers = getIntent().getIntegerArrayListExtra("chapter_numbers");
    }

    @Override
    protected void onStart() {
        super.onStart();
        initializePlayer();
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Usa 16:9 por defecto; puedes calcularlo del tamaño real del video si quieres.
        PictureInPictureParams params =
            new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9))
                .build();
        enterPictureInPictureMode(params);
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        // Oculta/mostrar overlays/controles cuando entras/sales de PiP
        if (inPip) {
            controlsContainer.setVisibility(View.GONE);
        } else {
            controlsContainer.setVisibility(View.VISIBLE);
        }
    }

    // ¡No sueltes el jugador si estás en PiP!
    @Override
    protected void onStop() {
        super.onStop();
        if (!isInPictureInPictureMode()) {
            releasePlayer(); // tu método actual
        }
    }


    private void initializePlayer() {
        if (currentVideoUrl == null) {
            Log.e(TAG, "Video URL is null, cannot initialize player.");
            return;
        }

        libVlc = VLCInstance.getInstance(getApplicationContext());
        mediaPlayer = new MediaPlayer(libVlc);
        mediaPlayer.attachViews(videoLayout, null, false, false);
        mediaPlayer.setAspectRatio(null);
        mediaPlayer.setScale(MediaPlayer.ScaleType.SURFACE_FIT_SCREEN.ordinal());

        currentAspectRatioIndex = 0;

        setupPlayerEvents();
        setupControls();

        Media media = new Media(libVlc, Uri.parse(currentVideoUrl));
        media.setHWDecoderEnabled(true, false);
        media.addOption(":network-caching=1500");
        media.addOption(":http-user-agent=VLC/3.0.0 (Linux; Android 9)");
        
        mediaPlayer.setMedia(media);
        media.release();
        
        mediaPlayer.play();
    }

    private void releasePlayer() {
        if (mediaPlayer != null) {
            lastPosition = mediaPlayer.getTime();
            mediaPlayer.stop();
            mediaPlayer.detachViews();
            mediaPlayer.release();
            mediaPlayer = null;
        }
        controlsHandler.removeCallbacksAndMessages(null);
    }

    private void setupPlayerEvents() {
        mediaPlayer.setEventListener(event -> {
            switch (event.type) {
                case MediaPlayer.Event.EncounteredError:
                    Log.e(TAG, "An error was encountered during playback");
                    break;
                case MediaPlayer.Event.Playing:
                    playPauseButton.setImageResource(android.R.drawable.ic_media_pause);
                    if (lastPosition > 0) {
                        mediaPlayer.setTime(lastPosition);
                        lastPosition = 0;
                    }
                    hideControls();
                    break;
                case MediaPlayer.Event.Paused:
                case MediaPlayer.Event.Stopped:
                    playPauseButton.setImageResource(android.R.drawable.ic_media_play);
                    break;
                case MediaPlayer.Event.TimeChanged:
                    currentTime.setText(formatTime(event.getTimeChanged()));
                    seekBar.setProgress((int) event.getTimeChanged());
                    break;
                case MediaPlayer.Event.LengthChanged:
                    totalDuration.setText(formatTime(event.getLengthChanged()));
                    seekBar.setMax((int) event.getLengthChanged());
                    break;
                case MediaPlayer.Event.EndReached:
                    Log.d(TAG, "Video ended, checking for next episode");
                    playNextEpisode();
                    break;
            }
        });
    }

    private void playNextEpisode() {
        if (chapterUrls == null || chapterUrls.isEmpty()) {
            Log.d(TAG, "No chapters available for auto-play");
            return;
        }
        
        // Encontrar el índice del capítulo actual
        int currentIndex = -1;
        for (int i = 0; i < chapterUrls.size(); i++) {
            if (chapterUrls.get(i).equals(currentVideoUrl)) {
                currentIndex = i;
                break;
            }
        }
        
        // Si encontramos el capítulo actual y hay un siguiente
        if (currentIndex >= 0 && currentIndex < chapterUrls.size() - 1) {
            int nextIndex = currentIndex + 1;
            String nextEpisodeUrl = chapterUrls.get(nextIndex);
            String nextEpisodeTitle = chapterTitles != null && nextIndex < chapterTitles.size() 
                ? chapterTitles.get(nextIndex) 
                : "Episodio " + (nextIndex + 1);
            
            Log.d(TAG, "Auto-playing next episode: " + nextEpisodeTitle);
            
            // Mostrar toast informativo
            Toast.makeText(this, "Reproduciendo: " + nextEpisodeTitle, Toast.LENGTH_LONG).show();
            
            // Cambiar al siguiente episodio
            releasePlayer();
            currentVideoUrl = nextEpisodeUrl;
            lastPosition = 0;
            initializePlayer();
        } else {
            Log.d(TAG, "No next episode available or current episode not found");
            Toast.makeText(this, "Serie completada", Toast.LENGTH_LONG).show();
        }
    }

    private void setupControls() {
        playPauseButton.setOnClickListener(v -> {
            if (mediaPlayer.isPlaying()) mediaPlayer.pause();
            else mediaPlayer.play();
            hideControls();
        });

        rewindButton.setOnClickListener(v -> {
            mediaPlayer.setTime(mediaPlayer.getTime() - 10000);
            hideControls();
        });

        forwardButton.setOnClickListener(v -> {
            mediaPlayer.setTime(mediaPlayer.getTime() + 10000);
            hideControls();
        });

        tracksButton.setOnClickListener(v -> {
            showTracksDialog();
            hideControls();
        });

        aspectRatioButton.setOnClickListener(v -> {
            cycleAspectRatio();
            hideControls();
        });
        
        if (chapterTitles == null || chapterTitles.isEmpty()) {
            channelsButton.setVisibility(View.GONE);
        } else {
            channelsButton.setVisibility(View.VISIBLE);
            channelsButton.setOnClickListener(v -> {
                showChaptersDialog();
                hideControls();
            });
        }

        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser) mediaPlayer.setTime(progress);
            }
            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {
                controlsHandler.removeCallbacksAndMessages(null);
            }
            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
                hideControls();
            }
        });
    }

    private void toggleControls() {
        if (controlsContainer.getVisibility() == View.VISIBLE) {
            controlsContainer.setVisibility(View.GONE);
        } else {
            controlsContainer.setVisibility(View.VISIBLE);
            hideControls();
        }
    }

    private void hideControls() {
        controlsHandler.removeCallbacksAndMessages(null);
        controlsHandler.postDelayed(() -> {
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                controlsContainer.setVisibility(View.GONE);
            }
        }, 3000);
    }

    private String formatTime(long millis) {
        long totalSeconds = millis / 1000;
        long seconds = totalSeconds % 60;
        long minutes = (totalSeconds / 60) % 60;
        long hours = totalSeconds / 3600;
        return hours > 0 ? String.format("%d:%02d:%02d", hours, minutes, seconds) : String.format("%02d:%02d", minutes, seconds);
    }

    private void enterFullScreenMode() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterFullScreenMode();
    }

    private void cycleAspectRatio() {
        if (mediaPlayer == null) return;

        currentAspectRatioIndex = (currentAspectRatioIndex + 1) % aspectRatioModes.length;
        String mode = aspectRatioModes[currentAspectRatioIndex];
        Toast.makeText(this, mode, Toast.LENGTH_SHORT).show();

        switch (mode) {
            case "Ajustar":
                mediaPlayer.setAspectRatio(null);
                mediaPlayer.setScale(MediaPlayer.ScaleType.SURFACE_FIT_SCREEN.ordinal());
                break;
            case "Rellenar":
                mediaPlayer.setAspectRatio(null);
                mediaPlayer.setScale(MediaPlayer.ScaleType.SURFACE_FILL.ordinal());
                break;
            case "16:9":
                mediaPlayer.setAspectRatio("16:9");
                mediaPlayer.setScale(0);
                break;
            case "4:3":
                mediaPlayer.setAspectRatio("4:3");
                mediaPlayer.setScale(0);
                break;
        }
    }

    private void showChaptersDialog() {
        if (chapterTitles == null || chapterUrls == null) return;

        ArrayList<String> formattedTitles = new ArrayList<>();
        boolean useNewFormat = chapterSeasonNumbers != null && chapterNumbers != null &&
                               chapterSeasonNumbers.size() == chapterTitles.size() &&
                               chapterNumbers.size() == chapterTitles.size();

        if (useNewFormat) {
            Log.d(TAG, "Datos de temporadas recibidos: " + chapterSeasonNumbers.toString());
        }

        for (int i = 0; i < chapterTitles.size(); i++) {

            if (useNewFormat) {
                formattedTitles.add(String.format("Temporada %d - Capítulo %d: %s",
                        chapterSeasonNumbers.get(i), chapterNumbers.get(i), chapterTitles.get(i)));
            } else {
                formattedTitles.add(chapterTitles.get(i));
            }
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Seleccionar Capítulo");
        builder.setItems(formattedTitles.toArray(new String[0]), (dialog, which) -> {
            if (which >= 0 && which < chapterUrls.size()) {
                releasePlayer();
                currentVideoUrl = chapterUrls.get(which);
                lastPosition = 0;
                initializePlayer();
            }
        });
        builder.show();
    }
    
    private void showTracksDialog() {
        if (mediaPlayer == null) return;

        MediaPlayer.TrackDescription[] audioTracks = mediaPlayer.getAudioTracks();
        MediaPlayer.TrackDescription[] spuTracks = mediaPlayer.getSpuTracks();

        if ((audioTracks == null || audioTracks.length <= 1) && (spuTracks == null || spuTracks.length == 0)) {
            Toast.makeText(this, "No hay pistas de audio o subtítulos alternativos.", Toast.LENGTH_SHORT).show();
            return;
        }

        ArrayList<String> trackNames = new ArrayList<>();
        ArrayList<Runnable> trackActions = new ArrayList<>();

        int currentAudioTrack = mediaPlayer.getAudioTrack();
        int currentSpuTrack = mediaPlayer.getSpuTrack();

        if (audioTracks != null && audioTracks.length > 1) {
            trackNames.add("--- Pistas de Audio ---");
            trackActions.add(null); 

            for (MediaPlayer.TrackDescription track : audioTracks) {
                if (track.id == -1) continue;
                String trackName = track.name;
                if (currentAudioTrack == track.id) {
                    trackName += " (✓)";
                }
                trackNames.add(trackName);
                final int trackId = track.id;
                trackActions.add(() -> mediaPlayer.setAudioTrack(trackId));
            }
        }

        if (spuTracks != null && spuTracks.length > 0) {
            if (!trackNames.isEmpty()) {
                trackNames.add(""); 
                trackActions.add(null);
            }
            trackNames.add("--- Subtítulos ---");
            trackActions.add(null);

            String disableSubsName = "Desactivar Subtítulos";
            if (currentSpuTrack == -1) {
                disableSubsName += " (✓)";
            }
            trackNames.add(disableSubsName);
            trackActions.add(() -> mediaPlayer.setSpuTrack(-1));

            for (MediaPlayer.TrackDescription track : spuTracks) {
                if (track.id == -1) continue;
                String trackName = track.name;
                if (currentSpuTrack == track.id) {
                    trackName += " (✓)";
                }
                trackNames.add(trackName);
                final int trackId = track.id;
                trackActions.add(() -> mediaPlayer.setSpuTrack(trackId));
            }
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Audio y Subtítulos");
        builder.setItems(trackNames.toArray(new String[0]), (dialog, which) -> {
            Runnable action = trackActions.get(which);
            if (action != null) {
                action.run();
            }
        });
        builder.create().show();
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (gestureDetector.onTouchEvent(event)) {
            return true;
        }
        return super.onTouchEvent(event);
    }

    //region GestureDetector.OnGestureListener
    @Override
    public boolean onDown(MotionEvent e) {
        gestureInitialBrightness = getWindow().getAttributes().screenBrightness;
        if (gestureInitialBrightness < 0) {
            try {
                gestureInitialBrightness = android.provider.Settings.System.getInt(getContentResolver(), android.provider.Settings.System.SCREEN_BRIGHTNESS) / 255f;
            } catch (android.provider.Settings.SettingNotFoundException settingNotFoundException) {
                gestureInitialBrightness = 0.5f;
            }
        }
        gestureInitialVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
        return true;
    }

    @Override
    public boolean onSingleTapUp(MotionEvent e) {
        toggleControls();
        return true;
    }

    @Override
    public boolean onScroll(MotionEvent e1, MotionEvent e2, float distanceX, float distanceY) {
        if (Math.abs(distanceY) > Math.abs(distanceX)) {
            float deltaY = e1.getY() - e2.getY();
            
            if (e1.getX() < getWindow().getDecorView().getWidth() / 2) {
                // Control de brillo en el lado izquierdo
                WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
                float brightnessDelta = deltaY / (videoLayout.getHeight() * 2.0f);
                float newBrightness = gestureInitialBrightness + brightnessDelta;
                newBrightness = Math.max(0f, Math.min(1f, newBrightness));
                layoutParams.screenBrightness = newBrightness;
                getWindow().setAttributes(layoutParams);
                showBrightnessBar(newBrightness);
            } else {
                // Control de volumen en el lado derecho
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                float volumeDelta = deltaY / (videoLayout.getHeight() * 10.0f);
                int volumeChange = Math.round(volumeDelta * maxVolume);
                int newVolume = gestureInitialVolume + volumeChange;
                newVolume = Math.max(0, Math.min(maxVolume, newVolume));
                
                // Forzar el cambio de volumen
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, newVolume, AudioManager.FLAG_SHOW_UI);
                showVolumeBar(newVolume, maxVolume);
                
                // Log para debug
                android.util.Log.d(TAG, "Volume gesture: delta=" + volumeDelta + ", change=" + volumeChange + ", newVolume=" + newVolume + "/" + maxVolume);
            }
            return true;
        }

        return false;
    }

    @Override
    public void onLongPress(MotionEvent e) {}

    @Override
    public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
        return false;
    }

    @Override
    public void onShowPress(MotionEvent e) {}
    //endregion

    private void showBrightnessBar(float brightness) {
        brightnessBar.setMax(100);
        brightnessBar.setProgress((int) (brightness * 100));
        brightnessBar.setVisibility(View.VISIBLE);
        indicatorHandler.removeCallbacks(hideBrightnessBarRunnable);
        indicatorHandler.postDelayed(hideBrightnessBarRunnable, 1500);
    }

    private void showVolumeBar(int volume, int maxVolume) {
        volumeBar.setMax(maxVolume);
        volumeBar.setProgress(volume);
        volumeBar.setVisibility(View.VISIBLE);
        indicatorHandler.removeCallbacks(hideVolumeBarRunnable);
        indicatorHandler.postDelayed(hideVolumeBarRunnable, 1500);
    }
}
