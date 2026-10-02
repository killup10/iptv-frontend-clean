package play.teamg.store;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import com.google.android.exoplayer2.C;
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.PlaybackException;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.audio.AudioAttributes;
import com.google.android.exoplayer2.source.DefaultMediaSourceFactory;
import com.google.android.exoplayer2.upstream.DefaultDataSource;
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource;
import com.google.android.exoplayer2.util.MimeTypes;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servicio en primer plano (Foreground Service) con ExoPlayer nativo integrado.
 * Garantiza reproducción 100% ininterrumpida al minimizar la app, apagar la pantalla
 * y control interactivo instantáneo desde la pantalla de bloqueo y barra de notificaciones.
 */
public class MusicPlaybackService extends Service {
    private static final String TAG = "MusicPlaybackService";
    private static final int NOTIFICATION_ID = 1001;
    private static final String CHANNEL_ID = "teamg_music_playback_v1";

    public static final String ACTION_UPDATE = "play.teamg.store.ACTION_MUSIC_UPDATE";
    public static final String ACTION_SEEK = "play.teamg.store.ACTION_MUSIC_SEEK";
    public static final String ACTION_PLAY = "play.teamg.store.ACTION_MUSIC_PLAY";
    public static final String ACTION_PAUSE = "play.teamg.store.ACTION_MUSIC_PAUSE";
    public static final String ACTION_TOGGLE = "play.teamg.store.ACTION_MUSIC_TOGGLE";
    public static final String ACTION_NEXT = "play.teamg.store.ACTION_MUSIC_NEXT";
    public static final String ACTION_PREV = "play.teamg.store.ACTION_MUSIC_PREV";
    public static final String ACTION_STOP = "play.teamg.store.ACTION_MUSIC_STOP";

    // Variables de estado accesibles de forma estática
    public static volatile ExoPlayer playerInstance = null;
    public static volatile boolean isServiceRunning = false;
    public static volatile boolean isPlaying = false;
    public static volatile String currentTitle = "TeamG Music";
    public static volatile String currentArtist = "Reproduciendo";
    public static volatile String currentCoverUrl = "";
    public static volatile String currentAudioUrl = "";
    public static volatile long currentDuration = 0L;
    public static volatile long currentPosition = 0L;

    private ExoPlayer player;
    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private NotificationManager notificationManager;
    private Bitmap currentCoverBitmap = null;
    private String lastLoadedCoverUrl = null;

    private final ExecutorService imageExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public static boolean isPlaybackActive() {
        return isServiceRunning;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();

        // 1. WakeLock parcial para asegurar que la CPU no duerma con la pantalla apagada
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TeamG:MusicPlaybackWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception e) {
            Log.w(TAG, "No se pudo obtener WakeLock", e);
        }

