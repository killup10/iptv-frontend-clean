package play.teamg.store;

import android.util.Log;

import java.net.HttpURLConnection;
import java.net.URL;

public final class SessionValidationHelper {
    private static final String TAG = "SessionValidation";

    private SessionValidationHelper() {}

    public enum ValidationResult {
        VALID,
        INVALID,
        RETRY
    }

    public static boolean hasSessionContext(String apiBaseUrl, String sessionToken, String deviceId) {
        return false;
    }

    public static ValidationResult validate(String apiBaseUrl, String sessionToken, String deviceId) {
        if (!hasSessionContext(apiBaseUrl, sessionToken, deviceId)) {
            return ValidationResult.RETRY;
        }

        HttpURLConnection connection = null;

        try {
            String normalizedBaseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl.substring(0, apiBaseUrl.length() - 1) : apiBaseUrl;
            URL url = new URL(normalizedBaseUrl + "/api/auth/session");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setRequestProperty("Authorization", "Bearer " + sessionToken);
            connection.setRequestProperty("x-device-id", deviceId);

            int statusCode = connection.getResponseCode();
            if (statusCode >= 200 && statusCode < 300) {
                return ValidationResult.VALID;
            }

            if (statusCode == 401 || statusCode == 403) {
                Log.w(TAG, "Validacion nativa recibio HTTP " + statusCode + ". Se ignorara para evitar cierres falsos de sesion.");
                return ValidationResult.RETRY;
            }

            Log.w(TAG, "Validacion nativa respondio con HTTP " + statusCode + ". Se reintentara.");
            return ValidationResult.RETRY;
        } catch (Exception error) {
            Log.w(TAG, "Error validando sesion nativa. Se reintentara.", error);
            return ValidationResult.RETRY;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
