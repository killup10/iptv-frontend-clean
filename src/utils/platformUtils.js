import { Capacitor } from '@capacitor/core';

/**
 * Detecta si estamos en Android TV (función interna)
 */
const detectAndroidTV = () => {
  if (typeof window === 'undefined') return false;
  
  // Android TV suele tener estas características
  const hasAndroidTV = 
    navigator.userAgent.includes('Android') &&
    (navigator.userAgent.includes('AFT') || // Amazon FireStick
     navigator.userAgent.includes('ARRIS') || // Arris TV
     navigator.userAgent.includes('BRAVIA') || // Sony TV
     navigator.userAgent.includes('Nexus Player') ||
     navigator.userAgent.includes('HbbTV'));
  
  // También detectar por pantalla (TV suele ser muy grande)
  const isLargeScreen = window.innerWidth > 1920 || window.innerHeight > 1080;
  
  // Si tiene touchscreen:false en los atributos
  const noTouchscreen = !navigator.maxTouchPoints || navigator.maxTouchPoints === 0;
  
  return hasAndroidTV || (isLargeScreen && noTouchscreen);
};

/**
 * Determina el tipo de plataforma de una sola vez.
 * Devuelve: 'electron', 'android', 'android-tv', 'ios', o 'web'.
 */
const getPlatform = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return 'electron';
  }
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform(); // 'android' o 'ios'
    if (platform === 'android' && detectAndroidTV()) {
      return 'android-tv';
    }
    return platform;
  }
  return 'web';
};

// Se determina la plataforma una sola vez al cargar el módulo.
const platform = getPlatform();

export const isElectron = () => platform === 'electron';
export const isAndroid = () => platform === 'android' || platform === 'android-tv';
export const isAndroidTV = () => platform === 'android-tv';
export const isAndroidMobile = () => platform === 'android';
export const isIOS = () => platform === 'ios';
export const isWeb = () => platform === 'web';

/**
 * Obtiene el tipo de reproductor que debe usarse basado en la plataforma.
 * Devuelve: 'electron', 'android-vlc', 'android-tv-native', o 'web'.
 */
export const getPlayerType = () => {
  switch (platform) {
    case 'electron':
      return 'electron';
    case 'android':
      return 'android-vlc';
    case 'android-tv':
      return 'android-tv-native'; // Reproductor nativo para TV
    default:
      return 'web';
  }
};

/**
 * Obtiene el tipo de UI que debe usarse basado en la plataforma.
 * Devuelve: 'tv', 'mobile', 'desktop', o 'web'.
 */
export const getUIType = () => {
  switch (platform) {
    case 'android-tv':
      return 'tv';
    case 'android':
    case 'ios':
      return 'mobile';
    case 'electron':
      return 'desktop';
    default:
      return 'web';
  }
};

/**
 * Obtiene la plataforma activa
 */
export const getPlatformName = () => {
  return platform;
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
