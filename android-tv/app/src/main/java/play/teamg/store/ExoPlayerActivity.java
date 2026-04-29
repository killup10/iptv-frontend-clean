package play.teamg.store;

import android.app.PictureInPictureParams;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;
import android.util.Rational;
import android.util.TypedValue;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckedTextView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.google.android.exoplayer2.C;
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.Format;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.PlaybackException;
import com.google.android.exoplayer2.PlaybackParameters;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.source.MediaSource;
import com.google.android.exoplayer2.source.ProgressiveMediaSource;
import com.google.android.exoplayer2.source.TrackGroup;
import com.google.android.exoplayer2.source.TrackGroupArray;
import com.google.android.exoplayer2.source.dash.DashMediaSource;
import com.google.android.exoplayer2.source.hls.HlsMediaSource;
import com.google.android.exoplayer2.trackselection.DefaultTrackSelector;
import com.google.android.exoplayer2.trackselection.MappingTrackSelector;
import com.google.android.exoplayer2.trackselection.TrackSelection;
import com.google.android.exoplayer2.trackselection.TrackSelectionArray;
import com.google.android.exoplayer2.ui.AspectRatioFrameLayout;
import com.google.android.exoplayer2.ui.PlayerView;
import com.google.android.exoplayer2.upstream.DataSource;
import com.google.android.exoplayer2.upstream.DefaultDataSource;
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource;
import com.google.android.exoplayer2.util.Util;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.text.SimpleDateFormat;

public class ExoPlayerActivity extends AppCompatActivity {

    private static final String TAG = "ExoPlayerActivity";
    private static final String ACTION_VIDEO_PLAYER_CONTROL = "VIDEO_PLAYER_CONTROL";
    private static final String ACTION_UPDATE_LIVE_CHANNELS = "UPDATE_LIVE_CHANNELS";
    private static final long CONTROL_AUTO_HIDE_MS = 3200L;
    private static final long UI_UPDATE_INTERVAL_MS = 500L;
    private static final long PROGRESS_UPDATE_INTERVAL_MS = 15000L;
    private static final long QUICK_SEEK_MS = 10000L;
    private static final float[] PLAYBACK_SPEEDS = new float[]{0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 1.75f, 2.0f};
    private static final String[] ASPECT_RATIO_LABELS = new String[]{"Ajustar", "Zoom", "Rellenar", "Ancho"};
    private static final int[] ASPECT_RATIO_MODES = new int[]{
        AspectRatioFrameLayout.RESIZE_MODE_FIT,
        AspectRatioFrameLayout.RESIZE_MODE_ZOOM,
        AspectRatioFrameLayout.RESIZE_MODE_FILL,
        AspectRatioFrameLayout.RESIZE_MODE_FIXED_WIDTH
    };

    private PlayerView playerView;
    private View topScrim;
    private View bottomScrim;
    private View topPanel;
    private View controlsContainer;
    private View selectionPanel;
    private TextView contentBadgeView;
    private TextView episodeContextView;
    private TextView videoTitleView;
    private TextView videoSubtitleView;
    private TextView videoMetaLineView;
    private TextView clockView;
    private TextView currentTimeView;
    private TextView totalDurationView;
    private TextView controlHintView;
    private TextView lockMessageView;
    private TextView selectionPanelTitleView;
    private TextView selectionPanelHintView;
    private ScrollView selectionPanelScrollView;
    private LinearLayout selectionPanelContent;
    private SeekBar seekBar;
    private Button tracksButton;
    private Button aspectRatioButton;
    private Button speedButton;
    private Button prevEpisodeButton;
    private Button rewindButton;
    private Button playPauseButton;
    private Button forwardButton;
    private Button nextEpisodeButton;
    private Button channelsButton;

    private ExoPlayer player;
    private DefaultTrackSelector trackSelector;
    private DataSource.Factory dataSourceFactory;
    private AlertDialog activeDialog;

    private String baseTitle;
    private String currentVideoUrl;
    private String videoMetaLine = "";
    private long pendingStartTimeMs = 0L;
    private long mediaDurationMs = 0L;
    private int seasonIndex = -1;
    private int chapterIndex = -1;
    private boolean isLiveTV = false;
    private String contentType = "series";
    private boolean playerClosedNotified = false;
    private boolean isSeekBarArmed = false;
    private boolean controlsVisible = true;
    private boolean isScreenLocked = false;
    private boolean isSwitchingPlayerEngine = false;
    private boolean engineFallbackAttempted = false;
    private long pendingSeekPositionMs = -1L;
    private long lastProgressSyncAtMs = 0L;
    private int currentAspectRatioIndex = 0;
    private int currentSpeedIndex = 2;
    private int currentChannelSelection = 0;
    private String requestedPlayerType = "android-exoplayer";
    private boolean isSelectionPanelVisible = false;
    private View selectionPanelSourceView;
    private final ArrayList<View> selectionPanelOptionViews = new ArrayList<>();

    private ArrayList<String> chapterTitles = new ArrayList<>();
    private ArrayList<String> chapterUrls = new ArrayList<>();
    private ArrayList<Integer> chapterSeasonNumbers = new ArrayList<>();
    private ArrayList<Integer> chapterNumbers = new ArrayList<>();
    private ArrayList<Integer> chapterSeasonIndices = new ArrayList<>();
    private ArrayList<Integer> chapterIndices = new ArrayList<>();
    private ArrayList<String> channelNames = new ArrayList<>();
    private ArrayList<String> channelLogos = new ArrayList<>();
    private ArrayList<String> channelUrls = new ArrayList<>();

    private final Handler uiHandler = new Handler(Looper.getMainLooper());
    private final Handler controlsHandler = new Handler(Looper.getMainLooper());

    private final Runnable uiUpdateRunnable = new Runnable() {
        @Override
        public void run() {
            updateProgressUi();
            refreshControlHint();
            maybeEmitPeriodicProgress();
            if (player != null) {
                uiHandler.postDelayed(this, UI_UPDATE_INTERVAL_MS);
            }
        }
    };

    private final Runnable hideControlsRunnable = new Runnable() {
        @Override
        public void run() {
            if (!canAutoHideControls()) {
                return;
            }
            setOverlayVisibility(false, true);
        }
    };

    private final Runnable hideLockMessageRunnable = new Runnable() {
        @Override
        public void run() {
            lockMessageView.animate().alpha(0f).setDuration(180L).withEndAction(() -> {
                lockMessageView.setVisibility(View.GONE);
            }).start();
        }
    };

    private final Runnable clockUpdateRunnable = new Runnable() {
        @Override
        public void run() {
            updateClockLabel();
            controlsHandler.postDelayed(this, 30000L);
        }
    };

    private final BroadcastReceiver controlReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getStringExtra("action");
            if (player == null || action == null) {
                return;
            }

