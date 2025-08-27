// preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD_LOG] Script de precarga (preload.cjs) ejecutándose...');

try {
  // --- API para controlar MPV embebido ---
  contextBridge.exposeInMainWorld('electronMPV', {
    /**
     * Reproduce un video en MPV dentro de un BrowserView de Electron.
     * @param {string} url    - La URL (.mkv, .m3u8, etc.) del video a reproducir.
     * @param {{ x: number, y: number, width: number, height: number }} bounds
     *                       - Coordenadas/Dimensiones (relativas al viewport) donde debe pintarse MPV.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    play: (url, bounds) => {
      return ipcRenderer.invoke('mpv-embed-play', { url, bounds });
    },

    /**
     * Detiene la reproducción actual de MPV y libera recursos.
     */
    stop: () => {
      return ipcRenderer.invoke('mpv-embed-stop');
    },

    /**
     * Actualiza las bounds (posición/tamaño) del BrowserView donde MPV está pintando.
     * Útil si el usuario redimensiona o mueve el contenedor en el frontend.
     * @param {{ x: number, y: number, width: number, height: number }} bounds
     */
    updateBounds: (bounds) => {
      ipcRenderer.send('mpv-embed-update-bounds', { bounds });
    },

    /**
     * Permite al proceso principal solicitar en cualquier momento que el renderer
     * reenvíe sus bounds actuales. Esto es útil si el usuario mueve la ventana o la arrastra,
     * para que MPV ajuste su BrowserView a las nuevas coordenadas.
     *
     * @param {Function} callback - función a invocar cuando llegue la petición de sincronización
     * @returns {Function}        - función para remover este listener cuando ya no sea necesario
     */
    onRequestVideoBoundsSync: (callback) => {
      const handler = () => {
        callback();
      };
      ipcRenderer.on('request-video-bounds-sync', handler);
      return () => {
        ipcRenderer.removeListener('request-video-bounds-sync', handler);
      };
    }
  });
  console.log('[PRELOAD_LOG] electronMPV expuesto a window.electronMPV');
} catch (error) {
  console.error('[PRELOAD_ERROR] Error al exponer electronMPV:', error);
}

try {
  // --- API genérica de Electron (por si la necesitas) ---
  contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Indica si estamos corriendo dentro de Electron.
     * @returns {boolean}
     */
    isElectron: () => true,

    /**
     * Versiones de Node, Chrome y Electron para debugging.
     */
    versions: {
      node: () => process.versions.node,
      chrome: () => process.versions.chrome,
      electron: () => process.versions.electron
    },

    /**
     * Suscribirse a errores de MPV
     */
    on: (channel, callback) => {
      if (channel === 'mpv-error' || channel === 'mpv-time-pos') {
        ipcRenderer.on(channel, callback);
      }
    },
    removeListener: (channel, callback) => {
            if (channel === 'mpv-error' || channel === 'mpv-time-pos') {
            ipcRenderer.removeListener(channel, callback);
      }
    }
  });
  console.log('[PRELOAD_LOG] electronAPI (con isElectron, versions y onMpvError) expuesta a window.electronAPI');
} catch (error) {
  console.error('[PRELOAD_ERROR] Error al exponer electronAPI:', error);
}
