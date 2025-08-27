// src/utils/playerUtils.js

// Función para detectar si estamos en Electron usando contextBridge
const IS_ELECTRON = typeof window !== 'undefined' && 
                   typeof window.electronAPI === 'object' &&
                   typeof window.electronAPI.isElectron === 'function' &&
                   window.electronAPI.isElectron();

if (process.env.NODE_ENV === 'development') {
  console.log("playerUtils: ¿Ejecutando en Electron?", IS_ELECTRON);
  console.log("playerUtils: window.electronAPI disponible?", typeof window.electronAPI);
  console.log("playerUtils: window.electronMPV disponible?", typeof window.electronMPV);
}

/**
 * getPlayableUrl
 *
 * @param {object} item - Objeto que debe incluir al menos { url: string }.
 * @param {string} [m3u8ProxyBaseUrl] - Opcional: La URL base de tu proxy M3U8.
 * @returns {string} - URL lista para reproducir en el player.
 * @throws {Error} - Si la URL no es válida o no se puede procesar.
 */
export function getPlayableUrl(item, m3u8ProxyBaseUrl) {
  // Validación de entrada
  if (!item || typeof item !== 'object') {
    throw new Error('Se requiere un objeto item válido');
  }

  if (typeof item.url !== 'string' || item.url.trim() === '') {
    throw new Error('URL inválida o vacía');
  }

  // Devolver siempre la URL original sin procesar para evitar el proxy.
  return item.url.trim();
}
