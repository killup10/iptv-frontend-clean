package play.teamg.store;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.content.pm.ActivityInfo;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.os.Build;
import androidx.annotation.RequiresApi;

public class MainActivity extends BridgeActivity {
  private View customView;
  private WebChromeClient.CustomViewCallback customViewCallback;
  private FrameLayout fullscreenContainer;
  private int originalOrientation;
  private int originalSystemUiVisibility;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(VideoPlayerPlugin.class);
    registerPlugin(PermissionManager.class);
    registerPlugin(AppUpdatePlugin.class);
    super.onCreate(savedInstanceState);
    
    // Configurar WebChromeClient para manejar pantalla completa y permisos
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

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
              if (customView != null) {
                onHideCustomView();
                return;
              }

              customView = view;
              customViewCallback = callback;
              originalOrientation = getRequestedOrientation();
              originalSystemUiVisibility = getWindow().getDecorView().getSystemUiVisibility();

              fullscreenContainer = new FrameLayout(MainActivity.this);
              fullscreenContainer.setBackgroundColor(android.graphics.Color.BLACK);
              fullscreenContainer.addView(customView, new FrameLayout.LayoutParams(
                  ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

              ViewGroup decorView = (ViewGroup) getWindow().getDecorView();
              decorView.addView(fullscreenContainer, new ViewGroup.LayoutParams(
                  ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

              getWindow().getDecorView().setSystemUiVisibility(
                  View.SYSTEM_UI_FLAG_FULLSCREEN |
                  View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                  View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                  View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                  View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                  View.SYSTEM_UI_FLAG_LAYOUT_STABLE
              );

              setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            }

            @Override
            public void onHideCustomView() {
              if (customView == null) {
                return;
              }

              ViewGroup decorView = (ViewGroup) getWindow().getDecorView();
              if (fullscreenContainer != null) {
                decorView.removeView(fullscreenContainer);
                fullscreenContainer = null;
              }

              customView = null;
              if (customViewCallback != null) {
                customViewCallback.onCustomViewHidden();
                customViewCallback = null;
              }

              getWindow().getDecorView().setSystemUiVisibility(originalSystemUiVisibility);
              setRequestedOrientation(originalOrientation);
            }
          });
        }
      } catch (Exception e) {
        android.util.Log.e("TeamG", "Error setting WebChromeClient", e);
      }
    }
  }

  @Override
  public void onBackPressed() {
    if (customView != null) {
      if (bridge != null && bridge.getWebView() != null && bridge.getWebView().getWebChromeClient() != null) {
        bridge.getWebView().getWebChromeClient().onHideCustomView();
        return;
      }
    }
    super.onBackPressed();
  }
}
