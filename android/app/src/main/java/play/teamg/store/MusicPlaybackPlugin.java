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
}
