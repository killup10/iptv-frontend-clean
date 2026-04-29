package play.teamg.store;

import android.app.PictureInPictureParams;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.util.Rational;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

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

public class ExoPlayerActivity extends AppCompatActivity {
    private static final String TAG = "ExoPlayerActivity";
    private static final long PROGRESS_UPDATE_INTERVAL_MS = 15000L;
    private static final long SESSION_VALIDATE_INTERVAL_MS = 20000L;

    private PlayerView playerView;
    private ExoPlayer player;
    private String videoUrl;
    private String videoTitle;
    private long startTime;
    private int seasonIndex = -1;
    private int chapterIndex = -1;
    private boolean playerClosedNotified = false;
    private String sessionToken = "";
    private String deviceId = "";
    private String apiBaseUrl = "";
    private boolean sessionValidationInFlight = false;

    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private final Handler sessionValidationHandler = new Handler(Looper.getMainLooper());

    private final Runnable progressRunnable = new Runnable() {
        @Override
        public void run() {
            emitProgress(false, false);
            if (player != null) {
                progressHandler.postDelayed(this, PROGRESS_UPDATE_INTERVAL_MS);
            }
        }
    };

    private final Runnable sessionValidationRunnable = new Runnable() {
        @Override
        public void run() {
            queueSessionValidation();
        }
    };

    private final BroadcastReceiver controlReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getStringExtra("action");
            if (player == null || action == null) return;

            switch (action) {
                case "pause":
                    player.pause();
                    emitProgress(false, true);
                    break;
                case "play":
                    player.play();
                    break;
                case "stop":
                    releasePlayer("stop");
                    finish();
                    break;
                case "seek":
                    long position = intent.getLongExtra("position", 0);
                    player.seekTo(position * 1000L);
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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        View decorView = getWindow().getDecorView();
        int uiOptions = View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        decorView.setSystemUiVisibility(uiOptions);

        setContentView(R.layout.activity_exoplayer);

        videoUrl = getIntent().getStringExtra("video_url");
        videoTitle = getIntent().getStringExtra("video_title");
        startTime = getIntent().getLongExtra("start_time", 0L);
        seasonIndex = getIntent().getIntExtra("season_index", -1);
        chapterIndex = getIntent().getIntExtra("chapter_index", -1);
        sessionToken = getIntent().getStringExtra("session_token");
        deviceId = getIntent().getStringExtra("device_id");
        apiBaseUrl = getIntent().getStringExtra("api_base_url");

        if (videoUrl == null || videoUrl.isEmpty()) {
            Toast.makeText(this, "URL de video no valida", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        playerView = findViewById(R.id.player_view);

        IntentFilter filter = new IntentFilter("VIDEO_PLAYER_CONTROL");
        ContextCompat.registerReceiver(this, controlReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);

        initializePlayer();
    }

    private void initializePlayer() {
        if (player != null) {
            return;
        }

        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                Log.e(TAG, "Player error: " + error.getMessage(), error);
                Toast.makeText(
                    ExoPlayerActivity.this,
                    "Error de reproduccion: " + error.getMessage(),
                    Toast.LENGTH_LONG
                ).show();
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (player == null) {
                    return;
                }

                if (playbackState == Player.STATE_READY) {
                    if (startTime > 0) {
                        player.seekTo(startTime * 1000L);
                        startTime = 0L;
                    }
                    emitProgress(false, true);
                    scheduleProgressUpdates();
                } else if (playbackState == Player.STATE_ENDED) {
                    emitProgress(true, true);
                    stopProgressUpdates();
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (isPlaying) {
                    scheduleProgressUpdates();
                } else {
                    stopProgressUpdates();
                    emitProgress(false, true);
                }
            }
        });

        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(videoUrl));

        DataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(
            this,
            new DefaultHttpDataSource.Factory()
                .setUserAgent(Util.getUserAgent(this, "TeamGPlay"))
                .setConnectTimeoutMs(30000)
                .setReadTimeoutMs(30000)
        );

        MediaSource mediaSource;
        String lowerUrl = videoUrl.toLowerCase();

        if (lowerUrl.contains(".m3u8")) {
            mediaSource = new HlsMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem);
        } else if (lowerUrl.contains(".mpd")) {
            mediaSource = new DashMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem);
        } else {
            mediaSource = new ProgressiveMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem);
        }

        player.setMediaSource(mediaSource);
        player.prepare();
        player.setPlayWhenReady(true);
    }

    private void scheduleProgressUpdates() {
        progressHandler.removeCallbacks(progressRunnable);
        progressHandler.postDelayed(progressRunnable, PROGRESS_UPDATE_INTERVAL_MS);
    }

    private void stopProgressUpdates() {
        progressHandler.removeCallbacks(progressRunnable);
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
        if (isFinishing() || isDestroyed() || sessionValidationInFlight) {
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
                if (isFinishing() || isDestroyed()) {
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
        Log.w(TAG, "Sesion revocada. Cerrando reproductor nativo.");
        stopSessionValidation();
        Toast.makeText(this, "Tu sesion fue revocada en este dispositivo.", Toast.LENGTH_LONG).show();
        releasePlayer("session_revoked");
        finish();
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
        stopProgressUpdates();
        stopSessionValidation();

        if (player != null) {
            emitProgress(false, true);
            player.release();
            player = null;
        }

        if (reason != null && !reason.isEmpty()) {
            notifyPlayerClosed(reason);
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (Util.SDK_INT > 23) {
            initializePlayer();
        }
        queueSessionValidation();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (Util.SDK_INT <= 23 || player == null) {
            initializePlayer();
        }
        queueSessionValidation();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (Util.SDK_INT <= 23 && !isInPictureInPictureMode()) {
            releasePlayer("pause");
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (player == null) {
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
        playerView.setUseController(!inPip);
        if (inPip) {
            queueSessionValidation();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (!isInPictureInPictureMode()) {
            releasePlayer("stop");
        } else {
            scheduleSessionValidation();
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
        releasePlayer("destroy");
    }

    @Override
    public void onBackPressed() {
        notifyPlayerClosed("back");
        releasePlayer("");
        super.onBackPressed();
    }
}
