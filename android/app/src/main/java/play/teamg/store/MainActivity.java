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
      bridge.getWebView().setWebChromeClient(new WebChromeClient() {
        @RequiresApi(api = Build.VERSION_CODES.LOLLIPOP)
        @Override
        public void onPermissionRequest(PermissionRequest request) {
          // Log para debugging
          android.util.Log.d("TeamG", "WebChromeClient onPermissionRequest: " + request.getResources()[0]);
          
          // Aceptar todos los permisos solicitados (micrófono, cámara, etc.)
          request.grant(request.getResources());
        }
      });
    }
  }
}