        // 2. Inicializar ExoPlayer nativo para reproducción de audio
        try {
            DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(10000)
                .setReadTimeoutMs(10000)
                .setUserAgent("TeamGPlay/1.5.12 (Android; ExoPlayer)");

            DefaultDataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(this, httpDataSourceFactory);
            DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(dataSourceFactory);

            player = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(mediaSourceFactory)
                .build();
            playerInstance = player;

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();
            player.setAudioAttributes(audioAttributes, true); // Control automático de AudioFocus

            player.addListener(new Player.Listener() {
                @Override
                public void onIsPlayingChanged(boolean isPlayingNow) {
                    isPlaying = player != null && player.getPlayWhenReady();
                    manageWakeLock(isPlaying);
                    updateMediaSessionState();
                    updateNotification();
                    // IMPORTANTE: NO emitir sendMediaAction aquí. Durante buffering o seek,
                    // isPlayingNow cambia temporalmente a false. Las acciones reales del usuario
                    // (notificación y pantalla de bloqueo) se gestionan explícitamente en handleAction.
                }

                @Override
                public void onPlaybackStateChanged(int playbackState) {
                    if (playbackState == Player.STATE_ENDED) {
                        Log.d(TAG, "Canción finalizada en ExoPlayer nativo -> pasando a la siguiente");
                        MusicPlaybackPlugin.sendMediaAction("next");
                    }
                }

                @Override
                public void onPlayerError(PlaybackException error) {
                    Log.e(TAG, "ExoPlayer error de reproducción: " + error.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error inicializando ExoPlayer nativo", e);
        }

        // 3. Inicializar MediaSessionCompat para la pantalla de bloqueo y controles del sistema
        try {
            mediaSession = new MediaSessionCompat(this, "TeamGMusicSession");
            mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            );

            mediaSession.setCallback(new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    handleAction(ACTION_PLAY);
                }

                @Override
                public void onPause() {
                    handleAction(ACTION_PAUSE);
                }

                @Override
                public void onSkipToNext() {
                    handleAction(ACTION_NEXT);
                }

                @Override
                public void onSkipToPrevious() {
                    handleAction(ACTION_PREV);
                }

                @Override
                public void onStop() {
                    handleAction(ACTION_STOP);
                }
            });

            mediaSession.setActive(true);
        } catch (Exception e) {
            Log.e(TAG, "Error configurando MediaSessionCompat", e);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_STICKY;
        }

        String action = intent.getAction();
        if (action == null) {
            action = ACTION_UPDATE;
        }

        switch (action) {
            case ACTION_SEEK:
                if (intent.hasExtra("seekToSeconds") && player != null) {
                    long seekSec = intent.getLongExtra("seekToSeconds", 0L);
                    player.seekTo(seekSec * 1000L);
                    currentPosition = seekSec;
                    updateMediaSessionState();
                    updateNotification();
                }
                break;

            case ACTION_UPDATE:
                currentTitle = intent.getStringExtra("title") != null ? intent.getStringExtra("title") : currentTitle;
                currentArtist = intent.getStringExtra("artist") != null ? intent.getStringExtra("artist") : currentArtist;
                String cover = intent.getStringExtra("coverUrl");
                if (cover != null && !cover.trim().isEmpty()) {
                    currentCoverUrl = cover;
                }
                String audioUrl = intent.getStringExtra("audioUrl");
                boolean reqPlay = intent.getBooleanExtra("isPlaying", isPlaying);
                currentDuration = intent.getLongExtra("duration", currentDuration);
                currentPosition = intent.getLongExtra("position", currentPosition);

                // Si se solicitó seek
                if (intent.hasExtra("seekToSeconds") && player != null) {
                    long seekSec = intent.getLongExtra("seekToSeconds", 0L);
                    player.seekTo(seekSec * 1000L);
                    currentPosition = seekSec;
                }

                // Si se pasó un stream de audio válido, cargarlo en ExoPlayer
                if (audioUrl != null && !audioUrl.trim().isEmpty()) {
                    boolean isDifferentUrl = !audioUrl.equals(currentAudioUrl);
                    if (isDifferentUrl) {
                        currentAudioUrl = audioUrl;
                        if (player != null) {
                            try {
                                MediaItem.Builder mediaItemBuilder = new MediaItem.Builder().setUri(audioUrl);
                                if (audioUrl.contains("icecast") || audioUrl.contains(".aac")) {
                                    mediaItemBuilder.setMimeType(MimeTypes.AUDIO_AAC);
                                } else if (audioUrl.endsWith(".mp3") || audioUrl.contains(".mp3")) {
                                    mediaItemBuilder.setMimeType(MimeTypes.AUDIO_MPEG);
                                }
                                player.setMediaItem(mediaItemBuilder.build());
                                player.prepare();
                                if (reqPlay) {
                                    player.play();
                                }
                            } catch (Exception e) {
                                Log.e(TAG, "Error preparando audio en ExoPlayer: " + e.getMessage());
                            }
                        }
                    } else if (player != null) {
                        if (reqPlay && !player.getPlayWhenReady()) {
                            player.play();
                        } else if (!reqPlay && player.getPlayWhenReady()) {
                            player.pause();
                        }
                    }
                } else if (player != null) {
                    // Si no vino URL nueva pero cambió estado isPlaying
                    if (reqPlay && !player.getPlayWhenReady()) {
                        player.play();
                    } else if (!reqPlay && player.getPlayWhenReady()) {
                        player.pause();
                    }
                }

                isPlaying = (player != null && player.isPlaying()) || reqPlay;
                manageWakeLock(isPlaying);
                updateMediaSessionState();
                loadCoverBitmap(currentCoverUrl);
                startOrUpdateForeground();
                break;

            case ACTION_PLAY:
            case ACTION_PAUSE:
            case ACTION_TOGGLE:
            case ACTION_NEXT:
            case ACTION_PREV:
            case ACTION_STOP:
                handleAction(action);
                break;

            default:
                break;
        }

        return START_STICKY;
    }

    private void handleAction(String action) {
        switch (action) {
            case ACTION_PLAY:
                if (player != null) {
                    player.play();
                }
                isPlaying = true;
                manageWakeLock(true);
                updateMediaSessionState();
                updateNotification();
                MusicPlaybackPlugin.sendMediaAction("play");
                break;

            case ACTION_PAUSE:
                if (player != null) {
                    player.pause();
                }
                isPlaying = false;
                manageWakeLock(false);
                updateMediaSessionState();
                updateNotification();
                MusicPlaybackPlugin.sendMediaAction("pause");
                break;

            case ACTION_TOGGLE:
                if (player != null) {
                    if (player.isPlaying()) {
                        player.pause();
                        isPlaying = false;
                    } else {
                        player.play();
                        isPlaying = true;
                    }
                } else {
                    isPlaying = !isPlaying;
                }
                manageWakeLock(isPlaying);
                updateMediaSessionState();
                updateNotification();
                MusicPlaybackPlugin.sendMediaAction(isPlaying ? "play" : "pause");
                break;

            case ACTION_NEXT:
                MusicPlaybackPlugin.sendMediaAction("next");
                break;

            case ACTION_PREV:
                MusicPlaybackPlugin.sendMediaAction("prev");
                break;

            case ACTION_STOP:
                if (player != null) {
                    player.stop();
                }
                isPlaying = false;
                manageWakeLock(false);
                stopForeground(true);
                stopSelf();
                break;
        }
    }

