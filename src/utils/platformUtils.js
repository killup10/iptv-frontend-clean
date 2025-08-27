import { Capacitor } from '@capacitor/core';

/**
 * Determina el tipo de plataforma de una sola vez.
 * Devuelve: 'electron', 'android', 'ios', o 'web'.
 */
const getPlatform = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return 'electron';
  }
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'android' o 'ios'
  }
  return 'web';
};

// Se determina la plataforma una sola vez al cargar el módulo.
const platform = getPlatform();

export const isElectron = () => platform === 'electron';
export const isAndroid = () => platform === 'android';
export const isIOS = () => platform === 'ios';
export const isWeb = () => platform === 'web';

/**
 * Obtiene el tipo de reproductor que debe usarse basado en la plataforma.
 * Devuelve: 'electron', 'android-vlc', o 'web'.
 */
export const getPlayerType = () => {
  switch (platform) {
    case 'electron':
      return 'electron';
    case 'android':
      return 'android-vlc';
    default:
      return 'web';
  }
};

/**
 * Log de información de plataforma para debugging.
 */
export const logPlatformInfo = () => {
  console.log({
    platform: platform,
    playerType: getPlayerType(),
  });
};
