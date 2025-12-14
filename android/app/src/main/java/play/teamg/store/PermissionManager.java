package play.teamg.store;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PermissionManager")
public class PermissionManager extends Plugin {
  
  private static final int MICROPHONE_PERMISSION_CODE = 1001;
  private static final String PERMISSION_MICROPHONE = Manifest.permission.RECORD_AUDIO;
  
  private PluginCall savedCall;

  /**
   * Solicitar permiso de micrófono
   */
  public void requestMicrophonePermission(PluginCall call) {
    this.savedCall = call;
    requestMicrophonePermissionImpl();
  }

  private void requestMicrophonePermissionImpl() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      int permission = ContextCompat.checkSelfPermission(getContext(), PERMISSION_MICROPHONE);
      
      if (permission != PackageManager.PERMISSION_GRANTED) {
        // Permiso no otorgado, solicitar
        ActivityCompat.requestPermissions(
            getActivity(),
            new String[]{PERMISSION_MICROPHONE},
            MICROPHONE_PERMISSION_CODE
        );
      } else {
        // Permiso ya otorgado
        notifySuccess();
      }
    } else {
      // En Android < 6.0, los permisos ya están otorgados en tiempo de instalación
      notifySuccess();
    }
  }

  /**
   * Manejar resultado de solicitud de permisos
   */
  public void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    if (requestCode == MICROPHONE_PERMISSION_CODE) {
      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
        // Permiso otorgado
        notifySuccess();
      } else {
        // Permiso denegado
        notifyFailure("Permission denied");
      }
    }
  }

  private void notifySuccess() {
    JSObject result = new JSObject();
    result.put("status", "granted");
    
    if (savedCall != null) {
      savedCall.resolve(result);
      savedCall = null;
    }
  }

  private void notifyFailure(String message) {
    if (savedCall != null) {
      savedCall.reject(message);
      savedCall = null;
    }
  }
}
