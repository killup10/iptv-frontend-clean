package play.teamg.store;

import android.content.Context;
import org.videolan.libvlc.LibVLC;
import java.util.ArrayList;


public class VLCInstance {
    private static LibVLC libVLC;

    public static synchronized LibVLC getInstance(Context context) {
        if (libVLC == null) {
            ArrayList<String> options = new ArrayList<>();
            options.add("--no-sub-autodetect-file");
            options.add("--swscale-mode=0");
            options.add("--network-caching=1500");
            options.add("--avcodec-threads=0");
            libVLC = new LibVLC(context, options);
        }
        return libVLC;
    }

    public static synchronized void release() {
        if (libVLC != null) {
            libVLC.release();
            libVLC = null;
        }
    }
}
