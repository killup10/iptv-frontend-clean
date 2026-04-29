package play.teamg.store;

import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Looper;
import android.media.AudioManager;
import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.util.Rational;
import android.text.Editable;
import android.text.TextWatcher;

import android.util.Log;
import android.view.GestureDetector;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.interfaces.IMedia;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Locale;

public class VLCPlayerActivity extends AppCompatActivity implements GestureDetector.OnGestureListener {

    private static final String TAG = "VLCPlayerActivity";

    // Player components
    private LibVLC libVlc;
    private MediaPlayer mediaPlayer;
    private VLCVideoLayout videoLayout;

    // UI Controls
    private SeekBar seekBar;
    private TextView currentTime, totalDuration, videoTitle;
    private ImageButton playPauseButton, tracksButton, channelsButton, aspectRatioButton;
    private Button rewindButton, forwardButton;
    private ImageButton prevEpisodeButton, nextEpisodeButton, lockButton, speedButton;
    private View controlsContainer, topControlsContainer;
    private ProgressBar brightnessBar, volumeBar, unlockProgressBar;
    private FrameLayout videoContainer;

    // Velocidad de reproducción
    private final float[] playbackSpeeds = {0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 1.75f, 2.0f};
    private int currentSpeedIndex = 2; // 1.0x por defecto

    private Handler controlsHandler = new Handler(Looper.getMainLooper());

    // Media data
    private String currentVideoUrl;
    private long lastPosition = 0L;
    private boolean isScreenLocked = false;
    private boolean isSeekPending = false;
    private boolean isSeekBarArmed = false;
    private long pendingSeekPositionMs = -1L;
    private long mediaDurationMs = 0L;

    // Episode switching (avoid UI stalls/ANR when moving between episodes)
    private boolean isEpisodeSwitchInProgress = false;
    private String pendingEpisodeUrl = null;
    private String pendingEpisodeToastTitle = null;

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
    private ArrayList<Integer> chapterSeasonIndices;
    private ArrayList<Integer> chapterIndices;

    // ← NUEVO: Variables para canales en vivo (TV en Vivo)
    private ArrayList<String> channelNames;
    private ArrayList<String> channelLogos;
    private ArrayList<String> channelUrls;
    private boolean isLiveTV = false;

    private static final int MAX_AUTO_RECOVERY_ATTEMPTS = 6;
    private static final long RECOVERY_BASE_DELAY_MS = 2500L;
    private static final long STALL_TIMEOUT_MS = 20000L;
    private static final long STALL_CHECK_INTERVAL_MS = 5000L;

