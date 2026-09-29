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
            instance.notifyListeners("onMediaAction", ret);
        }
    }

    @PluginMethod
    public void updatePlayback(PluginCall call) {
        try {
            String title = call.getString("title", "TeamG Music");
            String artist = call.getString("artist", "Reproduciendo");
            String coverUrl = call.getString("coverUrl", "");
            boolean isPlaying = call.getBoolean("isPlaying", true);
            long duration = call.getLong("duration", 0L);
            long position = call.getLong("position", 0L);

            Context context = getContext();
            Intent intent = new Intent(context, MusicPlaybackService.class);
            intent.setAction(MusicPlaybackService.ACTION_UPDATE);
            intent.putExtra("title", title);
            intent.putExtra("artist", artist);
            intent.putExtra("coverUrl", coverUrl);
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
