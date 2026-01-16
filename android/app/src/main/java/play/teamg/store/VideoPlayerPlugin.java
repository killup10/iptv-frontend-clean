package play.teamg.store;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;

@CapacitorPlugin(name = "VideoPlayerPlugin")
public class VideoPlayerPlugin extends Plugin {
    private static final String TAG = "VideoPlayerPlugin";
    private BroadcastReceiver progressReceiver;

    @PluginMethod
    public void playVideo(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Video");
        Long startTime = call.getLong("startTime", 0L);
        JSArray chaptersArray = call.getArray("chapters");

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        Log.d(TAG, "Playing video: " + url);

        try {
            Intent intent = new Intent(getContext(), VLCPlayerActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            intent.putExtra("video_url", url);
            intent.putExtra("video_title", title);
            intent.putExtra("start_time", startTime);

            if (chaptersArray != null) {
                ArrayList<String> chapterTitles = new ArrayList<>();
                ArrayList<String> chapterUrls = new ArrayList<>();
                ArrayList<Integer> chapterSeasonNumbers = new ArrayList<>();
                ArrayList<Integer> chapterNumbers = new ArrayList<>();

                try {
                    // Rastrear el número de capítulo dentro de cada temporada
                    int currentSeason = -1;
                    int chapterCount = 0;
                    
                    for (int i = 0; i < chaptersArray.length(); i++) {
                        JSONObject chapter = chaptersArray.getJSONObject(i);
                        int seasonNumber = chapter.optInt("seasonNumber", 1);
                        
                        // Si cambiamos de temporada, reiniciar el contador
                        if (seasonNumber != currentSeason) {
                            currentSeason = seasonNumber;
                            chapterCount = 1;
                        } else {
                            chapterCount++;
                        }
                        
                        chapterTitles.add(chapter.getString("title"));
                        chapterUrls.add(chapter.getString("url"));
                        chapterSeasonNumbers.add(seasonNumber);
                        chapterNumbers.add(chapterCount);  // Usar número dentro de la temporada, no el global
                    }
                    intent.putStringArrayListExtra("chapter_titles", chapterTitles);
                    intent.putStringArrayListExtra("chapter_urls", chapterUrls);
                    intent.putIntegerArrayListExtra("chapter_season_numbers", chapterSeasonNumbers);
                    intent.putIntegerArrayListExtra("chapter_numbers", chapterNumbers);
                    
                    Log.d(TAG, "Capítulos procesados - Temporadas: " + chapterSeasonNumbers.toString() + ", Números: " + chapterNumbers.toString());
                } catch (JSONException e) {
                    Log.e(TAG, "Error processing chapters", e);
                }
            }
            
            getActivity().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "VLC player started");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error starting VLC player", e);
            
            try {
                Intent fallbackIntent = new Intent(getContext(), ExoPlayerActivity.class);
                fallbackIntent.putExtra("video_url", url);
                fallbackIntent.putExtra("video_title", title);
                fallbackIntent.putExtra("start_time", startTime);
                
                getActivity().startActivity(fallbackIntent);
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "ExoPlayer started (VLC fallback)");
                call.resolve(result);
                
            } catch (Exception fallbackError) {
                Log.e(TAG, "Error starting fallback player", fallbackError);
                call.reject("Error starting video player: " + fallbackError.getMessage());
            }
        }
    }

    private void sendPlayerControl(String action, long position) {
        Context context = getContext();
        Intent intent = new Intent("VIDEO_PLAYER_CONTROL");
        intent.putExtra("action", action);
        if (position > 0) {
            intent.putExtra("position", position);
        }
        intent.setPackage(context.getPackageName());
        context.sendBroadcast(intent);
    }

    @PluginMethod
    public void pauseVideo(PluginCall call) {
        sendPlayerControl("pause", 0);
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopVideo(PluginCall call) {
        Log.d(TAG, "stopVideo called - sending stop command and finishing VLC activity");
        
        // Enviar comando de detención
        sendPlayerControl("stop", 0);
        
        // Forzar el cierre de la actividad VLC
        try {
            Intent finishIntent = new Intent("FINISH_VLC_ACTIVITY");
            finishIntent.setPackage(getContext().getPackageName());
            getContext().sendBroadcast(finishIntent);
            Log.d(TAG, "Sent FINISH_VLC_ACTIVITY broadcast");
        } catch (Exception e) {
            Log.e(TAG, "Error sending finish broadcast", e);
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void forceStopVideo(PluginCall call) {
        Log.d(TAG, "forceStopVideo called - aggressively stopping VLC");
        
        // Primero intentar detener normalmente
        sendPlayerControl("stop", 0);
        
        // Luego forzar el cierre de la actividad
        try {
            // Enviar broadcast para cerrar la actividad
            Intent finishIntent = new Intent("FORCE_FINISH_VLC_ACTIVITY");
            finishIntent.setPackage(getContext().getPackageName());
            getContext().sendBroadcast(finishIntent);
            Log.d(TAG, "Sent FORCE_FINISH_VLC_ACTIVITY broadcast");
            
            // También intentar cerrar cualquier actividad VLC visible
            Intent closeIntent = new Intent(getContext(), VLCPlayerActivity.class);
            closeIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            closeIntent.putExtra("FORCE_CLOSE", true);
            getActivity().startActivity(closeIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "Error in forceStopVideo", e);
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "Force stop executed");
        call.resolve(result);
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        Long position = call.getLong("position", 0L);
        sendPlayerControl("seek", position);
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getCurrentTime(PluginCall call) {
        // Enviar solicitud para obtener tiempo actual
        sendPlayerControl("getCurrentTime", 0);
        
        // Por ahora devolvemos 0, pero esto debería ser mejorado
        // para recibir el tiempo real del reproductor
        JSObject result = new JSObject();
        result.put("currentTime", 0);
        result.put("success", true);
        call.resolve(result);
    }

    @Override
    protected void handleOnStart() {
        super.handleOnStart();
        registerProgressReceiver();
    }

    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        unregisterProgressReceiver();
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        // Asegurar que VLC se detenga cuando el plugin se destruye
        Log.d(TAG, "Plugin being destroyed - stopping VLC");
        sendPlayerControl("stop", 0);
        
        try {
            Intent finishIntent = new Intent("FORCE_FINISH_VLC_ACTIVITY");
            finishIntent.setPackage(getContext().getPackageName());
            getContext().sendBroadcast(finishIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping VLC on destroy", e);
        }
    }

    private void registerProgressReceiver() {
        if (progressReceiver == null) {
            progressReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if ("VIDEO_PROGRESS_UPDATE".equals(intent.getAction())) {
                        long currentTime = intent.getLongExtra("currentTime", 0);
                        boolean completed = intent.getBooleanExtra("completed", false);
                        
                        Log.d(TAG, "Progress received: " + currentTime + "s, completed: " + completed);
                        
                        // Enviar evento al JavaScript
                        JSObject data = new JSObject();
                        data.put("currentTime", currentTime);
                        data.put("completed", completed);
                        notifyListeners("timeupdate", data);
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter("VIDEO_PROGRESS_UPDATE");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(progressReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                getContext().registerReceiver(progressReceiver, filter);
            }
            Log.d(TAG, "Progress receiver registered");
        }
    }

    private void unregisterProgressReceiver() {
        if (progressReceiver != null) {
            try {
                getContext().unregisterReceiver(progressReceiver);
                progressReceiver = null;
                Log.d(TAG, "Progress receiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering progress receiver", e);
            }
        }
    }

    // Método para enviar eventos de progreso desde la actividad VLC
    public void notifyTimeUpdate(long currentTime) {
        JSObject data = new JSObject();
        data.put("currentTime", currentTime);
        notifyListeners("timeupdate", data);
    }
}