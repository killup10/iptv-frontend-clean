/**
 * Utility para manejar permisos de micrófono
 * En Android con Capacitor, el WebChromeClient maneja los permisos automáticamente
 */

let microphonePermissionPromise = null;

export async function checkAndRequestMicrophonePermission() {
  // Si hay una solicitud en progreso, esperar a que se complete
  if (microphonePermissionPromise) {
    console.log('[MicrophonePermission] ⏳ Esperando solicitud en progreso...');
    return microphonePermissionPromise;
  }
  
  // Crear una nueva promesa de solicitud
  microphonePermissionPromise = (async () => {
    try {
      console.log('[MicrophonePermission] 🔄 Solicitando acceso al micrófono...');
      
      // El WebChromeClient de Android maneja la solicitud automáticamente
      // Solo necesitamos intentar acceder al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Cerrar el stream inmediatamente (solo lo usamos para pedir permiso)
      stream.getTracks().forEach(track => {
        console.log('[MicrophonePermission] Parando track:', track.kind);
        track.stop();
      });
      
      console.log('[MicrophonePermission] ✅ Permiso OTORGADO');
      return true;
      
    } catch (err) {
      console.error('[MicrophonePermission] ❌ Error:', {
        name: err.name,
        message: err.message,
        type: typeof err
      });
      
      // Determinar si fue denegado explícitamente
      const isDenied = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' ||
        (err.message && err.message.toLowerCase().includes('denied'));
      
      if (isDenied) {
        console.error('[MicrophonePermission] 🔒 Permiso DENEGADO');
        console.error('[MicrophonePermission] Abre Ajustes > Aplicaciones > TeamG Play > Permisos > Micrófono y actívalo');
        return false;
      }
      
      // Para otros errores, no cacheamos
      console.warn('[MicrophonePermission] ⚠️ Error desconocido, permitiendo reintento');
      return true;
      
    } finally {
      microphonePermissionPromise = null;
    }
  })();
  
  return microphonePermissionPromise;
}

/**
 * Verificar soporte de Web Speech API
 */
export function supportsSpeechRecognition() {
  const supported = !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition
  );
  console.log('[SpeechRecognition] Soporte disponible:', supported);
  return supported;
}
