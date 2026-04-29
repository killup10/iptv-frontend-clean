package play.teamg.store;

import android.app.UiModeManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
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
    private BroadcastReceiver playerClosedReceiver;
    private long lastKnownCurrentTime = 0L;
    private boolean lastKnownCompleted = false;
    private int lastKnownSeasonIndex = -1;
    private int lastKnownChapterIndex = -1;

    @PluginMethod
    public void playVideo(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Video");
        String metaLine = call.getString("metaLine", "");
        Long startTime = call.getLong("startTime", 0L);
        JSArray chaptersArray = call.getArray("chapters");
        String requestedPlayerType = call.getString("playerType", "");
        int seasonIndex = call.getInt("seasonIndex", -1);
        int chapterIndex = call.getInt("chapterIndex", -1);
        JSArray channelsArray = call.getArray("channels");
        Boolean isLiveTV = call.getBoolean("isLiveTV", false);
        String contentType = call.getString("contentType", "series");

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        String resolvedPlayerType = resolvePlayerType(requestedPlayerType, isLiveTV, contentType);
        boolean shouldUseExoplayer = shouldUseExoplayer(resolvedPlayerType);
        Class<?> targetActivity = shouldUseExoplayer ? ExoPlayerActivity.class : VLCPlayerActivity.class;
        String resolvedPlayerName = shouldUseExoplayer ? "ExoPlayer" : "VLC";

        Log.d(TAG, "Playing video: " + url);
        Log.d(
            TAG,
            "Content type: " + contentType
                + ", isLiveTV: " + isLiveTV
                + ", requestedPlayer=" + requestedPlayerType
                + ", resolvedPlayer=" + resolvedPlayerName
        );

        Intent intent = null;
        try {
            intent = new Intent(getContext(), targetActivity);
            intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            intent.putExtra("video_url", url);
            intent.putExtra("video_title", title);
            intent.putExtra("video_meta_line", metaLine);
            intent.putExtra("start_time", startTime);
            intent.putExtra("player_type", resolvedPlayerType);
            intent.putExtra("season_index", seasonIndex);
            intent.putExtra("chapter_index", chapterIndex);
            intent.putExtra("is_live_tv", isLiveTV);
            intent.putExtra("content_type", contentType);

            if (chaptersArray != null) {
                ArrayList<String> chapterTitles = new ArrayList<>();
                ArrayList<String> chapterUrls = new ArrayList<>();
                ArrayList<Integer> chapterSeasonNumbers = new ArrayList<>();
                ArrayList<Integer> chapterNumbers = new ArrayList<>();
                ArrayList<Integer> chapterSeasonIndices = new ArrayList<>();
                ArrayList<Integer> chapterIndices = new ArrayList<>();

                try {
                    int currentSeason = -1;
                    int chapterCount = 0;

                    for (int i = 0; i < chaptersArray.length(); i++) {
                        JSONObject chapter = chaptersArray.getJSONObject(i);
                        int seasonNumber = chapter.optInt("seasonNumber", 1);

                        if (seasonNumber != currentSeason) {
                            currentSeason = seasonNumber;
                            chapterCount = 1;
                        } else {
                            chapterCount++;
                        }

                        chapterTitles.add(chapter.getString("title"));
                        chapterUrls.add(chapter.getString("url"));
                        chapterSeasonNumbers.add(seasonNumber);
                        chapterNumbers.add(chapterCount);
                        chapterSeasonIndices.add(Math.max(0, chapter.optInt("seasonIndex", seasonNumber - 1)));
                        chapterIndices.add(Math.max(0, chapter.optInt("chapterIndex", chapterCount - 1)));
                    }
                    intent.putStringArrayListExtra("chapter_titles", chapterTitles);
                    intent.putStringArrayListExtra("chapter_urls", chapterUrls);
                    intent.putIntegerArrayListExtra("chapter_season_numbers", chapterSeasonNumbers);
                    intent.putIntegerArrayListExtra("chapter_numbers", chapterNumbers);
                    intent.putIntegerArrayListExtra("chapter_season_indices", chapterSeasonIndices);
                    intent.putIntegerArrayListExtra("chapter_indices", chapterIndices);

                    Log.d(TAG, "Capitulos procesados - Temporadas: " + chapterSeasonNumbers + ", Numeros: " + chapterNumbers + ", Indices temporada/capitulo: " + chapterSeasonIndices + "/" + chapterIndices);
                } catch (JSONException e) {
                    Log.e(TAG, "Error processing chapters", e);
                }
            }

            if (channelsArray != null && channelsArray.length() > 0) {
                ArrayList<String> channelNames = new ArrayList<>();
                ArrayList<String> channelLogos = new ArrayList<>();
                ArrayList<String> channelUrls = new ArrayList<>();

                try {
                    for (int i = 0; i < channelsArray.length(); i++) {
                        JSONObject channel = channelsArray.getJSONObject(i);
                        String channelUrl = channel.optString("url", "");
                        if (channelUrl.isEmpty()) channelUrl = channel.optString("streamUrl", "");
                        if (channelUrl.isEmpty()) channelUrl = channel.optString("stream_url", "");
                        if (channelUrl.isEmpty()) channelUrl = channel.optString("playbackUrl", "");
                        if (channelUrl.isEmpty()) channelUrl = channel.optString("videoUrl", "");
                        if (channelUrl.isEmpty()) {
                            Log.w(TAG, "Skipping live channel without URL at index " + i);
                            continue;
                        }

                        String channelName = channel.optString("name", channel.optString("title", "Canal"));
                        channelNames.add(channelName);
                        channelLogos.add(channel.optString("logo", ""));
                        channelUrls.add(channelUrl);
                    }
                    intent.putStringArrayListExtra("channel_names", channelNames);
                    intent.putStringArrayListExtra("channel_logos", channelLogos);
                    intent.putStringArrayListExtra("channel_urls", channelUrls);

                    Log.d(TAG, "Canales procesados - Total: " + channelNames.size() + " canales");
                } catch (JSONException e) {
                    Log.e(TAG, "Error processing live channels", e);
                }
            }

            getActivity().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", resolvedPlayerName + " started");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error starting " + resolvedPlayerName, e);

            try {
                String fallbackPlayerType = shouldUseExoplayer ? "android-vlc" : "android-exoplayer";
                Class<?> fallbackActivity = shouldUseExoplayer ? VLCPlayerActivity.class : ExoPlayerActivity.class;
                String fallbackPlayerName = shouldUseExoplayer ? "VLC" : "ExoPlayer";
                Intent fallbackIntent = new Intent(getContext(), fallbackActivity);
                fallbackIntent.putExtra("video_url", url);
                fallbackIntent.putExtra("video_title", title);
                fallbackIntent.putExtra("video_meta_line", metaLine);
                fallbackIntent.putExtra("start_time", startTime);
                fallbackIntent.putExtra("player_type", fallbackPlayerType);
                fallbackIntent.putExtra("season_index", seasonIndex);
                fallbackIntent.putExtra("chapter_index", chapterIndex);
                fallbackIntent.putExtra("is_live_tv", isLiveTV);
                fallbackIntent.putExtra("content_type", contentType);

                if (chaptersArray != null) {
                    fallbackIntent.putStringArrayListExtra("chapter_titles", intent.getStringArrayListExtra("chapter_titles"));
                    fallbackIntent.putStringArrayListExtra("chapter_urls", intent.getStringArrayListExtra("chapter_urls"));
                    fallbackIntent.putIntegerArrayListExtra("chapter_season_numbers", intent.getIntegerArrayListExtra("chapter_season_numbers"));
                    fallbackIntent.putIntegerArrayListExtra("chapter_numbers", intent.getIntegerArrayListExtra("chapter_numbers"));
                    fallbackIntent.putIntegerArrayListExtra("chapter_season_indices", intent.getIntegerArrayListExtra("chapter_season_indices"));
                    fallbackIntent.putIntegerArrayListExtra("chapter_indices", intent.getIntegerArrayListExtra("chapter_indices"));
                }

                if (channelsArray != null) {
                    fallbackIntent.putStringArrayListExtra("channel_names", intent.getStringArrayListExtra("channel_names"));
                    fallbackIntent.putStringArrayListExtra("channel_logos", intent.getStringArrayListExtra("channel_logos"));
                    fallbackIntent.putStringArrayListExtra("channel_urls", intent.getStringArrayListExtra("channel_urls"));
                }

                getActivity().startActivity(fallbackIntent);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", fallbackPlayerName + " started (fallback)");
                call.resolve(result);

            } catch (Exception fallbackError) {
                Log.e(TAG, "Error starting fallback player", fallbackError);
                call.reject("Error starting video player: " + fallbackError.getMessage());
            }
        }
    }

    @PluginMethod
    public void updateLiveChannels(PluginCall call) {
        JSArray channelsArray = call.getArray("channels");
        ArrayList<String> channelNames = new ArrayList<>();
        ArrayList<String> channelLogos = new ArrayList<>();
        ArrayList<String> channelUrls = new ArrayList<>();

        try {
            if (channelsArray != null) {
                for (int i = 0; i < channelsArray.length(); i++) {
                    JSONObject channel = channelsArray.getJSONObject(i);
                    String channelUrl = channel.optString("url", "");
                    if (channelUrl.isEmpty()) channelUrl = channel.optString("streamUrl", "");
                    if (channelUrl.isEmpty()) channelUrl = channel.optString("stream_url", "");
                    if (channelUrl.isEmpty()) channelUrl = channel.optString("playbackUrl", "");
                    if (channelUrl.isEmpty()) channelUrl = channel.optString("videoUrl", "");
                    if (channelUrl.isEmpty()) {
                        continue;
                    }

                    String channelName = channel.optString("name", channel.optString("title", "Canal"));
                    channelNames.add(channelName);
                    channelLogos.add(channel.optString("logo", ""));
                    channelUrls.add(channelUrl);
                }
            }

            Intent intent = new Intent("UPDATE_LIVE_CHANNELS");
            intent.setPackage(getContext().getPackageName());
            intent.putStringArrayListExtra("channel_names", channelNames);
            intent.putStringArrayListExtra("channel_logos", channelLogos);
            intent.putStringArrayListExtra("channel_urls", channelUrls);
            getContext().sendBroadcast(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("count", channelNames.size());
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error updating live channels", e);
            call.reject("Error updating live channels: " + e.getMessage());
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

        sendPlayerControl("stop", 0);

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

        sendPlayerControl("stop", 0);

        try {
            Intent finishIntent = new Intent("FORCE_FINISH_VLC_ACTIVITY");
            finishIntent.setPackage(getContext().getPackageName());
            getContext().sendBroadcast(finishIntent);
            Log.d(TAG, "Sent FORCE_FINISH_VLC_ACTIVITY broadcast");

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
        sendPlayerControl("getCurrentTime", 0);

        JSObject result = new JSObject();
        result.put("currentTime", lastKnownCurrentTime);
        result.put("completed", lastKnownCompleted);
        if (lastKnownSeasonIndex >= 0) {
            result.put("seasonIndex", lastKnownSeasonIndex);
        }
        if (lastKnownChapterIndex >= 0) {
            result.put("chapterIndex", lastKnownChapterIndex);
        }
        result.put("success", true);
        call.resolve(result);
    }

    @Override
    protected void handleOnStart() {
        super.handleOnStart();
        registerProgressReceiver();
        registerPlayerClosedReceiver();
    }

    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        unregisterProgressReceiver();
        unregisterPlayerClosedReceiver();
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
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
                        boolean forceSync = intent.getBooleanExtra("forceSync", false);
                        int seasonIndex = intent.getIntExtra("seasonIndex", -1);
                        int chapterIndex = intent.getIntExtra("chapterIndex", -1);

                        Log.d(TAG, "Progress received: " + currentTime + "s, completed: " + completed + ", forceSync=" + forceSync + ", seasonIndex=" + seasonIndex + ", chapterIndex=" + chapterIndex);

                        lastKnownCurrentTime = currentTime;
                        lastKnownCompleted = completed;
                        lastKnownSeasonIndex = seasonIndex;
                        lastKnownChapterIndex = chapterIndex;

                        JSObject data = new JSObject();
                        data.put("currentTime", currentTime);
                        data.put("completed", completed);
                        data.put("forceSync", forceSync);
                        if (seasonIndex >= 0) {
                            data.put("seasonIndex", seasonIndex);
                        }
                        if (chapterIndex >= 0) {
                            data.put("chapterIndex", chapterIndex);
                        }
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

    private void registerPlayerClosedReceiver() {
        if (playerClosedReceiver == null) {
            playerClosedReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if ("VIDEO_PLAYER_CLOSED".equals(intent.getAction())) {
                        String reason = intent.getStringExtra("reason");
                        if (reason == null) reason = "unknown";
                        Log.d(TAG, "Player closed event received. Reason: " + reason);

                        JSObject data = new JSObject();
                        data.put("reason", reason);
                        notifyListeners("playerClosed", data);
                    }
                }
            };

            IntentFilter filter = new IntentFilter("VIDEO_PLAYER_CLOSED");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(playerClosedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                getContext().registerReceiver(playerClosedReceiver, filter);
            }
            Log.d(TAG, "Player closed receiver registered");
        }
    }

    private void unregisterPlayerClosedReceiver() {
        if (playerClosedReceiver != null) {
            try {
                getContext().unregisterReceiver(playerClosedReceiver);
                playerClosedReceiver = null;
                Log.d(TAG, "Player closed receiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering player closed receiver", e);
            }
        }
    }

    public void notifyTimeUpdate(long currentTime) {
        JSObject data = new JSObject();
        data.put("currentTime", currentTime);
        notifyListeners("timeupdate", data);
    }

    private String resolvePlayerType(String requestedPlayerType, boolean isLiveTV, String contentType) {
        if ("android-vlc".equalsIgnoreCase(requestedPlayerType)) {
            return "android-vlc";
        }
        if (isAndroidTvDevice() && !Boolean.TRUE.equals(isLiveTV)) {
            Log.d(TAG, "Forzando VLC en Android TV para VOD por compatibilidad AC3/E-AC3. contentType=" + contentType);
            return "android-vlc";
        }
        if ("android-exoplayer".equalsIgnoreCase(requestedPlayerType)) {
            return "android-exoplayer";
        }
        return isAndroidTvDevice() && Boolean.TRUE.equals(isLiveTV)
            ? "android-exoplayer"
            : "android-vlc";
    }

    private boolean shouldUseExoplayer(String playerType) {
        if ("android-vlc".equalsIgnoreCase(playerType)) {
            return false;
        }
        if ("android-exoplayer".equalsIgnoreCase(playerType)) {
            return true;
        }
        return false;
    }

    private boolean isAndroidTvDevice() {
        try {
            UiModeManager uiModeManager = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
            boolean isTelevisionUiMode =
                uiModeManager != null && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;
            boolean hasLeanbackFeature =
                getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);
            return isTelevisionUiMode || hasLeanbackFeature;
        } catch (Exception e) {
            Log.w(TAG, "Error detecting Android TV device", e);
            return false;
        }
    }
}
