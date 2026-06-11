package play.teamg.store;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.os.Build;
import androidx.annotation.RequiresApi;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(VideoPlayerPlugin.class);
    registerPlugin(PermissionManager.class);
    super.onCreate(savedInstanceState);

    // Configurar WebChromeClient para manejar solicitudes de permiso
    setupWebChromeClient();
  }

  private void setupWebChromeClient() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      try {
        if (bridge != null && bridge.getWebView() != null) {
          bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @RequiresApi(api = Build.VERSION_CODES.LOLLIPOP)
            @Override
            public void onPermissionRequest(PermissionRequest request) {
              try {
                if (request != null && request.getResources() != null && request.getResources().length > 0) {
                  android.util.Log.d("TeamG", "WebChromeClient onPermissionRequest: " + request.getResources()[0]);
                  request.grant(request.getResources());
                }
              } catch (Exception e) {
                android.util.Log.e("TeamG", "Error granting permissions", e);
              }
            }
          });
        } else {
          android.util.Log.w("TeamG", "Bridge or WebView is null - skipping setup");
        }
      } catch (Exception e) {
        android.util.Log.e("TeamG", "Error setting WebChromeClient", e);
      }
    }
  }
}
