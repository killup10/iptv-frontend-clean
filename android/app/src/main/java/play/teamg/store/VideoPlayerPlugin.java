package play.teamg.store;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
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
            intent.putExtra("video_url", url);
            intent.putExtra("video_title", title);
            intent.putExtra("start_time", startTime);

            if (chaptersArray != null) {
                ArrayList<String> chapterTitles = new ArrayList<>();
                ArrayList<String> chapterUrls = new ArrayList<>();
                ArrayList<Integer> chapterSeasonNumbers = new ArrayList<>();
                ArrayList<Integer> chapterNumbers = new ArrayList<>();

                try {
                    for (int i = 0; i < chaptersArray.length(); i++) {
                        JSONObject chapter = chaptersArray.getJSONObject(i);
                        chapterTitles.add(chapter.getString("title"));
                        chapterUrls.add(chapter.getString("url"));
                        chapterSeasonNumbers.add(chapter.optInt("seasonNumber", 1));
                        chapterNumbers.add(chapter.optInt("chapterNumber", i + 1));
                    }
                    intent.putStringArrayListExtra("chapter_titles", chapterTitles);
                    intent.putStringArrayListExtra("chapter_urls", chapterUrls);
                    intent.putIntegerArrayListExtra("chapter_season_numbers", chapterSeasonNumbers);
                    intent.putIntegerArrayListExtra("chapter_numbers", chapterNumbers);
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
        sendPlayerControl("stop", 0);
        
        JSObject result = new JSObject();
        result.put("success", true);
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
}