    private boolean isActivityClosing = false;
    private boolean isRecoveringPlayback = false;
    private boolean forceAudioRecoveryPending = false;
    private boolean hasSentPlayerClosedEvent = false;
    private String closeReason = "unknown";
    private int recoveryAttempts = 0;
    private long lastTimeChangedSystemMs = 0L;
    private long lastPlaybackPositionMs = 0L;
    private static final long QUICK_SEEK_MS = 10000L;
    private static final long SEEK_BAR_STEP_MS = 5000L;
    private final Handler recoveryHandler = new Handler(Looper.getMainLooper());
    private final Runnable stallWatchdogRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                if (mediaPlayer != null && mediaPlayer.isPlaying() && !isRecoveringPlayback && !isActivityClosing) {
                    long now = System.currentTimeMillis();
                    long stalledFor = now - lastTimeChangedSystemMs;
                    if (stalledFor >= STALL_TIMEOUT_MS) {
                        Log.w(TAG, "Playback stall detected (" + stalledFor + "ms without time updates)");
                        attemptPlaybackRecovery("stalled stream");
                    }
                }
            } catch (Exception watchdogError) {
                Log.e(TAG, "Error in playback stall watchdog", watchdogError);
            } finally {
                if (!isActivityClosing) {
                    recoveryHandler.postDelayed(this, STALL_CHECK_INTERVAL_MS);
                }
            }
        }
    };

    private BroadcastReceiver controlReceiver;
    private BroadcastReceiver finishReceiver;
    private BroadcastReceiver liveChannelsReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Verificar si se debe cerrar inmediatamente
        if (getIntent().getBooleanExtra("FORCE_CLOSE", false)) {
            Log.d(TAG, "FORCE_CLOSE flag detected - finishing immediately");
            closeReason = "force_close_intent";
            finish();
            return;
        }

        setContentView(R.layout.activity_vlc_player);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        videoLayout = findViewById(R.id.videoLayout);
        controlsContainer = findViewById(R.id.controls_container);
        topControlsContainer = findViewById(R.id.top_controls_container);
        seekBar = findViewById(R.id.seekBar);
        currentTime = findViewById(R.id.currentTime);
        totalDuration = findViewById(R.id.totalDuration);
        videoTitle = findViewById(R.id.video_title);
        playPauseButton = findViewById(R.id.play_pause_button);
        rewindButton = findViewById(R.id.rewind_button);
        forwardButton = findViewById(R.id.forward_button);
        prevEpisodeButton = findViewById(R.id.prev_episode_button);
        nextEpisodeButton = findViewById(R.id.next_episode_button);
        lockButton = findViewById(R.id.lock_button);
        tracksButton = findViewById(R.id.tracks_button);
        aspectRatioButton = findViewById(R.id.aspect_ratio_button);
        speedButton = findViewById(R.id.speed_button);
        channelsButton = findViewById(R.id.channels_button);
        brightnessBar = findViewById(R.id.brightness_bar);
        volumeBar = findViewById(R.id.volume_bar);
        unlockProgressBar = findViewById(R.id.unlock_progress_bar);

        currentVideoUrl = getIntent().getStringExtra("video_url");
        String videoTitleText = getIntent().getStringExtra("video_title");
        lastPosition = getIntent().getLongExtra("start_time", 0L);
        if (lastPosition > 0) {
            isSeekPending = true;
        }

        // Mostrar título del video con información del capítulo si existe
        if (videoTitleText != null && !videoTitleText.isEmpty()) {
            videoTitle.setText(videoTitleText);
            Log.d(TAG, "Video title set to: " + videoTitleText);
        } else {
            videoTitle.setText("Video");
        }

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
        chapterSeasonIndices = getIntent().getIntegerArrayListExtra("chapter_season_indices");
        chapterIndices = getIntent().getIntegerArrayListExtra("chapter_indices");

        // ← NUEVO: Leer datos de canales en vivo
        channelNames = getIntent().getStringArrayListExtra("channel_names");
        channelLogos = getIntent().getStringArrayListExtra("channel_logos");
        channelUrls = getIntent().getStringArrayListExtra("channel_urls");
        isLiveTV = getIntent().getBooleanExtra("is_live_tv", false);

        if (isLiveTV) {
            Log.d(TAG, "=== TV EN VIVO INICIALIZADO ===");
            Log.d(TAG, "Canales: " + (channelNames != null ? channelNames.size() : 0));
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Verificar si se debe cerrar
        if (intent.getBooleanExtra("FORCE_CLOSE", false)) {
            Log.d(TAG, "FORCE_CLOSE flag in onNewIntent - finishing activity");
            closeReason = "force_close_intent";
            finish();
            return;
        }

        // Actualizar metadata cuando la actividad es reutilizada con REORDER_TO_FRONT
        chapterTitles = intent.getStringArrayListExtra("chapter_titles");
        chapterUrls = intent.getStringArrayListExtra("chapter_urls");
        chapterSeasonNumbers = intent.getIntegerArrayListExtra("chapter_season_numbers");
        chapterNumbers = intent.getIntegerArrayListExtra("chapter_numbers");
        chapterSeasonIndices = intent.getIntegerArrayListExtra("chapter_season_indices");
        chapterIndices = intent.getIntegerArrayListExtra("chapter_indices");
        channelNames = intent.getStringArrayListExtra("channel_names");
        channelLogos = intent.getStringArrayListExtra("channel_logos");
        channelUrls = intent.getStringArrayListExtra("channel_urls");
        isLiveTV = intent.getBooleanExtra("is_live_tv", false);

        String nextVideoUrl = intent.getStringExtra("video_url");
        String nextVideoTitle = intent.getStringExtra("video_title");
        if (nextVideoTitle != null && !nextVideoTitle.isEmpty()) {
            videoTitle.setText(nextVideoTitle);
        }
        if (nextVideoUrl != null && !nextVideoUrl.equals(currentVideoUrl)) {
            currentVideoUrl = nextVideoUrl;
            lastPosition = intent.getLongExtra("start_time", 0L);
            isSeekPending = lastPosition > 0;
            releasePlayer();
            initializePlayer();
        } else {
            setupControls();
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        isActivityClosing = false;
        hasSentPlayerClosedEvent = false;
        closeReason = "active";
        initializePlayer();
        registerControlReceiver();
        registerFinishReceiver();
        registerLiveChannelsReceiver();
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            enterPictureInPictureMode();
        }
    }

    @Override
    public void onBackPressed() {
        closeReason = "user_back";
        super.onBackPressed();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() != KeyEvent.ACTION_DOWN) {
            return super.dispatchKeyEvent(event);
        }

        int keyCode = event.getKeyCode();
        boolean controlsVisible = controlsContainer.getVisibility() == View.VISIBLE;
        boolean controlsFocused = isControlsFocused();
        boolean seekBarFocused = isSeekBarFocused();

        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_UP:
                if (!controlsVisible) {
                    showControls();
                    return true;
                }
                if (!isLiveTV && controlsFocused && !seekBarFocused) {
                    focusSeekBar();
                    return true;
                }
                showControls();
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (!controlsVisible) {
                    showControls();
                    return true;
                }
                if (seekBarFocused) {
                    disarmSeekBar(false);
                    focusPrimaryControls();
                    return true;
                }
                showControls();
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (seekBarFocused && !isLiveTV) {
                    if (isSeekBarArmed) {
                        confirmSeekBarSelection();
                    } else {
                        armSeekBar();
                    }
                    return true;
                }
                if (!controlsVisible || !controlsFocused) {
                    showControls();
                    togglePlayPause();
                    return true;
                }
                return super.dispatchKeyEvent(event);
            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (seekBarFocused && !isLiveTV) {
                    if (isSeekBarArmed) {
                        adjustSeekBarSelection(-SEEK_BAR_STEP_MS);
                    }
                    return true;
                }
                if (controlsVisible && controlsFocused) {
                    return super.dispatchKeyEvent(event);
                }
                if (!isLiveTV) {
                    focusRewindButton();
                } else {
                    showControls();
                }
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (seekBarFocused && !isLiveTV) {
                    if (isSeekBarArmed) {
                        adjustSeekBarSelection(SEEK_BAR_STEP_MS);
                    }
                    return true;
                }
                if (controlsVisible && controlsFocused) {
                    return super.dispatchKeyEvent(event);
                }
                if (!isLiveTV) {
                    focusForwardButton();
                } else {
                    showControls();
                }
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                disarmSeekBar(false);
                togglePlayPause();
                showControls();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY:
                if (mediaPlayer != null) {
                    mediaPlayer.play();
                }
                disarmSeekBar(false);
                showControls();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                if (mediaPlayer != null) {
                    mediaPlayer.pause();
                }
                disarmSeekBar(false);
                showControls();
                return true;
            case KeyEvent.KEYCODE_MEDIA_NEXT:
                if (!isLiveTV) {
                    disarmSeekBar(false);
                    goToNextEpisode();
                    showControls();
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                if (!isLiveTV) {
                    disarmSeekBar(false);
                    goToPreviousEpisode();
                    showControls();
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_CHANNEL_UP:
                if (isLiveTV) {
                    changeChannelByStep(1);
                    showControls();
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_CHANNEL_DOWN:
                if (isLiveTV) {
                    changeChannelByStep(-1);
                    showControls();
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_BACK:
            case KeyEvent.KEYCODE_ESCAPE:
                if (isSeekBarArmed) {
                    disarmSeekBar(true);
                    return true;
                }
                break;
            default:
                break;
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        if (inPip) {
            controlsContainer.setVisibility(View.GONE);
        } else {
            controlsContainer.setVisibility(View.VISIBLE);
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        unregisterControlReceiver();
        unregisterFinishReceiver();
        unregisterLiveChannelsReceiver();
        // Limpiar long press handler
        if (longPressRunnable != null) {
            longPressHandler.removeCallbacks(longPressRunnable);
            longPressRunnable = null;
        }
        if (!isInPictureInPictureMode()) {
            isActivityClosing = true;
            releasePlayer();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        isActivityClosing = true;
        recoveryHandler.removeCallbacksAndMessages(null);
        // Limpiar long press handler
        if (longPressRunnable != null) {
            longPressHandler.removeCallbacks(longPressRunnable);
            longPressRunnable = null;
        }
        if (isInPictureInPictureMode() && mediaPlayer != null && mediaPlayer.isPlaying()) {
            Log.d(TAG, "Stopping playback when activity is destroyed in PiP mode");
            mediaPlayer.stop();
            notifyProgressUpdate(mediaPlayer.getTime());
        }
        notifyPlayerClosed(closeReason);
        releasePlayer();
    }

    private void initializePlayer() {
        if (currentVideoUrl == null) {
            Log.e(TAG, "Video URL is null, cannot initialize player.");
            return;
        }
        isActivityClosing = false;
        lastTimeChangedSystemMs = System.currentTimeMillis();
        recoveryHandler.removeCallbacks(stallWatchdogRunnable);

        libVlc = VLCInstance.getInstance(getApplicationContext());
        mediaPlayer = new MediaPlayer(libVlc);
        mediaPlayer.setAudioDigitalOutputEnabled(false);
        mediaPlayer.setVolume(100);
        mediaPlayer.attachViews(videoLayout, null, false, false);
        mediaPlayer.setAspectRatio(null);
        mediaPlayer.setScale(MediaPlayer.ScaleType.SURFACE_FIT_SCREEN.ordinal());

        currentAspectRatioIndex = 0;

        setupPlayerEvents();
        setupControls();
        updateVideoTitleWithChapterInfo();

        Media media = new Media(libVlc, Uri.parse(currentVideoUrl));
        media.setHWDecoderEnabled(true, false);
        media.addOption(":network-caching=1500");
        media.addOption(":http-user-agent=VLC/3.0.0 (Linux; Android 9)");

        mediaPlayer.setMedia(media);
        media.release();

        mediaPlayer.play();
        recoveryHandler.postDelayed(stallWatchdogRunnable, STALL_CHECK_INTERVAL_MS);
    }

    private void releasePlayer() {
        recoveryHandler.removeCallbacks(stallWatchdogRunnable);
        if (mediaPlayer != null) {
            long currentPositionMs = Math.max(0L, mediaPlayer.getTime());
            lastPlaybackPositionMs = currentPositionMs;
            lastPosition = currentPositionMs / 1000L;
            // Guardar progreso final antes de cerrar
            if (currentPositionMs > 0) {
                Log.d(TAG, "Saving final progress before closing: " + (currentPositionMs / 1000) + "s");
                notifyProgressUpdate(currentPositionMs, false, true);
            }
            mediaPlayer.stop();
            mediaPlayer.detachViews();
            mediaPlayer.release();
            mediaPlayer = null;
        }
        controlsHandler.removeCallbacksAndMessages(null);
    }

    // Variables para throttling de progreso
    private long lastProgressSent = 0;
    private final long PROGRESS_THROTTLE_MS = 10000; // 10 segundos

    private void setupPlayerEvents() {
        mediaPlayer.setEventListener(event -> {
            switch (event.type) {
                case MediaPlayer.Event.EncounteredError:
                    Log.e(TAG, "An error was encountered during playback");
                    attemptPlaybackRecovery("vlc error event");
                    break;
                case MediaPlayer.Event.Buffering:
                    // Solo refrescar el watchdog cuando el buffer está prácticamente lleno.
                    if (event.getBuffering() >= 95f) {
                        lastTimeChangedSystemMs = System.currentTimeMillis();
                    }
                    break;
                case MediaPlayer.Event.Playing:
                    playPauseButton.setImageResource(android.R.drawable.ic_media_pause);
                    recoveryAttempts = 0;
                    isRecoveringPlayback = false;
                    lastTimeChangedSystemMs = System.currentTimeMillis();
                    if (isSeekPending) {
                        mediaPlayer.setTime(lastPosition * 1000);
                        isSeekPending = false;
                    }
                    if (forceAudioRecoveryPending) {
                        recoveryHandler.postDelayed(() -> restoreAudioOutputAfterRecovery(), 350L);
                    }
                    recoveryHandler.postDelayed(() -> ensureCompatibleAudioTrackSelection("playback_started"), 500L);
                    hideControls();
                    break;
                case MediaPlayer.Event.Paused:
                    playPauseButton.setImageResource(android.R.drawable.ic_media_play);
                    // Enviar progreso cuando se pausa (siempre)
                    notifyProgressUpdate(mediaPlayer.getTime(), false, true);
                    break;
                case MediaPlayer.Event.Stopped:
                    playPauseButton.setImageResource(android.R.drawable.ic_media_play);
                    notifyProgressUpdate(mediaPlayer.getTime(), false, true);
                    break;
                case MediaPlayer.Event.TimeChanged:
                    lastTimeChangedSystemMs = System.currentTimeMillis();
                    lastPlaybackPositionMs = event.getTimeChanged();
                    if (!isSeekBarArmed) {
                        currentTime.setText(formatTime(event.getTimeChanged()));
                        seekBar.setProgress((int) event.getTimeChanged());
                    }
                    // Enviar progreso con throttling (cada 10 segundos)
                    long now = System.currentTimeMillis();
                    if (now - lastProgressSent > PROGRESS_THROTTLE_MS) {
                        notifyProgressUpdate(event.getTimeChanged());
                        lastProgressSent = now;
                    }
                    break;
                case MediaPlayer.Event.LengthChanged:
                    mediaDurationMs = event.getLengthChanged();
                    totalDuration.setText(formatTime(event.getLengthChanged()));
                    seekBar.setMax((int) event.getLengthChanged());
                    break;
                case MediaPlayer.Event.EndReached:
                    Log.d(TAG, "Video ended, checking for next episode");
                    // Enviar progreso final cuando termina el video
                    notifyProgressUpdate(mediaPlayer.getTime(), true, true);
                    playNextEpisode();
                    break;
            }
        });
    }

    // Método para notificar progreso al plugin JavaScript
    private void attemptPlaybackRecovery(String reason) {
        if (isActivityClosing || currentVideoUrl == null) {
            return;
        }
        if (isRecoveringPlayback) {
            return;
        }
        if (recoveryAttempts >= MAX_AUTO_RECOVERY_ATTEMPTS) {
            Log.e(TAG, "Max playback recovery attempts reached. Last reason: " + reason);
            return;
        }

        isRecoveringPlayback = true;
        forceAudioRecoveryPending = true;
        recoveryAttempts++;

        long currentPositionMs = 0L;
        if (mediaPlayer != null) {
            currentPositionMs = Math.max(0L, mediaPlayer.getTime());
        }
        if (currentPositionMs <= 0 && lastPlaybackPositionMs > 0) {
            currentPositionMs = lastPlaybackPositionMs;
        }
        if (currentPositionMs > 0) {
            lastPosition = currentPositionMs / 1000L;
            isSeekPending = true;
            notifyProgressUpdate(currentPositionMs);
        }

        final long delayMs = RECOVERY_BASE_DELAY_MS * Math.min(recoveryAttempts, 3);
        Log.w(TAG, "Recovery attempt " + recoveryAttempts + "/" + MAX_AUTO_RECOVERY_ATTEMPTS + " due to: " + reason + " (delay " + delayMs + "ms)");

        runOnUiThread(() -> Toast.makeText(
                VLCPlayerActivity.this,
                "Reconectando transmisión...",
                Toast.LENGTH_SHORT
        ).show());

        recoveryHandler.postDelayed(() -> {
            if (isActivityClosing) {
                isRecoveringPlayback = false;
                return;
            }
            try {
                releasePlayer();
                initializePlayer();
            } catch (Exception recoveryError) {
                Log.e(TAG, "Error during playback recovery", recoveryError);
            } finally {
                isRecoveringPlayback = false;
            }
        }, delayMs);
    }

    private void restoreAudioOutputAfterRecovery() {
        if (mediaPlayer == null) {
            return;
        }

        try {
            // Recuperar foco de audio del sistema
            if (audioManager != null) {
                int focusResult = audioManager.requestAudioFocus(
                        null,
                        AudioManager.STREAM_MUSIC,
                        AudioManager.AUDIOFOCUS_GAIN
                );
                Log.d(TAG, "Audio focus requested after recovery. Result=" + focusResult);
            }

            // Asegurar volumen interno de VLC
            mediaPlayer.setVolume(100);

            // Reasignar pista de audio válida si VLC quedó sin pista (-1)
            MediaPlayer.TrackDescription[] audioTracks = mediaPlayer.getAudioTracks();
            int currentAudioTrack = mediaPlayer.getAudioTrack();
            int firstValidTrackId = -1;

            if (audioTracks != null) {
                for (MediaPlayer.TrackDescription track : audioTracks) {
                    if (track != null && track.id != -1) {
                        firstValidTrackId = track.id;
                        break;
                    }
                }
            }

            if (currentAudioTrack == -1 && firstValidTrackId != -1) {
                mediaPlayer.setAudioTrack(firstValidTrackId);
                Log.d(TAG, "Audio track restored with fallback id=" + firstValidTrackId);
            } else if (currentAudioTrack != -1) {
                // Reaplicar pista actual para forzar reenganche del decoder de audio
                mediaPlayer.setAudioTrack(currentAudioTrack);
                Log.d(TAG, "Audio track re-applied id=" + currentAudioTrack);
            } else {
                Log.w(TAG, "No valid audio tracks found after recovery");
            }

            recoveryHandler.postDelayed(() -> ensureCompatibleAudioTrackSelection("recovery"), 400L);
        } catch (Exception audioError) {
            Log.e(TAG, "Failed to restore audio output after recovery", audioError);
        } finally {
            forceAudioRecoveryPending = false;
        }
    }

    private String getAudioCodecValue(IMedia.AudioTrack track) {
        if (track == null) {
            return "";
        }

        if (track.codec != null && !track.codec.isEmpty()) {
            return track.codec;
        }

        return track.originalCodec != null ? track.originalCodec : "";
    }

    private boolean isEac3Codec(String codecValue) {
        if (codecValue == null || codecValue.isEmpty()) {
            return false;
        }

        String normalizedCodec = codecValue.toLowerCase(Locale.ROOT);
        return normalizedCodec.contains("eac3")
            || normalizedCodec.contains("ec-3")
            || normalizedCodec.contains("dd+");
    }

    private boolean isPreferredCompressedCodec(String codecValue) {
        if (codecValue == null || codecValue.isEmpty()) {
            return false;
        }

        String normalizedCodec = codecValue.toLowerCase(Locale.ROOT);
        return normalizedCodec.contains("aac")
            || normalizedCodec.contains("mp4a")
            || normalizedCodec.contains("ac3")
            || normalizedCodec.contains("mp3")
            || normalizedCodec.contains("opus")
            || normalizedCodec.contains("vorbis")
            || normalizedCodec.contains("flac")
            || normalizedCodec.contains("pcm");
    }

    private int scoreAudioTrackForCompatibility(IMedia.AudioTrack track) {
        if (track == null) {
            return Integer.MIN_VALUE;
        }

        String codecValue = getAudioCodecValue(track);
        int score = 0;

        if (isEac3Codec(codecValue)) {
            score -= 200;
        } else if (isPreferredCompressedCodec(codecValue)) {
            score += 300;
        } else {
            score += 100;
        }

        if (track.channels <= 2) {
            score += 80;
        } else if (track.channels <= 6) {
            score += 20;
        }

        if (track.language != null) {
            String normalizedLanguage = track.language.toLowerCase(Locale.ROOT);
            if (normalizedLanguage.startsWith("es") || normalizedLanguage.contains("spa")) {
                score += 10;
            }
        }

        return score;
    }

    private String formatAudioTrackDetails(IMedia.AudioTrack track) {
        if (track == null) {
            return "";
        }

        String codecValue = getAudioCodecValue(track);
        String normalizedCodec = codecValue == null ? "" : codecValue.toUpperCase(Locale.ROOT);
        String channelLabel = track.channels > 0 ? track.channels + "ch" : "";

        if (!normalizedCodec.isEmpty() && !channelLabel.isEmpty()) {
            return normalizedCodec + " • " + channelLabel;
        }
        if (!normalizedCodec.isEmpty()) {
            return normalizedCodec;
        }
        return channelLabel;
    }

    private IMedia.AudioTrack findAudioTrackInfo(IMedia media, int trackId) {
        if (media == null || trackId == -1) {
            return null;
        }

        int totalTracks = media.getTrackCount();
        for (int index = 0; index < totalTracks; index++) {
            IMedia.Track rawTrack = media.getTrack(index);
            if (!(rawTrack instanceof IMedia.AudioTrack)) {
                continue;
            }

            IMedia.AudioTrack audioTrack = (IMedia.AudioTrack) rawTrack;
            if (audioTrack.id == trackId) {
                return audioTrack;
            }
        }

        return null;
    }

    private void ensureCompatibleAudioTrackSelection(String reason) {
        if (mediaPlayer == null || !mediaPlayer.hasMedia()) {
            return;
        }

        IMedia media = mediaPlayer.getMedia();
        if (media == null) {
            return;
        }

        int totalTracks = media.getTrackCount();
        if (totalTracks <= 0) {
            return;
        }

        int currentAudioTrackId = mediaPlayer.getAudioTrack();
        IMedia.AudioTrack currentAudioTrackInfo = null;
        IMedia.AudioTrack preferredAudioTrack = null;
        boolean foundAlternativeToEac3 = false;

        for (int index = 0; index < totalTracks; index++) {
            IMedia.Track rawTrack = media.getTrack(index);
            if (!(rawTrack instanceof IMedia.AudioTrack)) {
                continue;
            }

            IMedia.AudioTrack audioTrack = (IMedia.AudioTrack) rawTrack;
            if (audioTrack.id == -1) {
                continue;
            }

            String codecValue = getAudioCodecValue(audioTrack);
            Log.d(
                TAG,
                "Audio track detected [" + reason + "] id=" + audioTrack.id
                    + ", codec=" + codecValue
                    + ", channels=" + audioTrack.channels
                    + ", language=" + audioTrack.language
                    + ", description=" + audioTrack.description
            );

            if (!isEac3Codec(codecValue)) {
                foundAlternativeToEac3 = true;
            }

            if (audioTrack.id == currentAudioTrackId) {
                currentAudioTrackInfo = audioTrack;
            }

            if (preferredAudioTrack == null
                || scoreAudioTrackForCompatibility(audioTrack) > scoreAudioTrackForCompatibility(preferredAudioTrack)) {
                preferredAudioTrack = audioTrack;
            }
        }

        if (preferredAudioTrack == null) {
            return;
        }

        boolean shouldSwitchTrack = currentAudioTrackId == -1;
        if (currentAudioTrackInfo != null) {
            String currentCodecValue = getAudioCodecValue(currentAudioTrackInfo);
            shouldSwitchTrack = isEac3Codec(currentCodecValue)
                && foundAlternativeToEac3
                && preferredAudioTrack.id != currentAudioTrackId;
        }

        if (!shouldSwitchTrack) {
            return;
        }

        boolean switched = mediaPlayer.setAudioTrack(preferredAudioTrack.id);
        Log.w(
            TAG,
            "Audio compatibility fallback [" + reason + "] currentTrack=" + currentAudioTrackId
                + ", nextTrack=" + preferredAudioTrack.id
                + ", details=" + formatAudioTrackDetails(preferredAudioTrack)
                + ", switched=" + switched
        );
    }

    private int getCurrentChapterGlobalIndex() {
        if (currentVideoUrl == null || chapterUrls == null || chapterUrls.isEmpty()) {
            return -1;
        }
        return chapterUrls.indexOf(currentVideoUrl);
    }

    private void appendCurrentChapterProgress(Intent progressIntent) {
        int currentIndex = getCurrentChapterGlobalIndex();
        if (currentIndex < 0) {
            return;
        }

        int seasonIndex = -1;
        int chapterIndex = -1;

        if (chapterSeasonIndices != null && currentIndex < chapterSeasonIndices.size()) {
            seasonIndex = chapterSeasonIndices.get(currentIndex);
        } else if (chapterSeasonNumbers != null && currentIndex < chapterSeasonNumbers.size()) {
            seasonIndex = Math.max(0, chapterSeasonNumbers.get(currentIndex) - 1);
        }

        if (chapterIndices != null && currentIndex < chapterIndices.size()) {
            chapterIndex = chapterIndices.get(currentIndex);
        } else if (chapterNumbers != null && currentIndex < chapterNumbers.size()) {
            chapterIndex = Math.max(0, chapterNumbers.get(currentIndex) - 1);
        }

        if (seasonIndex >= 0) {
            progressIntent.putExtra("seasonIndex", seasonIndex);
        }
        if (chapterIndex >= 0) {
            progressIntent.putExtra("chapterIndex", chapterIndex);
        }
        progressIntent.putExtra("chapterGlobalIndex", currentIndex);
    }

    private void notifyPlayerClosed(String reason) {
        if (hasSentPlayerClosedEvent) {
            return;
        }
        hasSentPlayerClosedEvent = true;
        try {
            Intent closedIntent = new Intent("VIDEO_PLAYER_CLOSED");
            closedIntent.putExtra("reason", reason != null ? reason : "unknown");
            closedIntent.setPackage(getPackageName());
            sendBroadcast(closedIntent);
            Log.d(TAG, "Player closed event sent. Reason: " + reason);
        } catch (Exception e) {
            Log.e(TAG, "Error sending player closed event", e);
        }
    }

    private void notifyProgressUpdate(long currentTimeMs) {
        notifyProgressUpdate(currentTimeMs, false, false);
    }

    private void notifyProgressUpdate(long currentTimeMs, boolean completed) {
        notifyProgressUpdate(currentTimeMs, completed, completed);
    }

    private void notifyProgressUpdate(long currentTimeMs, boolean completed, boolean forceSync) {
        try {
            // Convertir de milisegundos a segundos para consistencia con el frontend
            long currentTimeSec = currentTimeMs / 1000;

            // Crear intent para enviar progreso al plugin
            Intent progressIntent = new Intent("VIDEO_PROGRESS_UPDATE");
            progressIntent.putExtra("currentTime", currentTimeSec);
            progressIntent.putExtra("completed", completed);
            progressIntent.putExtra("forceSync", forceSync);
            appendCurrentChapterProgress(progressIntent);
            progressIntent.setPackage(getPackageName());
            sendBroadcast(progressIntent);

            Log.d(TAG, "Progress update sent: " + currentTimeSec + "s, completed: " + completed + ", forceSync=" + forceSync + ", chapterGlobalIndex=" + getCurrentChapterGlobalIndex());
        } catch (Exception e) {
            Log.e(TAG, "Error sending progress update", e);
        }
    }

    private void playNextEpisode() {
        if (chapterUrls == null || chapterUrls.isEmpty()) {
            Log.d(TAG, "No chapters available for auto-play");
            return;
        }

        // Encontrar el índice del capítulo actual
        int currentIndex = getCurrentChapterGlobalIndex();

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

            requestEpisodeSwitch(nextEpisodeUrl, null);
        } else {
            Log.d(TAG, "No next episode available or current episode not found");
            Toast.makeText(this, "Serie completada", Toast.LENGTH_LONG).show();
        }
    }

    private void setEpisodeSwitchControlsEnabled(boolean enabled) {
        try {
            if (prevEpisodeButton != null) prevEpisodeButton.setEnabled(enabled);
            if (nextEpisodeButton != null) nextEpisodeButton.setEnabled(enabled);
            if (channelsButton != null) channelsButton.setEnabled(enabled);
        } catch (Exception ignored) {
        }
    }

    private void requestEpisodeSwitch(String targetUrl, String toastTitle) {
        if (isActivityClosing) {
            return;
        }
        if (targetUrl == null || targetUrl.isEmpty()) {
            return;
        }
        if (targetUrl.equals(currentVideoUrl)) {
            return;
        }

        pendingEpisodeUrl = targetUrl;
        pendingEpisodeToastTitle = toastTitle;

        if (isEpisodeSwitchInProgress) {
            Log.d(TAG, "Episode switch already in progress, queued: " + targetUrl);
            return;
        }

        isEpisodeSwitchInProgress = true;
        setEpisodeSwitchControlsEnabled(false);

        // Defer the heavy work to the message queue so the click handler returns fast (helps avoid ANR).
        controlsHandler.post(this::performPendingEpisodeSwitch);
    }

    private void performPendingEpisodeSwitch() {
        if (isActivityClosing) {
            pendingEpisodeUrl = null;
            pendingEpisodeToastTitle = null;
            isEpisodeSwitchInProgress = false;
            setEpisodeSwitchControlsEnabled(true);
            return;
        }

        final String targetUrl = pendingEpisodeUrl;
        final String toastTitle = pendingEpisodeToastTitle;
        pendingEpisodeUrl = null;
        pendingEpisodeToastTitle = null;

        if (targetUrl == null || targetUrl.isEmpty()) {
            isEpisodeSwitchInProgress = false;
            setEpisodeSwitchControlsEnabled(true);
            return;
        }

        try {
            // Persist current position (best-effort) before switching.
            if (mediaPlayer != null) {
                try {
                    long currentPositionMs = Math.max(0L, mediaPlayer.getTime());
                    if (currentPositionMs > 0) {
                        notifyProgressUpdate(currentPositionMs, false, true);
                    }
                } catch (Exception progressErr) {
                    Log.w(TAG, "Failed to send progress before episode switch", progressErr);
                }

                try {
                    mediaPlayer.stop();
                } catch (Exception stopErr) {
                    Log.w(TAG, "Failed to stop current media before episode switch", stopErr);
                }
            }

            currentVideoUrl = targetUrl;
            lastPosition = 0L;
            isSeekPending = false;
            lastPlaybackPositionMs = 0L;

            if (libVlc == null) {
                libVlc = VLCInstance.getInstance(getApplicationContext());
            }

            // Reuse the existing MediaPlayer to avoid heavy release/recreate cycles (reduces UI stalls/ANR).
            if (mediaPlayer == null) {
                initializePlayer();
            } else {
                recoveryHandler.removeCallbacks(stallWatchdogRunnable);
                lastTimeChangedSystemMs = System.currentTimeMillis();
                isRecoveringPlayback = false;
                forceAudioRecoveryPending = false;

                Media media = new Media(libVlc, Uri.parse(currentVideoUrl));
                media.setHWDecoderEnabled(true, false);
                media.addOption(":network-caching=1500");
                media.addOption(":http-user-agent=VLC/3.0.0 (Linux; Android 9)");

                mediaPlayer.setMedia(media);
                media.release();

                updateVideoTitleWithChapterInfo();
                mediaPlayer.play();
                recoveryHandler.postDelayed(stallWatchdogRunnable, STALL_CHECK_INTERVAL_MS);
            }

            if (toastTitle != null && !toastTitle.isEmpty()) {
                Toast.makeText(this, "Reproduciendo: " + toastTitle, Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error switching episode, falling back to re-initialization", e);
            try {
                releasePlayer();
            } catch (Exception releaseErr) {
                Log.w(TAG, "Failed to release player during fallback", releaseErr);
            }
            try {
                initializePlayer();
            } catch (Exception initErr) {
                Log.e(TAG, "Failed to initialize player during fallback", initErr);
            }
        } finally {
            if (pendingEpisodeUrl != null && !pendingEpisodeUrl.equals(currentVideoUrl)) {
                // Another request arrived while we were switching (rare but safe).
                controlsHandler.post(this::performPendingEpisodeSwitch);
            } else {
                isEpisodeSwitchInProgress = false;
                setEpisodeSwitchControlsEnabled(true);
            }
        }
    }

    private void setupControls() {
        playPauseButton.setOnClickListener(v -> {
            if (mediaPlayer.isPlaying()) mediaPlayer.pause();
            else mediaPlayer.play();
            hideControls();
        });

        if (isLiveTV) {
            rewindButton.setVisibility(View.GONE);
            forwardButton.setVisibility(View.GONE);
        } else {
            rewindButton.setVisibility(View.VISIBLE);
            forwardButton.setVisibility(View.VISIBLE);

            rewindButton.setText("10-");
            forwardButton.setText("10+");

            rewindButton.setOnClickListener(v -> {
                seekByMs(-QUICK_SEEK_MS);
                hideControls();
            });

            forwardButton.setOnClickListener(v -> {
                seekByMs(QUICK_SEEK_MS);
                hideControls();
            });
        }

        // Botones de Episodio Anterior/Siguiente
        if (chapterUrls != null && !chapterUrls.isEmpty() && chapterUrls.size() > 1) {
            prevEpisodeButton.setVisibility(View.VISIBLE);
            nextEpisodeButton.setVisibility(View.VISIBLE);

            prevEpisodeButton.setOnClickListener(v -> {
                goToPreviousEpisode();
            });

            nextEpisodeButton.setOnClickListener(v -> {
                goToNextEpisode();
            });
        }

        // Botón de Bloqueo de Pantalla
        lockButton.setOnClickListener(v -> {
            toggleScreenLock();
        });

        tracksButton.setOnClickListener(v -> {
            showTracksDialog();
            hideControls();
        });

        aspectRatioButton.setOnClickListener(v -> {
            cycleAspectRatio();
            hideControls();
        });

        speedButton.setOnClickListener(v -> {
            cyclePlaybackSpeed();
            hideControls();
        });

        // ← MODIFICADO: Diferenciar entre TV en vivo y Series/VODs
        if (isLiveTV && channelNames != null && !channelNames.isEmpty()) {
            // TV EN VIVO: Mostrar botón de canales en vivo
            Log.d(TAG, "Configurando botón para TV EN VIVO (" + channelNames.size() + " canales)");
            channelsButton.setVisibility(View.VISIBLE);

            channelsButton.setOnClickListener(v -> {
                showLiveChannelsDialog();
                hideControls();
            });
        } else if (chapterTitles != null && !chapterTitles.isEmpty()) {
            // SERIES/VODs: Mostrar botón de capítulos
            Log.d(TAG, "Configurando botón para SERIES/VODs (" + chapterTitles.size() + " capítulos)");
            channelsButton.setVisibility(View.VISIBLE);

            channelsButton.setOnClickListener(v -> {
                showChaptersDialog();
                hideControls();
            });
        } else {
            // SIN CONTENIDO: Ocultar botón
            Log.d(TAG, "No hay capítulos ni canales - ocultando botón");
            channelsButton.setVisibility(View.GONE);
        }

        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser && !isLiveTV) {
                    currentTime.setText(formatTime(progress));
                }
            }
            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {
                controlsHandler.removeCallbacksAndMessages(null);
            }
            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
                if (!isLiveTV) {
                    currentTime.setText(formatTime(seekBar.getProgress()));
                }
                hideControls();
            }
        });
    }

    private void updateVideoTitleWithChapterInfo() {
        if (currentVideoUrl == null || chapterUrls == null || chapterUrls.isEmpty()) {
            return;
        }

        // Encontrar el índice del capítulo actual
        int currentIndex = chapterUrls.indexOf(currentVideoUrl);
        if (currentIndex >= 0 && chapterSeasonNumbers != null && chapterNumbers != null &&
            currentIndex < chapterSeasonNumbers.size() && currentIndex < chapterNumbers.size()) {

            int seasonNum = chapterSeasonNumbers.get(currentIndex);
            int chapterNum = chapterNumbers.get(currentIndex);
            String title = (chapterTitles != null && currentIndex < chapterTitles.size())
                ? chapterTitles.get(currentIndex)
                : "";

            String fullTitle = String.format("S%dE%d - %s", seasonNum, chapterNum, title);
            videoTitle.setText(fullTitle);
            Log.d(TAG, "Updated title to: " + fullTitle);
        }
    }

    private void goToPreviousEpisode() {
        if (currentVideoUrl == null || chapterUrls == null || chapterUrls.isEmpty()) {
            Toast.makeText(this, "No hay episodios anteriores", Toast.LENGTH_SHORT).show();
            return;
        }

        int currentIndex = chapterUrls.indexOf(currentVideoUrl);
        if (currentIndex > 0) {
            String prevTitle = (chapterTitles != null && currentIndex - 1 < chapterTitles.size())
                ? chapterTitles.get(currentIndex - 1)
                : "Episodio " + currentIndex;

            requestEpisodeSwitch(chapterUrls.get(currentIndex - 1), prevTitle);
        } else {
            Toast.makeText(this, "Primer episodio", Toast.LENGTH_SHORT).show();
        }
    }

    private void goToNextEpisode() {
        if (currentVideoUrl == null || chapterUrls == null || chapterUrls.isEmpty()) {
            Toast.makeText(this, "No hay episodios siguientes", Toast.LENGTH_SHORT).show();
            return;
        }

        int currentIndex = chapterUrls.indexOf(currentVideoUrl);
        if (currentIndex >= 0 && currentIndex < chapterUrls.size() - 1) {
            String nextTitle = (chapterTitles != null && currentIndex + 1 < chapterTitles.size())
                ? chapterTitles.get(currentIndex + 1)
                : "Episodio " + (currentIndex + 2);

            requestEpisodeSwitch(chapterUrls.get(currentIndex + 1), nextTitle);
        } else {
            Toast.makeText(this, "Último episodio", Toast.LENGTH_SHORT).show();
        }
    }

    private void toggleScreenLock() {
        isScreenLocked = !isScreenLocked;

        if (isScreenLocked) {
            lockButton.setImageDrawable(getDrawable(android.R.drawable.ic_lock_lock));
            controlsContainer.setAlpha(0.3f);
            Toast.makeText(this, "Pantalla bloqueada 🔒", Toast.LENGTH_SHORT).show();
        } else {
            lockButton.setImageDrawable(getDrawable(android.R.drawable.ic_lock_silent_mode_off));
            controlsContainer.setAlpha(1.0f);
            Toast.makeText(this, "Pantalla desbloqueada 🔓", Toast.LENGTH_SHORT).show();
        }
    }

    private void hideControls() {
        controlsHandler.removeCallbacksAndMessages(null);
        controlsHandler.postDelayed(() -> {
            if (isSeekBarArmed) {
                return;
            }
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                controlsContainer.setVisibility(View.GONE);
                topControlsContainer.setVisibility(View.GONE);
            }
        }, 3000);
    }

    private void showControls() {
        controlsContainer.setVisibility(View.VISIBLE);
        topControlsContainer.setVisibility(View.VISIBLE);
        disarmSeekBar(false);
        if (playPauseButton != null) {
            playPauseButton.requestFocus();
        }
        hideControls();
    }

    private void focusSeekBar() {
        if (isLiveTV || seekBar == null) {
            showControls();
            return;
        }
        controlsContainer.setVisibility(View.VISIBLE);
        topControlsContainer.setVisibility(View.VISIBLE);
        seekBar.requestFocus();
        hideControls();
    }

    private void focusRewindButton() {
        controlsContainer.setVisibility(View.VISIBLE);
        topControlsContainer.setVisibility(View.VISIBLE);
        if (rewindButton != null && rewindButton.getVisibility() == View.VISIBLE) {
            rewindButton.requestFocus();
        } else if (playPauseButton != null) {
            playPauseButton.requestFocus();
        }
        hideControls();
    }

    private void focusForwardButton() {
        controlsContainer.setVisibility(View.VISIBLE);
        topControlsContainer.setVisibility(View.VISIBLE);
        if (forwardButton != null && forwardButton.getVisibility() == View.VISIBLE) {
            forwardButton.requestFocus();
        } else if (playPauseButton != null) {
            playPauseButton.requestFocus();
        }
        hideControls();
    }

    private void focusPrimaryControls() {
        controlsContainer.setVisibility(View.VISIBLE);
        topControlsContainer.setVisibility(View.VISIBLE);
        disarmSeekBar(false);
        if (playPauseButton != null) {
            playPauseButton.requestFocus();
        }
        hideControls();
    }

    private void toggleControls() {
        if (controlsContainer.getVisibility() == View.VISIBLE) {
            controlsContainer.setVisibility(View.GONE);
            topControlsContainer.setVisibility(View.GONE);
        } else {
            showControls();
        }
    }

    private void togglePlayPause() {
        if (mediaPlayer == null) return;
        if (mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
        } else {
            mediaPlayer.play();
        }
    }

    private void seekByMs(long deltaMs) {
        if (mediaPlayer == null) return;
        long targetTime = Math.max(0L, mediaPlayer.getTime() + deltaMs);
        mediaPlayer.setTime(targetTime);
    }

    private void armSeekBar() {
        if (isLiveTV || seekBar == null || mediaPlayer == null) {
            return;
        }

        controlsHandler.removeCallbacksAndMessages(null);
        isSeekBarArmed = true;
        pendingSeekPositionMs = Math.max(0L, mediaPlayer.getTime());
        applySeekBarPreviewState();
    }

    private void disarmSeekBar(boolean restoreCurrentTime) {
        boolean wasArmed = isSeekBarArmed;
        isSeekBarArmed = false;
        pendingSeekPositionMs = -1L;

        if ((wasArmed || restoreCurrentTime) && mediaPlayer != null) {
            long currentPositionMs = Math.max(0L, mediaPlayer.getTime());
            currentTime.setText(formatTime(currentPositionMs));
            seekBar.setProgress((int) currentPositionMs);
        }

        applySeekBarPreviewState();
    }

    private void confirmSeekBarSelection() {
        if (mediaPlayer == null || pendingSeekPositionMs < 0) {
            disarmSeekBar(true);
            hideControls();
            return;
        }

        long targetTime = clampSeekPosition(pendingSeekPositionMs);
        mediaPlayer.setTime(targetTime);
        notifyProgressUpdate(targetTime, false, true);
        lastPlaybackPositionMs = targetTime;
        currentTime.setText(formatTime(targetTime));
        seekBar.setProgress((int) targetTime);
        isSeekBarArmed = false;
        pendingSeekPositionMs = -1L;
        applySeekBarPreviewState();
        hideControls();
    }

    private void adjustSeekBarSelection(long deltaMs) {
        if (!isSeekBarArmed || seekBar == null) {
            return;
        }

        long baseTime = pendingSeekPositionMs >= 0
                ? pendingSeekPositionMs
                : (mediaPlayer != null ? Math.max(0L, mediaPlayer.getTime()) : 0L);
        long targetTime = clampSeekPosition(baseTime + deltaMs);

        pendingSeekPositionMs = targetTime;
        currentTime.setText(formatTime(targetTime));
        seekBar.setProgress((int) targetTime);
    }

    private long clampSeekPosition(long valueMs) {
        long durationMs = mediaDurationMs > 0L ? mediaDurationMs : (seekBar != null ? seekBar.getMax() : 0L);
        long safeValueMs = Math.max(0L, valueMs);
        if (durationMs > 0L) {
            safeValueMs = Math.min(safeValueMs, durationMs);
        }
        return safeValueMs;
    }

    private void applySeekBarPreviewState() {
        if (seekBar == null) {
            return;
        }
        seekBar.setActivated(isSeekBarArmed);
        seekBar.setAlpha(isSeekBarArmed ? 1f : 0.92f);
        seekBar.setScaleY(isSeekBarArmed ? 1.18f : 1f);
    }

    private boolean isViewInside(View child, View parent) {
        if (child == null || parent == null) return false;
        View current = child;
        while (current != null) {
            if (current == parent) return true;
            if (!(current.getParent() instanceof View)) break;
            current = (View) current.getParent();
        }
        return false;
    }

    private boolean isControlsFocused() {
        View focused = getCurrentFocus();
        return isViewInside(focused, controlsContainer) || isViewInside(focused, topControlsContainer);
    }

    private boolean isSeekBarFocused() {
        View focused = getCurrentFocus();
        return focused == seekBar;
    }

    private void changeChannelByStep(int delta) {
        if (!isLiveTV || channelUrls == null || channelUrls.isEmpty()) return;
        int count = channelUrls.size();
        currentChannelSelection = (currentChannelSelection + delta) % count;
        if (currentChannelSelection < 0) currentChannelSelection += count;

        String nextUrl = channelUrls.get(currentChannelSelection);
        String nextName = (channelNames != null && currentChannelSelection < channelNames.size())
            ? channelNames.get(currentChannelSelection)
            : "Canal";
        switchChannel(nextUrl, nextName);
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

    private void cyclePlaybackSpeed() {
        if (mediaPlayer == null) return;

        // Crear diálogo para seleccionar velocidad
        String[] speedLabels = new String[playbackSpeeds.length];
        for (int i = 0; i < playbackSpeeds.length; i++) {
            float speed = playbackSpeeds[i];
            if (speed == 1.0f) {
                speedLabels[i] = "1x (Normal)";
            } else if (speed == 0.5f) {
                speedLabels[i] = "0.5x (Lento)";
            } else if (speed == 0.75f) {
                speedLabels[i] = "0.75x";
            } else if (speed == 1.5f) {
                speedLabels[i] = "1.5x";
            } else if (speed == 1.75f) {
                speedLabels[i] = "1.75x";
            } else if (speed == 1.25f) {
                speedLabels[i] = "1.25x";
            } else if (speed == 2.0f) {
                speedLabels[i] = "2x (Rápido)";
            } else {
                speedLabels[i] = String.format("%.2fx", speed);
            }
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Velocidad de Reproducción");
        builder.setSingleChoiceItems(speedLabels, currentSpeedIndex, (dialog, which) -> {
            currentSpeedIndex = which;
            float speed = playbackSpeeds[which];
            mediaPlayer.setRate(speed);

            String speedText = speedLabels[which];
            Toast.makeText(VLCPlayerActivity.this, "Velocidad: " + speedText, Toast.LENGTH_SHORT).show();
            Log.d(TAG, "Playback speed changed to: " + speedText);

            dialog.dismiss();
            hideControls();
        });
        builder.show();
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
                String selectedTitle = (chapterTitles != null && which < chapterTitles.size())
                        ? chapterTitles.get(which)
                        : null;
                requestEpisodeSwitch(chapterUrls.get(which), selectedTitle);
            }
        });
        builder.show();
    }

    // ← NUEVO: Diálogo para seleccionar canales en vivo con soporte TV
    private int currentChannelSelection = 0;
    private AlertDialog currentChannelDialog = null;

    private void showLiveChannelsDialog() {
        if (channelNames == null || channelUrls == null || channelNames.isEmpty() || channelUrls.isEmpty()) {
            Toast.makeText(this, "No hay canales disponibles", Toast.LENGTH_SHORT).show();
            return;
        }

        Log.d(TAG, "showLiveChannelsDialog: Mostrando " + channelNames.size() + " canales");
        int channelCount = Math.min(channelNames.size(), channelUrls.size());
        int currentIndex = channelUrls.indexOf(currentVideoUrl);
        currentChannelSelection = currentIndex >= 0 ? currentIndex : Math.min(currentChannelSelection, channelCount - 1);

        LinearLayout contentLayout = new LinearLayout(this);
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        int paddingPx = (int) (20 * getResources().getDisplayMetrics().density);
        contentLayout.setPadding(paddingPx, paddingPx / 2, paddingPx, 0);

        EditText searchInput = new EditText(this);
        searchInput.setSingleLine(true);
        searchInput.setHint("Buscar canal...");
        searchInput.setTextColor(getColor(android.R.color.white));
        searchInput.setHintTextColor(0xFFB0B0B0);
        searchInput.setFocusable(true);
        searchInput.setFocusableInTouchMode(true);
        contentLayout.addView(searchInput, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        ListView listView = new ListView(this);
        listView.setChoiceMode(ListView.CHOICE_MODE_SINGLE);
        int listHeightPx = (int) (360 * getResources().getDisplayMetrics().density);
        contentLayout.addView(listView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                listHeightPx
        ));

        ArrayList<Integer> visibleChannelIndices = new ArrayList<>();
        ArrayAdapter<String> channelAdapter = new ArrayAdapter<>(
                this,
                android.R.layout.simple_list_item_single_choice,
                new ArrayList<>()
        );
        listView.setAdapter(channelAdapter);
        applyChannelFilter("", visibleChannelIndices, channelAdapter, channelCount);

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Selecciona un Canal");
        builder.setView(contentLayout);

        builder.setPositiveButton("OK", (dialog, which) -> {
            updateCurrentChannelSelectionFromVisibleList(visibleChannelIndices, listView);
            confirmChannelSelection(dialog);
        });

        builder.setNegativeButton("Cancelar", (dialog, which) -> {
            dialog.dismiss();
            currentChannelDialog = null;
        });

        AlertDialog dialogInstance = builder.create();
        dialogInstance.setOnKeyListener((dialog, keyCode, event) -> {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                View currentFocus = dialogInstance.getCurrentFocus();
                boolean searchInputFocused = searchInput.hasFocus() || currentFocus == searchInput;
                switch (keyCode) {
                    case KeyEvent.KEYCODE_DPAD_CENTER:
                    case KeyEvent.KEYCODE_ENTER:
                    case KeyEvent.KEYCODE_NUMPAD_ENTER:
                        if (searchInputFocused) {
                            showChannelSearchKeyboard(searchInput);
                            return true;
                        }
                        updateCurrentChannelSelectionFromVisibleList(visibleChannelIndices, listView);
                        confirmChannelSelection(dialog);
                        return true;
                    case KeyEvent.KEYCODE_BACK:
                        dialog.dismiss();
                        currentChannelDialog = null;
                        return true;
                    default:
                        return false;
                }
            }
            return false;
        });

        dialogInstance.setOnShowListener(dialog -> {
            currentChannelDialog = dialogInstance;
            int visibleSelection = Math.max(0, visibleChannelIndices.indexOf(currentChannelSelection));
            listView.setItemChecked(visibleSelection, true);
            listView.setSelection(visibleSelection);
            listView.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
                @Override
                public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                    if (position >= 0 && position < visibleChannelIndices.size()) {
                        currentChannelSelection = visibleChannelIndices.get(position);
                    }
                }

                @Override
                public void onNothingSelected(AdapterView<?> parent) {
                }
            });
            listView.setOnItemClickListener((parent, view, position, id) -> {
                if (position >= 0 && position < visibleChannelIndices.size()) {
                    currentChannelSelection = visibleChannelIndices.get(position);
                    confirmChannelSelection(dialogInstance);
                }
            });
            searchInput.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {
                }

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    applyChannelFilter(s != null ? s.toString() : "", visibleChannelIndices, channelAdapter, channelCount);
                    int nextSelection = visibleChannelIndices.indexOf(currentChannelSelection);
                    if (nextSelection < 0) {
                        nextSelection = visibleChannelIndices.isEmpty() ? -1 : 0;
                        if (nextSelection >= 0) {
                            currentChannelSelection = visibleChannelIndices.get(nextSelection);
                        }
                    }
                    if (nextSelection >= 0) {
                        listView.setItemChecked(nextSelection, true);
                        listView.setSelection(nextSelection);
                    }
                }

                @Override
                public void afterTextChanged(Editable s) {
                }
            });
            searchInput.setOnClickListener(v -> showChannelSearchKeyboard(searchInput));
            searchInput.setOnFocusChangeListener((v, hasFocus) -> {
                if (hasFocus) {
                    showChannelSearchKeyboard(searchInput);
                }
            });
            searchInput.setOnKeyListener((v, keyCode, event) -> {
                if (event.getAction() != KeyEvent.ACTION_DOWN) {
                    return false;
                }

                if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
                    if (visibleChannelIndices.isEmpty()) {
                        return true;
                    }

                    int nextSelection = Math.max(0, visibleChannelIndices.indexOf(currentChannelSelection));
                    if (nextSelection < 0) {
                        nextSelection = 0;
                    }
                    listView.requestFocus();
                    listView.setItemChecked(nextSelection, true);
                    listView.setSelection(nextSelection);
                    return true;
                }

                if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                        || keyCode == KeyEvent.KEYCODE_ENTER
                        || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
                    showChannelSearchKeyboard(searchInput);
                    return true;
                }

                return false;
            });
            listView.requestFocus();
        });
        dialogInstance.setOnDismissListener(dialog -> currentChannelDialog = null);

        currentChannelDialog = dialogInstance;
        dialogInstance.show();
    }

    private void showChannelSearchKeyboard(EditText searchInput) {
        if (searchInput == null) {
            return;
        }

        searchInput.requestFocus();
        searchInput.post(() -> {
            try {
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(searchInput, InputMethodManager.SHOW_IMPLICIT);
                }
            } catch (Exception error) {
                Log.w(TAG, "No se pudo abrir teclado de busqueda de canales", error);
            }
        });
    }

    private String normalizeChannelSearchValue(String value) {
        if (value == null) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        return normalized.toLowerCase(Locale.ROOT).trim();
    }

    private void applyChannelFilter(String query, ArrayList<Integer> visibleChannelIndices, ArrayAdapter<String> adapter, int channelCount) {
        visibleChannelIndices.clear();
        adapter.clear();

        String normalizedQuery = normalizeChannelSearchValue(query);
        for (int i = 0; i < channelCount; i++) {
            String channelName = channelNames.get(i);
            String normalizedChannelName = normalizeChannelSearchValue(channelName);
            if (!normalizedQuery.isEmpty() && !normalizedChannelName.contains(normalizedQuery)) {
                continue;
            }
            visibleChannelIndices.add(i);
            adapter.add(i == currentChannelSelection ? channelName + "  - Actual" : channelName);
        }
        adapter.notifyDataSetChanged();
    }

    private void updateCurrentChannelSelectionFromVisibleList(ArrayList<Integer> visibleChannelIndices, ListView listView) {
        if (visibleChannelIndices == null || listView == null || visibleChannelIndices.isEmpty()) {
            return;
        }

        int selectedPosition = listView.getSelectedItemPosition();
        int checkedPosition = listView.getCheckedItemPosition();
        int visiblePosition = selectedPosition >= 0 ? selectedPosition : checkedPosition;
        if (visiblePosition >= 0 && visiblePosition < visibleChannelIndices.size()) {
            currentChannelSelection = visibleChannelIndices.get(visiblePosition);
            listView.setItemChecked(visiblePosition, true);
        }
    }

    private void confirmChannelSelection(DialogInterface dialog) {
        int channelCount = Math.min(channelNames.size(), channelUrls.size());
        if (currentChannelSelection >= 0 && currentChannelSelection < channelCount) {
            String selectedChannel = channelNames.get(currentChannelSelection);
            String selectedUrl = channelUrls.get(currentChannelSelection);
            Log.d(TAG, "Canal confirmado: " + selectedChannel + " - URL: " + selectedUrl);
            switchChannel(selectedUrl, selectedChannel);
        }

        dialog.dismiss();
        currentChannelDialog = null;
    }

    // ← NUEVO: Cambiar de canal en vivo
    private void switchChannel(String newChannelUrl, String newChannelName) {
        Log.d(TAG, "switchChannel: Cambiando a canal: " + newChannelName + " - URL: " + newChannelUrl);

        try {
            // Actualizar título del video
            videoTitle.setText(newChannelName);
            currentVideoUrl = newChannelUrl;

            // Detener reproducción actual
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                mediaPlayer.stop();
                Log.d(TAG, "switchChannel: Reproducción anterior detenida");
            }

            // Esperar un poco para asegurar que se detuvo
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                try {
                    if (libVlc == null) {
                        libVlc = VLCInstance.getInstance(getApplicationContext());
                    }

                    // Crear nueva media
                    Media media = new Media(libVlc, android.net.Uri.parse(newChannelUrl));
                    media.setHWDecoderEnabled(true, false);
                    media.addOption(":network-caching=1500");
                    media.addOption(":http-user-agent=VLC/3.0.0 (Linux; Android 9)");

                    mediaPlayer.setMedia(media);
                    media.release();

                    // Reproducir nuevo canal
                    mediaPlayer.play();
                    Log.d(TAG, "switchChannel: Nuevo canal iniciado");

                    // Mostrar toast con el canal seleccionado
                    Toast.makeText(VLCPlayerActivity.this, "Sintonizando: " + newChannelName, Toast.LENGTH_SHORT).show();

                } catch (Exception e) {
                    Log.e(TAG, "Error al cambiar el canal: " + e.getMessage(), e);
                    Toast.makeText(VLCPlayerActivity.this, "Error al cambiar de canal", Toast.LENGTH_SHORT).show();
                }
            }, 300);

        } catch (Exception e) {
            Log.e(TAG, "Error en switchChannel: " + e.getMessage(), e);
            Toast.makeText(this, "Error al cambiar de canal", Toast.LENGTH_SHORT).show();
        }
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

            IMedia media = mediaPlayer.getMedia();
            for (MediaPlayer.TrackDescription track : audioTracks) {
                if (track.id == -1) continue;
                String trackName = track.name;
                IMedia.AudioTrack audioTrackInfo = findAudioTrackInfo(media, track.id);
                String trackDetails = formatAudioTrackDetails(audioTrackInfo);
                if (!trackDetails.isEmpty()) {
                    trackName += " • " + trackDetails;
                }
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

    private long lastDoubleTapTime = 0;
    private float lastTapX = 0;
    private float lastTapY = 0;
    private static final long DOUBLE_TAP_TIMEOUT = 500; // ms (aumentado a 500 para mejor detección)
    private static final float DOUBLE_TAP_SLOP = 150; // píxeles de tolerancia

    // Long Press Lock/Unlock
    private long pressStartTime = 0;
    private float pressStartX = 0;
    private float pressStartY = 0;
    private static final long LONG_PRESS_DURATION = 1500; // 1.5 segundos para desbloquear
    private static final float LONG_PRESS_SLOP = 50; // tolerancia de movimiento (píxeles)
    private Handler longPressHandler = new Handler(Looper.getMainLooper());
    private Runnable longPressRunnable = null;

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        // Si la pantalla está bloqueada, detectar long press para desbloquear
        if (isScreenLocked) {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    // Inicio de presión
                    pressStartTime = System.currentTimeMillis();
                    pressStartX = event.getX();
                    pressStartY = event.getY();

                    // Mostrar barra de progreso
                    unlockProgressBar.setVisibility(View.VISIBLE);
                    unlockProgressBar.setProgress(0);

                    // Cancelar cualquier long press anterior
                    if (longPressRunnable != null) {
                        longPressHandler.removeCallbacks(longPressRunnable);
                    }

                    // Actualizar progreso cada 50ms
                    updateUnlockProgress();

                    // Configurar el callback para long press (3 segundos)
                    longPressRunnable = () -> {
                        toggleScreenLock();
                        unlockProgressBar.setVisibility(View.GONE);
                        longPressRunnable = null;
                        Toast.makeText(this, "🔓 Pantalla desbloqueada", Toast.LENGTH_SHORT).show();
                    };
                    longPressHandler.postDelayed(longPressRunnable, LONG_PRESS_DURATION);
                    return true;

                case MotionEvent.ACTION_MOVE:
                    // Si se mueve demasiado, cancelar el long press
                    if (Math.abs(event.getX() - pressStartX) > LONG_PRESS_SLOP ||
                        Math.abs(event.getY() - pressStartY) > LONG_PRESS_SLOP) {
                        if (longPressRunnable != null) {
                            longPressHandler.removeCallbacks(longPressRunnable);
                            longPressRunnable = null;
                        }
                        unlockProgressBar.setVisibility(View.GONE);
                    } else {
                        // Actualizar progreso
                        updateUnlockProgress();
                    }
                    return true;

                case MotionEvent.ACTION_UP:
                    // Cancelar el long press si se suelta antes de 3 segundos
                    if (longPressRunnable != null) {
                        longPressHandler.removeCallbacks(longPressRunnable);
                        longPressRunnable = null;
                    }
                    pressStartTime = 0;
                    unlockProgressBar.setVisibility(View.GONE);
                    return true;
            }
            return true; // Consumir evento cuando está bloqueado
        }

        // Manejo de doble tap para +15/-15 segundos (cuando NO está bloqueado)
        if (event.getAction() == MotionEvent.ACTION_DOWN) {
            long currentTime = System.currentTimeMillis();
            float currentX = event.getX();
            float currentY = event.getY();

            // Verificar si es doble tap
            if (currentTime - lastDoubleTapTime < DOUBLE_TAP_TIMEOUT &&
                Math.abs(currentX - lastTapX) < DOUBLE_TAP_SLOP &&
                Math.abs(currentY - lastTapY) < DOUBLE_TAP_SLOP &&
                mediaPlayer != null && mediaPlayer.isPlaying()) {

                // Es doble tap - avanzar/retroceder
                if (currentX < getWindow().getDecorView().getWidth() / 2) {
                    // Lado izquierdo: retroceder 15 segundos
                    long newTime = Math.max(0, mediaPlayer.getTime() - 15000);
                    mediaPlayer.setTime(newTime);
                    Toast.makeText(this, "⏪ -15s", Toast.LENGTH_SHORT).show();
                    Log.d(TAG, "Double tap left: rewind 15s");
                } else {
                    // Lado derecho: avanzar 15 segundos
                    long newTime = mediaPlayer.getTime() + 15000;
                    mediaPlayer.setTime(newTime);
                    Toast.makeText(this, "⏩ +15s", Toast.LENGTH_SHORT).show();
                    Log.d(TAG, "Double tap right: forward 15s");
                }
                lastDoubleTapTime = 0;
                return true;
            }

            // Actualizar último tap
            lastDoubleTapTime = currentTime;
            lastTapX = currentX;
            lastTapY = currentY;
        }

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
        // Single tap: mostrar/ocultar controles
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
                Log.d(TAG, "Brightness gesture: " + (newBrightness * 100) + "%");
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
                Log.d(TAG, "Volume gesture: " + newVolume + "/" + maxVolume);
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

    private void registerControlReceiver() {
        controlReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("VIDEO_PLAYER_CONTROL".equals(intent.getAction())) {
                    String action = intent.getStringExtra("action");
                    Log.d(TAG, "Received control action: " + action);
                    if (mediaPlayer != null) {
                        switch (action) {
                            case "play":
                                mediaPlayer.play();
                                break;
                            case "pause":
                                mediaPlayer.pause();
                                break;
                            case "stop":
                                Log.d(TAG, "Stop command received - finishing activity");
                                isActivityClosing = true;
                                recoveryHandler.removeCallbacksAndMessages(null);
                                closeReason = "stop_command";
                                mediaPlayer.stop();
                                finish(); // Cerrar la actividad cuando se recibe stop
                                break;
                            case "seek":
                                long position = intent.getLongExtra("position", -1);
                                if (position >= 0) {
                                    mediaPlayer.setTime(position);
                                }
                                break;
                        }
                    }
                }
            }
        };
        IntentFilter filter = new IntentFilter("VIDEO_PLAYER_CONTROL");
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(controlReceiver, filter, RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(controlReceiver, filter);
        }
    }

    private void registerFinishReceiver() {
        finishReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if ("FINISH_VLC_ACTIVITY".equals(action) || "FORCE_FINISH_VLC_ACTIVITY".equals(action)) {
                    Log.d(TAG, "Received finish broadcast: " + action + " - closing activity");
                    isActivityClosing = true;
                    recoveryHandler.removeCallbacksAndMessages(null);
                    closeReason = "FORCE_FINISH_VLC_ACTIVITY".equals(action) ? "force_finish_broadcast" : "finish_broadcast";
                    // Guardar progreso antes de cerrar
                    if (mediaPlayer != null) {
                        notifyProgressUpdate(mediaPlayer.getTime(), false, true);
                    }
                    // Cerrar la actividad
                    finish();
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction("FINISH_VLC_ACTIVITY");
        filter.addAction("FORCE_FINISH_VLC_ACTIVITY");
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(finishReceiver, filter, RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(finishReceiver, filter);
        }
        Log.d(TAG, "Finish receiver registered");
    }

    private void registerLiveChannelsReceiver() {
        if (liveChannelsReceiver != null) return;

        liveChannelsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!"UPDATE_LIVE_CHANNELS".equals(intent.getAction())) return;

                ArrayList<String> nextNames = intent.getStringArrayListExtra("channel_names");
                ArrayList<String> nextLogos = intent.getStringArrayListExtra("channel_logos");
                ArrayList<String> nextUrls = intent.getStringArrayListExtra("channel_urls");

                if (nextNames == null || nextUrls == null || nextNames.isEmpty() || nextUrls.isEmpty()) {
                    Log.w(TAG, "Ignoring live channel update without valid channels");
                    return;
                }

                channelNames = nextNames;
                channelLogos = nextLogos != null ? nextLogos : new ArrayList<>();
                channelUrls = nextUrls;
                isLiveTV = true;
                currentChannelSelection = channelUrls.indexOf(currentVideoUrl);
                if (currentChannelSelection < 0) currentChannelSelection = 0;
                setupControls();
                Log.d(TAG, "Live channels updated: " + channelNames.size());
            }
        };

        IntentFilter filter = new IntentFilter("UPDATE_LIVE_CHANNELS");
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(liveChannelsReceiver, filter, RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(liveChannelsReceiver, filter);
        }
    }

    private void unregisterControlReceiver() {
        if (controlReceiver != null) {
            unregisterReceiver(controlReceiver);
            controlReceiver = null;
        }
    }

    private void unregisterFinishReceiver() {
        if (finishReceiver != null) {
            try {
                unregisterReceiver(finishReceiver);
                finishReceiver = null;
                Log.d(TAG, "Finish receiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering finish receiver", e);
            }
        }
    }

    private void unregisterLiveChannelsReceiver() {
        if (liveChannelsReceiver != null) {
            try {
                unregisterReceiver(liveChannelsReceiver);
                liveChannelsReceiver = null;
                Log.d(TAG, "Live channels receiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering live channels receiver", e);
            }
        }
    }

    // Actualizar barra de progreso de desbloqueo
    private void updateUnlockProgress() {
        if (pressStartTime == 0) return;

        long elapsedTime = System.currentTimeMillis() - pressStartTime;
        int progress = (int) ((elapsedTime * 100) / LONG_PRESS_DURATION);
        progress = Math.min(progress, 100); // Máximo 100%

        unlockProgressBar.setProgress(progress);
    }

    public void enterPictureInPictureMode() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                Rational aspectRatio = new Rational(16, 9);
                builder.setAspectRatio(aspectRatio);
                enterPictureInPictureMode(builder.build());
            } catch (Exception e) {
                Log.e(TAG, "Error entering Picture-in-Picture mode", e);
            }
        }
    }
}
