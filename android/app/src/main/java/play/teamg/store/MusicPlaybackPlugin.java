package play.teamg.store;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.io.*;
import java.net.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.Iterator;

@CapacitorPlugin(
    name = "MusicPlaybackPlugin",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class MusicPlaybackPlugin extends Plugin {
    private static final String TAG = "MusicPlaybackPlugin";
    private static MusicPlaybackPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void sendMediaAction(String action) {
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("action", action);
            try {
                instance.notifyListeners("onMediaAction", ret);
            } catch (Exception ignored) {}

            try {
                if (instance.getActivity() != null) {
                    instance.getActivity().runOnUiThread(() -> {
                        try {
                            if (instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                                instance.getBridge().getWebView().resumeTimers();
                                String script = "try { window.dispatchEvent(new CustomEvent('backgroundPlayback:" + action + "')); } catch(e){}";
                                instance.getBridge().getWebView().evaluateJavascript(script, null);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error enviando JS directo a WebView", e);
                        }
                    });
                }
            } catch (Exception e) {
                Log.e(TAG, "Error en sendMediaAction", e);
            }
        }
    }

    @PluginMethod
    public void updatePlayback(PluginCall call) {
        try {
            String title = call.getString("title", "TeamG Music");
            String artist = call.getString("artist", "Reproduciendo");
            String coverUrl = call.getString("coverUrl", "");
            String audioUrl = call.getString("audioUrl", "");
            boolean isPlaying = call.getBoolean("isPlaying", true);
            long duration = Math.round(call.getDouble("duration", 0.0));
            long position = Math.round(call.getDouble("position", 0.0));

            Context context = getContext();
            Intent intent = new Intent(context, MusicPlaybackService.class);
            intent.setAction(MusicPlaybackService.ACTION_UPDATE);
            intent.putExtra("title", title);
            intent.putExtra("artist", artist);
            intent.putExtra("coverUrl", coverUrl);
            intent.putExtra("audioUrl", audioUrl);
            intent.putExtra("isPlaying", isPlaying);
            intent.putExtra("duration", duration);
            intent.putExtra("position", position);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error actualizando reproducción", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        try {
            long positionSeconds = Math.round(call.getDouble("position", 0.0));
            Context context = getContext();
            Intent intent = new Intent(context, MusicPlaybackService.class);
            intent.setAction(MusicPlaybackService.ACTION_SEEK);
            intent.putExtra("seekToSeconds", positionSeconds);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error en seekTo", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getPosition(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                JSObject ret = new JSObject();
                double posSec = 0;
                double durSec = 0;
                boolean playing = MusicPlaybackService.isPlaying;
                if (MusicPlaybackService.playerInstance != null) {
                    posSec = Math.max(0, MusicPlaybackService.playerInstance.getCurrentPosition() / 1000.0);
                    long d = MusicPlaybackService.playerInstance.getDuration();
                    durSec = d > 0 ? (d / 1000.0) : MusicPlaybackService.currentDuration;
                    playing = MusicPlaybackService.playerInstance.isPlaying();
                } else {
                    posSec = MusicPlaybackService.currentPosition;
                    durSec = MusicPlaybackService.currentDuration;
                }
                ret.put("position", posSec);
                ret.put("duration", durSec);
                ret.put("isPlaying", playing);
                ret.put("audioUrl", MusicPlaybackService.currentAudioUrl);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Error en getPosition", e);
                call.reject("Error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, MusicPlaybackService.class);
            intent.setAction(MusicPlaybackService.ACTION_STOP);
            context.startService(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error deteniendo reproducción", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    private final ExecutorService downloadExecutor = Executors.newFixedThreadPool(2);

    @PluginMethod
    public void downloadAudio(PluginCall call) {
        String urlString = call.getString("url", "");
        String relativePath = call.getString("path", "");
        String id = call.getString("id", "");
        JSObject headers = call.getObject("headers", new JSObject());

        if (urlString == null || urlString.isEmpty()) {
            call.reject("URL de descarga requerida");
            return;
        }
        if (relativePath == null || relativePath.isEmpty()) {
            call.reject("Ruta de archivo requerida");
            return;
        }

        downloadExecutor.execute(() -> {
            File partial = null;
            HttpURLConnection connection = null;
            try {
                File root = getContext().getFilesDir();
                File targetFile = new File(root, relativePath).getCanonicalFile();

                File parentDir = targetFile.getParentFile();
                if (parentDir != null && !parentDir.exists()) {
                    if (!parentDir.mkdirs() && !parentDir.isDirectory()) {
                        throw new IOException("No se pudo crear el directorio de destino: " + parentDir.getAbsolutePath());
                    }
                }

                partial = new File(targetFile.getPath() + ".part");
                if (partial.exists()) {
                    partial.delete();
                }

                URL url = new URL(urlString);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(25000);
                connection.setReadTimeout(50000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("Accept-Encoding", "identity");

                boolean hasUserAgent = false;
                if (headers != null) {
                    Iterator<String> keys = headers.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        String val = headers.getString(key);
                        if (key.equalsIgnoreCase("User-Agent")) hasUserAgent = true;
                        connection.setRequestProperty(key, val);
                    }
                }
                if (!hasUserAgent) {
                    if (urlString.contains("googlevideo.com") || urlString.contains("youtube.com")) {
                        connection.setRequestProperty("User-Agent", "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip");
                    } else {
                        connection.setRequestProperty("User-Agent", "TeamGPlay-Music/1.5.14");
                    }
                }

                int code = connection.getResponseCode();
                if (code == HttpURLConnection.HTTP_MOVED_PERM || code == HttpURLConnection.HTTP_MOVED_TEMP || code == 307 || code == 308) {
                    String newUrl = connection.getHeaderField("Location");
                    if (newUrl != null && !newUrl.isEmpty()) {
                        connection.disconnect();
                        url = new URL(newUrl);
                        connection = (HttpURLConnection) url.openConnection();
                        connection.setConnectTimeout(25000);
                        connection.setReadTimeout(50000);
                        connection.setInstanceFollowRedirects(true);
                        code = connection.getResponseCode();
                    }
                }

                if (code < 200 || code >= 300) {
                    throw new IOException("HTTP " + code + ": Servidor devolvió error al descargar audio.");
                }

                long totalBytes = connection.getContentLengthLong();
                long bytesRead = 0;
                long lastEmit = 0;

                try (InputStream in = new BufferedInputStream(connection.getInputStream(), 65536);
                     OutputStream out = new BufferedOutputStream(new FileOutputStream(partial), 65536)) {
                    byte[] buffer = new byte[65536];
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        out.write(buffer, 0, n);
                        bytesRead += n;

                        long now = System.currentTimeMillis();
                        if (now - lastEmit >= 300) {
                            lastEmit = now;
                            JSObject prog = new JSObject();
                            prog.put("id", id);
                            prog.put("bytes", bytesRead);
                            prog.put("total", totalBytes);
                            int pct = totalBytes > 0 ? (int) Math.min(99, Math.round(((double) bytesRead / totalBytes) * 100)) : 50;
                            prog.put("progress", pct);
                            notifyListeners("downloadProgress", prog);
                        }
                    }
                    out.flush();
                }

                if (bytesRead < 20480) {
                    throw new IOException("Archivo descargado incompleto (" + bytesRead + " bytes).");
                }

                if (targetFile.exists()) {
                    targetFile.delete();
                }

                if (!partial.renameTo(targetFile)) {
                    try (InputStream fis = new FileInputStream(partial);
                         OutputStream fos = new FileOutputStream(targetFile)) {
                        byte[] buf = new byte[65536];
                        int len;
                        while ((len = fis.read(buf)) > 0) {
                            fos.write(buf, 0, len);
                        }
                    }
                    partial.delete();
                }

                JSObject res = new JSObject();
                res.put("id", id);
                res.put("path", targetFile.getAbsolutePath());
                res.put("relativePath", relativePath);
                res.put("size", targetFile.length());
                call.resolve(res);

            } catch (Exception ex) {
                Log.e(TAG, "Error en downloadAudio: " + ex.getMessage(), ex);
                if (partial != null && partial.exists()) {
                    try { partial.delete(); } catch (Exception ignored) {}
                }
                call.reject("Error descargando audio: " + ex.getMessage());
            } finally {
                if (connection != null) {
                    try { connection.disconnect(); } catch (Exception ignored) {}
                }
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (downloadExecutor != null && !downloadExecutor.isShutdown()) {
            downloadExecutor.shutdown();
        }
        super.handleOnDestroy();
    }
}
