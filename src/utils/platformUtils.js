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

  // 1. Debug / Forzar: Si se forzó el modo TV, es TV.
  if (isForcedTVMode()) return true;

  // 2. Si el User Agent indica explícitamente que es un dispositivo móvil, NO es una TV.
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = ua.includes('mobile') || ua.includes('mobi') || ua.includes('phone') || ua.includes('ipod');
  if (isMobileUA) {
    return false;
  }

  // 3. Si estamos en una plataforma nativa de Capacitor y no es la build de TV, entonces es la app móvil.
  try {
    if (Capacitor.isNativePlatform && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      if (window.__TEAMG_TV_BUILD__ !== true) {
        return false;
      }
    }
  } catch (e) {
    console.warn('[platformUtils] Error comprobando Capacitor en detectAndroidTV:', e);
  }

  // 4. Detección heurística para Smart TV reales
  const hasAndroidTV =
    navigator.userAgent.includes('Android') &&
    (navigator.userAgent.includes('AFT') || // Amazon FireStick
     navigator.userAgent.includes('ARRIS') || // Arris TV
     navigator.userAgent.includes('BRAVIA') || // Sony TV
     navigator.userAgent.includes('Nexus Player') ||
     navigator.userAgent.includes('HbbTV') ||
     navigator.userAgent.includes('Leanback') ||
     navigator.userAgent.includes('GoogleTV') ||
     navigator.userAgent.includes('Fire TV') ||
     navigator.userAgent.includes('Smart-TV') ||
     navigator.userAgent.includes('SmartTV') ||
     navigator.userAgent.includes('Android TV'));

  // También detectar por pantalla (TV suele ser muy grande)
  const isLargeScreen = window.innerWidth >= 1280 && window.innerHeight >= 720;

  // Si estamos en Android sin touchscreen, asumir que es TV.
  // Algunos sticks reportan maxTouchPoints 0 y otros "undefined"; exigir
  // estrictamente 0 dejaba fuera firmwares que reportan 1 con mouse.
  const touchPoints = Number(navigator.maxTouchPoints);
  const noTouchscreen = !Number.isFinite(touchPoints) || touchPoints <= 1;

  // Si estamos en Android sin touchscreen, asumir que es TV
  const isAndroidNoTouch = navigator.userAgent.includes('Android') && noTouchscreen;

  return hasAndroidTV || (isLargeScreen && noTouchscreen) || isAndroidNoTouch;
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

// La plataforma se re-evalua de forma perezosa en cada consulta (con cache
// corta) en lugar de una sola vez al importar el modulo. Antes, si Capacitor
// o tv-index.html aun no habian inicializado `__TEAMG_TV_BUILD__` al cargar
// el bundle, `isAndroidTV()` quedaba en false para siempre y el D-Pad moria.
let cachedPlatform = null;
let cachedPlatformAt = 0;
const PLATFORM_CACHE_MS = 2000;

function getActivePlatform() {
  // Electron siempre gana: existe aunque el resto falle.
  if (typeof window !== 'undefined' && (window.electronAPI || window.electronMPV)) {
    return 'electron';
  }
  const now = Date.now();
  if (cachedPlatform === null || now - cachedPlatformAt > PLATFORM_CACHE_MS) {
    cachedPlatform = getPlatform();
    cachedPlatformAt = now;
  }
  return cachedPlatform;
}

/** Fuerza una re-deteccion inmediata (util tras login / cambio de build). */
export function refreshPlatform() {
  cachedPlatform = getPlatform();
  cachedPlatformAt = Date.now();
  return cachedPlatform;
}

export const isElectron = () => {
  if (typeof window !== 'undefined' && (window.electronAPI || window.electronMPV)) {
    return true;
  }
  return getActivePlatform() === 'electron';
};
export const isAndroid = () => {
  const platform = getActivePlatform();
  return platform === 'android' || platform === 'android-tv';
};
export const isAndroidTV = () => getActivePlatform() === 'android-tv';
export const isAndroidMobile = () => getActivePlatform() === 'android';
export const isIOS = () => getActivePlatform() === 'ios';
export const isWeb = () => !isElectron() && getActivePlatform() === 'web';

/**
 * Obtiene el tipo de reproductor que debe usarse basado en la plataforma.
 * Devuelve: 'electron', 'android-vlc', 'android-exoplayer' o 'web'.
 */
export const getPlayerType = () => {
  if (typeof window !== 'undefined' && (window.electronAPI || window.electronMPV)) {
    return 'electron';
  }
  switch (getActivePlatform()) {
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
  if (typeof window !== 'undefined' && (window.electronAPI || window.electronMPV)) {
    return 'desktop';
  }
  switch (getActivePlatform()) {
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
  if (typeof window !== 'undefined' && (window.electronAPI || window.electronMPV)) {
    return 'electron';
  }
  return getActivePlatform();
};

/**
 * Log de información de plataforma para debugging.
 */
export const logPlatformInfo = () => {
  console.log({
    platform: getActivePlatform(),
    playerType: getPlayerType(),
  });
};
