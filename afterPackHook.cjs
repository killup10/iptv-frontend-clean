// afterPackHook.cjs
const path = require('node:path');
const fs = require('node:fs');

/**
 * Hook de afterPack para electron-builder.
 * Intenta reemplazar el ffmpeg.dll por defecto de Electron con una versión personalizada.
 * @param {object} context - El contexto de compilación de electron-builder.
 * Contiene propiedades como:
 * - context.appOutDir: Directorio de salida de la app desempaquetada (ej. release_electron/win-unpacked)
 * - context.electronPlatformName: 'win32', 'darwin', 'linux'
 */
module.exports = async function(context) {
  console.log('[afterPackHook] Iniciando reemplazo de FFmpeg...');

  // Imprime las claves principales del contexto para depuración (opcional)
  // console.log('[afterPackHook] Inspeccionando claves principales del objeto context:');
  // console.log(`[afterPackHook]   context.appOutDir: ${context.appOutDir}`);
  // console.log(`[afterPackHook]   context.outDir: ${context.outDir}`);
  // console.log(`[afterPackHook]   context.electronPlatformName: ${context.electronPlatformName}`);

  const platform = context.electronPlatformName;
  const appOutDir = context.appOutDir; // Directorio donde la app está desempaquetada, ej: release_electron/win-unpacked

  console.log(`[afterPackHook]   Plataforma detectada: ${platform}`);
  console.log(`[afterPackHook]   Directorio de salida de la app (appOutDir): ${appOutDir}`);

  // Solo para Windows en este ejemplo, ya que ffmpeg.dll es específico de Windows.
  // Adapta para otras plataformas si es necesario (ej. libffmpeg.so en Linux).
  if (platform === 'win32') {
    console.log('[afterPackHook]   Intentando reemplazar FFmpeg para la plataforma: win32');

    // extraResources copia a la carpeta 'resources' DENTRO de appOutDir.
    // 'ffmpeg_custom_packaged' es el nombre del directorio 'to' en tu extraResources.
    // 'ffmpeg.dll' es el nombre de tu archivo.
    const customFfmpegSourcePath = path.join(appOutDir, 'resources', 'ffmpeg_custom_packaged', 'ffmpeg.dll');

    // El ffmpeg.dll de Electron está en la raíz de appOutDir.
    const electronFfmpegDestPath = path.join(appOutDir, 'ffmpeg.dll');

    console.log(`[afterPackHook]     Ruta de FFmpeg personalizado (fuente): ${customFfmpegSourcePath}`);
    console.log(`[afterPackHook]     Ruta de FFmpeg de Electron (destino): ${electronFfmpegDestPath}`);

    if (fs.existsSync(customFfmpegSourcePath)) {
      try {
        fs.copyFileSync(customFfmpegSourcePath, electronFfmpegDestPath);
        console.log('[afterPackHook]     ✅ FFmpeg reemplazado exitosamente.');
      } catch (err) {
        console.error('[afterPackHook]     ❌ Error al reemplazar FFmpeg:', err);
        // Considera si quieres que el build falle aquí o solo muestre una advertencia.
        // Descomenta la siguiente línea para hacer que el build falle si el reemplazo falla.
        // throw err;
      }
    } else {
      console.warn(`[afterPackHook]     ⚠️ FFmpeg personalizado no encontrado en ${customFfmpegSourcePath}. No se reemplazó nada.`);
      console.warn("[afterPackHook]     Asegúrate de que 'extraResources' en tu configuración de electron-builder esté configurado correctamente:");
      console.warn("[afterPackHook]       - 'from' debe apuntar a tu ffmpeg.dll personalizado (ej: 'ffmpeg_custom/ffmpeg.dll').");
      console.warn("[afterPackHook]       - 'to' debe ser el directorio destino dentro de 'resources' (ej: 'ffmpeg_custom_packaged').");
      console.warn("[afterPackHook]       - Y que el archivo FFmpeg exista en la ruta 'from'.");
    }
  } else {
    console.log(`[afterPackHook]   Reemplazo de FFmpeg no implementado o no necesario para la plataforma: ${platform}`);
  }
  console.log('[afterPackHook] Hook completado.');
};
