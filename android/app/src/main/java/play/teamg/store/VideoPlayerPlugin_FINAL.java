package play.teamg.store;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

@CapacitorPlugin(name = "VideoPlayerPlugin")
public class VideoPlayerPlugin extends Plugin {
    private static final String TAG = "VideoPlayerPlugin";
    private BroadcastReceiver progressReceiver;
    private BroadcastReceiver stopReceiver;
    private Handler mainHandler;

    @Override
    public void load() {
        super.load();
        mainHandler = new Handler(Looper.getMainLooper());
        registerReceivers();
        Log.d(TAG, "🔥 VideoPlayerPlugin FINAL loaded - Con fixes agresivos");
    }

    @Override
    protected void handleOnDestroy() {
        Log.d(TAG, "⚠️ handleOnDestroy called - Forzando cierre de VLC");
        // Forzar cierre de VLC cuando el plugin se destruye
        forceKillVLC();
        unregisterReceivers();
        super.handleOnDestroy();
    }

    private void registerReceivers() {
        // Progress receiver
        progressReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("VLC_PROGRESS_UPDATE".equals(intent.getAction())) {
                    float currentTime = intent.getFloatExtra("currentTime", 0);
                    float duration = intent.getFloatExtra("duration", 0);
                    boolean completed = intent.getBooleanExtra("completed", false);

                    JSObject ret = new JSObject();
                    ret.put("currentTime", currentTime);
                    ret.put("duration", duration);
                    ret.put("completed", completed);
                    
                    notifyListeners("timeupdate", ret);
                }
            }
        };

        // Stop receiver
        stopReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("VLC_STOPPED".equals(intent.getAction())) {
                    Log.d(TAG, "VLC stopped event received");
                    notifyListeners("stopped", new JSObject());
                }
            }
        };

        IntentFilter progressFilter = new IntentFilter("VLC_PROGRESS_UPDATE");
        IntentFilter stopFilter = new IntentFilter("VLC_STOPPED");
        
        getContext().registerReceiver(progressReceiver, progressFilter);
        getContext().registerReceiver(stopReceiver, stopFilter);
    }

    private void unregisterReceivers() {
        try {
            if (progressReceiver != null) {
                getContext().unregisterReceiver(progressReceiver);
                progressReceiver = null;
            }
            if (stopReceiver != null) {
                getContext().unregisterReceiver(stopReceiver);
                stopReceiver = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering receivers", e);
        }
    }

    @PluginMethod
    public void playVideo(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Video");
        Float startTime = call.getFloat("startTime", 0f);
        JSONArray chapters = call.getArray("chapters", new JSONArray());

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        // Primero, asegurar que cualquier instancia anterior esté cerrada
        forceKillVLC();

        // Pequeño delay para asegurar que se cerró
        mainHandler.postDelayed(() -> {
            Intent intent = new Intent(getContext(), VLCPlayerActivity.class);
            intent.putExtra("videoUrl", url);
            intent.putExtra("videoTitle", title);
            intent.putExtra("startTime", startTime);
            intent.putExtra("chapters", chapters.toString());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            
            getContext().startActivity(intent);
            Log.d(TAG, "Started VLC with URL: " + url);
            
            call.resolve();
        }, 100);
    }

    @PluginMethod
    public void stopVideo(PluginCall call) {
        Log.d(TAG, "stopVideo called - Enviando comando stop a VLC");
        
        // Enviar comando stop
        Intent stopIntent = new Intent("VLC_COMMAND");
        stopIntent.putExtra("command", "stop");
        getContext().sendBroadcast(stopIntent);
        
        // También enviar comando de cierre forzado
        forceKillVLC();
        
        call.resolve();
    }

    @PluginMethod
    public void forceStopVideo(PluginCall call) {
        Log.d(TAG, "🛑 forceStopVideo called - MATANDO VLC COMPLETAMENTE");
        forceKillVLC();
        call.resolve();
    }

    // Método helper para matar VLC de múltiples formas
    private void forceKillVLC() {
        try {
            // Método 1: Enviar comando stop
            Intent stopIntent = new Intent("VLC_COMMAND");
            stopIntent.putExtra("command", "stop");
            getContext().sendBroadcast(stopIntent);
            Log.d(TAG, "Sent stop command");
        } catch (Exception e) {
            Log.e(TAG, "Error sending stop command", e);
        }

        try {
            // Método 2: Enviar broadcast para cerrar la actividad
            Intent finishIntent = new Intent("FORCE_FINISH_VLC_ACTIVITY");
            getContext().sendBroadcast(finishIntent);
            Log.d(TAG, "Sent finish broadcast");
        } catch (Exception e) {
            Log.e(TAG, "Error sending finish broadcast", e);
        }

        try {
            // Método 3: Enviar comando KILL especial
            Intent killIntent = new Intent("KILL_VLC_NOW");
            getContext().sendBroadcast(killIntent);
            Log.d(TAG, "Sent kill broadcast");
        } catch (Exception e) {
            Log.e(TAG, "Error sending kill broadcast", e);
        }

        try {
            // Método 4: Intentar cerrar cualquier actividad VLC visible
            Intent closeIntent = new Intent(getContext(), VLCPlayerActivity.class);
            closeIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            closeIntent.putExtra("EXIT", true);
            getContext().startActivity(closeIntent);
            Log.d(TAG, "Sent exit intent to activity");
        } catch (Exception e) {
            // Esto puede fallar si la actividad no existe, lo cual está bien
            Log.d(TAG, "Activity might not exist, which is fine");
        }
    }

    @PluginMethod
    public void pauseVideo(PluginCall call) {
        Intent intent = new Intent("VLC_COMMAND");
        intent.putExtra("command", "pause");
        getContext().sendBroadcast(intent);
        call.resolve();
    }

    @PluginMethod
    public void resumeVideo(PluginCall call) {
        Intent intent = new Intent("VLC_COMMAND");
        intent.putExtra("command", "resume");
        getContext().sendBroadcast(intent);
        call.resolve();
    }

    @PluginMethod
    public void seekForward(PluginCall call) {
        Integer seconds = call.getInt("seconds", 10);
        Intent intent = new Intent("VLC_COMMAND");
        intent.putExtra("command", "seekForward");
        intent.putExtra("seconds", seconds);
        getContext().sendBroadcast(intent);
        call.resolve();
    }

    @PluginMethod
    public void seekBackward(PluginCall call) {
        Integer seconds = call.getInt("seconds", 10);
        Intent intent = new Intent("VLC_COMMAND");
        intent.putExtra("command", "seekBackward");
        intent.putExtra("seconds", seconds);
        getContext().sendBroadcast(intent);
        call.resolve();
    }

    @PluginMethod
    public void getCurrentTime(PluginCall call) {
        // Este método podría implementarse con un sistema de request/response
        // Por ahora, retornamos un valor placeholder
        JSObject ret = new JSObject();
        ret.put("currentTime", 0);
        call.resolve(ret);
    }

    @PluginMethod
    public void sendCommand(PluginCall call) {
        String command = call.getString("command");
        if ("KILL_VLC".equals(command)) {
            forceKillVLC();
        }
        call.resolve();
    }
}
