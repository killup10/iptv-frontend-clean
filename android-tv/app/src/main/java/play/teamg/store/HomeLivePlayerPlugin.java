package play.teamg.store;

import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** One native video surface underneath the transparent Home WebView. */
@CapacitorPlugin(name = "HomeLivePlayer")
public class HomeLivePlayerPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicInteger generation = new AtomicInteger();
    private final AtomicInteger sourceChanges = new AtomicInteger();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean foreground = true;
    private VLCVideoLayout surface;
    private volatile MediaPlayer player;
    private ViewGroup parent;
    private Drawable parentBackground;
    private volatile String activeUrl = "";
    private volatile boolean retryNeeded;
    private volatile boolean fullscreen;

    @PluginMethod
    public void tune(PluginCall call) {
        String url = call.getString("url", "");
        if (url.isEmpty()) { call.reject("Channel URL required"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                ensureSurface();
                MediaPlayer engine = player;
                int request = generation.incrementAndGet();
                mainHandler.removeCallbacksAndMessages(null);
                mainHandler.postDelayed(() -> {
                    if (request != generation.get() || engine != player || !foreground || engine.isPlaying() || retryNeeded) return;
                    retryNeeded = true;
                    JSObject data = new JSObject();
                    data.put("state", "error");
                    data.put("url", url);
                    notifyListeners("state", data);
                    exitFullscreen();
                    worker.execute(() -> { if (request == generation.get()) engine.stop(); });
                }, 20000);
                worker.execute(() -> {
                    if (request != generation.get()) { call.resolve(); return; }
                    try {
                        if (!url.equals(activeUrl) || retryNeeded) {
                            engine.setEventListener(null);
                            engine.stop();
                            if (request != generation.get()) { call.resolve(); return; }
                            Media media = new Media(VLCInstance.getInstance(getContext()), Uri.parse(url));
                            media.setHWDecoderEnabled(true, false);
                            media.addOption(":network-caching=700");
                            media.addOption(":live-caching=700");
                            media.addOption(":http-reconnect=true");
                            media.addOption(":http-user-agent=VLC/3.0.0 (Linux; Android 9)");
                            engine.setMedia(media);
                            sourceChanges.incrementAndGet();
                            media.release();
                            activeUrl = url;
                            retryNeeded = false;
                        }
                        if (request != generation.get()) { call.resolve(); return; }
                        engine.setEventListener(event -> {
                            if (request != generation.get()) return;
                            String state = null;
                            if (event.type == MediaPlayer.Event.Playing) state = "playing";
                            if (event.type == MediaPlayer.Event.EncounteredError || event.type == MediaPlayer.Event.EndReached) {
                                retryNeeded = true;
                                state = "error";
                            }
                            if (state != null) {
                                JSObject data = new JSObject();
                                data.put("state", state);
                                data.put("url", url);
                                notifyListeners("state", data);
                                if ("error".equals(state)) getActivity().runOnUiThread(() -> {
                                    if (request == generation.get()) exitFullscreen();
                                });
                            }
                        });
                        if (engine.isPlaying()) {
                            JSObject data = new JSObject();
                            data.put("state", "playing");
                            data.put("url", url);
                            notifyListeners("state", data);
                        } else engine.play();
                        call.resolve();
                    } catch (Exception error) {
                        activeUrl = "";
                        call.reject("Cannot tune channel", error);
                    }
                });
            } catch (Exception error) { call.reject("Cannot initialize Home player", error); }
        });
    }

    private void ensureSurface() {
        if (surface != null) return;
        View web = getBridge().getWebView();
        parent = (ViewGroup) web.getParent();
        parentBackground = parent.getBackground();
        parent.setBackgroundColor(Color.TRANSPARENT);
        surface = new VLCVideoLayout(getContext());
        // Keep the surface fixed when Home scrolls or hides. Capacitor's
        // CoordinatorLayout converts these into its own layout parameters.
        parent.addView(surface, 0, new ViewGroup.LayoutParams(-1, -1));
        getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
        web.bringToFront();
        player = new MediaPlayer(VLCInstance.getInstance(getContext()));
        player.setAudioDigitalOutputEnabled(false);
        player.attachViews(surface, null, false, false);
        player.setScale(MediaPlayer.ScaleType.SURFACE_FIT_SCREEN.ordinal());
        getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @PluginMethod
    public void setFullscreen(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            boolean requested = call.getBoolean("fullscreen", false);
            if (requested && (player == null || retryNeeded)) {
                call.reject("Channel playback failed");
                return;
            }
            fullscreen = requested;
            getBridge().getWebView().setVisibility(fullscreen ? View.INVISIBLE : View.VISIBLE);
            call.resolve();
        });
    }

    /** MainActivity consumes Back before the hidden WebView can navigate. */
    public boolean exitFullscreen() {
        if (!fullscreen) return false;
        fullscreen = false;
        getBridge().getWebView().setVisibility(View.VISIBLE);
        notifyListeners("fullscreenExit", new JSObject());
        return true;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        worker.execute(() -> {
            MediaPlayer engine = player;
            JSObject status = new JSObject();
            status.put("active", engine != null);
            status.put("playing", engine != null && engine.isPlaying());
            status.put("time", engine == null ? 0 : engine.getTime());
            status.put("fullscreen", fullscreen);
            status.put("sourceChanges", sourceChanges.get());
            call.resolve(status);
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { release(); call.resolve(); });
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            release();
            call.resolve();
            if (getActivity() != null) {
                getActivity().finishAffinity();
            }
        });
    }

    private void release() {
        mainHandler.removeCallbacksAndMessages(null);
        generation.incrementAndGet();
        fullscreen = false;
        getBridge().getWebView().setVisibility(View.VISIBLE);
        MediaPlayer old = player;
        player = null;
        activeUrl = "";
        retryNeeded = false;
        if (old != null) {
            old.setEventListener(null);
            old.detachViews();
            worker.execute(() -> { old.stop(); old.release(); });
        }
        if (surface != null) { parent.removeView(surface); surface = null; }
        if (parent != null) { parent.setBackground(parentBackground); parent = null; }
        getBridge().getWebView().setBackgroundColor(Color.BLACK);
        getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override protected void handleOnPause() {
        foreground = false;
        // No stream/audio continues while another activity or app covers Home.
        worker.execute(() -> { if (player != null) player.pause(); });
    }
    @Override protected void handleOnResume() {
        foreground = true;
        worker.execute(() -> { if (player != null && !activeUrl.isEmpty()) player.play(); });
    }
    @Override protected void handleOnDestroy() {
        release();
        worker.shutdown();
    }
}
