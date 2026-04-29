import { Capacitor } from '@capacitor/core';

const isForcedTVMode = () => {
  if (typeof window === 'undefined') return false;

  return window.__TEAMG_TV_BUILD__ === true ||
    localStorage.getItem('FORCED_TV_MODE') === 'true' ||
    localStorage.getItem('FORCE_TV_MODE') === 'true' ||
    new URLSearchParams(window.location.search).get('tv') === 'true';
};

/**
 * Detecta si estamos en Android TV (función interna)
 */
const detectAndroidTV = () => {
  if (typeof window === 'undefined') return false;

  // Debug: permitir forzar Android TV vía localStorage/URL
  const forceTV = isForcedTVMode();

  // Android TV suele tener estas características
  const hasAndroidTV =
    navigator.userAgent.includes('Android') &&
    (navigator.userAgent.includes('AFT') || // Amazon FireStick
     navigator.userAgent.includes('ARRIS') || // Arris TV
     navigator.userAgent.includes('BRAVIA') || // Sony TV
     navigator.userAgent.includes('Nexus Player') ||
     navigator.userAgent.includes('HbbTV') ||
     navigator.userAgent.includes('Android TV'));

  // También detectar por pantalla (TV suele ser muy grande)
  const isLargeScreen = window.innerWidth >= 1280 && window.innerHeight >= 720;

  // Si tiene touchscreen:false en los atributos
  const noTouchscreen = !navigator.maxTouchPoints || navigator.maxTouchPoints === 0;

  // Si estamos en Android sin touchscreen, asumir que es TV
  const isAndroidNoTouch = navigator.userAgent.includes('Android') && noTouchscreen;

  return forceTV || hasAndroidTV || (isLargeScreen && noTouchscreen) || isAndroidNoTouch;
};

/**
 * Determina el tipo de plataforma de una sola vez.
 * Devuelve: 'electron', 'android', 'android-tv', 'ios', o 'web'.
 */
const getPlatform = () => {
  const forceTVMode = isForcedTVMode();

  if (typeof window !== 'undefined' && window.electronAPI) {
    return 'electron';
  }

  // Intentar usar Capacitor solo si está listo
  try {
    if (Capacitor.isNativePlatform && typeof Capacitor.isNativePlatform === 'function') {
      const platform = Capacitor.getPlatform(); // 'android' o 'ios'
      if (forceTVMode) {
        return 'android-tv';
      }
      if (platform === 'android' && detectAndroidTV()) {
        return 'android-tv';
      }
      return platform;
    }
  } catch (e) {
    console.warn('Capacitor no disponible, usando detección alternativa', e);
  }

  if (forceTVMode) {
    return 'android-tv';
  }

  // Fallback: detectar Android TV por navegador
  if (navigator.userAgent.includes('Android') && detectAndroidTV()) {
    return 'android-tv';
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
 * Devuelve: 'electron', 'android-vlc', 'android-exoplayer' o 'web'.
 */
export const getPlayerType = () => {
  switch (platform) {
    case 'electron':
      return 'electron';
    case 'android':
      return 'android-vlc';
    case 'android-tv':
      return 'android-vlc';
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