    private void manageWakeLock(boolean acquire) {
        try {
            if (wakeLock != null) {
                if (acquire && !wakeLock.isHeld()) {
                    wakeLock.acquire(12 * 60 * 60 * 1000L); // Hasta 12 horas continuas
                } else if (!acquire && wakeLock.isHeld()) {
                    wakeLock.release();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error administrando WakeLock", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Reproducción de Música",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Controles interactivos de música en segundo plano y pantalla bloqueada");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private PendingIntent createActionPendingIntent(String action, int requestCode) {
        Intent intent = new Intent(this, MusicPlaybackService.class);
        intent.setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getService(this, requestCode, intent, flags);
    }

    private void updateMediaSessionState() {
        if (mediaSession == null) return;

        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                PlaybackStateCompat.ACTION_STOP
            );

        long pos = (player != null) ? player.getCurrentPosition() : (currentPosition * 1000L);
        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        stateBuilder.setState(state, pos, 1.0f);
        mediaSession.setPlaybackState(stateBuilder.build());

        long dur = (player != null && player.getDuration() > 0) ? player.getDuration() : (currentDuration * 1000L);

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "TeamG Music")
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, dur);

        if (currentCoverBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentCoverBitmap);
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, currentCoverBitmap);
        }

        mediaSession.setMetadata(metaBuilder.build());
    }

    private Notification buildNotification() {
        // Intent para abrir MainActivity al presionar el cuerpo de la notificación
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_MAIN);
        launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int contentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            contentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 0, launchIntent, contentFlags);

        // PendingIntents para Anterior, Play/Pause y Siguiente
        PendingIntent prevPendingIntent = createActionPendingIntent(ACTION_PREV, 101);
        PendingIntent togglePendingIntent = createActionPendingIntent(ACTION_TOGGLE, 102);
        PendingIntent nextPendingIntent = createActionPendingIntent(ACTION_NEXT, 103);

        androidx.media.app.NotificationCompat.MediaStyle mediaStyle = new androidx.media.app.NotificationCompat.MediaStyle()
            .setShowActionsInCompactView(0, 1, 2);

        if (mediaSession != null) {
            mediaStyle.setMediaSession(mediaSession.getSessionToken());
        }

        int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseTitle = isPlaying ? "Pausar" : "Reproducir";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText("TeamG Music")
            .setContentIntent(contentPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setShowWhen(false)
            .setOngoing(isPlaying)
            .setStyle(mediaStyle)
            .addAction(android.R.drawable.ic_media_previous, "Anterior", prevPendingIntent)
            .addAction(playPauseIcon, playPauseTitle, togglePendingIntent)
            .addAction(android.R.drawable.ic_media_next, "Siguiente", nextPendingIntent);

        if (currentCoverBitmap != null) {
            builder.setLargeIcon(currentCoverBitmap);
        }

        return builder.build();
    }

    private void startOrUpdateForeground() {
        Notification notification = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) { // Android 14+
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10-13
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error iniciando startForeground", e);
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, notification);
            }
        }
    }

    private void updateNotification() {
        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    private void loadCoverBitmap(String urlStr) {
        if (urlStr == null || urlStr.trim().isEmpty() || urlStr.equals(lastLoadedCoverUrl)) {
            return;
        }
        lastLoadedCoverUrl = urlStr;
        imageExecutor.execute(() -> {
            try {
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setConnectTimeout(3500);
                conn.setReadTimeout(4000);
                conn.connect();
                InputStream input = conn.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                if (bitmap != null) {
                    Bitmap scaled = Bitmap.createScaledBitmap(bitmap, 400, 400, true);
                    if (!urlStr.equals(currentCoverUrl)) return;
                    currentCoverBitmap = scaled;
                    mainHandler.post(() -> {
                        updateMediaSessionState();
                        updateNotification();
                    });
                }
            } catch (Exception e) {
                Log.w(TAG, "No se pudo descargar carátula para notificación: " + e.getMessage());
            }
        });
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        // Si el usuario desliza y elimina la aplicación de tareas recientes, cerrar el servicio
        if (player != null) {
            player.stop();
        }
        manageWakeLock(false);
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isServiceRunning = false;
        isPlaying = false;
        manageWakeLock(false);
        if (player != null) {
            player.release();
            player = null;
        }
        playerInstance = null;
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        imageExecutor.shutdown();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