            switch (action) {
                case "pause":
                    player.pause();
                    showControls();
                    emitProgress(false, true);
                    break;
                case "play":
                    player.play();
                    showControls();
                    break;
                case "stop":
                    releasePlayer("stop");
                    finish();
                    break;
                case "seek":
                    long position = Math.max(0L, intent.getLongExtra("position", 0L) * 1000L);
                    player.seekTo(position);
                    pendingSeekPositionMs = -1L;
                    isSeekBarArmed = false;
                    updateProgressUi();
                    refreshControlHint();
                    showControls();
                    emitProgress(false, true);
                    break;
                case "getCurrentTime":
                    emitProgress(false, true);
                    break;
                default:
                    break;
            }
        }
    };

    private final BroadcastReceiver liveChannelsReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            ArrayList<String> names = intent.getStringArrayListExtra("channel_names");
            ArrayList<String> logos = intent.getStringArrayListExtra("channel_logos");
            ArrayList<String> urls = intent.getStringArrayListExtra("channel_urls");

            channelNames = names != null ? names : new ArrayList<>();
            channelLogos = logos != null ? logos : new ArrayList<>();
            channelUrls = urls != null ? urls : new ArrayList<>();
            currentChannelSelection = resolveCurrentChannelSelection();

            updateControlAvailability();
            updateHeaderAndMeta();
            Log.d(TAG, "Updated live channels in ExoPlayer: " + channelUrls.size());
        }
    };

    private interface DialogSelectionHandler {
        void onSelected(int index);
    }

    private static final class TrackOption {
        final int groupIndex;
        final int trackIndex;
        final String label;

        TrackOption(int groupIndex, int trackIndex, String label) {
            this.groupIndex = groupIndex;
            this.trackIndex = trackIndex;
            this.label = label;
        }
    }

    private static final class RendererTrackState {
        int rendererIndex = C.INDEX_UNSET;
        TrackGroupArray trackGroups;
        final ArrayList<TrackOption> options = new ArrayList<>();
        int selectedOptionIndex = -1;
        int availableTrackCount = 0;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        enterFullscreenMode();
        setContentView(R.layout.activity_exoplayer);

        bindViews();
        readIntentExtras();

        if (TextUtils.isEmpty(currentVideoUrl)) {
            Toast.makeText(this, "URL de video no valida", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        configureOverlay();

        IntentFilter controlFilter = new IntentFilter(ACTION_VIDEO_PLAYER_CONTROL);
        ContextCompat.registerReceiver(this, controlReceiver, controlFilter, ContextCompat.RECEIVER_NOT_EXPORTED);

        IntentFilter liveFilter = new IntentFilter(ACTION_UPDATE_LIVE_CHANNELS);
        ContextCompat.registerReceiver(this, liveChannelsReceiver, liveFilter, ContextCompat.RECEIVER_NOT_EXPORTED);

        initializePlayer();
    }

    private void bindViews() {
        playerView = findViewById(R.id.player_view);
        topScrim = findViewById(R.id.top_scrim);
        bottomScrim = findViewById(R.id.bottom_scrim);
        topPanel = findViewById(R.id.top_panel);
        controlsContainer = findViewById(R.id.controls_container);
        selectionPanel = findViewById(R.id.selection_panel);
        contentBadgeView = findViewById(R.id.content_badge);
        episodeContextView = findViewById(R.id.episode_context);
        videoTitleView = findViewById(R.id.video_title);
        videoSubtitleView = findViewById(R.id.video_subtitle);
        videoMetaLineView = findViewById(R.id.video_meta_line);
        clockView = findViewById(R.id.clock_view);
        currentTimeView = findViewById(R.id.current_time);
        totalDurationView = findViewById(R.id.total_duration);
        controlHintView = findViewById(R.id.control_hint);
        lockMessageView = findViewById(R.id.lock_message);
        selectionPanelTitleView = findViewById(R.id.selection_panel_title);
        selectionPanelHintView = findViewById(R.id.selection_panel_hint);
        selectionPanelScrollView = findViewById(R.id.selection_panel_scroll);
        selectionPanelContent = findViewById(R.id.selection_panel_content);
        seekBar = findViewById(R.id.seek_bar);
        tracksButton = findViewById(R.id.tracks_button);
        aspectRatioButton = findViewById(R.id.aspect_ratio_button);
        speedButton = findViewById(R.id.speed_button);
        prevEpisodeButton = findViewById(R.id.prev_episode_button);
        rewindButton = findViewById(R.id.rewind_button);
        playPauseButton = findViewById(R.id.play_pause_button);
        forwardButton = findViewById(R.id.forward_button);
        nextEpisodeButton = findViewById(R.id.next_episode_button);
        channelsButton = findViewById(R.id.channels_button);
    }

    private void readIntentExtras() {
        Intent intent = getIntent();
        currentVideoUrl = intent.getStringExtra("video_url");
        baseTitle = intent.getStringExtra("video_title");
        videoMetaLine = intent.getStringExtra("video_meta_line");
        pendingStartTimeMs = Math.max(0L, intent.getLongExtra("start_time", 0L) * 1000L);
        seasonIndex = intent.getIntExtra("season_index", -1);
        chapterIndex = intent.getIntExtra("chapter_index", -1);
        isLiveTV = intent.getBooleanExtra("is_live_tv", false);
        contentType = intent.getStringExtra("content_type");
        requestedPlayerType = intent.getStringExtra("player_type");
        engineFallbackAttempted = intent.getBooleanExtra("engine_fallback_attempted", false);
        if (contentType == null) {
            contentType = "series";
        }
        if (TextUtils.isEmpty(requestedPlayerType)) {
            requestedPlayerType = "android-exoplayer";
        }

        ArrayList<String> extraChapterTitles = intent.getStringArrayListExtra("chapter_titles");
        ArrayList<String> extraChapterUrls = intent.getStringArrayListExtra("chapter_urls");
        ArrayList<Integer> extraChapterSeasonNumbers = intent.getIntegerArrayListExtra("chapter_season_numbers");
        ArrayList<Integer> extraChapterNumbers = intent.getIntegerArrayListExtra("chapter_numbers");
        ArrayList<Integer> extraChapterSeasonIndices = intent.getIntegerArrayListExtra("chapter_season_indices");
        ArrayList<Integer> extraChapterIndices = intent.getIntegerArrayListExtra("chapter_indices");
        ArrayList<String> extraChannelNames = intent.getStringArrayListExtra("channel_names");
        ArrayList<String> extraChannelLogos = intent.getStringArrayListExtra("channel_logos");
        ArrayList<String> extraChannelUrls = intent.getStringArrayListExtra("channel_urls");

        chapterTitles = extraChapterTitles != null ? extraChapterTitles : new ArrayList<>();
        chapterUrls = extraChapterUrls != null ? extraChapterUrls : new ArrayList<>();
        chapterSeasonNumbers = extraChapterSeasonNumbers != null ? extraChapterSeasonNumbers : new ArrayList<>();
        chapterNumbers = extraChapterNumbers != null ? extraChapterNumbers : new ArrayList<>();
        chapterSeasonIndices = extraChapterSeasonIndices != null ? extraChapterSeasonIndices : new ArrayList<>();
        chapterIndices = extraChapterIndices != null ? extraChapterIndices : new ArrayList<>();
        channelNames = extraChannelNames != null ? extraChannelNames : new ArrayList<>();
        channelLogos = extraChannelLogos != null ? extraChannelLogos : new ArrayList<>();
        channelUrls = extraChannelUrls != null ? extraChannelUrls : new ArrayList<>();

        currentChannelSelection = resolveCurrentChannelSelection();
        if (TextUtils.isEmpty(baseTitle)) {
            if (isLiveTV && !channelNames.isEmpty()) {
                baseTitle = safeGet(channelNames, currentChannelSelection, "Canal en vivo");
            } else {
                int chapterListIndex = resolveCurrentChapterListIndex();
                if (chapterListIndex >= 0) {
                    baseTitle = safeGet(chapterTitles, chapterListIndex, "Video");
                } else {
                    baseTitle = "TeamG Play";
                }
            }
        }
    }

    private void configureOverlay() {
        playerView.setUseController(false);
        playerView.setKeepContentOnPlayerReset(true);
        playerView.setResizeMode(ASPECT_RATIO_MODES[currentAspectRatioIndex]);
        playerView.setFocusable(false);
        playerView.setFocusableInTouchMode(false);
        controlsContainer.setFocusable(false);
        controlsContainer.setFocusableInTouchMode(false);
        selectionPanel.setFocusable(false);
        selectionPanel.setFocusableInTouchMode(false);
        seekBar.setFocusable(false);
        seekBar.setFocusableInTouchMode(false);
        seekBar.setClickable(false);
        seekBar.setEnabled(false);
        seekBar.setThumbOffset(0);

        decorateFocusableButton(tracksButton);
        decorateFocusableButton(aspectRatioButton);
        decorateFocusableButton(speedButton);
        decorateFocusableButton(prevEpisodeButton);
        decorateFocusableButton(rewindButton);
        decorateFocusablePrimaryButton(playPauseButton);
        decorateFocusableButton(forwardButton);
        decorateFocusableButton(nextEpisodeButton);
        decorateFocusableButton(channelsButton);

        videoTitleView.setSelected(true);
        setupControls();
        updateControlAvailability();
        updateHeaderAndMeta();
        updateProgressUi();
        refreshControlHint();
        updateClockLabel();
        setOverlayVisibility(true, false);
        controlsContainer.post(this::focusPrimaryControlsIfNeeded);
        controlsHandler.removeCallbacks(clockUpdateRunnable);
        controlsHandler.post(clockUpdateRunnable);
    }

    private void setupControls() {
        tracksButton.setOnClickListener(v -> {
            openTracksPanel(v);
        });

        aspectRatioButton.setOnClickListener(v -> {
            openAspectRatioPanel(v);
        });

        speedButton.setOnClickListener(v -> {
            openSpeedPanel(v);
        });

        prevEpisodeButton.setOnClickListener(v -> {
            if (!v.isEnabled()) {
                return;
            }
            if (isLiveTV) {
                changeChannelByStep(-1);
            } else {
                goToPreviousEpisode();
            }
            closeSelectionPanel(false);
            showControls();
        });

        rewindButton.setOnClickListener(v -> {
            if (!v.isEnabled()) {
                return;
            }
            seekByMs(-QUICK_SEEK_MS);
            closeSelectionPanel(false);
            showControls();
        });

        playPauseButton.setOnClickListener(v -> {
            togglePlayPause();
            closeSelectionPanel(false);
            showControls();
        });

        forwardButton.setOnClickListener(v -> {
            if (!v.isEnabled()) {
                return;
            }
            seekByMs(QUICK_SEEK_MS);
            closeSelectionPanel(false);
            showControls();
        });

        nextEpisodeButton.setOnClickListener(v -> {
            if (!v.isEnabled()) {
                return;
            }
            if (isLiveTV) {
                changeChannelByStep(1);
            } else {
                goToNextEpisode();
            }
            closeSelectionPanel(false);
            showControls();
        });

        channelsButton.setOnClickListener(v -> {
            if (!v.isEnabled()) {
                return;
            }
            openContextListPanel(v);
        });
    }

    private void initializePlayer() {
        if (player != null) {
            return;
        }

        dataSourceFactory = new DefaultDataSource.Factory(
            this,
            new DefaultHttpDataSource.Factory()
                .setUserAgent(Util.getUserAgent(this, "TeamGPlay"))
                .setConnectTimeoutMs(30000)
                .setReadTimeoutMs(30000)
        );

        trackSelector = new DefaultTrackSelector(this);
        player = new ExoPlayer.Builder(this)
            .setTrackSelector(trackSelector)
            .build();

        playerView.setPlayer(player);
        player.setPlaybackParameters(new PlaybackParameters(PLAYBACK_SPEEDS[currentSpeedIndex]));

        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                Log.e(TAG, "Player error: " + error.getMessage(), error);
                if (shouldAutoSwitchToAlternatePlayer(error)) {
                    Toast.makeText(
                        ExoPlayerActivity.this,
                        "ExoPlayer no pudo con este stream. Probando VLC...",
                        Toast.LENGTH_LONG
                    ).show();
                    switchPlayerEngine("android-vlc", true, "decoder_fallback");
                    return;
                }
                Toast.makeText(
                    ExoPlayerActivity.this,
                    "Error de reproduccion: " + error.getMessage(),
                    Toast.LENGTH_LONG
                ).show();
                showControls();
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (player == null) {
                    return;
                }

                if (playbackState == Player.STATE_READY) {
                    mediaDurationMs = resolveDurationMs();
                    if (pendingStartTimeMs > 0L) {
                        player.seekTo(pendingStartTimeMs);
                        pendingStartTimeMs = 0L;
                    }
                    updateProgressUi();
                    refreshControlHint();
                    updatePlayPauseButton();
                    updateHeaderAndMeta();
                    scheduleUiUpdates();
                    scheduleHideControls();
                    emitProgress(false, true);
                } else if (playbackState == Player.STATE_ENDED) {
                    updatePlayPauseButton();
                    emitProgress(true, true);
                    showControls();
                } else if (playbackState == Player.STATE_BUFFERING) {
                    updatePlayPauseButton();
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                updatePlayPauseButton();
                if (isPlaying) {
                    scheduleUiUpdates();
                    scheduleHideControls();
                } else {
                    controlsHandler.removeCallbacks(hideControlsRunnable);
                    emitProgress(false, true);
                }
            }

        });

        loadMedia(currentVideoUrl, pendingStartTimeMs);
    }

    private void loadMedia(String targetUrl, long startPositionMs) {
        if (player == null || TextUtils.isEmpty(targetUrl)) {
            return;
        }

        currentVideoUrl = targetUrl;
        pendingStartTimeMs = Math.max(0L, startPositionMs);
        mediaDurationMs = 0L;
        pendingSeekPositionMs = -1L;
        isSeekBarArmed = false;
        if (isSelectionPanelVisible) {
            closeSelectionPanel(false);
        }
        controlHintView.setText("DPAD Navegar | OK Seleccionar | BACK Salir");
        currentChannelSelection = resolveCurrentChannelSelection();
        updateHeaderAndMeta();

        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(targetUrl));
        MediaSource mediaSource = buildMediaSource(targetUrl, mediaItem);
        player.setMediaSource(mediaSource, true);
        player.prepare();
        player.play();
        updatePlayPauseButton();
    }

    private MediaSource buildMediaSource(String targetUrl, MediaItem mediaItem) {
        String lowerUrl = targetUrl.toLowerCase(Locale.ROOT);
        if (lowerUrl.contains(".m3u8")) {
            return new HlsMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem);
        }
        if (lowerUrl.contains(".mpd")) {
            return new DashMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem);
        }
        return new ProgressiveMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem);
    }

    private void scheduleUiUpdates() {
        uiHandler.removeCallbacks(uiUpdateRunnable);
        uiHandler.post(uiUpdateRunnable);
    }

    private void stopUiUpdates() {
        uiHandler.removeCallbacks(uiUpdateRunnable);
    }

    private void maybeEmitPeriodicProgress() {
        if (player == null || !player.isPlaying()) {
            return;
        }
        long now = System.currentTimeMillis();
        if (now - lastProgressSyncAtMs >= PROGRESS_UPDATE_INTERVAL_MS) {
            emitProgress(false, false);
        }
    }

    private void emitProgress(boolean completed, boolean forceSync) {
        if (player == null) {
            return;
        }

        Intent intent = new Intent("VIDEO_PROGRESS_UPDATE");
        intent.setPackage(getPackageName());
        intent.putExtra("currentTime", Math.max(0L, player.getCurrentPosition() / 1000L));
        intent.putExtra("completed", completed);
        intent.putExtra("forceSync", forceSync);
        if (seasonIndex >= 0) {
            intent.putExtra("seasonIndex", seasonIndex);
        }
        if (chapterIndex >= 0) {
            intent.putExtra("chapterIndex", chapterIndex);
        }
        sendBroadcast(intent);
        lastProgressSyncAtMs = System.currentTimeMillis();
    }

    private void notifyPlayerClosed(String reason) {
        if (playerClosedNotified) {
            return;
        }

        playerClosedNotified = true;
        Intent intent = new Intent("VIDEO_PLAYER_CLOSED");
        intent.setPackage(getPackageName());
        intent.putExtra("reason", reason);
        sendBroadcast(intent);
    }

    private void releasePlayer(String reason) {
        controlsHandler.removeCallbacks(hideControlsRunnable);
        controlsHandler.removeCallbacks(hideLockMessageRunnable);
        controlsHandler.removeCallbacks(clockUpdateRunnable);
        stopUiUpdates();

        if (activeDialog != null && activeDialog.isShowing()) {
            activeDialog.dismiss();
        }

        if (player != null) {
            emitProgress(false, true);
            try {
                player.release();
            } catch (Exception e) {
                Log.w(TAG, "Error releasing player", e);
            }
            player = null;
        }

        if (!TextUtils.isEmpty(reason)) {
            notifyPlayerClosed(reason);
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() != KeyEvent.ACTION_DOWN) {
            return super.dispatchKeyEvent(event);
        }

        if (activeDialog != null && activeDialog.isShowing()) {
            return super.dispatchKeyEvent(event);
        }

        int keyCode = event.getKeyCode();

        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_ESCAPE) {
            if (isSelectionPanelVisible) {
                closeSelectionPanel(true);
                return true;
            }
            return super.dispatchKeyEvent(event);
        }

        if (!controlsVisible) {
            showControls();
            if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                || keyCode == KeyEvent.KEYCODE_ENTER
                || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER
                || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) {
                togglePlayPause();
            }
            return true;
        }

        switch (keyCode) {
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                togglePlayPause();
                showControls();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY:
                if (player != null) {
                    player.play();
                }
                showControls();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                if (player != null) {
                    player.pause();
                }
                showControls();
                return true;
            case KeyEvent.KEYCODE_MEDIA_NEXT:
                if (isLiveTV) {
                    changeChannelByStep(1);
                } else {
                    goToNextEpisode();
                }
                showControls();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                if (isLiveTV) {
                    changeChannelByStep(-1);
                } else {
                    goToPreviousEpisode();
                }
                showControls();
                return true;
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
            default:
                break;
        }

        scheduleHideControls();
        if (!isControlsFocused()) {
            if (isSelectionPanelVisible) {
                focusSelectionPanelIfNeeded();
            } else {
                focusPrimaryControlsIfNeeded();
            }
            return true;
        }

        return super.dispatchKeyEvent(event);
    }

    private void updateProgressUi() {
        if (player == null) {
            return;
        }

        if (isLiveTV) {
            seekBar.setProgress(0);
            currentTimeView.setText("LIVE");
            totalDurationView.setText("--:--");
            controlHintView.setText("DPAD Navegar   •   OK Seleccionar   •   BACK Salir");
            return;
        }

        long currentPositionMs = Math.max(0L, player.getCurrentPosition());
        long resolvedDurationMs = resolveDurationMs();

        if (resolvedDurationMs > 0L) {
            mediaDurationMs = resolvedDurationMs;
            seekBar.setMax((int) Math.min(Integer.MAX_VALUE, resolvedDurationMs));
            seekBar.setProgress((int) Math.min(Integer.MAX_VALUE, clampSeekPosition(currentPositionMs)));
        } else {
            seekBar.setMax(1);
            seekBar.setProgress(0);
        }

        currentTimeView.setText(formatTime(currentPositionMs));
        totalDurationView.setText(resolvedDurationMs > 0L ? formatTime(resolvedDurationMs) : "--:--");
        controlHintView.setText("DPAD Navegar   •   OK Seleccionar   •   BACK Salir");
        /*
        controlHintView.setText("DPAD Navegar   •   OK Seleccionar   •   BACK Salir");
            ? "Izq/Der ajusta • OK confirma • Atras cancela"
            : "OK selecciona • Arriba progreso • Fila inferior opciones");
        applySeekBarPreviewState();
        */
    }

    private long resolveDurationMs() {
        if (player == null) {
            return mediaDurationMs;
        }
        long duration = player.getDuration();
        if (duration == C.TIME_UNSET || duration < 0L) {
            return mediaDurationMs;
        }
        return duration;
    }

    private void updateControlAvailability() {
        boolean hasChapters = chapterUrls != null && chapterUrls.size() > 1;
        boolean hasAnyChapters = chapterUrls != null && !chapterUrls.isEmpty();
        boolean hasChannels = channelUrls != null && !channelUrls.isEmpty();
        boolean hasAdjacentItems = isLiveTV ? hasChannels : hasChapters;
        boolean hasContextList = isLiveTV ? hasChannels : hasAnyChapters;

        updateControlEnabledState(prevEpisodeButton, hasAdjacentItems);
        updateControlEnabledState(nextEpisodeButton, hasAdjacentItems);
        updateControlEnabledState(rewindButton, !isLiveTV);
        updateControlEnabledState(forwardButton, !isLiveTV);
        updateControlEnabledState(tracksButton, true);
        updateControlEnabledState(speedButton, true);
        updateControlEnabledState(aspectRatioButton, true);
        updateControlEnabledState(channelsButton, hasContextList);
        updateControlVisibility(channelsButton, hasContextList);

        seekBar.setEnabled(false);
        seekBar.setFocusable(false);
        seekBar.setFocusableInTouchMode(false);
        configureControlFocusOrder();
        updateButtonLabels();
    }

    private boolean hasContextListEntries() {
        return isLiveTV
            ? channelUrls != null && !channelUrls.isEmpty()
            : chapterUrls != null && !chapterUrls.isEmpty();
    }

    private void configureControlFocusOrder() {
        ArrayList<Button> enabledActionButtons = new ArrayList<>();
        addVisibleControlButton(enabledActionButtons, rewindButton);
        addVisibleControlButton(enabledActionButtons, forwardButton);
        addVisibleControlButton(enabledActionButtons, tracksButton);
        addVisibleControlButton(enabledActionButtons, speedButton);
        addVisibleControlButton(enabledActionButtons, aspectRatioButton);
        addVisibleControlButton(enabledActionButtons, channelsButton);

        Button firstActionButton = !enabledActionButtons.isEmpty() ? enabledActionButtons.get(0) : playPauseButton;
        Button centeredActionButton = enabledActionButtons.contains(tracksButton)
            ? tracksButton
            : firstActionButton;
        Button lastActionButton = !enabledActionButtons.isEmpty()
            ? enabledActionButtons.get(enabledActionButtons.size() - 1)
            : playPauseButton;

        Button playLeftTarget = prevEpisodeButton.isEnabled() ? prevEpisodeButton : playPauseButton;
        Button playRightTarget = nextEpisodeButton.isEnabled() ? nextEpisodeButton : playPauseButton;
        Button prevDownTarget = rewindButton.isEnabled() ? rewindButton : firstActionButton;
        Button nextDownTarget = channelsButton.isEnabled() ? channelsButton : lastActionButton;

        prevEpisodeButton.setNextFocusLeftId(prevEpisodeButton.isEnabled() ? prevEpisodeButton.getId() : playPauseButton.getId());
        prevEpisodeButton.setNextFocusRightId(playPauseButton.getId());
        prevEpisodeButton.setNextFocusUpId(prevEpisodeButton.getId());
        prevEpisodeButton.setNextFocusDownId(prevDownTarget != null ? prevDownTarget.getId() : playPauseButton.getId());

        playPauseButton.setNextFocusLeftId(playLeftTarget.getId());
        playPauseButton.setNextFocusRightId(playRightTarget.getId());
        playPauseButton.setNextFocusUpId(playPauseButton.getId());
        playPauseButton.setNextFocusDownId(centeredActionButton != null ? centeredActionButton.getId() : playPauseButton.getId());

        nextEpisodeButton.setNextFocusLeftId(playPauseButton.getId());
        nextEpisodeButton.setNextFocusRightId(nextEpisodeButton.isEnabled() ? nextEpisodeButton.getId() : playPauseButton.getId());
        nextEpisodeButton.setNextFocusUpId(nextEpisodeButton.getId());
        nextEpisodeButton.setNextFocusDownId(nextDownTarget != null ? nextDownTarget.getId() : playPauseButton.getId());

        for (int index = 0; index < enabledActionButtons.size(); index++) {
            Button currentButton = enabledActionButtons.get(index);
            Button leftButton = index > 0 ? enabledActionButtons.get(index - 1) : currentButton;
            Button rightButton = index < enabledActionButtons.size() - 1 ? enabledActionButtons.get(index + 1) : currentButton;
            currentButton.setNextFocusLeftId(leftButton.getId());
            currentButton.setNextFocusRightId(rightButton.getId());
            currentButton.setNextFocusUpId(playPauseButton.getId());
            currentButton.setNextFocusDownId(currentButton.getId());
        }
    }

    private void addVisibleControlButton(List<Button> orderedButtons, Button button) {
        if (button == null || button.getVisibility() != View.VISIBLE || !button.isEnabled() || !button.isFocusable()) {
            return;
        }
        orderedButtons.add(button);
    }

    private void updateControlEnabledState(Button button, boolean enabled) {
        if (button == null) {
            return;
        }
        button.setEnabled(enabled);
        button.setFocusable(enabled);
        button.setFocusableInTouchMode(enabled);
        button.setAlpha(enabled ? 1f : 0.34f);
    }

    private void updateControlVisibility(View view, boolean visible) {
        if (view == null) {
            return;
        }
        view.setVisibility(visible ? View.VISIBLE : View.GONE);
    }

    private void updateButtonLabels() {
        String currentAudioLabel = trimLabel(sanitizeUiLabel(resolveCurrentAudioTrackLabel()), 18);
        tracksButton.setText("Audio / Sub");
        tracksButton.setContentDescription("Audio / Subtitulos. Actual: " + currentAudioLabel);
        aspectRatioButton.setText("Aspecto\n" + ASPECT_RATIO_LABELS[currentAspectRatioIndex]);
        speedButton.setText("Velocidad\n" + formatSpeedLabel(PLAYBACK_SPEEDS[currentSpeedIndex]));
        rewindButton.setText("-10s\nRetroceso");
        forwardButton.setText("+10s\nAvance");

        if (isLiveTV) {
            String channelValue = !channelNames.isEmpty()
                ? trimLabel(safeGet(channelNames, resolveCurrentChannelSelection(), "Lista"), 14)
                : "Lista";
            channelsButton.setText("Canales\n" + sanitizeUiLabel(channelValue));
            channelsButton.setContentDescription("Canales");
        } else {
            int currentChapterListIndex = resolveCurrentChapterListIndex();
            String episodesValue = currentChapterListIndex >= 0
                ? "T" + safeGet(chapterSeasonNumbers, currentChapterListIndex, 1)
                    + " E" + safeGet(chapterNumbers, currentChapterListIndex, 1)
                : (!chapterUrls.isEmpty() ? "Lista" : "No disp.");
            channelsButton.setText("Episodios\n" + trimLabel(sanitizeUiLabel(episodesValue), 14));
            channelsButton.setContentDescription("Episodios");
        }

        /* int chapterIndex = resolveCurrentChapterListIndex();
        String episodesValue = chapterIndex >= 0
            ? "T" + safeGet(chapterSeasonNumbers, chapterIndex, 1) + " · E" + safeGet(chapterNumbers, chapterIndex, 1)
            : (!chapterUrls.isEmpty() ? "Lista" : "No disp.");
        episodesValue = sanitizeUiLabel(episodesValue);
        channelsButton.setText("Episodios\n" + trimLabel(episodesValue, 14));

        String channelValue = isLiveTV && !channelNames.isEmpty()
            ? trimLabel(safeGet(channelNames, resolveCurrentChannelSelection(), "Lista"), 14)
            : "No disp.";
        channelsButton.setText((isLiveTV ? "Canales\n" : "Episodios\n") + sanitizeUiLabel(channelValue));
        */
        updatePlayPauseButton();
    }

    private void updatePlayPauseButton() {
        if (playPauseButton == null) {
            return;
        }
        boolean isPlaying = player != null && player.isPlaying();
        playPauseButton.setText("");
        playPauseButton.setContentDescription(isPlaying ? "Pausar" : "Reproducir");
        playPauseButton.setCompoundDrawablesWithIntrinsicBounds(
            null,
            ContextCompat.getDrawable(
                this,
                isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play
            ),
            null,
            null
        );
        playPauseButton.setCompoundDrawablePadding(0);
        playPauseButton.setCompoundDrawableTintList(ColorStateList.valueOf(Color.WHITE));
    }

    private void updateHeaderAndMeta() {
        updateButtonLabels();
        contentBadgeView.setText(resolveBadgeLabel());
        String episodeContextLabel = resolveEpisodeContextLabel();
        episodeContextView.setText(sanitizeUiLabel(episodeContextLabel));
        episodeContextView.setVisibility(TextUtils.isEmpty(episodeContextLabel) ? View.GONE : View.VISIBLE);
        videoTitleView.setText(sanitizeUiLabel(resolveCurrentHeaderTitle()));
        videoSubtitleView.setText(sanitizeUiLabel(resolveCurrentHeaderSubtitle()));
        if (videoMetaLineView != null) {
            String metaLine = resolveHeaderMetaLine();
            videoMetaLineView.setText(sanitizeUiLabel(metaLine));
            videoMetaLineView.setVisibility(TextUtils.isEmpty(metaLine) ? View.GONE : View.VISIBLE);
        }
    }

    private String resolveHeaderMetaLine() {
        if (!TextUtils.isEmpty(videoMetaLine)) {
            return videoMetaLine;
        }

        ArrayList<String> parts = new ArrayList<>();
        if (isLiveTV) {
            parts.add("En vivo");
            if (!channelNames.isEmpty()) {
                parts.add("Canal " + (resolveCurrentChannelSelection() + 1));
            }
        } else {
            parts.add(resolveBadgeLabel());
            if (chapterUrls != null && !chapterUrls.isEmpty()) {
                parts.add(chapterUrls.size() + " items");
            }
        }
        parts.add(trimLabel(resolveCurrentAudioTrackLabel(), 20));
        return TextUtils.join("   •   ", parts);
    }

    private String resolveEpisodeContextLabel() {
        if (isLiveTV) {
            return "DIRECTO";
        }

        int currentChapterListIndex = resolveCurrentChapterListIndex();
        if (currentChapterListIndex < 0) {
            return "";
        }

        Integer seasonNumberValue = safeGet(chapterSeasonNumbers, currentChapterListIndex, null);
        Integer chapterNumberValue = safeGet(chapterNumbers, currentChapterListIndex, null);
        if (seasonNumberValue != null && chapterNumberValue != null) {
            return "TEMP " + seasonNumberValue + " \u00b7 EP " + chapterNumberValue;
        }

        return "";
    }

    private String resolveBadgeLabel() {
        if (isLiveTV) {
            return "EN VIVO";
        }
        String normalized = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        switch (normalized) {
            case "pelicula":
            case "movie":
                return "PELICULA";
            case "channel":
                return "CANAL";
            default:
                return "SERIE";
        }
    }

    private String resolveCurrentHeaderTitle() {
        if (isLiveTV) {
            return safeGet(channelNames, resolveCurrentChannelSelection(), baseTitle);
        }

        int currentChapterListIndex = resolveCurrentChapterListIndex();
        if (currentChapterListIndex >= 0) {
            return safeGet(chapterTitles, currentChapterListIndex, baseTitle);
        }

        return baseTitle;
    }

    private String resolveCurrentHeaderSubtitle() {
        if (isLiveTV) {
            return "Selecciona canal, audio y aspecto con el control remoto";
        }

        int currentChapterListIndex = resolveCurrentChapterListIndex();
        if (currentChapterListIndex >= 0 && !TextUtils.isEmpty(baseTitle)) {
            return baseTitle;
        }

        return resolveBadgeLabel();
    }

    private String buildChapterDisplayTitle(int index) {
        String title = safeGet(chapterTitles, index, baseTitle);
        Integer seasonNumberValue = safeGet(chapterSeasonNumbers, index, null);
        Integer chapterNumberValue = safeGet(chapterNumbers, index, null);
        if (seasonNumberValue != null && chapterNumberValue != null) {
            return "T" + seasonNumberValue + " E" + chapterNumberValue + " - " + title;
        }
        return title;
    }

    private void togglePlayPause() {
        if (player == null) {
            return;
        }

        if (player.isPlaying()) {
            player.pause();
        } else {
            player.play();
        }

        updatePlayPauseButton();
    }

    private void seekByMs(long deltaMs) {
        if (player == null || isLiveTV) {
            return;
        }
        long targetPosition = clampSeekPosition(Math.max(0L, player.getCurrentPosition()) + deltaMs);
        player.seekTo(targetPosition);
        pendingSeekPositionMs = -1L;
        isSeekBarArmed = false;
        updateProgressUi();
        refreshControlHint();
        emitProgress(false, true);
    }

    private void armSeekBar() {
        if (isLiveTV || seekBar == null || player == null) {
            return;
        }
        controlsHandler.removeCallbacks(hideControlsRunnable);
        isSeekBarArmed = true;
        pendingSeekPositionMs = Math.max(0L, player.getCurrentPosition());
        updateProgressUi();
        refreshControlHint();
    }

    private void disarmSeekBar(boolean restoreCurrentTime) {
        boolean wasArmed = isSeekBarArmed;
        isSeekBarArmed = false;
        pendingSeekPositionMs = -1L;

        if (restoreCurrentTime || wasArmed) {
            updateProgressUi();
            refreshControlHint();
        }

        applySeekBarPreviewState();
    }

    private void confirmSeekBarSelection() {
        if (player == null || pendingSeekPositionMs < 0L) {
            disarmSeekBar(true);
            scheduleHideControls();
            return;
        }

        long targetPositionMs = clampSeekPosition(pendingSeekPositionMs);
        player.seekTo(targetPositionMs);
        pendingSeekPositionMs = -1L;
        isSeekBarArmed = false;
        updateProgressUi();
        refreshControlHint();
        emitProgress(false, true);
        scheduleHideControls();
    }

    private void adjustSeekBarSelection(long deltaMs) {
        if (!isSeekBarArmed || seekBar == null) {
            return;
        }
        long basePositionMs = pendingSeekPositionMs >= 0L
            ? pendingSeekPositionMs
            : (player != null ? Math.max(0L, player.getCurrentPosition()) : 0L);
        pendingSeekPositionMs = clampSeekPosition(basePositionMs + deltaMs);
        updateProgressUi();
        refreshControlHint();
    }

    private long clampSeekPosition(long valueMs) {
        long safeValue = Math.max(0L, valueMs);
        long durationMs = resolveDurationMs();
        if (durationMs > 0L) {
            safeValue = Math.min(safeValue, durationMs);
        }
        return safeValue;
    }

    private void applySeekBarPreviewState() {
        if (seekBar == null) {
            return;
        }
        float focusBoost = seekBar.hasFocus() ? 1.04f : 1f;
        seekBar.setAlpha(isSeekBarArmed ? 1f : 0.94f);
        seekBar.setScaleY((isSeekBarArmed ? 1.16f : 1f) * focusBoost);
        seekBar.setScaleX(focusBoost);
    }

    private void changeChannelByStep(int delta) {
        if (!isLiveTV || channelUrls == null || channelUrls.isEmpty()) {
            return;
        }
        int count = channelUrls.size();
        currentChannelSelection = (resolveCurrentChannelSelection() + delta) % count;
        if (currentChannelSelection < 0) {
            currentChannelSelection += count;
        }
        playSelectedChannel(currentChannelSelection, true);
    }

    private void playSelectedChannel(int index, boolean showToast) {
        if (!isLiveTV || index < 0 || index >= channelUrls.size()) {
            return;
        }

        String selectedUrl = channelUrls.get(index);
        if (TextUtils.isEmpty(selectedUrl)) {
            return;
        }

        currentChannelSelection = index;
        baseTitle = safeGet(channelNames, index, baseTitle);
        loadMedia(selectedUrl, 0L);

        if (showToast) {
            Toast.makeText(this, "Sintonizando: " + safeGet(channelNames, index, "Canal"), Toast.LENGTH_SHORT).show();
        }
    }

    private void goToPreviousEpisode() {
        int currentIndex = resolveCurrentChapterListIndex();
        if (currentIndex > 0) {
            playSelectedChapter(currentIndex - 1, true);
        } else {
            Toast.makeText(this, "Primer episodio", Toast.LENGTH_SHORT).show();
        }
    }

    private void goToNextEpisode() {
        int currentIndex = resolveCurrentChapterListIndex();
        if (currentIndex >= 0 && currentIndex < chapterUrls.size() - 1) {
            playSelectedChapter(currentIndex + 1, true);
        } else {
            Toast.makeText(this, "Ultimo episodio", Toast.LENGTH_SHORT).show();
        }
    }

    private void playSelectedChapter(int index, boolean showToast) {
        if (index < 0 || index >= chapterUrls.size()) {
            return;
        }

        String selectedUrl = safeGet(chapterUrls, index, null);
        if (TextUtils.isEmpty(selectedUrl)) {
            return;
        }

        if (player != null) {
            emitProgress(false, true);
        }

        Integer selectedSeasonIndex = safeGet(chapterSeasonIndices, index, null);
        Integer selectedChapterIndex = safeGet(chapterIndices, index, null);
        if (selectedSeasonIndex != null) {
            seasonIndex = selectedSeasonIndex;
        }
        if (selectedChapterIndex != null) {
            chapterIndex = selectedChapterIndex;
        }

        loadMedia(selectedUrl, 0L);

        if (showToast) {
            Toast.makeText(this, "Reproduciendo: " + safeGet(chapterTitles, index, "Episodio"), Toast.LENGTH_SHORT).show();
        }
    }

    private int resolveCurrentChapterListIndex() {
        if (chapterUrls == null || chapterUrls.isEmpty()) {
            return -1;
        }

        int byUrl = chapterUrls.indexOf(currentVideoUrl);
        if (byUrl >= 0) {
            return byUrl;
        }

        if (seasonIndex >= 0 && chapterIndex >= 0
            && chapterSeasonIndices != null && chapterIndices != null
            && chapterSeasonIndices.size() == chapterUrls.size()
            && chapterIndices.size() == chapterUrls.size()) {
            for (int i = 0; i < chapterUrls.size(); i++) {
                Integer seasonValue = safeGet(chapterSeasonIndices, i, null);
                Integer chapterValue = safeGet(chapterIndices, i, null);
                if (seasonValue != null && chapterValue != null
                    && seasonValue == seasonIndex && chapterValue == chapterIndex) {
                    return i;
                }
            }
        }

        return -1;
    }

    private int resolveCurrentChannelSelection() {
        if (channelUrls == null || channelUrls.isEmpty()) {
            return 0;
        }

        int byUrl = channelUrls.indexOf(currentVideoUrl);
        if (byUrl >= 0) {
            return byUrl;
        }

        return Math.min(Math.max(0, currentChannelSelection), channelUrls.size() - 1);
    }

    private void openContextListPanel(View sourceView) {
        if (isLiveTV) {
            openChannelsPanel(sourceView);
        } else {
            openEpisodesPanel(sourceView);
        }
    }

    private void openTracksPanel(View sourceView) {
        beginSelectionPanel("Pistas", "Audio y subtitulos disponibles", sourceView);

        RendererTrackState audioState = buildRendererTrackState(C.TRACK_TYPE_AUDIO, false);
        if (!audioState.options.isEmpty()) {
            addSelectionSectionTitle("Audio");
            for (int i = 0; i < audioState.options.size(); i++) {
                final int optionIndex = i;
                final String optionLabel = audioState.options.get(i).label;
                addSelectionOptionButton(optionLabel, audioState.selectedOptionIndex == i, () -> {
                    applyTrackSelection(audioState, optionIndex, false);
                    updateHeaderAndMeta();
                    openTracksPanel(sourceView);
                });
            }
        }

        RendererTrackState subtitleState = buildRendererTrackState(C.TRACK_TYPE_TEXT, true);
        if (!subtitleState.options.isEmpty()) {
            addSelectionSectionTitle("Subtitulos");
            for (int i = 0; i < subtitleState.options.size(); i++) {
                final int optionIndex = i;
                final String optionLabel = subtitleState.options.get(i).label;
                addSelectionOptionButton(optionLabel, subtitleState.selectedOptionIndex == i, () -> {
                    applyTrackSelection(subtitleState, optionIndex, true);
                    updateHeaderAndMeta();
                    openTracksPanel(sourceView);
                });
            }
        }

        finalizeSelectionPanel();
    }

    private void openSpeedPanel(View sourceView) {
        beginSelectionPanel("Velocidad", "Selecciona la velocidad de reproduccion", sourceView);
        for (int i = 0; i < PLAYBACK_SPEEDS.length; i++) {
            final int optionIndex = i;
            final String label = formatSpeedLabel(PLAYBACK_SPEEDS[i]);
            addSelectionOptionButton(label, currentSpeedIndex == i, () -> {
                currentSpeedIndex = optionIndex;
                if (player != null) {
                    player.setPlaybackParameters(new PlaybackParameters(PLAYBACK_SPEEDS[optionIndex]));
                }
                updateHeaderAndMeta();
                closeSelectionPanel(true);
            });
        }
        finalizeSelectionPanel();
    }

    private void openAspectRatioPanel(View sourceView) {
        beginSelectionPanel("Aspecto", "Ajuste de encuadre de video", sourceView);
        for (int i = 0; i < ASPECT_RATIO_LABELS.length; i++) {
            final int optionIndex = i;
            final String label = ASPECT_RATIO_LABELS[i];
            addSelectionOptionButton(label, currentAspectRatioIndex == i, () -> {
                currentAspectRatioIndex = optionIndex;
                if (playerView != null) {
                    playerView.setResizeMode(ASPECT_RATIO_MODES[optionIndex]);
                }
                updateHeaderAndMeta();
                closeSelectionPanel(true);
            });
        }
        finalizeSelectionPanel();
    }

    private void openEpisodesPanel(View sourceView) {
        if (chapterTitles == null || chapterTitles.isEmpty() || chapterUrls == null || chapterUrls.isEmpty()) {
            Toast.makeText(this, "No hay episodios disponibles", Toast.LENGTH_SHORT).show();
            return;
        }

        beginSelectionPanel("Episodios", "Selecciona el episodio a reproducir", sourceView);
        int currentIndex = resolveCurrentChapterListIndex();
        for (int i = 0; i < chapterTitles.size(); i++) {
            final int optionIndex = i;
            addSelectionOptionButton(buildChapterDisplayTitle(i), currentIndex == i, () -> {
                playSelectedChapter(optionIndex, false);
                closeSelectionPanel(false);
                controlsContainer.post(this::focusPrimaryControlsIfNeeded);
            });
        }
        finalizeSelectionPanel();
    }

    private void openChannelsPanel(View sourceView) {
        if (channelNames == null || channelNames.isEmpty() || channelUrls == null || channelUrls.isEmpty()) {
            Toast.makeText(this, "No hay canales disponibles", Toast.LENGTH_SHORT).show();
            return;
        }

        beginSelectionPanel("Canales", "Selecciona el canal en vivo", sourceView);
        int currentIndex = resolveCurrentChannelSelection();
        int count = Math.min(channelNames.size(), channelUrls.size());
        for (int i = 0; i < count; i++) {
            final int optionIndex = i;
            addSelectionOptionButton(safeGet(channelNames, i, "Canal " + (i + 1)), currentIndex == i, () -> {
                playSelectedChannel(optionIndex, false);
                closeSelectionPanel(false);
                controlsContainer.post(this::focusPrimaryControlsIfNeeded);
            });
        }
        finalizeSelectionPanel();
    }

    private void beginSelectionPanel(String title, String hint, View sourceView) {
        selectionPanelSourceView = sourceView != null ? sourceView : playPauseButton;
        isSelectionPanelVisible = true;
        selectionPanelOptionViews.clear();
        selectionPanelContent.removeAllViews();
        selectionPanelScrollView.scrollTo(0, 0);
        selectionPanelTitleView.setText(title);
        if (TextUtils.isEmpty(hint)) {
            selectionPanelHintView.setVisibility(View.GONE);
            selectionPanelHintView.setText("");
        } else {
            selectionPanelHintView.setVisibility(View.VISIBLE);
            selectionPanelHintView.setText(hint);
        }
        setOverlayVisibility(true, true);
    }

    private void addSelectionSectionTitle(String title) {
        TextView label = new TextView(this);
        label.setText(title.toUpperCase(Locale.ROOT));
        label.setTextColor(Color.parseColor("#A9C2E6"));
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        label.setTypeface(label.getTypeface(), android.graphics.Typeface.BOLD);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.bottomMargin = dpToPx(6);
        if (selectionPanelContent.getChildCount() > 0) {
            params.topMargin = dpToPx(12);
        }
        label.setLayoutParams(params);
        selectionPanelContent.addView(label);
    }

    private void addSelectionOptionButton(String label, boolean selected, Runnable action) {
        Button optionButton = new Button(this);
        optionButton.setId(View.generateViewId());
        optionButton.setAllCaps(false);
        optionButton.setBackground(ContextCompat.getDrawable(this, R.drawable.tv_exo_panel_option));
        optionButton.setMinHeight(0);
        optionButton.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));
        optionButton.setText(label);
        optionButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        optionButton.setTextColor(Color.WHITE);
        optionButton.setGravity(android.view.Gravity.START | android.view.Gravity.CENTER_VERTICAL);
        optionButton.setSelected(selected);
        optionButton.setFocusable(true);
        optionButton.setFocusableInTouchMode(true);
        optionButton.setStateListAnimator(null);
        optionButton.setOnClickListener(v -> {
            action.run();
            showControls();
        });
        optionButton.setOnFocusChangeListener((view, hasFocus) -> view.animate()
            .scaleX(hasFocus ? 1.03f : 1f)
            .scaleY(hasFocus ? 1.03f : 1f)
            .setDuration(120L)
            .start());

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.bottomMargin = dpToPx(6);
        optionButton.setLayoutParams(params);
        selectionPanelContent.addView(optionButton);
        selectionPanelOptionViews.add(optionButton);
    }

    private void finalizeSelectionPanel() {
        if (selectionPanelOptionViews.isEmpty()) {
            closeSelectionPanel(true);
            return;
        }

        int fallbackSourceId = selectionPanelSourceView != null ? selectionPanelSourceView.getId() : playPauseButton.getId();
        View preferredFocus = resolveSelectionPanelPreferredFocus();

        for (int i = 0; i < selectionPanelOptionViews.size(); i++) {
            View currentView = selectionPanelOptionViews.get(i);
            View upView = i > 0 ? selectionPanelOptionViews.get(i - 1) : currentView;
            View downView = i < selectionPanelOptionViews.size() - 1 ? selectionPanelOptionViews.get(i + 1) : currentView;
            currentView.setNextFocusUpId(upView.getId());
            currentView.setNextFocusDownId(downView.getId());
            currentView.setNextFocusLeftId(currentView.getId());
            currentView.setNextFocusRightId(fallbackSourceId);
        }

        if (selectionPanelSourceView != null) {
            selectionPanelSourceView.setNextFocusLeftId(preferredFocus.getId());
        }

        selectionPanel.post(() -> {
            setOverlayVisibility(true, true);
            preferredFocus.requestFocus();
        });
        scheduleHideControls();
    }

    private void closeSelectionPanel(boolean restoreFocus) {
        isSelectionPanelVisible = false;
        updateSingleOverlayVisibility(selectionPanel, false, true);
        selectionPanelContent.removeAllViews();
        selectionPanelOptionViews.clear();
        selectionPanelHintView.setText("");
        configureControlFocusOrder();
        if (restoreFocus && selectionPanelSourceView != null && selectionPanelSourceView.isFocusable()) {
            selectionPanelSourceView.requestFocus();
        }
        selectionPanelSourceView = null;
        scheduleHideControls();
    }

    private void showTracksDialog() {
        boolean hasMultipleAudioTracks = buildRendererTrackState(C.TRACK_TYPE_AUDIO, false).availableTrackCount > 1;
        boolean hasSubtitleTracks = buildRendererTrackState(C.TRACK_TYPE_TEXT, true).availableTrackCount > 0;

        if (!hasMultipleAudioTracks && !hasSubtitleTracks) {
            Toast.makeText(this, "No hay pistas alternas para este video", Toast.LENGTH_SHORT).show();
            return;
        }

        if (hasMultipleAudioTracks && !hasSubtitleTracks) {
            showAudioTrackDialog();
            return;
        }

        if (!hasMultipleAudioTracks) {
            showSubtitleTrackDialog();
            return;
        }

        ArrayList<String> options = new ArrayList<>();
        options.add("Audio (" + trimLabel(resolveCurrentAudioTrackLabel(), 18) + ")");
        options.add("Subtitulos");
        showSimpleDialog("Pistas", options, which -> {
            if (which == 0) {
                controlsHandler.post(this::showAudioTrackDialog);
            } else if (which == 1) {
                controlsHandler.post(this::showSubtitleTrackDialog);
            }
        });
    }

    private void showAudioTrackDialog() {
        RendererTrackState state = buildRendererTrackState(C.TRACK_TYPE_AUDIO, false);
        if (state.availableTrackCount <= 1 || state.rendererIndex == C.INDEX_UNSET || state.trackGroups == null) {
            Toast.makeText(this, "No hay audio alterno disponible", Toast.LENGTH_SHORT).show();
            return;
        }

        ArrayList<String> labels = new ArrayList<>();
        for (TrackOption option : state.options) {
            labels.add(option.label);
        }

        showSingleChoiceDialog("Seleccionar audio", labels, state.selectedOptionIndex, which -> {
            applyTrackSelection(state, which, false);
            Toast.makeText(this, "Audio: " + trimLabel(labels.get(which), 26), Toast.LENGTH_SHORT).show();
            updateHeaderAndMeta();
        });
    }

    private void showSubtitleTrackDialog() {
        RendererTrackState state = buildRendererTrackState(C.TRACK_TYPE_TEXT, true);
        if (state.availableTrackCount <= 0 || state.rendererIndex == C.INDEX_UNSET || state.trackGroups == null) {
            Toast.makeText(this, "No hay subtitulos disponibles", Toast.LENGTH_SHORT).show();
            return;
        }

        ArrayList<String> labels = new ArrayList<>();
        for (TrackOption option : state.options) {
            labels.add(option.label);
        }

        showSingleChoiceDialog("Subtitulos", labels, state.selectedOptionIndex, which -> {
            applyTrackSelection(state, which, true);
            String subtitleLabel = which == 0 ? "Subtitulos apagados" : "Subtitulos: " + trimLabel(labels.get(which), 26);
            Toast.makeText(this, subtitleLabel, Toast.LENGTH_SHORT).show();
            updateHeaderAndMeta();
        });
    }

    private RendererTrackState buildRendererTrackState(int trackType, boolean includeOffOption) {
        RendererTrackState state = new RendererTrackState();
        if (trackSelector == null || player == null) {
            return state;
        }

        MappingTrackSelector.MappedTrackInfo mappedTrackInfo = trackSelector.getCurrentMappedTrackInfo();
        if (mappedTrackInfo == null) {
            return state;
        }

        TrackSelectionArray currentSelections = player.getCurrentTrackSelections();

        for (int rendererIndex = 0; rendererIndex < mappedTrackInfo.getRendererCount(); rendererIndex++) {
            if (mappedTrackInfo.getRendererType(rendererIndex) != trackType) {
                continue;
            }

            state.rendererIndex = rendererIndex;
            state.trackGroups = mappedTrackInfo.getTrackGroups(rendererIndex);
            TrackSelection currentSelection = currentSelections.get(rendererIndex);

            if (includeOffOption) {
                state.options.add(new TrackOption(-1, -1, "Desactivados"));
                state.selectedOptionIndex = currentSelection == null ? 0 : -1;
            }

            int ordinal = 1;
            for (int groupIndex = 0; groupIndex < state.trackGroups.length; groupIndex++) {
                TrackGroup trackGroup = state.trackGroups.get(groupIndex);
                for (int trackIndex = 0; trackIndex < trackGroup.length; trackIndex++) {
                    Format format = trackGroup.getFormat(trackIndex);
                    String label = buildTrackLabel(format, trackType, ordinal++);
                    state.options.add(new TrackOption(groupIndex, trackIndex, label));
                    state.availableTrackCount++;

                    if (currentSelection != null
                        && currentSelection.getTrackGroup() == trackGroup
                        && currentSelection.indexOf(trackIndex) != C.INDEX_UNSET) {
                        state.selectedOptionIndex = state.options.size() - 1;
                    }
                }
            }
            break;
        }

        return state;
    }

    private void applyTrackSelection(RendererTrackState state, int optionIndex, boolean allowOffOption) {
        if (trackSelector == null || state.rendererIndex == C.INDEX_UNSET || state.trackGroups == null) {
            return;
        }
        if (optionIndex < 0 || optionIndex >= state.options.size()) {
            return;
        }

        DefaultTrackSelector.Parameters.Builder builder = trackSelector.buildUponParameters();
        builder.clearSelectionOverrides(state.rendererIndex);

        TrackOption option = state.options.get(optionIndex);
        if (allowOffOption && option.groupIndex < 0) {
            builder.setRendererDisabled(state.rendererIndex, true);
        } else {
            builder.setRendererDisabled(state.rendererIndex, false);
            builder.setSelectionOverride(
                state.rendererIndex,
                state.trackGroups,
                new DefaultTrackSelector.SelectionOverride(option.groupIndex, option.trackIndex)
            );
        }

        trackSelector.setParameters(builder);
    }

    private String resolveCurrentAudioTrackLabel() {
        RendererTrackState state = buildRendererTrackState(C.TRACK_TYPE_AUDIO, false);
        if (state.selectedOptionIndex >= 0 && state.selectedOptionIndex < state.options.size()) {
            return state.options.get(state.selectedOptionIndex).label;
        }
        return "Auto";
    }

    private String buildTrackLabel(Format format, int trackType, int ordinal) {
        ArrayList<String> parts = new ArrayList<>();

        if (!TextUtils.isEmpty(format.label)) {
            parts.add(format.label.trim());
        }

        if (!TextUtils.isEmpty(format.language) && !"und".equalsIgnoreCase(format.language)) {
            parts.add(format.language.toUpperCase(Locale.ROOT));
        }

        String codecLabel = formatCodecLabel(format.sampleMimeType);
        if (!TextUtils.isEmpty(codecLabel)) {
            parts.add(codecLabel);
        }

        if (trackType == C.TRACK_TYPE_AUDIO && format.channelCount > 0) {
            parts.add(format.channelCount + "ch");
        }

        if (parts.isEmpty()) {
            parts.add(trackType == C.TRACK_TYPE_AUDIO ? "Audio " + ordinal : "Subtitulo " + ordinal);
        }

        return TextUtils.join(" - ", parts);
    }

    private String formatCodecLabel(String sampleMimeType) {
        if (TextUtils.isEmpty(sampleMimeType)) {
            return "";
        }

        String normalized = sampleMimeType.toLowerCase(Locale.ROOT);
        if (normalized.contains("eac3")) {
            return "E-AC3";
        }
        if (normalized.contains("ac3")) {
            return "AC3";
        }
        if (normalized.contains("mp4a")) {
            return "AAC";
        }
        if (normalized.contains("dts")) {
            return "DTS";
        }
        if (normalized.contains("cea-608")) {
            return "CEA-608";
        }
        if (normalized.contains("cea-708")) {
            return "CEA-708";
        }
        int slashIndex = normalized.indexOf('/');
        return slashIndex >= 0 && slashIndex < normalized.length() - 1
            ? normalized.substring(slashIndex + 1).toUpperCase(Locale.ROOT)
            : normalized.toUpperCase(Locale.ROOT);
    }

    private void cycleAspectRatio() {
        currentAspectRatioIndex = (currentAspectRatioIndex + 1) % ASPECT_RATIO_MODES.length;
        if (playerView != null) {
            playerView.setResizeMode(ASPECT_RATIO_MODES[currentAspectRatioIndex]);
        }
        updateHeaderAndMeta();
        Toast.makeText(this, "Aspecto: " + ASPECT_RATIO_LABELS[currentAspectRatioIndex], Toast.LENGTH_SHORT).show();
    }

    private void showSpeedDialog() {
        ArrayList<String> options = new ArrayList<>();
        for (float speed : PLAYBACK_SPEEDS) {
            options.add(formatSpeedLabel(speed));
        }

        showSingleChoiceDialog("Velocidad", options, currentSpeedIndex, which -> {
            currentSpeedIndex = which;
            if (player != null) {
                player.setPlaybackParameters(new PlaybackParameters(PLAYBACK_SPEEDS[which]));
            }
            updateHeaderAndMeta();
            Toast.makeText(this, "Velocidad: " + options.get(which), Toast.LENGTH_SHORT).show();
        });
    }

    private String formatSpeedLabel(float speed) {
        if (speed == 1.0f) {
            return "1.0x";
        }
        return String.format(Locale.US, "%.2fx", speed);
    }

    private void showSettingsDialog() {
        ArrayList<String> options = new ArrayList<>();
        String alternatePlayerType = resolveAlternatePlayerType();
        if (!TextUtils.isEmpty(alternatePlayerType)) {
            options.add("Usar " + resolvePlayerDisplayName(alternatePlayerType));
        }
        options.add(isScreenLocked ? "Desbloquear controles" : "Bloquear controles");
        options.add("Pistas");
        options.add("Velocidad");
        options.add("Aspecto");
        options.add(isLiveTV ? "Lista de canales" : "Lista de episodios");

        showSimpleDialog("Ajustes", options, which -> {
            int optionIndex = 0;
            if (!TextUtils.isEmpty(alternatePlayerType)) {
                if (which == optionIndex) {
                    switchPlayerEngine(alternatePlayerType, false, "manual_switch");
                    return;
                }
                optionIndex++;
            }

            if (which == optionIndex) {
                toggleScreenLock();
                return;
            }
            optionIndex++;

            if (which == optionIndex) {
                showTracksDialog();
                return;
            }
            optionIndex++;

            if (which == optionIndex) {
                showSpeedDialog();
                return;
            }
            optionIndex++;

            if (which == optionIndex) {
                cycleAspectRatio();
                return;
            }
            optionIndex++;

            if (which == optionIndex) {
                if (isLiveTV) {
                    showLiveChannelsDialog();
                } else {
                    showChaptersDialog();
                }
            }
        });
    }

    private String resolveAlternatePlayerType() {
        return "android-vlc".equalsIgnoreCase(requestedPlayerType)
            ? "android-exoplayer"
            : "android-vlc";
    }

    private String resolvePlayerDisplayName(String playerType) {
        return "android-vlc".equalsIgnoreCase(playerType) ? "VLC" : "ExoPlayer";
    }

    private boolean shouldAutoSwitchToAlternatePlayer(PlaybackException error) {
        if (error == null || engineFallbackAttempted) {
            return false;
        }
        if ("android-vlc".equalsIgnoreCase(requestedPlayerType)) {
            return false;
        }

        String diagnosticText = (
            String.valueOf(error.getMessage()) + " " + String.valueOf(error.getCause())
        ).toLowerCase(Locale.ROOT);

        return diagnosticText.contains("decoder")
            || diagnosticText.contains("codec")
            || diagnosticText.contains("audio")
            || diagnosticText.contains("renderer")
            || diagnosticText.contains("format");
    }

    private void switchPlayerEngine(String targetPlayerType, boolean markFallbackAttempted, String reason) {
        if (TextUtils.isEmpty(targetPlayerType) || targetPlayerType.equalsIgnoreCase(requestedPlayerType)) {
            return;
        }

        long startSeconds = 0L;
        if (!isLiveTV && player != null) {
            startSeconds = Math.max(0L, player.getCurrentPosition() / 1000L);
        }

        Intent switchIntent = buildPlayerIntent(targetPlayerType, startSeconds, markFallbackAttempted);
        isSwitchingPlayerEngine = true;
        Log.d(TAG, "Switching player engine to " + targetPlayerType + " reason=" + reason);
        releasePlayer(null);
        startActivity(switchIntent);
        finish();
    }

    private Intent buildPlayerIntent(String targetPlayerType, long startTimeSeconds, boolean markFallbackAttempted) {
        Class<?> targetActivity = "android-vlc".equalsIgnoreCase(targetPlayerType)
            ? VLCPlayerActivity.class
            : ExoPlayerActivity.class;

        Intent intent = new Intent(this, targetActivity);
        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        intent.putExtra("video_url", currentVideoUrl);
        intent.putExtra("video_title", baseTitle);
        intent.putExtra("video_meta_line", videoMetaLine);
        intent.putExtra("start_time", startTimeSeconds);
        intent.putExtra("player_type", targetPlayerType);
        intent.putExtra("season_index", seasonIndex);
        intent.putExtra("chapter_index", chapterIndex);
        intent.putExtra("is_live_tv", isLiveTV);
        intent.putExtra("content_type", contentType);
        intent.putExtra("engine_fallback_attempted", markFallbackAttempted);
        intent.putStringArrayListExtra("chapter_titles", chapterTitles);
        intent.putStringArrayListExtra("chapter_urls", chapterUrls);
        intent.putIntegerArrayListExtra("chapter_season_numbers", chapterSeasonNumbers);
        intent.putIntegerArrayListExtra("chapter_numbers", chapterNumbers);
        intent.putIntegerArrayListExtra("chapter_season_indices", chapterSeasonIndices);
        intent.putIntegerArrayListExtra("chapter_indices", chapterIndices);
        intent.putStringArrayListExtra("channel_names", channelNames);
        intent.putStringArrayListExtra("channel_logos", channelLogos);
        intent.putStringArrayListExtra("channel_urls", channelUrls);
        return intent;
    }

    private void showChaptersDialog() {
        if (chapterTitles == null || chapterTitles.isEmpty() || chapterUrls == null || chapterUrls.isEmpty()) {
            Toast.makeText(this, "No hay capitulos disponibles", Toast.LENGTH_SHORT).show();
            return;
        }

        ArrayList<String> formattedTitles = new ArrayList<>();
        for (int i = 0; i < chapterTitles.size(); i++) {
            formattedTitles.add(buildChapterDisplayTitle(i));
        }

        showSingleChoiceDialog("Capitulos", formattedTitles, resolveCurrentChapterListIndex(), which -> {
            playSelectedChapter(which, true);
        });
    }

    private void showLiveChannelsDialog() {
        if (channelNames == null || channelNames.isEmpty() || channelUrls == null || channelUrls.isEmpty()) {
            Toast.makeText(this, "No hay canales disponibles", Toast.LENGTH_SHORT).show();
            return;
        }

        ArrayList<String> visibleChannelNames = new ArrayList<>();
        int count = Math.min(channelNames.size(), channelUrls.size());
        for (int i = 0; i < count; i++) {
            visibleChannelNames.add(safeGet(channelNames, i, "Canal " + (i + 1)));
        }

        showSingleChoiceDialog("Seleccionar canal", visibleChannelNames, resolveCurrentChannelSelection(), which -> {
            playSelectedChannel(which, true);
        });
    }

    private void showSimpleDialog(String title, List<String> options, DialogSelectionHandler handler) {
        dismissActiveDialog();

        ArrayAdapter<String> adapter = createDialogAdapter(options, false);
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle(title)
            .setAdapter(adapter, (dialogInterface, which) -> handler.onSelected(which))
            .setNegativeButton("Cancelar", (dialogInterface, which) -> dialogInterface.dismiss())
            .create();

        showStyledDialog(dialog);
    }

    private void showSingleChoiceDialog(String title, List<String> options, int checkedIndex, DialogSelectionHandler handler) {
        dismissActiveDialog();

        ArrayAdapter<String> adapter = createDialogAdapter(options, true);
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle(title)
            .setSingleChoiceItems(adapter, checkedIndex, (dialogInterface, which) -> {
                handler.onSelected(which);
                dialogInterface.dismiss();
            })
            .setNegativeButton("Cancelar", (dialogInterface, which) -> dialogInterface.dismiss())
            .create();

        showStyledDialog(dialog);
    }

    private ArrayAdapter<String> createDialogAdapter(List<String> options, boolean singleChoice) {
        int layoutId = singleChoice
            ? android.R.layout.simple_list_item_single_choice
            : android.R.layout.simple_list_item_1;

        return new ArrayAdapter<String>(this, layoutId, options) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                View view = super.getView(position, convertView, parent);
                if (view instanceof TextView) {
                    TextView textView = (TextView) view;
                    textView.setTextColor(Color.WHITE);
                    textView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
                    int paddingHorizontal = dpToPx(16);
                    int paddingVertical = dpToPx(12);
                    textView.setPadding(paddingHorizontal, paddingVertical, paddingHorizontal, paddingVertical);
                }
                if (view instanceof CheckedTextView) {
                    ((CheckedTextView) view).setCheckMarkTintList(
                        ColorStateList.valueOf(ContextCompat.getColor(ExoPlayerActivity.this, R.color.colorAccent))
                    );
                }
                view.setBackgroundColor(Color.TRANSPARENT);
                return view;
            }
        };
    }

    private void showStyledDialog(AlertDialog dialog) {
        activeDialog = dialog;
        dialog.setOnDismissListener(dialogInterface -> {
            if (activeDialog == dialog) {
                activeDialog = null;
            }
            if (!isScreenLocked) {
                showControls();
            }
        });
        dialog.show();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(ContextCompat.getDrawable(this, R.drawable.tv_exo_dialog_background));
        }

        if (dialog.getListView() != null) {
            dialog.getListView().setDivider(new ColorDrawable(Color.TRANSPARENT));
            dialog.getListView().setDividerHeight(dpToPx(6));
            dialog.getListView().setPadding(dpToPx(8), dpToPx(12), dpToPx(8), dpToPx(4));
        }

        if (dialog.getButton(DialogInterface.BUTTON_NEGATIVE) != null) {
            dialog.getButton(DialogInterface.BUTTON_NEGATIVE)
                .setTextColor(ContextCompat.getColor(this, R.color.colorAccent));
        }
    }

    private void dismissActiveDialog() {
        if (activeDialog != null && activeDialog.isShowing()) {
            activeDialog.dismiss();
        }
    }

    private void showControls() {
        if (isScreenLocked) {
            showLockedMessage("Controles bloqueados. Pulsa OK para desbloquear.");
            return;
        }
        setOverlayVisibility(true, true);
        if (controlsContainer != null) {
            controlsContainer.post(() -> {
                if (isSelectionPanelVisible) {
                    focusSelectionPanelIfNeeded();
                } else {
                    focusPrimaryControlsIfNeeded();
                }
            });
        } else {
            if (isSelectionPanelVisible) {
                focusSelectionPanelIfNeeded();
            } else {
                focusPrimaryControlsIfNeeded();
            }
        }
        scheduleHideControls();
    }

    private void scheduleHideControls() {
        controlsHandler.removeCallbacks(hideControlsRunnable);
        if (canAutoHideControls()) {
            controlsHandler.postDelayed(hideControlsRunnable, CONTROL_AUTO_HIDE_MS);
        }
    }

    private boolean canAutoHideControls() {
        return player != null
            && player.isPlaying()
            && !isSelectionPanelVisible
            && !isScreenLocked
            && (activeDialog == null || !activeDialog.isShowing());
    }

    private void setOverlayVisibility(boolean visible, boolean animate) {
        controlsVisible = visible;
        updateSingleOverlayVisibility(topScrim, visible, animate);
        updateSingleOverlayVisibility(bottomScrim, visible, animate);
        updateSingleOverlayVisibility(topPanel, visible, animate);
        updateSingleOverlayVisibility(controlsContainer, visible, animate);
        updateSingleOverlayVisibility(selectionPanel, visible && isSelectionPanelVisible, animate);
    }

    private void updateSingleOverlayVisibility(View view, boolean visible, boolean animate) {
        if (view == null) {
            return;
        }
        if (visible) {
            view.setVisibility(View.VISIBLE);
            if (animate) {
                view.setScaleX(0.985f);
                view.setScaleY(0.985f);
                view.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(180L).start();
            } else {
                view.setAlpha(1f);
                view.setScaleX(1f);
                view.setScaleY(1f);
            }
        } else if (animate) {
            view.animate().alpha(0f).scaleX(0.985f).scaleY(0.985f).setDuration(180L)
                .withEndAction(() -> view.setVisibility(View.GONE))
                .start();
        } else {
            view.setAlpha(0f);
            view.setScaleX(0.985f);
            view.setScaleY(0.985f);
            view.setVisibility(View.GONE);
        }
    }

    private void focusSeekBar() {
        if (isLiveTV || seekBar == null) {
            showControls();
            return;
        }
        seekBar.requestFocus();
        scheduleHideControls();
    }

    private void focusRewindButton() {
        if (!isLiveTV && rewindButton.getVisibility() == View.VISIBLE) {
            showControls();
            rewindButton.requestFocus();
        } else {
            focusPrimaryControls();
        }
    }

    private void focusForwardButton() {
        if (!isLiveTV && forwardButton.getVisibility() == View.VISIBLE) {
            showControls();
            forwardButton.requestFocus();
        } else {
            focusPrimaryControls();
        }
    }

    private void focusPrimaryControls() {
        showControls();
        focusPrimaryControlsIfNeeded();
    }

    private void focusSelectionPanelIfNeeded() {
        if (!isSelectionPanelVisible || selectionPanelOptionViews.isEmpty()) {
            focusPrimaryControlsIfNeeded();
            return;
        }
        View currentFocus = getCurrentFocus();
        if (isViewInside(currentFocus, selectionPanel)) {
            return;
        }
        resolveSelectionPanelPreferredFocus().requestFocus();
    }

    private View resolveSelectionPanelPreferredFocus() {
        for (View optionView : selectionPanelOptionViews) {
            if (optionView.isSelected()) {
                return optionView;
            }
        }
        return selectionPanelOptionViews.get(0);
    }

    private void focusPrimaryControlsIfNeeded() {
        View currentFocus = getCurrentFocus();
        if (isViewInside(currentFocus, controlsContainer) || isViewInside(currentFocus, topPanel)) {
            return;
        }

        if (playPauseButton.getVisibility() == View.VISIBLE && playPauseButton.isEnabled()) {
            playPauseButton.requestFocus();
            return;
        }
        if (channelsButton.getVisibility() == View.VISIBLE && channelsButton.isEnabled()) {
            channelsButton.requestFocus();
            return;
        }
        tracksButton.requestFocus();
    }

    private boolean isControlsFocused() {
        View focused = getCurrentFocus();
        return isViewInside(focused, controlsContainer)
            || isViewInside(focused, selectionPanel)
            || isViewInside(focused, topPanel);
    }

    private boolean isSeekBarFocused() {
        return getCurrentFocus() == seekBar;
    }

    private boolean isViewInside(View child, View parent) {
        if (child == null || parent == null) {
            return false;
        }
        View current = child;
        while (current != null) {
            if (current == parent) {
                return true;
            }
            if (!(current.getParent() instanceof View)) {
                break;
            }
            current = (View) current.getParent();
        }
        return false;
    }

    private void toggleScreenLock() {
        isScreenLocked = !isScreenLocked;
        updateButtonLabels();

        if (isScreenLocked) {
            setOverlayVisibility(false, true);
            showLockedMessage("Controles bloqueados. Pulsa OK para desbloquear.");
        } else {
            hideLockMessage();
            showControls();
        }
    }

    private void showLockedMessage(String message) {
        lockMessageView.setText(message);
        lockMessageView.setAlpha(1f);
        lockMessageView.setVisibility(View.VISIBLE);
        controlsHandler.removeCallbacks(hideLockMessageRunnable);
        controlsHandler.postDelayed(hideLockMessageRunnable, 2200L);
    }

    private void hideLockMessage() {
        controlsHandler.removeCallbacks(hideLockMessageRunnable);
        lockMessageView.animate().alpha(0f).setDuration(160L).withEndAction(() -> {
            if (!isScreenLocked) {
                lockMessageView.setVisibility(View.GONE);
            }
        }).start();
    }

    private void updateClockLabel() {
        if (clockView == null) {
            return;
        }
        SimpleDateFormat formatter = new SimpleDateFormat("HH:mm", Locale.getDefault());
        clockView.setText(formatter.format(new Date()));
    }

    private void decorateFocusableButton(Button button) {
        button.setOnFocusChangeListener((view, hasFocus) -> {
            view.setSelected(hasFocus);
            view.animate()
                .scaleX(hasFocus ? 1.045f : 1f)
                .scaleY(hasFocus ? 1.045f : 1f)
                .translationY(hasFocus ? -4f : 0f)
                .setDuration(140L)
                .start();
        });
    }

    private void decorateFocusablePrimaryButton(Button button) {
        button.setOnFocusChangeListener((view, hasFocus) -> {
            view.setSelected(hasFocus);
            view.animate()
                .scaleX(hasFocus ? 1.06f : 1f)
                .scaleY(hasFocus ? 1.06f : 1f)
                .translationY(hasFocus ? -4f : 0f)
                .setDuration(160L)
                .start();
        });
    }

    private void decorateSeekBar() {
        seekBar.setOnFocusChangeListener((view, hasFocus) -> applySeekBarPreviewState());
    }

    private void refreshControlHint() {
        if (controlHintView == null) {
            return;
        }
        controlHintView.setText("DPAD Navegar | OK Seleccionar | BACK Salir");
    }

    private int dpToPx(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String formatTime(long millis) {
        long totalSeconds = Math.max(0L, millis / 1000L);
        long seconds = totalSeconds % 60;
        long minutes = (totalSeconds / 60) % 60;
        long hours = totalSeconds / 3600;
        return hours > 0
            ? String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds)
            : String.format(Locale.US, "%02d:%02d", minutes, seconds);
    }

    private String sanitizeUiLabel(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value
            .replace("â€¢", "|")
            .replace("Â·", "|")
            .replace("\u00b7", "|")
            .replace("\u2022", "|");

        return normalized
            .replaceAll("\\s*\\|\\s*", " | ")
            .replaceAll("\\s{2,}", " ")
            .trim();
    }

    private String trimLabel(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLength - 3)) + "...";
    }

    private <T> T safeGet(List<T> list, int index, T fallback) {
        if (list == null || index < 0 || index >= list.size()) {
            return fallback;
        }
        T value = list.get(index);
        return value != null ? value : fallback;
    }

    private void enterFullscreenMode() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterFullscreenMode();
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
        enterFullscreenMode();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (Util.SDK_INT <= 23 && !isInPictureInPictureMode()) {
            releasePlayer(isSwitchingPlayerEngine ? null : "pause");
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (player == null || Util.SDK_INT < 26) {
            return;
        }

        PictureInPictureParams params = new PictureInPictureParams.Builder()
            .setAspectRatio(new Rational(16, 9))
            .build();
        enterPictureInPictureMode(params);
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        if (inPip) {
            setOverlayVisibility(false, false);
            hideLockMessage();
        } else {
            showControls();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (!isInPictureInPictureMode()) {
            releasePlayer(isSwitchingPlayerEngine ? null : "stop");
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(controlReceiver);
        } catch (Exception e) {
            Log.w(TAG, "Error unregistering control receiver", e);
        }
        try {
            unregisterReceiver(liveChannelsReceiver);
        } catch (Exception e) {
            Log.w(TAG, "Error unregistering live channels receiver", e);
        }
        releasePlayer(isSwitchingPlayerEngine ? null : "destroy");
    }

    @Override
    public void onBackPressed() {
        if (activeDialog != null && activeDialog.isShowing()) {
            activeDialog.dismiss();
            return;
        }
        if (isSelectionPanelVisible) {
            closeSelectionPanel(true);
            return;
        }
        if (isScreenLocked) {
            toggleScreenLock();
            return;
        }
        releasePlayer(isSwitchingPlayerEngine ? null : "back");
        super.onBackPressed();
    }
}
