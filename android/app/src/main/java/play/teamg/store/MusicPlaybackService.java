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

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servicio en primer plano (Foreground Service) para reproducción de música en segundo plano
 * y control desde la pantalla de bloqueo y barra de notificaciones del sistema Android.
 */
public class MusicPlaybackService extends Service {
    private static final String TAG = "MusicPlaybackService";
    private static final int NOTIFICATION_ID = 1001;
    private static final String CHANNEL_ID = "teamg_music_playback_v1";

    public static final String ACTION_UPDATE = "play.teamg.store.ACTION_MUSIC_UPDATE";
    public static final String ACTION_PLAY = "play.teamg.store.ACTION_MUSIC_PLAY";
    public static final String ACTION_PAUSE = "play.teamg.store.ACTION_MUSIC_PAUSE";
    public static final String ACTION_TOGGLE = "play.teamg.store.ACTION_MUSIC_TOGGLE";
    public static final String ACTION_NEXT = "play.teamg.store.ACTION_MUSIC_NEXT";
    public static final String ACTION_PREV = "play.teamg.store.ACTION_MUSIC_PREV";
    public static final String ACTION_STOP = "play.teamg.store.ACTION_MUSIC_STOP";

    // Variables de estado accesibles de forma estática por MainActivity
    public static volatile boolean isServiceRunning = false;
    public static volatile boolean isPlaying = false;
    public static volatile String currentTitle = "TeamG Music";
    public static volatile String currentArtist = "Reproduciendo";
    public static volatile String currentCoverUrl = "";
    public static volatile long currentDuration = 0L;
    public static volatile long currentPosition = 0L;

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

        // 1. Inicializar WakeLock parcial para evitar que la CPU duerma cuando se apaga la pantalla
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TeamG:MusicPlaybackWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception e) {
            Log.w(TAG, "No se pudo obtener WakeLock", e);
        }

        // 2. Inicializar MediaSessionCompat para pantalla de bloqueo, auriculares y mandos
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
            case ACTION_UPDATE:
                currentTitle = intent.getStringExtra("title") != null ? intent.getStringExtra("title") : currentTitle;
                currentArtist = intent.getStringExtra("artist") != null ? intent.getStringExtra("artist") : currentArtist;
                String cover = intent.getStringExtra("coverUrl");
                if (cover != null) {
                    currentCoverUrl = cover;
                }
                isPlaying = intent.getBooleanExtra("isPlaying", isPlaying);
                currentDuration = intent.getLongExtra("duration", currentDuration);
                currentPosition = intent.getLongExtra("position", currentPosition);

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
                isPlaying = true;
                manageWakeLock(true);
                updateMediaSessionState();
                updateNotification();
                MusicPlaybackPlugin.sendMediaAction("play");
                break;

            case ACTION_PAUSE:
                isPlaying = false;
                manageWakeLock(false);
                updateMediaSessionState();
                updateNotification();
                MusicPlaybackPlugin.sendMediaAction("pause");
                break;

            case ACTION_TOGGLE:
                isPlaying = !isPlaying;
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
                    wakeLock.acquire(12 * 60 * 60 * 1000L); // Hasta 12 horas de música continua
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

        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        stateBuilder.setState(state, currentPosition * 1000L, 1.0f);
        mediaSession.setPlaybackState(stateBuilder.build());

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "TeamG Music")
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration * 1000L);

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
