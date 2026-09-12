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
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.LruCache;
import android.util.Rational;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.inputmethod.InputMethodManager;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import android.util.Log;
import android.view.GestureDetector;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
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
import org.videolan.libvlc.util.VLCVideoLayout;

import java.util.ArrayList;

public class VLCPlayerActivity extends AppCompatActivity implements GestureDetector.OnGestureListener {

    private static final String TAG = "VLCPlayerActivity";
    private static final long SESSION_VALIDATE_INTERVAL_MS = 20000L;

    // Player components
    private LibVLC libVlc;
    private MediaPlayer mediaPlayer;
    private VLCVideoLayout videoLayout;

    // UI Controls
    private SeekBar seekBar;
    private TextView currentTime, totalDuration, videoTitle;
    private ImageButton playPauseButton, rewindButton, forwardButton, tracksButton, channelsButton, aspectRatioButton;
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
    private int currentSeasonIndex = -1;
    private int currentChapterIndex = -1;
    private boolean hasStartedPlayback = false;
    private int autoPlayCount = 0;

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
    private ArrayList<String> channelNumbers;
    private ArrayList<String> channelEpgs;
    private boolean isLiveTV = false;

    // Drawer OSD
    private View channelDrawerBackdrop;
    private LinearLayout channelDrawerContainer;
    private TextView drawerHeaderTitle, drawerHeaderTime, drawerFooterHint;
    private EditText drawerSearchInput;
    private ListView drawerChannelList;
    private ImageButton railTabSearch, railTabHistory, railTabFavorites, railTabChannels;
    private ChannelDrawerAdapter channelDrawerAdapter;
    private final ArrayList<Integer> visibleChannelIndices = new ArrayList<>();
    private final ArrayList<String> recentChannelNames = new ArrayList<>();
    private String currentRailTab = "channels";
    private SharedPreferences favoritesPrefs;
    private Set<String> favoriteChannelsSet = new HashSet<>();

    // Sub-panel Programación EPG del Canal
    private View drawerChannelsView, drawerScheduleView;
    private ImageButton scheduleBtnBack;
    private TextView scheduleChannelTitle, scheduleEmptyText;
    private ProgressBar scheduleProgress;
    private ListView scheduleProgramList;
    private ScheduleProgramAdapter scheduleProgramAdapter;
    private final ArrayList<ProgramScheduleItem> scheduleItems = new ArrayList<>();

    private static class ProgramScheduleItem {
        String title;
        String desc;
        String timeStr;
        boolean isLive;
        boolean hasReminder;

        ProgramScheduleItem(String title, String desc, String timeStr, boolean isLive) {
            this.title = title;
            this.desc = desc;
            this.timeStr = timeStr;
            this.isLive = isLive;
            this.hasReminder = false;
        }
    }

    // High-performance Logo Cache & Background Pool (Zero-Lag)
    private static LruCache<String, Bitmap> sLogoCache;
    private static final ExecutorService sLogoExecutor = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "TeamG-LogoLoader");
        t.setPriority(Thread.MIN_PRIORITY);
        return t;
    });

    private static final int MAX_AUTO_RECOVERY_ATTEMPTS = 6;
    private static final long RECOVERY_BASE_DELAY_MS = 2500L;
    private static final long STALL_TIMEOUT_MS = 20000L;
    private static final long STALL_CHECK_INTERVAL_MS = 5000L;

    private boolean isActivityClosing = false;
    private boolean isRecoveringPlayback = false;
    private boolean forceAudioRecoveryPending = false;
    private boolean hasSentPlayerClosedEvent = false;
    private boolean sessionValidationInFlight = false;
    private String closeReason = "unknown";
    private String playbackSessionId = "";
    private String sessionToken = "";
    private String deviceId = "";
    private String apiBaseUrl = "";
    private int recoveryAttempts = 0;
    private long lastTimeChangedSystemMs = 0L;
    private long lastPlaybackPositionMs = 0L;
    private final Handler recoveryHandler = new Handler(Looper.getMainLooper());
    private final Handler sessionValidationHandler = new Handler(Looper.getMainLooper());
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
    private final Runnable sessionValidationRunnable = new Runnable() {
        @Override
        public void run() {
            queueSessionValidation();
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

        View backButton = findViewById(R.id.back_button);
        if (backButton != null) {
            backButton.setOnClickListener(v -> onBackPressed());
        }

        // Drawer OSD Views
        channelDrawerBackdrop = findViewById(R.id.channel_drawer_backdrop);
        channelDrawerContainer = findViewById(R.id.channel_drawer_container);
        drawerHeaderTitle = findViewById(R.id.drawer_header_title);
        drawerHeaderTime = findViewById(R.id.drawer_header_time);
        drawerSearchInput = findViewById(R.id.drawer_search_input);
        drawerChannelList = findViewById(R.id.drawer_channel_list);
        drawerFooterHint = findViewById(R.id.drawer_footer_hint);
        railTabSearch = findViewById(R.id.rail_tab_search);
        railTabHistory = findViewById(R.id.rail_tab_history);
        railTabFavorites = findViewById(R.id.rail_tab_favorites);
        railTabChannels = findViewById(R.id.rail_tab_channels);

        drawerChannelsView = findViewById(R.id.drawer_channels_view);
        drawerScheduleView = findViewById(R.id.drawer_schedule_view);
        scheduleBtnBack = findViewById(R.id.schedule_btn_back);
        scheduleChannelTitle = findViewById(R.id.schedule_channel_title);
        scheduleEmptyText = findViewById(R.id.schedule_empty_text);
        scheduleProgress = findViewById(R.id.schedule_progress);
        scheduleProgramList = findViewById(R.id.schedule_program_list);
        if (scheduleBtnBack != null) {
            scheduleBtnBack.setOnClickListener(v -> closeChannelScheduleView());
        }
        if (scheduleProgramList != null) {
            scheduleProgramAdapter = new ScheduleProgramAdapter();
            scheduleProgramList.setAdapter(scheduleProgramAdapter);
        }

        currentVideoUrl = getIntent().getStringExtra("video_url");
        String videoTitleText = getIntent().getStringExtra("video_title");
        playbackSessionId = getIntent().getStringExtra("playback_session_id");
        if (playbackSessionId == null) playbackSessionId = "";
        lastPosition = getIntent().getLongExtra("start_time", 0L);
        sessionToken = getIntent().getStringExtra("session_token");
        deviceId = getIntent().getStringExtra("device_id");
        apiBaseUrl = getIntent().getStringExtra("api_base_url");
        currentSeasonIndex = getIntent().getIntExtra("season_index", -1);
        currentChapterIndex = getIntent().getIntExtra("chapter_index", -1);
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
        channelNumbers = getIntent().getStringArrayListExtra("channel_numbers");
        channelEpgs = getIntent().getStringArrayListExtra("channel_epgs");
        isLiveTV = getIntent().getBooleanExtra("is_live_tv", false);

        setupDrawerControls();

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
        channelNumbers = intent.getStringArrayListExtra("channel_numbers");
        channelEpgs = intent.getStringArrayListExtra("channel_epgs");
        isLiveTV = intent.getBooleanExtra("is_live_tv", false);
        applyDrawerFilter();
        playbackSessionId = intent.getStringExtra("playback_session_id");
        if (playbackSessionId == null) playbackSessionId = "";
        sessionToken = intent.getStringExtra("session_token");
        deviceId = intent.getStringExtra("device_id");
        apiBaseUrl = intent.getStringExtra("api_base_url");
        currentSeasonIndex = intent.getIntExtra("season_index", -1);
        currentChapterIndex = intent.getIntExtra("chapter_index", -1);

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
        if (mediaPlayer == null) {
            initializePlayer();
        } else {
            setupControls();
        }
        registerControlReceiver();
        registerFinishReceiver();
        registerLiveChannelsReceiver();
        queueSessionValidation();
    }

    @Override
    public void onUserLeaveHint() {
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            enterPictureInPictureMode();
        }
    }

    @Override
    public void onBackPressed() {
        if (channelDrawerContainer != null && channelDrawerContainer.getVisibility() == View.VISIBLE) {
            if (drawerScheduleView != null && drawerScheduleView.getVisibility() == View.VISIBLE) {
                closeChannelScheduleView();
                return;
            }
            hideLiveChannelsDrawer();
            return;
        }
        closeReason = "user_back";
        super.onBackPressed();
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        if (inPip) {
            controlsContainer.setVisibility(View.GONE);
            queueSessionValidation();
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
        } else {
            queueSessionValidation();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        isActivityClosing = true;
        recoveryHandler.removeCallbacksAndMessages(null);
        stopSessionValidation();
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
        hasStartedPlayback = false;
        autoPlayCount = 0;
        lastTimeChangedSystemMs = System.currentTimeMillis();
        recoveryHandler.removeCallbacks(stallWatchdogRunnable);

        libVlc = VLCInstance.getInstance(getApplicationContext());
        mediaPlayer = new MediaPlayer(libVlc);
        mediaPlayer.attachViews(videoLayout, null, false, false);
        mediaPlayer.setAspectRatio(null);
        mediaPlayer.setScale(MediaPlayer.ScaleType.SURFACE_FIT_SCREEN.ordinal());

        currentAspectRatioIndex = 0;

        setupPlayerEvents();
        setupControls();
        updateVideoTitleWithChapterInfo();

        Media media = buildMediaForCurrentUrl();
        mediaPlayer.setMedia(media);
        media.release();

        mediaPlayer.play();
        recoveryHandler.postDelayed(stallWatchdogRunnable, STALL_CHECK_INTERVAL_MS);
    }

    private Media buildMediaForCurrentUrl() {
        Media media = new Media(libVlc, Uri.parse(currentVideoUrl));
        media.setHWDecoderEnabled(true, false);
        media.addOption(":network-caching=200");
        media.addOption(":live-caching=200");
        media.addOption(":clock-jitter=0");
        media.addOption(":clock-synchro=0");
        media.addOption(":http-user-agent=VLC/3.0.0 (Linux; Android 9)");
        return media;
    }

    private void reconnectCurrentPlayback(boolean preservePosition) {
        if (currentVideoUrl == null) {
            Log.e(TAG, "Cannot reconnect playback without currentVideoUrl");
            return;
        }

        if (libVlc == null) {
            libVlc = VLCInstance.getInstance(getApplicationContext());
        }

        if (mediaPlayer == null) {
            initializePlayer();
            return;
        }

        recoveryHandler.removeCallbacks(stallWatchdogRunnable);
        lastTimeChangedSystemMs = System.currentTimeMillis();

        if (!preservePosition || isLiveTV) {
            lastPosition = 0L;
            lastPlaybackPositionMs = 0L;
            isSeekPending = false;
        }

        try {
            mediaPlayer.stop();
        } catch (Exception stopError) {
            Log.w(TAG, "Failed to stop current media before reconnect", stopError);
        }

        Media media = buildMediaForCurrentUrl();
        mediaPlayer.setMedia(media);
        media.release();

        updateVideoTitleWithChapterInfo();
        mediaPlayer.play();
        recoveryHandler.postDelayed(stallWatchdogRunnable, STALL_CHECK_INTERVAL_MS);
    }

    private void releasePlayer() {
        recoveryHandler.removeCallbacks(stallWatchdogRunnable);
        stopSessionValidation();
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

    private void scheduleSessionValidation() {
        if (!SessionValidationHelper.hasSessionContext(apiBaseUrl, sessionToken, deviceId)) {
            return;
        }

        sessionValidationHandler.removeCallbacks(sessionValidationRunnable);
        sessionValidationHandler.postDelayed(sessionValidationRunnable, SESSION_VALIDATE_INTERVAL_MS);
    }

    private void stopSessionValidation() {
        sessionValidationHandler.removeCallbacks(sessionValidationRunnable);
    }

    private void queueSessionValidation() {
        if (isActivityClosing || isFinishing() || sessionValidationInFlight) {
            return;
        }

        if (!SessionValidationHelper.hasSessionContext(apiBaseUrl, sessionToken, deviceId)) {
            return;
        }

        sessionValidationInFlight = true;
        new Thread(() -> {
            SessionValidationHelper.ValidationResult result =
                SessionValidationHelper.validate(apiBaseUrl, sessionToken, deviceId);

            runOnUiThread(() -> {
                sessionValidationInFlight = false;
                if (isActivityClosing || isFinishing()) {
                    return;
                }

                if (result == SessionValidationHelper.ValidationResult.INVALID) {
                    handleSessionRevoked();
                    return;
                }

                scheduleSessionValidation();
            });
        }).start();
    }

    private void handleSessionRevoked() {
        Log.w(TAG, "Sesion revocada. Cerrando VLC nativo.");
        isActivityClosing = true;
        closeReason = "session_revoked";
        recoveryHandler.removeCallbacksAndMessages(null);
        stopSessionValidation();

        try {
            if (mediaPlayer != null) {
                notifyProgressUpdate(mediaPlayer.getTime(), false, true);
                mediaPlayer.stop();
            }
        } catch (Exception error) {
            Log.w(TAG, "No se pudo detener VLC al revocar la sesion", error);
        }

        Toast.makeText(this, "Tu sesion fue revocada en este dispositivo.", Toast.LENGTH_LONG).show();
        finish();
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
                    hasStartedPlayback = true;
                    playPauseButton.setImageResource(R.drawable.ic_pause);
                    recoveryAttempts = 0;
                    isRecoveringPlayback = false;
                    lastTimeChangedSystemMs = System.currentTimeMillis();
                    if (isSeekPending && !isLiveTV) {
                        final long targetPos = lastPosition * 1000;
                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            try {
                                if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                                    long currentPos = mediaPlayer.getTime();
                                    if (currentPos < targetPos - 2000) {
                                        mediaPlayer.setTime(targetPos);
                                        Log.d(TAG, "Seek executed via playing delay to: " + targetPos + "ms (current position was " + currentPos + "ms)");
                                    }
                                }
                            } catch (Exception e) {
                                Log.e(TAG, "Error executing seek on delayed handler", e);
                            }
                        }, 500);
                    } else if (isLiveTV) {
                        isSeekPending = false;
                        lastPosition = 0L;
                    }
                    if (forceAudioRecoveryPending) {
                        recoveryHandler.postDelayed(() -> restoreAudioOutputAfterRecovery(), 350L);
                    }
                    hideControls();
                    break;
                case MediaPlayer.Event.Paused:
                    playPauseButton.setImageResource(R.drawable.ic_play);
                    // Enviar progreso cuando se pausa (siempre)
                    notifyProgressUpdate(mediaPlayer.getTime(), false, true);
                    if (!hasStartedPlayback && autoPlayCount < 3) {
                        autoPlayCount++;
                        Log.d(TAG, "Force playing from Paused state on start (attempt " + autoPlayCount + ")");
                        mediaPlayer.play();
                    }
                    break;
                case MediaPlayer.Event.Stopped:
                    playPauseButton.setImageResource(R.drawable.ic_play);
                    notifyProgressUpdate(mediaPlayer.getTime(), false, true);
                    break;
                case MediaPlayer.Event.TimeChanged:
                    lastTimeChangedSystemMs = System.currentTimeMillis();
                    lastPlaybackPositionMs = event.getTimeChanged();
                    
                    // One-shot seek on TimeChanged when player starts reporting time and seek is still pending
                    if (isSeekPending && !isLiveTV && lastPosition > 0) {
                        long currentPos = event.getTimeChanged();
                        if (currentPos > 0 && currentPos < lastPosition * 1000 - 2000) {
                            final long targetPos = lastPosition * 1000;
                            mediaPlayer.setTime(targetPos);
                            isSeekPending = false;
                            Log.d(TAG, "Seek executed via TimeChanged event to: " + targetPos + "ms (current position was " + currentPos + "ms)");
                        }
                    }
                    
                    currentTime.setText(formatTime(event.getTimeChanged()));
                    seekBar.setProgress((int) event.getTimeChanged());
                    // Enviar progreso con throttling (cada 10 segundos)
                    long now = System.currentTimeMillis();
                    if (now - lastProgressSent > PROGRESS_THROTTLE_MS) {
                        notifyProgressUpdate(event.getTimeChanged());
                        lastProgressSent = now;
                    }
                    break;
                case MediaPlayer.Event.LengthChanged:
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
        if (!isLiveTV && currentPositionMs > 0) {
            lastPosition = currentPositionMs / 1000L;
            isSeekPending = true;
            notifyProgressUpdate(currentPositionMs);
        } else if (isLiveTV) {
            lastPosition = 0L;
            lastPlaybackPositionMs = 0L;
            isSeekPending = false;
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
                reconnectCurrentPlayback(!isLiveTV);
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
        } catch (Exception audioError) {
            Log.e(TAG, "Failed to restore audio output after recovery", audioError);
        } finally {
            forceAudioRecoveryPending = false;
        }
    }

    private String cleanUrl(String url) {
        if (url == null) return "";
        try {
            // URL Decode in case it's encoded (like in api/resolve?url=...)
            String decoded = java.net.URLDecoder.decode(url, "UTF-8");
            
            // If it contains "url=", extract the url parameter
            if (decoded.contains("url=")) {
                int start = decoded.indexOf("url=") + 4;
                int end = decoded.indexOf("&", start);
                if (end == -1) {
                    decoded = decoded.substring(start);
                } else {
                    decoded = decoded.substring(start, end);
                }
                // Decode again because it was nested
                decoded = java.net.URLDecoder.decode(decoded, "UTF-8");
            }
            
            // Normalize dropbox domains
            decoded = decoded.replace("www.dropbox.com", "dl.dropboxusercontent.com")
                             .replace("dropbox.com", "dl.dropboxusercontent.com");
            
            // Remove query parameters
            int queryIdx = decoded.indexOf("?");
            if (queryIdx >= 0) {
                decoded = decoded.substring(0, queryIdx);
            }
            
            // Remove protocol and domain to get the path
            if (decoded.startsWith("http://")) {
                decoded = decoded.substring(7);
            } else if (decoded.startsWith("https://")) {
                decoded = decoded.substring(8);
            }
            
            int slashIdx = decoded.indexOf("/");
            if (slashIdx >= 0) {
                decoded = decoded.substring(slashIdx); // Keep only the path part e.g. /s/abcde12345/Episode.mp4
            }
            
            return decoded;
        } catch (Exception e) {
            Log.w(TAG, "Error cleaning URL for fuzzy match: " + url, e);
            // Fallback to basic string cleaning
            int qIdx = url.indexOf("?");
            if (qIdx >= 0) {
                return url.substring(0, qIdx);
            }
            return url;
        }
    }

    private int getCurrentChapterGlobalIndex() {
        if (currentVideoUrl == null || chapterUrls == null || chapterUrls.isEmpty()) {
            return -1;
        }

        // 1. Intentar por URL exacta (para contenido no-Dropbox o si coincide)
        int index = chapterUrls.indexOf(currentVideoUrl);
        if (index >= 0) {
            return index;
        }

        // 2. Intentar por coincidencia difusa (fuzzy match) de la ruta limpia de la URL
        String cleanCurrent = cleanUrl(currentVideoUrl);
        if (!cleanCurrent.isEmpty()) {
            for (int i = 0; i < chapterUrls.size(); i++) {
                String cleanChapter = cleanUrl(chapterUrls.get(i));
                if (!cleanChapter.isEmpty() && cleanChapter.equals(cleanCurrent)) {
                    Log.d(TAG, "Fuzzy match found for chapter index " + i + ": " + cleanCurrent);
                    return i;
                }
            }
        }

        // 3. Si no coincide, buscar por indices de temporada/capitulo utilizando las variables de control actualizadas
        int sIndex = (currentSeasonIndex >= 0) ? currentSeasonIndex : getIntent().getIntExtra("season_index", -1);
        int cIndex = (currentChapterIndex >= 0) ? currentChapterIndex : getIntent().getIntExtra("chapter_index", -1);

        if (sIndex >= 0 && cIndex >= 0 && chapterSeasonIndices != null && chapterIndices != null) {
            for (int i = 0; i < chapterSeasonIndices.size() && i < chapterIndices.size(); i++) {
                if (chapterSeasonIndices.get(i) == sIndex && chapterIndices.get(i) == cIndex) {
                    return i;
                }
            }
        }

        return -1;
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
            hasStartedPlayback = false;
            autoPlayCount = 0;

            // Resolve the new indices and update them
            int targetIdx = getCurrentChapterGlobalIndex();
            if (targetIdx >= 0) {
                if (chapterSeasonIndices != null && targetIdx < chapterSeasonIndices.size()) {
                    currentSeasonIndex = chapterSeasonIndices.get(targetIdx);
                    getIntent().putExtra("season_index", currentSeasonIndex);
                }
                if (chapterIndices != null && targetIdx < chapterIndices.size()) {
                    currentChapterIndex = chapterIndices.get(targetIdx);
                    getIntent().putExtra("chapter_index", currentChapterIndex);
                }
            }

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
                media.addOption(":network-caching=200");
                media.addOption(":live-caching=200");
                media.addOption(":clock-jitter=0");
                media.addOption(":clock-synchro=0");
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
        ImageButton backButton = findViewById(R.id.back_button);
        if (backButton != null) {
            backButton.setOnClickListener(v -> {
                closeReason = "user_back_button";
                finish();
            });
        }

        playPauseButton.setOnClickListener(v -> {
            if (mediaPlayer.isPlaying()) mediaPlayer.pause();
            else mediaPlayer.play();
            hideControls();
        });

        rewindButton.setOnClickListener(v -> {
            mediaPlayer.setTime(mediaPlayer.getTime() - 15000);
            hideControls();
        });

        forwardButton.setOnClickListener(v -> {
            mediaPlayer.setTime(mediaPlayer.getTime() + 15000);
            hideControls();
        });

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
                showLiveChannelsDrawer();
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

    private void updateVideoTitleWithChapterInfo() {
        if (chapterUrls == null || chapterUrls.isEmpty()) {
            return;
        }

        int currentIndex = getCurrentChapterGlobalIndex();
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

        int currentIndex = getCurrentChapterGlobalIndex();
        if (currentIndex > 0) {
            String prevTitle = (chapterTitles != null && currentIndex - 1 < chapterTitles.size())
                ? chapterTitles.get(currentIndex - 1)
                : "Episodio " + currentIndex;

            // Actualizar la información en el intent para el cambio del próximo capítulo
            if (chapterSeasonIndices != null && currentIndex - 1 < chapterSeasonIndices.size() &&
                chapterIndices != null && currentIndex - 1 < chapterIndices.size()) {
                getIntent().putExtra("season_index", chapterSeasonIndices.get(currentIndex - 1));
                getIntent().putExtra("chapter_index", chapterIndices.get(currentIndex - 1));
            }

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

        int currentIndex = getCurrentChapterGlobalIndex();
        if (currentIndex >= 0 && currentIndex < chapterUrls.size() - 1) {
            String nextTitle = (chapterTitles != null && currentIndex + 1 < chapterTitles.size())
                ? chapterTitles.get(currentIndex + 1)
                : "Episodio " + (currentIndex + 2);

            // Actualizar la información en el intent para el cambio del próximo capítulo
            if (chapterSeasonIndices != null && currentIndex + 1 < chapterSeasonIndices.size() &&
                chapterIndices != null && currentIndex + 1 < chapterIndices.size()) {
                getIntent().putExtra("season_index", chapterSeasonIndices.get(currentIndex + 1));
                getIntent().putExtra("chapter_index", chapterIndices.get(currentIndex + 1));
            }

            requestEpisodeSwitch(chapterUrls.get(currentIndex + 1), nextTitle);
        } else {
            Toast.makeText(this, "Último episodio", Toast.LENGTH_SHORT).show();
        }
    }

    private void toggleScreenLock() {
        isScreenLocked = !isScreenLocked;

        if (isScreenLocked) {
            lockButton.setImageDrawable(getDrawable(R.drawable.ic_lock));
            controlsContainer.setVisibility(View.GONE);
            topControlsContainer.setVisibility(View.GONE);
            Toast.makeText(this, "Pantalla bloqueada 🔒\nMantén presionado para desbloquear", Toast.LENGTH_SHORT).show();
        } else {
            lockButton.setImageDrawable(getDrawable(R.drawable.ic_unlock));
            controlsContainer.setVisibility(View.VISIBLE);
            topControlsContainer.setVisibility(View.VISIBLE);
            Toast.makeText(this, "Pantalla desbloqueada 🔓", Toast.LENGTH_SHORT).show();
            hideControls();
        }
    }

    private void hideControls() {
        controlsHandler.removeCallbacksAndMessages(null);
        controlsHandler.postDelayed(() -> {
            if (mediaPlayer != null && mediaPlayer.isPlaying() && !isScreenLocked) {
                controlsContainer.setVisibility(View.GONE);
                topControlsContainer.setVisibility(View.GONE);
            }
        }, 3000);
    }

    private void toggleControls() {
        if (isScreenLocked) {
            // Si está bloqueada, no hacer nada para evitar mostrar los controles en toques accidentales
            return;
        }
        if (controlsContainer.getVisibility() == View.VISIBLE) {
            controlsContainer.setVisibility(View.GONE);
            topControlsContainer.setVisibility(View.GONE);
        } else {
            controlsContainer.setVisibility(View.VISIBLE);
            topControlsContainer.setVisibility(View.VISIBLE);
            hideControls();
        }
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

    // =========================================================================
    // HIGH-PERFORMANCE LIVE CHANNELS DRAWER (ZERO-LAG OTT / TIVIMATE STYLE)
    // =========================================================================
    private int currentChannelSelection = 0;

    private void initLogoCache() {
        if (sLogoCache == null) {
            int maxMemory = (int) (Runtime.getRuntime().maxMemory() / 1024);
            int cacheSize = Math.max(1024 * 8, maxMemory / 8);
            sLogoCache = new LruCache<String, Bitmap>(cacheSize) {
                @Override
                protected int sizeOf(String key, Bitmap bitmap) {
                    return bitmap.getByteCount() / 1024;
                }
            };
        }
    }

    private void loadImageAsync(final String urlString, final android.widget.ImageView imageView) {
        if (urlString == null || urlString.trim().isEmpty()) {
            imageView.setImageDrawable(null);
            return;
        }

        initLogoCache();

        // 1. Instant Cache Hit (0ms - zero lag)
        Bitmap cached = sLogoCache.get(urlString);
        if (cached != null) {
            imageView.setImageBitmap(cached);
            return;
        }

        // 2. Cache Miss: prepare placeholder and tag
        imageView.setImageDrawable(null);
        imageView.setTag(urlString);

        // 3. Low-priority background thread with downsampled decode
        sLogoExecutor.submit(() -> {
            try {
                URL url = new URL(urlString);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(2500);
                conn.setReadTimeout(2500);
                conn.setDoInput(true);
                conn.connect();

                InputStream input = conn.getInputStream();
                byte[] data = readStreamFully(input);
                input.close();

                if (data == null || data.length == 0) return;

                BitmapFactory.Options opt = new BitmapFactory.Options();
                opt.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(data, 0, data.length, opt);

                int targetSizePx = (int) (72 * getResources().getDisplayMetrics().density);
                int inSampleSize = 1;
                while ((opt.outWidth / (inSampleSize * 2)) >= targetSizePx &&
                       (opt.outHeight / (inSampleSize * 2)) >= targetSizePx) {
                    inSampleSize *= 2;
                }

                opt.inJustDecodeBounds = false;
                opt.inSampleSize = inSampleSize;
                opt.inPreferredConfig = Bitmap.Config.RGB_565; // 50% memory saving

                final Bitmap bitmap = BitmapFactory.decodeByteArray(data, 0, data.length, opt);
                if (bitmap != null) {
                    sLogoCache.put(urlString, bitmap);
                    imageView.post(() -> {
                        if (urlString.equals(imageView.getTag())) {
                            imageView.setImageBitmap(bitmap);
                        }
                    });
                }
            } catch (Exception ignored) {
            }
        });
    }

    private static byte[] readStreamFully(InputStream is) throws java.io.IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int nRead;
        byte[] data = new byte[4096];
        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        buffer.flush();
        return buffer.toByteArray();
    }

    private void initFavorites() {
        if (favoritesPrefs == null) {
            favoritesPrefs = getSharedPreferences("teamg_channel_favorites", MODE_PRIVATE);
            favoriteChannelsSet = new HashSet<>(favoritesPrefs.getStringSet("favorites", new HashSet<>()));
        }
    }

    private boolean isChannelFavorite(String channelName) {
        if (channelName == null) return false;
        initFavorites();
        return favoriteChannelsSet.contains(channelName);
    }

    private void toggleFavorite(String channelName) {
        if (channelName == null) return;
        initFavorites();
        if (favoriteChannelsSet.contains(channelName)) {
            favoriteChannelsSet.remove(channelName);
        } else {
            favoriteChannelsSet.add(channelName);
        }
        favoritesPrefs.edit().putStringSet("favorites", new HashSet<>(favoriteChannelsSet)).apply();
    }

    private void setupDrawerControls() {
        if (channelDrawerContainer == null) return;

        initFavorites();

        if (channelDrawerBackdrop != null) {
            channelDrawerBackdrop.setOnClickListener(v -> hideLiveChannelsDrawer());
        }

        channelDrawerAdapter = new ChannelDrawerAdapter();
        if (drawerChannelList != null) {
            drawerChannelList.setAdapter(channelDrawerAdapter);
            drawerChannelList.setOnItemClickListener((parent, view, position, id) -> {
                if (position >= 0 && position < visibleChannelIndices.size()) {
                    int channelIndex = visibleChannelIndices.get(position);
                    String selectedName = channelNames.get(channelIndex);
                    String selectedUrl = channelUrls.get(channelIndex);

                    // Si toca el canal que YA está reproduciendo, abrir la programación EPG del canal
                    if (channelIndex == currentChannelSelection || (currentVideoUrl != null && currentVideoUrl.equals(selectedUrl))) {
                        showChannelScheduleView(selectedName, channelIndex);
                        return;
                    }

                    currentChannelSelection = channelIndex;
                    if (!recentChannelNames.contains(selectedName)) {
                        recentChannelNames.add(0, selectedName);
                        if (recentChannelNames.size() > 20) recentChannelNames.remove(recentChannelNames.size() - 1);
                    }

                    switchChannel(selectedUrl, selectedName);
                    channelDrawerAdapter.notifyDataSetChanged();
                }
            });
        }

        if (railTabChannels != null) railTabChannels.setOnClickListener(v -> setDrawerRailTab("channels"));
        if (railTabFavorites != null) railTabFavorites.setOnClickListener(v -> setDrawerRailTab("favorites"));
        if (railTabHistory != null) railTabHistory.setOnClickListener(v -> setDrawerRailTab("history"));
        if (railTabSearch != null) railTabSearch.setOnClickListener(v -> toggleDrawerSearch());

        if (drawerSearchInput != null) {
            drawerSearchInput.addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                    applyDrawerFilter();
                }
                @Override public void afterTextChanged(Editable s) {}
            });
        }
    }

    private void setDrawerRailTab(String tab) {
        currentRailTab = tab;
        if (railTabChannels != null) {
            railTabChannels.setBackgroundResource("channels".equals(tab) ? R.drawable.mobile_player_button_primary : R.drawable.mobile_player_button_secondary);
        }
        if (railTabFavorites != null) {
            railTabFavorites.setBackgroundResource("favorites".equals(tab) ? R.drawable.mobile_player_button_primary : R.drawable.mobile_player_button_secondary);
        }
        if (railTabHistory != null) {
            railTabHistory.setBackgroundResource("history".equals(tab) ? R.drawable.mobile_player_button_primary : R.drawable.mobile_player_button_secondary);
        }
        if (railTabSearch != null) {
            railTabSearch.setBackgroundResource("search".equals(tab) ? R.drawable.mobile_player_button_primary : R.drawable.mobile_player_button_secondary);
        }

        if ("search".equals(tab)) {
            if (drawerSearchInput != null) {
                drawerSearchInput.setVisibility(View.VISIBLE);
                drawerSearchInput.requestFocus();
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) imm.showSoftInput(drawerSearchInput, InputMethodManager.SHOW_IMPLICIT);
            }
            if (drawerHeaderTitle != null) drawerHeaderTitle.setText("Buscar Canales");
        } else {
            if (drawerSearchInput != null) {
                drawerSearchInput.setVisibility(View.GONE);
                hideKeyboard();
            }
            if (drawerHeaderTitle != null) {
                if ("favorites".equals(tab)) {
                    drawerHeaderTitle.setText("Canales Favoritos");
                } else if ("history".equals(tab)) {
                    drawerHeaderTitle.setText("Canales Recientes");
                } else {
                    drawerHeaderTitle.setText("Lista de canales");
                }
            }
        }

        applyDrawerFilter();
    }

    private void toggleDrawerSearch() {
        if ("search".equals(currentRailTab)) {
            setDrawerRailTab("channels");
        } else {
            setDrawerRailTab("search");
        }
    }

    private String stripAccents(String s) {
        if (s == null) return "";
        try {
            String normalized = Normalizer.normalize(s, Normalizer.Form.NFD);
            return normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").toLowerCase(Locale.ROOT).trim();
        } catch (Exception e) {
            return s.toLowerCase(Locale.ROOT).trim();
        }
    }

    private void applyDrawerFilter() {
        if (channelNames == null || channelUrls == null) return;
        int channelCount = Math.min(channelNames.size(), channelUrls.size());
        visibleChannelIndices.clear();

        String rawQuery = (drawerSearchInput != null && drawerSearchInput.getText() != null)
                ? drawerSearchInput.getText().toString() : "";
        String query = stripAccents(rawQuery);

        for (int i = 0; i < channelCount; i++) {
            String name = channelNames.get(i);

            if ("favorites".equals(currentRailTab) && !isChannelFavorite(name)) {
                continue;
            }
            if ("history".equals(currentRailTab) && !recentChannelNames.contains(name)) {
                continue;
            }
            if (!query.isEmpty()) {
                String normName = stripAccents(name);
                String epg = (channelEpgs != null && i < channelEpgs.size()) ? channelEpgs.get(i) : "";
                String normEpg = stripAccents(epg);
                if (!normName.contains(query) && !normEpg.contains(query)) {
                    continue;
                }
            }

            visibleChannelIndices.add(i);
        }

        if (channelDrawerAdapter != null) {
            channelDrawerAdapter.notifyDataSetChanged();
        }

        if (drawerFooterHint != null) {
            drawerFooterHint.setText(visibleChannelIndices.size() + " canales disponibles");
        }
    }

    private void showLiveChannelsDrawer() {
        if (channelNames == null || channelUrls == null || channelNames.isEmpty() || channelUrls.isEmpty()) {
            Toast.makeText(this, "No hay canales disponibles", Toast.LENGTH_SHORT).show();
            return;
        }

        if (channelDrawerContainer == null) {
            return;
        }

        int currentIndex = channelUrls.indexOf(currentVideoUrl);
        if (currentIndex >= 0) {
            currentChannelSelection = currentIndex;
        }

        if (drawerHeaderTime != null) {
            SimpleDateFormat df = new SimpleDateFormat("HH:mm", new Locale("es", "PE"));
            df.setTimeZone(java.util.TimeZone.getTimeZone("America/Lima"));
            drawerHeaderTime.setText(df.format(new Date()));
        }

        setDrawerRailTab("channels");
        applyDrawerFilter();

        if (channelDrawerBackdrop != null) {
            channelDrawerBackdrop.setVisibility(View.VISIBLE);
            channelDrawerBackdrop.setAlpha(0f);
            channelDrawerBackdrop.animate().alpha(1f).setDuration(200).start();
        }

        channelDrawerContainer.setVisibility(View.VISIBLE);
        channelDrawerContainer.setTranslationX(-800f);
        channelDrawerContainer.animate().translationX(0f).setDuration(220).start();

        int targetPos = visibleChannelIndices.indexOf(currentChannelSelection);
        if (targetPos >= 0 && drawerChannelList != null) {
            drawerChannelList.setSelection(Math.max(0, targetPos - 1));
        }
    }

    private void hideLiveChannelsDrawer() {
        if (channelDrawerContainer == null || channelDrawerContainer.getVisibility() != View.VISIBLE) return;

        hideKeyboard();

        if (channelDrawerBackdrop != null) {
            channelDrawerBackdrop.animate().alpha(0f).setDuration(180).start();
        }

        channelDrawerContainer.animate().translationX(-channelDrawerContainer.getWidth()).setDuration(200).withEndAction(() -> {
            channelDrawerContainer.setVisibility(View.GONE);
            closeChannelScheduleView();
            if (channelDrawerBackdrop != null) {
                channelDrawerBackdrop.setVisibility(View.GONE);
            }
        }).start();
    }

    private void showChannelScheduleView(String channelName, int channelIndex) {
        if (drawerChannelsView == null || drawerScheduleView == null) return;

        drawerChannelsView.setVisibility(View.GONE);
        drawerScheduleView.setVisibility(View.VISIBLE);

        if (scheduleChannelTitle != null) scheduleChannelTitle.setText(channelName);
        if (scheduleProgress != null) scheduleProgress.setVisibility(View.VISIBLE);
        if (scheduleEmptyText != null) scheduleEmptyText.setVisibility(View.GONE);
        if (scheduleProgramList != null) scheduleProgramList.setVisibility(View.GONE);

        scheduleItems.clear();
        if (scheduleProgramAdapter != null) scheduleProgramAdapter.notifyDataSetChanged();

        new Thread(() -> {
            ArrayList<ProgramScheduleItem> fetchedList = new ArrayList<>();
            try {
                String base = (apiBaseUrl != null && !apiBaseUrl.isEmpty()) ? apiBaseUrl : "https://api.teamg.store";
                String targetUrl = base + "/api/channels/epg/schedule?name=" + URLEncoder.encode(channelName, "UTF-8");
                URL url = new URL(targetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                if (sessionToken != null && !sessionToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + sessionToken);
                }

                if (conn.getResponseCode() == 200) {
                    InputStream in = conn.getInputStream();
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[2048];
                    int len;
                    while ((len = in.read(buf)) != -1) {
                        out.write(buf, 0, len);
                    }
                    in.close();
                    String jsonStr = out.toString("UTF-8");
                    JSONObject root = new JSONObject(jsonStr);
                    JSONArray arr = root.optJSONArray("schedule");
                    if (arr != null && arr.length() > 0) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject p = arr.getJSONObject(i);
                            String pTitle = p.optString("title", "Programa");
                            String pDesc = p.optString("desc", "");
                            String pStart = formatScheduleTime(p.optString("start", ""));
                            String pStop = formatScheduleTime(p.optString("stop", ""));
                            String timeStr = (!pStart.isEmpty() && !pStop.isEmpty()) ? (pStart + " - " + pStop) : pStart;
                            boolean isLive = p.optBoolean("isCurrent", false);
                            fetchedList.add(new ProgramScheduleItem(pTitle, pDesc, timeStr, isLive));
                        }
                    }
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.w("VLCPlayer", "Error fetching EPG schedule: " + e.getMessage());
            }

            // Fallback si la API no devolvió parrilla completa: usar EPG actual si existe
            if (fetchedList.isEmpty()) {
                String currentEpg = (channelEpgs != null && channelIndex >= 0 && channelIndex < channelEpgs.size())
                        ? channelEpgs.get(channelIndex) : "En emisión en vivo";
                fetchedList.add(new ProgramScheduleItem(currentEpg, "Emisión en directo del canal", "En vivo", true));
            }

            runOnUiThread(() -> {
                if (scheduleProgress != null) scheduleProgress.setVisibility(View.GONE);
                scheduleItems.clear();
                scheduleItems.addAll(fetchedList);
                if (scheduleProgramAdapter != null) scheduleProgramAdapter.notifyDataSetChanged();

                if (scheduleItems.isEmpty()) {
                    if (scheduleEmptyText != null) scheduleEmptyText.setVisibility(View.VISIBLE);
                    if (scheduleProgramList != null) scheduleProgramList.setVisibility(View.GONE);
                } else {
                    if (scheduleEmptyText != null) scheduleEmptyText.setVisibility(View.GONE);
                    if (scheduleProgramList != null) scheduleProgramList.setVisibility(View.VISIBLE);
                }
            });
        }).start();
    }

    private void closeChannelScheduleView() {
        if (drawerScheduleView != null) drawerScheduleView.setVisibility(View.GONE);
        if (drawerChannelsView != null) drawerChannelsView.setVisibility(View.VISIBLE);
    }

    private String formatScheduleTime(String isoStr) {
        if (isoStr == null || isoStr.trim().isEmpty()) return "";
        try {
            String s = isoStr.trim();
            Date date = null;
            String[] patterns = {
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                "yyyy-MM-dd'T'HH:mm:ss.SSS",
                "yyyy-MM-dd'T'HH:mm:ss"
            };
            for (String pattern : patterns) {
                try {
                    SimpleDateFormat parser = new SimpleDateFormat(pattern, Locale.US);
                    parser.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                    date = parser.parse(s);
                    if (date != null) break;
                } catch (Exception ignored) {}
            }
            if (date != null) {
                // Siempre guiarse por la hora oficial de Perú (America/Lima)
                SimpleDateFormat outFormat = new SimpleDateFormat("HH:mm", new Locale("es", "PE"));
                outFormat.setTimeZone(java.util.TimeZone.getTimeZone("America/Lima"));
                return outFormat.format(date);
            }
        } catch (Exception ignored) {}

        try {
            if (isoStr.contains("T")) {
                String timePart = isoStr.substring(isoStr.indexOf("T") + 1);
                if (timePart.length() >= 5) {
                    return timePart.substring(0, 5);
                }
            }
        } catch (Exception ignored) {}
        return isoStr;
    }

    private class ScheduleProgramAdapter extends android.widget.BaseAdapter {
        @Override
        public int getCount() {
            return scheduleItems.size();
        }

        @Override
        public Object getItem(int position) {
            return scheduleItems.get(position);
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = getLayoutInflater().inflate(R.layout.item_drawer_schedule, parent, false);
            }
            ProgramScheduleItem item = scheduleItems.get(position);
            TextView timeView = convertView.findViewById(R.id.schedule_item_time);
            TextView badgeView = convertView.findViewById(R.id.schedule_item_badge);
            TextView titleView = convertView.findViewById(R.id.schedule_item_title);
            TextView descView = convertView.findViewById(R.id.schedule_item_desc);
            TextView btnReminder = convertView.findViewById(R.id.schedule_item_btn_reminder);

            if (timeView != null) timeView.setText(item.timeStr != null ? item.timeStr : "");
            if (titleView != null) titleView.setText(item.title != null ? item.title : "");

            if (descView != null) {
                if (item.desc != null && !item.desc.trim().isEmpty() && !item.desc.equalsIgnoreCase(item.title)) {
                    descView.setText(item.desc);
                    descView.setVisibility(View.VISIBLE);
                } else {
                    descView.setVisibility(View.GONE);
                }
            }

            if (item.isLive) {
                if (badgeView != null) badgeView.setVisibility(View.VISIBLE);
                if (btnReminder != null) btnReminder.setVisibility(View.GONE);
            } else {
                if (badgeView != null) badgeView.setVisibility(View.GONE);
                if (btnReminder != null) {
                    btnReminder.setVisibility(View.VISIBLE);
                    if (item.hasReminder) {
                        btnReminder.setText("✓ Recordatorio activo");
                        btnReminder.setTextColor(0xFF00E676);
                    } else {
                        btnReminder.setText("🔔 Recordatorio");
                        btnReminder.setTextColor(0xFF00E5FF);
                    }
                    btnReminder.setOnClickListener(v -> {
                        item.hasReminder = !item.hasReminder;
                        notifyDataSetChanged();
                        if (item.hasReminder) {
                            Toast.makeText(VLCPlayerActivity.this, "🔔 Recordatorio activado para:\n" + item.title + (item.timeStr.isEmpty() ? "" : " (" + item.timeStr + ")"), Toast.LENGTH_LONG).show();
                        } else {
                            Toast.makeText(VLCPlayerActivity.this, "Recordatorio cancelado", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }

            return convertView;
        }
    }

    private void hideKeyboard() {
        if (drawerSearchInput != null) {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.hideSoftInputFromWindow(drawerSearchInput.getWindowToken(), 0);
            }
        }
    }

    private class ChannelDrawerAdapter extends android.widget.BaseAdapter {
        @Override
        public int getCount() {
            return visibleChannelIndices.size();
        }

        @Override
        public Object getItem(int position) {
            if (position >= 0 && position < visibleChannelIndices.size()) {
                return channelNames.get(visibleChannelIndices.get(position));
            }
            return null;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(int position, View convertView, android.view.ViewGroup parent) {
            ViewHolder holder;
            if (convertView == null) {
                convertView = getLayoutInflater().inflate(R.layout.item_drawer_channel, parent, false);
                holder = new ViewHolder();
                holder.numberView = convertView.findViewById(R.id.channel_item_number);
                holder.logoView = convertView.findViewById(R.id.channel_item_logo);
                holder.titleView = convertView.findViewById(R.id.channel_item_title);
                holder.epgView = convertView.findViewById(R.id.channel_item_epg);
                holder.favoriteView = convertView.findViewById(R.id.channel_item_favorite);
                convertView.setTag(holder);
            } else {
                holder = (ViewHolder) convertView.getTag();
            }

            int channelIndex = visibleChannelIndices.get(position);
            String name = channelNames.get(channelIndex);
            String logo = (channelLogos != null && channelIndex < channelLogos.size()) ? channelLogos.get(channelIndex) : "";
            String number = (channelNumbers != null && channelIndex < channelNumbers.size()) ? channelNumbers.get(channelIndex) : String.valueOf(channelIndex + 1);
            String epg = (channelEpgs != null && channelIndex < channelEpgs.size()) ? channelEpgs.get(channelIndex) : "En vivo";

            holder.numberView.setText(number);
            holder.titleView.setText(name);
            holder.epgView.setText(epg != null && !epg.isEmpty() ? epg : "En vivo");

            boolean isCurrent = (channelIndex == currentChannelSelection);
            convertView.setActivated(isCurrent);
            convertView.setSelected(isCurrent);

            boolean isFav = isChannelFavorite(name);
            holder.favoriteView.setAlpha(isFav ? 1.0f : 0.25f);
            holder.favoriteView.setColorFilter(isFav ? 0xFFFFD700 : 0xFFFFFFFF);
            holder.favoriteView.setOnClickListener(v -> {
                toggleFavorite(name);
                notifyDataSetChanged();
            });

            loadImageAsync(logo, holder.logoView);

            return convertView;
        }

        class ViewHolder {
            TextView numberView;
            android.widget.ImageView logoView;
            TextView titleView;
            TextView epgView;
            android.widget.ImageView favoriteView;
        }
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
                    media.addOption(":network-caching=200");
                    media.addOption(":live-caching=200");
                    media.addOption(":clock-jitter=0");
                    media.addOption(":clock-synchro=0");
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

    private boolean matchesTargetSession(Intent intent) {
        String targetSessionId = intent.getStringExtra("target_session_id");
        return targetSessionId == null
            || targetSessionId.isEmpty()
            || targetSessionId.equals(playbackSessionId);
    }

    private void registerControlReceiver() {
        controlReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("VIDEO_PLAYER_CONTROL".equals(intent.getAction())) {
                    if (!matchesTargetSession(intent)) {
                        Log.d(TAG, "Ignoring control for a stale playback session");
                        return;
                    }
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
                    if (!matchesTargetSession(intent)) {
                        Log.d(TAG, "Ignoring finish broadcast for a stale playback session");
                        return;
                    }
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
                ArrayList<String> nextNumbers = intent.getStringArrayListExtra("channel_numbers");
                ArrayList<String> nextEpgs = intent.getStringArrayListExtra("channel_epgs");

                if (nextNames == null || nextUrls == null || nextNames.isEmpty() || nextUrls.isEmpty()) {
                    Log.w(TAG, "Ignoring live channel update without valid channels");
                    return;
                }

                channelNames = nextNames;
                channelLogos = nextLogos != null ? nextLogos : new ArrayList<>();
                channelUrls = nextUrls;
                if (nextNumbers != null) channelNumbers = nextNumbers;
                if (nextEpgs != null) channelEpgs = nextEpgs;
                isLiveTV = true;
                currentChannelSelection = channelUrls.indexOf(currentVideoUrl);
                if (currentChannelSelection < 0) currentChannelSelection = 0;
                setupControls();
                applyDrawerFilter();
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
