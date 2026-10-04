// src/services/musicOfflineService.js
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { musicService } from './musicService.js';

let NativeMusicPlayback = null;
try {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
    NativeMusicPlayback = registerPlugin('MusicPlaybackPlugin');
  }
} catch (e) {
  console.warn('[musicOfflineService] MusicPlaybackPlugin no disponible:', e);
}

const STORAGE_MUSIC_KEY = 'teamg_music_offline_tracks_v1';
const STORAGE_OFFLINE_ALBUMS_KEY = 'teamg_music_offline_albums_v1';
const OFFLINE_MUSIC_FOLDER = 'teamg_offline_music';
const CACHE_NAME = 'teamg-offline-music-v1';

// Mapa de descargas en curso: trackId -> { progress: number, status: 'downloading' | 'error' | 'completed', bytes: number, total: number }
const activeMusicDownloads = new Map();

/**
 * Verifica si estamos en entorno móvil nativo (Android / iOS)
 */
export const isNativeStorage = () => {
  try {
    return Boolean(
      Capacitor?.isNativePlatform &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform()
    );
  } catch {
    return false;
  }
};

/**
 * Formatea bytes a MB de manera legible
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return (mb / 1024).toFixed(2) + ' GB';
  }
  return mb.toFixed(1) + ' MB';
}

// Duración máxima de la licencia offline de música: 30 días (acotada al vencimiento de suscripción en AdminPanel)
export const OFFLINE_LICENSE_DURATION_DAYS = 30;
export const OFFLINE_LICENSE_DURATION_MS = OFFLINE_LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Obtiene el usuario activo almacenado en la app
 */
export function getActiveUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Comprueba si la suscripción del usuario está activa y al día en el AdminPanel
 */
export function isUserSubscriptionActive(user = null) {
  const u = user || getActiveUser();
  if (!u) return true; // Si no hay usuario en sesión explícito, permitir uso estándar
  if (u.role === 'admin') return true;
  if (u.isActive === false) return false;
  if (u.expiresAt) {
    const exp = new Date(u.expiresAt).getTime();
    if (!isNaN(exp) && exp <= Date.now()) {
      return false; // Suscripción vencida en AdminPanel
    }
  }
  return true;
}

/**
 * Calcula la duración permitida de la licencia offline en milisegundos.
 * Si el usuario renovó en AdminPanel, la licencia dura hasta 30 días,
 * pero NUNCA más allá de la fecha de vencimiento pagada por el cliente.
 */
export function calculateAllowedLicenseDuration(user = null) {
  const u = user || getActiveUser();
  if (!u) return OFFLINE_LICENSE_DURATION_MS;
  if (!isUserSubscriptionActive(u)) {
    return 0; // Suscripción inactiva o vencida
  }

  // Administrador o sin fecha de vencimiento (ilimitado)
  if (u.role === 'admin' || !u.expiresAt) {
    return OFFLINE_LICENSE_DURATION_MS;
  }

  const subRemainingMs = new Date(u.expiresAt).getTime() - Date.now();
  if (subRemainingMs <= 0) {
    return 0; // Suscripción vencida
  }

  return Math.min(OFFLINE_LICENSE_DURATION_MS, subRemainingMs);
}

/**
 * Obtiene la información de validez de la licencia offline de una canción,
 * considerando tanto el límite de 30 días como el estado de suscripción en AdminPanel.
 */
export function getTrackLicenseInfo(trackOrId, user = null) {
  const track = typeof trackOrId === 'object' && trackOrId !== null
    ? (getOfflineTrack(trackOrId.id, trackOrId.title, trackOrId.artist) || trackOrId)
    : getOfflineTrack(trackOrId);
  if (!track) return { isValid: false, daysRemaining: 0, isExpired: true, expiresAt: 0, isSubscriptionExpired: false };

  const now = Date.now();
  const u = user || getActiveUser();
  const subActive = isUserSubscriptionActive(u);

  // Si la suscripción del usuario ya venció en AdminPanel
  if (!subActive) {
    return {
      isValid: false,
      daysRemaining: 0,
      isExpired: true,
      expiresAt: track.licenseExpiresAt || 0,
      isSubscriptionExpired: true,
    };
  }

  const baseExpiresAt = track.licenseExpiresAt || ((track.downloadedAt || now) + OFFLINE_LICENSE_DURATION_MS);

  // Acotar al vencimiento pagado si no es admin
  let effectiveExpiresAt = baseExpiresAt;
  if (u?.expiresAt && u.role !== 'admin') {
    const subExp = new Date(u.expiresAt).getTime();
    if (!isNaN(subExp)) {
      effectiveExpiresAt = Math.min(baseExpiresAt, subExp);
    }
  }

  const diffMs = effectiveExpiresAt - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const isExpired = diffMs <= 0;

  return {
    isValid: !isExpired,
    daysRemaining,
    isExpired,
    expiresAt: effectiveExpiresAt,
    lastOnlineValidation: track.lastOnlineValidation || track.downloadedAt || now,
    isSubscriptionExpired: false,
  };
}

/**
 * Renueva el período de licencia para todas las canciones offline SOLO si el cliente
 * tiene suscripción activa y pagada en el AdminPanel.
 */
export function renewAllMusicOfflineLicenses(user = null) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const list = getOfflineTracks();
  if (!list || list.length === 0) return true;

  const u = user || getActiveUser();
  const subActive = isUserSubscriptionActive(u);
  const now = Date.now();
  let hasChanged = false;

  // Si el cliente no renovó o está vencido en AdminPanel:
  if (!subActive) {
    console.warn('[musicOfflineService] Suscripción inactiva o expirada en AdminPanel. Bloqueando licencias offline de música.');
    const updated = list.map((track) => {
      if (track.licenseExpiresAt !== 0) {
        hasChanged = true;
        return {
          ...track,
          licenseExpiresAt: 0,
          lastOnlineValidation: now,
        };
      }
      return track;
    });
    if (hasChanged) {
      saveOfflineTracks(updated);
    }
    return false;
  }

  // Si el cliente SÍ está al día: extender período según su fecha de suscripción
  const allowedDuration = calculateAllowedLicenseDuration(u);
  const newExpiry = now + allowedDuration;

  const updated = list.map((track) => {
    const lastCheck = track.lastOnlineValidation || 0;
    if (!track.licenseExpiresAt || track.licenseExpiresAt < now || (now - lastCheck) > 6 * 60 * 60 * 1000 || track.licenseExpiresAt !== newExpiry) {
      hasChanged = true;
      return {
        ...track,
        licenseExpiresAt: newExpiry,
        lastOnlineValidation: now,
      };
    }
    return track;
  });

  if (hasChanged) {
    saveOfflineTracks(updated);
    console.log(`[musicOfflineService] Licencias offline de música renovadas por suscripción activa (${Math.ceil(allowedDuration / (24*60*60*1000))} días).`);
  }
  return true;
}

/**
 * Obtiene la lista de canciones guardadas para Modo Offline
 */
/**
 * Obtiene la lista de canciones guardadas para Modo Offline,
 * limpiando automáticamente registros corruptos o vacíos (0 MB).
 */
export function getOfflineTracks() {
  try {
    const raw = localStorage.getItem(STORAGE_MUSIC_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const valid = list.filter((item) => {
      const bytes = Number(item.sizeBytes || 0);
      if (bytes > 0 && bytes < 20 * 1024) return false;
      if (item.sizeFormatted === '0 MB' && bytes < 20 * 1024) return false;
      return true;
    });
    if (valid.length !== list.length) {
      saveOfflineTracks(valid);
    }
    return valid;
  } catch (err) {
    console.error('[musicOfflineService] Error leyendo canciones offline:', err);
    return [];
  }
}

/**
 * Guarda la lista de canciones offline y notifica a la app
 */
function saveOfflineTracks(tracks) {
  try {
    localStorage.setItem(STORAGE_MUSIC_KEY, JSON.stringify(tracks));
    window.dispatchEvent(new CustomEvent('teamg:music-offline-update', { detail: { tracks } }));
  } catch (err) {
    console.error('[musicOfflineService] Error guardando canciones offline:', err);
  }
}

/**
 * Lee la lista de álbumes guardados como descargados offline
 */
export function getOfflineAlbums() {
  try {
    const raw = localStorage.getItem(STORAGE_OFFLINE_ALBUMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[musicOfflineService] Error leyendo álbumes offline:', err);
    return [];
  }
}

/**
 * Guarda la lista de álbumes offline y notifica a la app
 */
export function saveOfflineAlbums(albums) {
  try {
    localStorage.setItem(STORAGE_OFFLINE_ALBUMS_KEY, JSON.stringify(albums));
    window.dispatchEvent(new CustomEvent('teamg:music-offline-update', { detail: { albums } }));
  } catch (err) {
    console.error('[musicOfflineService] Error guardando álbumes offline:', err);
  }
}

/**
 * Registra un álbum como descargado en el almacenamiento persistente
 */
export function recordAlbumDownloaded(album, downloadedTracks = []) {
  if (!album || !Array.isArray(downloadedTracks) || downloadedTracks.length === 0) return;
  const albums = getOfflineAlbums();
  const albumId = String(album.id || '').trim();
  const albumTitle = String(album.title || '').trim();
  const albumArtist = String(album.artist || '').trim();

  const record = {
    id: albumId,
    title: albumTitle,
    artist: albumArtist,
    cover: album.cover || '',
    trackCount: (Array.isArray(album.tracks) && album.tracks.length) || downloadedTracks.length || 0,
    downloadedAt: Date.now()
  };

  const filtered = albums.filter(a => {
    if (albumId && String(a.id) === albumId) return false;
    if (albumTitle && String(a.title || '').trim().toLowerCase() === albumTitle.toLowerCase()) return false;
    return true;
  });

  saveOfflineAlbums([record, ...filtered]);
}

/**
 * Normaliza cadenas de texto para comparar títulos de álbumes y canciones
 * ignorando mayúsculas, tildes, símbolos y menciones como (Deluxe), [Remastered], etc.
 */
export function normalizeCleanText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g, '') // descarta (deluxe), [explicit], (remaster), etc.
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Comprueba si una canción específica está descargada en modo offline
 * Soporta coincidencia por trackId (con o sin prefijos itunes-/deezer-) o por título y artista normalizados
 */
export function isTrackOffline(trackId, title = null, artist = null) {
  if (!trackId && !title) return false;
  const list = getOfflineTracks();
  const rawId = trackId ? String(trackId).trim() : '';
  const cleanId = rawId ? rawId.replace(/^[a-z]+-/, '') : '';
  const normTitle = title ? normalizeCleanText(title) : '';
  const normArtist = artist ? normalizeCleanText(artist) : '';

  return list.some((item) => {
    if (item.sizeBytes !== undefined && item.sizeBytes < 20 * 1024) return false;
    const itemId = String(item.id || '').trim();
    if (rawId && itemId === rawId) return true;
    if (cleanId) {
      const itemCleanId = itemId.replace(/^[a-z]+-/, '');
      if (itemCleanId === cleanId) return true;
      if (item.trackId && (String(item.trackId) === cleanId || String(item.trackId) === rawId)) return true;
    }
    if (title && item.title) {
      const matchExact = item.title.trim().toLowerCase() === title.trim().toLowerCase();
      if (matchExact) {
        if (!artist || !item.artist) return true;
        const a1 = artist.trim().toLowerCase();
        const a2 = item.artist.trim().toLowerCase();
        if (a1 === a2 || a1.includes(a2) || a2.includes(a1)) return true;
      }
      if (normTitle) {
        const itemNorm = normalizeCleanText(item.title);
        if (itemNorm && (itemNorm === normTitle || itemNorm.includes(normTitle) || normTitle.includes(itemNorm))) {
          if (!normArtist || !item.artist) return true;
          const aNorm = normalizeCleanText(item.artist);
          if (!aNorm || aNorm === normArtist || aNorm.includes(normArtist) || normArtist.includes(aNorm)) return true;
        }
      }
    }
    return false;
  });
}

/**
 * Obtiene el registro de una canción descargada por ID o por coincidencia de título y artista
 */
export function getOfflineTrack(trackId, title = null, artist = null) {
  if (!trackId && !title) return null;
  const list = getOfflineTracks();
  const rawId = trackId ? String(trackId).trim() : '';
  const cleanId = rawId ? rawId.replace(/^[a-z]+-/, '') : '';
  const normTitle = title ? normalizeCleanText(title) : '';
  const normArtist = artist ? normalizeCleanText(artist) : '';

  const item = list.find((item) => {
    if (item.sizeBytes !== undefined && item.sizeBytes < 20 * 1024) return false;
    const itemId = String(item.id || '').trim();
    if (rawId && itemId === rawId) return true;
    if (cleanId) {
      const itemCleanId = itemId.replace(/^[a-z]+-/, '');
      if (itemCleanId === cleanId) return true;
      if (item.trackId && (String(item.trackId) === cleanId || String(item.trackId) === rawId)) return true;
    }
    if (title && item.title) {
      const exactTitle = item.title.trim().toLowerCase() === title.trim().toLowerCase();
      if (exactTitle) {
        if (!artist || !item.artist) return true;
        const a1 = artist.trim().toLowerCase();
        const a2 = item.artist.trim().toLowerCase();
        if (a1 === a2 || a1.includes(a2) || a2.includes(a1)) return true;
      }
      if (normTitle) {
        const itemNorm = normalizeCleanText(item.title);
        if (itemNorm && (itemNorm === normTitle || itemNorm.includes(normTitle) || normTitle.includes(itemNorm))) {
          if (!normArtist || !item.artist) return true;
          const aNorm = normalizeCleanText(item.artist);
          if (!aNorm || aNorm === normArtist || aNorm.includes(normArtist) || normArtist.includes(aNorm)) return true;
        }
      }
    }
    return false;
  }) || null;

  return item;
}

/**
 * Retorna el estado actual de una descarga en curso
 */
export function getActiveDownloadStatus(trackId) {
  if (!trackId) return null;
  return activeMusicDownloads.get(String(trackId)) || null;
}

/**
 * Resuelve una URL de audio CDN directa y confiable (Apple Music / Deezer)
 * para descargas garantizadas sin bloqueos CORS ni restricciones de token.
 */
export async function resolveFallbackCdnAudio(track) {
  if (!track) return null;

  // 1. Si ya tiene audioUrl o previewUrl directa de CDN no-googlevideo
  if (track.audioUrl && /^https?:\/\//i.test(track.audioUrl) && !/googlevideo\.com|youtube\.com/i.test(track.audioUrl)) {
    return track.audioUrl.trim();
  }
  if (track.previewUrl && /^https?:\/\//i.test(track.previewUrl) && !/googlevideo\.com|youtube\.com/i.test(track.previewUrl)) {
    return track.previewUrl.trim();
  }

  // 2. Si el track tiene ID de iTunes o Apple Music
  const rawId = String(track.trackId || track.id || '');
  const itunesIdMatch = rawId.match(/(?:itunes-|apple-)?(\d{6,14})/);
  if (itunesIdMatch) {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${itunesIdMatch[1]}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const d = await res.json();
        const found = d.results?.[0];
        if (found?.previewUrl && /^https?:\/\//i.test(found.previewUrl)) {
          return found.previewUrl.trim();
        }
      }
    } catch (_) {}
  }

  // 3. Buscar en iTunes por Artista y Título
  const cleanTitle = (track.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const cleanArtist = (track.artist && track.artist !== 'Artista Desconocido') ? track.artist.trim() : '';
  const query = `${cleanArtist} ${cleanTitle}`.trim();

  if (query) {
    try {
      const itunesSearchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=3`;
      const res = await fetch(itunesSearchUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const d = await res.json();
        const found = d.results?.find(r => r.previewUrl);
        if (found?.previewUrl && /^https?:\/\//i.test(found.previewUrl)) {
          return found.previewUrl.trim();
        }
      }
    } catch (_) {}

    // 4. Buscar en Deezer por Artista y Título
    try {
      const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=3`, { signal: AbortSignal.timeout(5000) });
      if (deezerRes.ok) {
        const d = await deezerRes.json();
        const found = d.data?.find(r => r.preview);
        if (found?.preview && /^https?:\/\//i.test(found.preview)) {
          return found.preview.trim();
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Resuelve la URL de audio a descargar (canción completa o stream directo)
 */
async function resolveAudioUrlForDownload(track) {
  if (!track) return null;

  let resolved = null;

  // 1. Si ya tiene streamUrl directa
  if (track.streamUrl && /^https?:\/\//i.test(track.streamUrl)) {
    resolved = track.streamUrl;
  }

  // 2. Si ya tiene youtubeId resuelto y estamos en Android o Electron, obtener stream directo
  if (!resolved && track.youtubeId && (isNativeStorage() || (typeof window !== 'undefined' && window.electronAPI))) {
    try {
      const fullUrl = await musicService.getFullAudioUrl(track.youtubeId);
      if (fullUrl && /^https?:\/\//i.test(fullUrl)) {
        resolved = fullUrl;
      }
    } catch (e) {
      console.warn('[musicOfflineService] Error obteniendo audio completo por youtubeId:', e);
    }
  }

  // 3. Si no tiene youtubeId, resolverlo primero (en Android o Electron)
  if (!resolved && track.title && (isNativeStorage() || (typeof window !== 'undefined' && window.electronAPI))) {
    try {
      let ytId = await musicService.getYouTubeId(track.artist, track.title);
      if (ytId) {
        track.youtubeId = ytId;
        const fullUrl = await musicService.getFullAudioUrl(ytId);
        if (fullUrl && /^https?:\/\//i.test(fullUrl)) {
          resolved = fullUrl;
        }
      }
    } catch (e) {
      console.warn('[musicOfflineService] Error resolviendo youtubeId:', e);
    }
  }

  // 4. Fallback: Si tiene audioUrl estándar o previewUrl
  if (!resolved && track.audioUrl && /^https?:\/\//i.test(track.audioUrl)) {
    resolved = track.audioUrl;
  }
  if (!resolved && track.previewUrl && /^https?:\/\//i.test(track.previewUrl)) {
    resolved = track.previewUrl;
  }

  // 5. Fallback garantizado: resolución dinámica en Apple Music / Deezer CDN
  if (!resolved || (/googlevideo\.com|youtube\.com/i.test(resolved) && !isNativeStorage() && (!window?.electronAPI))) {
    try {
      const cdnUrl = await resolveFallbackCdnAudio(track);
      if (cdnUrl) {
        resolved = cdnUrl;
        track.audioUrl = cdnUrl;
        track.previewUrl = cdnUrl;
      }
    } catch (e) {
      console.warn('[musicOfflineService] Error en resolución fallback CDN:', e);
    }
  }

  if (resolved) {
    let finalUrl = resolved.trim();
    if (finalUrl.includes('dl.dropbox.com')) {
      finalUrl = finalUrl.replace('dl.dropbox.com', 'dl.dropboxusercontent.com');
    } else if (finalUrl.includes('www.dropbox.com')) {
      finalUrl = finalUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }
    return finalUrl;
  }

  return null;
}

/**
 * Descarga una canción individual para escuchar en Modo Offline
 */
export async function downloadTrackOffline(track, onProgress = null) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Sin conexión a internet. Para descargar canciones debes conectarte a una red Wi-Fi o datos móviles.');
  }

  if (!track || !track.id) {
    throw new Error('Información de canción inválida');
  }

  const trackId = String(track.id);

  if (isTrackOffline(trackId)) {
    console.log('[musicOfflineService] Canción ya descargada previamente:', track.title);
    return getOfflineTrack(trackId);
  }

  if (activeMusicDownloads.has(trackId)) {
    console.warn('[musicOfflineService] Ya hay una descarga en curso para:', track.title);
    return null;
  }

  // Inicializar estado
  activeMusicDownloads.set(trackId, { progress: 5, status: 'downloading', bytes: 0, total: 0 });
  const notifyProgress = (data) => {
    activeMusicDownloads.set(trackId, data);
    window.dispatchEvent(new CustomEvent('teamg:music-offline-progress', { detail: data }));
    if (typeof onProgress === 'function') onProgress(data);
  };

  notifyProgress({ id: trackId, progress: 10, status: 'downloading', bytes: 0, total: 0 });

  try {
    // 1. Resolver URL de audio
    const audioDownloadUrl = await resolveAudioUrlForDownload(track);
    if (!audioDownloadUrl) {
      throw new Error(`No se pudo resolver el audio descargable para "${track.title}"`);
    }

    notifyProgress({ id: trackId, progress: 25, status: 'downloading', bytes: 0, total: 0 });

    const rawAlbum = (track.album || track.albumTitle || '').trim();
    const safeAlbumFolder = (rawAlbum && rawAlbum !== 'Sencillo' && rawAlbum !== 'TeamG Music')
      ? rawAlbum.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().substring(0, 45)
      : '';
    const trackNum = track.trackNumber ? String(track.trackNumber).padStart(2, '0') + ' - ' : '';
    const safeTitle = (track.title || 'cancion').replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim().substring(0, 35);
    const safeFileName = safeAlbumFolder
      ? `${safeAlbumFolder}/${trackNum}${safeTitle}_${Date.now()}.mp3`
      : `tg_track_${trackId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.mp3`;
    const relativeFilePath = `${OFFLINE_MUSIC_FOLDER}/${safeFileName}`;

    let finalSizeBytes = 0;
    let storageType = 'cache_api';
    let localFilePath = relativeFilePath;

    if (isNativeStorage()) {
      // === ALMACENAMIENTO MÓVIL ANDROID/CAPACITOR (SANDBOX PRIVADO) ===
      storageType = 'native_sandbox';

      let progressSub = null;
      if (NativeMusicPlayback && typeof NativeMusicPlayback.addListener === 'function') {
        try {
          progressSub = await NativeMusicPlayback.addListener('downloadProgress', (event) => {
            if (String(event?.id) === trackId) {
              const bytes = Number(event?.bytes || 0);
              const total = Number(event?.total || 0);
              const pct = Number(event?.progress || 0);
              notifyProgress({
                id: trackId,
                progress: Math.min(99, Math.max(15, pct)),
                status: 'downloading',
                bytes,
                total
              });
            }
          });
        } catch (_) {}
      }

      console.log(`[musicOfflineService] Descargando audio nativo: "${track.title}"`);
      let downloadedOk = false;
      const isYtStream = /googlevideo\.com|youtube\.com/i.test(audioDownloadUrl);
      const downloadHeaders = isYtStream ? {
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
        'Accept': '*/*'
      } : {
        'Accept': '*/*'
      };

      // 1. Descarga nativa de alto rendimiento vía NativeMusicPlayback (Java HttpURLConnection con mkdirs() automático)
      if (NativeMusicPlayback && typeof NativeMusicPlayback.downloadAudio === 'function') {
        try {
          const dlRes = await NativeMusicPlayback.downloadAudio({
            id: trackId,
            url: audioDownloadUrl,
            path: relativeFilePath,
            headers: downloadHeaders
          });
          if (dlRes && (dlRes.size || 0) >= 20 * 1024) {
            finalSizeBytes = dlRes.size || 0;
            downloadedOk = true;
          }
        } catch (nativeErr) {
          console.warn('[musicOfflineService] NativeMusicPlayback.downloadAudio error, probando CDN alternativa:', nativeErr?.message || nativeErr);
        }
      }

      // 2. Si falló la primaria nativa, intentar con respaldo CDN nativo
      if (!downloadedOk && NativeMusicPlayback && typeof NativeMusicPlayback.downloadAudio === 'function') {
        try {
          const fallbackUrl = await resolveFallbackCdnAudio(track);
          if (fallbackUrl && fallbackUrl !== audioDownloadUrl) {
            console.log(`[musicOfflineService] Reintentando descarga con CDN alternativa para: "${track.title}"`);
            const fbRes = await NativeMusicPlayback.downloadAudio({
              id: trackId,
              url: fallbackUrl,
              path: relativeFilePath,
              headers: { 'Accept': '*/*' }
            });
            if (fbRes && (fbRes.size || 0) >= 20 * 1024) {
              finalSizeBytes = fbRes.size || 0;
              downloadedOk = true;
            }
          }
        } catch (fbErr) {
          console.warn('[musicOfflineService] Respaldo nativo también falló:', fbErr?.message || fbErr);
        }
      }

      // 3. Fallback a Filesystem de Capacitor si el plugin nativo no estuviera presente
      if (!downloadedOk) {
        try {
          try {
            await Filesystem.mkdir({ path: OFFLINE_MUSIC_FOLDER, directory: Directory.Data, recursive: true });
            if (safeAlbumFolder) {
              await Filesystem.mkdir({ path: `${OFFLINE_MUSIC_FOLDER}/${safeAlbumFolder}`, directory: Directory.Data, recursive: true });
            }
          } catch (_) {}

          await Filesystem.downloadFile({
            url: audioDownloadUrl,
            path: relativeFilePath,
            directory: Directory.Data,
            progress: true,
            headers: downloadHeaders
          });

          const stat = await Filesystem.stat({ path: relativeFilePath, directory: Directory.Data });
          if ((stat.size || 0) >= 20 * 1024) {
            finalSizeBytes = stat.size || 0;
            downloadedOk = true;
          }
        } catch (fsErr) {
          console.warn('[musicOfflineService] Filesystem fallback falló:', fsErr?.message || fsErr);
        }
      }

      if (progressSub && typeof progressSub.remove === 'function') {
        try { progressSub.remove(); } catch (_) {}
      }

      // Validar integridad mínima: audio real > 20 KB
      if (!downloadedOk || finalSizeBytes < 20 * 1024) {
        try {
          await Filesystem.deleteFile({
            path: relativeFilePath,
            directory: Directory.Data
          });
        } catch (_) {}
        throw new Error(`La descarga de "${track.title}" no pudo completarse. Por favor verifica tu conexión.`);
      }
      localFilePath = relativeFilePath;

    } else {
      // === ALMACENAMIENTO WEB / DESKTOP (CACHE API / BLOB) ===
      storageType = 'cache_api';
      let targetWebUrl = audioDownloadUrl;
      // En Web los navegadores bloquean CORS a googlevideo. Usamos CDN directa (Apple/Deezer).
      if (/googlevideo\.com|youtube\.com/i.test(targetWebUrl) && (!window?.electronAPI)) {
        const cdnUrl = await resolveFallbackCdnAudio(track);
        if (cdnUrl) targetWebUrl = cdnUrl;
      }

      console.log(`[musicOfflineService] Descargando audio web vía Cache API: "${track.title}"`);
      let response;
      try {
        response = await fetch(targetWebUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (webFetchErr) {
        const altCdn = await resolveFallbackCdnAudio(track);
        if (altCdn && altCdn !== targetWebUrl) {
          response = await fetch(altCdn);
          if (!response.ok) throw new Error(`Error HTTP al descargar audio: ${response.status}`);
        } else {
          throw webFetchErr;
        }
      }

      const contentLength = Number(response.headers.get('content-length')) || 0;
      const reader = response.body.getReader();
      const chunks = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;

        if (contentLength > 0) {
          const pct = Math.min(98, Math.max(25, Math.round(25 + ((receivedBytes / contentLength) * 73))));
          notifyProgress({
            id: trackId,
            progress: pct,
            status: 'downloading',
            bytes: receivedBytes,
            total: contentLength
          });
        }
      }

      finalSizeBytes = receivedBytes;
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const blob = new Blob(chunks, { type: contentType });

      const cache = await caches.open(CACHE_NAME);
      const fakeUrl = `https://offline.teamg.store/music/${safeFileName}`;
      await cache.put(fakeUrl, new Response(blob, {
        headers: { 'Content-Type': contentType, 'Content-Length': String(receivedBytes) }
      }));

      localFilePath = fakeUrl;
    }

    // Registrar metadata de la canción offline
    const record = {
      id: trackId,
      title: track.title || 'Canción',
      artist: track.artist || 'Artista Desconocido',
      album: track.album || rawAlbum || 'TeamG Music',
      albumFolder: safeAlbumFolder || null,
      trackNumber: track.trackNumber || null,
      cover: track.cover || '',
      genre: track.genre || '',
      fullDuration: track.fullDuration || track.duration || 210,
      duration: track.duration || 210,
      releaseDate: track.releaseDate || '',
      filePath: localFilePath,
      fileName: safeFileName,
      sizeBytes: finalSizeBytes,
      sizeFormatted: formatBytes(finalSizeBytes),
      storageType: storageType,
      downloadedAt: Date.now(),
      licenseExpiresAt: Date.now() + OFFLINE_LICENSE_DURATION_MS,
      lastOnlineValidation: Date.now(),
      isOffline: true
    };

    const currentList = getOfflineTracks();
    const updatedList = [record, ...currentList.filter(t => String(t.id) !== trackId)];
    saveOfflineTracks(updatedList);

    activeMusicDownloads.delete(trackId);
    notifyProgress({ id: trackId, progress: 100, status: 'completed', bytes: finalSizeBytes, total: finalSizeBytes });

    console.log(`[musicOfflineService] Descarga completada exitosamente: "${track.title}" (${record.sizeFormatted})`);
    return record;

  } catch (error) {
    console.error('[musicOfflineService] Error al descargar canción offline:', error);
    activeMusicDownloads.delete(trackId);
    notifyProgress({ id: trackId, progress: 0, status: 'error', error: error.message });
    throw error;
  }
}

/**
 * Descarga un álbum completo organizando sus archivos en su propia carpeta de álbum
 */
export async function downloadAlbumOffline(album, onOverallProgress = null) {
  if (!album) {
    throw new Error('Información de álbum inválida');
  }

  let tracks = Array.isArray(album.tracks) ? album.tracks : [];
  if (tracks.length === 0 && (album.id || album.title)) {
    try {
      tracks = await musicService.getAlbumTracks(album.id, album.title, album.artist);
    } catch (err) {
      console.warn('[musicOfflineService] Error cargando pistas del álbum para descarga:', err);
    }
  }

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('El álbum no contiene canciones para descargar');
  }

  const total = tracks.length;
  let completed = 0;
  const results = [];

  const albumTitle = String(album.title || 'Álbum').trim();
  const albumCover = album.cover || '';
  const albumArtist = String(album.artist || '').trim();

  for (let i = 0; i < total; i++) {
    const orig = tracks[i];
    const track = {
      ...orig,
      album: albumTitle,
      albumTitle: albumTitle,
      artist: orig.artist || albumArtist,
      cover: orig.cover || albumCover,
      trackNumber: orig.trackNumber || (i + 1)
    };

    if (typeof onOverallProgress === 'function') {
      onOverallProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i) / total) * 100),
        trackTitle: track.title,
        albumTitle
      });
    }

    try {
      if (isTrackOffline(track.id, track.title, track.artist)) {
        results.push(getOfflineTrack(track.id, track.title, track.artist) || track);
      } else {
        const downloaded = await downloadTrackOffline(track);
        if (downloaded) results.push(downloaded);
      }
    } catch (err) {
      console.warn(`[musicOfflineService] Falló descarga de canción en álbum "${albumTitle}": "${track.title}":`, err);
    }

    completed++;
    if (typeof onOverallProgress === 'function') {
      onOverallProgress({
        current: completed,
        total,
        percentage: Math.round((completed / total) * 100),
        trackTitle: track.title,
        albumTitle
      });
    }
  }

  // Registrar el álbum como descargado en almacenamiento persistente sólo si se descargaron pistas
  if (results.length > 0) {
    recordAlbumDownloaded({ ...album, tracks }, results);
  } else {
    throw new Error(`No se pudo descargar ninguna canción del álbum "${albumTitle}". Verifica tu conexión.`);
  }

  return results;
}

/**
 * Verifica si un álbum está descargado en modo offline
 * Comprueba registro persistente de álbumes, pistas individuales y carpeta de álbum
 */
export function isAlbumOffline(album) {
  if (!album) return false;
  const list = getOfflineTracks();
  if (!Array.isArray(list) || list.length === 0) return false;

  const albumId = album.id ? String(album.id).trim() : null;
  const cleanAlbumId = albumId ? albumId.replace(/^[a-z]+_album_/i, '').replace(/^[a-z]+-/i, '') : null;
  const albumTitle = String(album.title || '').trim().toLowerCase();
  const normTitle = normalizeCleanText(album.title);
  const albumArtist = String(album.artist || '').trim().toLowerCase();
  const normArtist = normalizeCleanText(album.artist);

  // 1. Verificación en registro persistente de álbumes offline
  const offlineAlbums = getOfflineAlbums();
  const isRecorded = offlineAlbums.some(a => {
    if (albumId && String(a.id).trim() === albumId) return true;
    if (cleanAlbumId) {
      const aCleanId = String(a.id || '').replace(/^[a-z]+_album_/i, '').replace(/^[a-z]+-/i, '');
      if (aCleanId && aCleanId === cleanAlbumId) return true;
    }
    if (albumTitle && String(a.title || '').trim().toLowerCase() === albumTitle) {
      return true;
    }
    if (normTitle) {
      const aNormTitle = normalizeCleanText(a.title);
      if (aNormTitle && (aNormTitle === normTitle || aNormTitle.includes(normTitle) || normTitle.includes(aNormTitle))) {
        if (!normArtist || !a.artist) return true;
        const aNormArt = normalizeCleanText(a.artist);
        if (!aNormArt || aNormArt === normArtist || aNormArt.includes(normArtist) || normArtist.includes(aNormArt)) return true;
      }
    }
    return false;
  });
  if (isRecorded) return true;

  // 2. Verificación por pistas del álbum
  const tracks = Array.isArray(album.tracks) ? album.tracks : [];
  if (tracks.length > 0) {
    const offlineCount = tracks.filter(t => isTrackOffline(t.id, t.title, t.artist || album.artist)).length;
    // Si al menos 1 pista está offline en álbumes pequeños o 50% en completos
    const threshold = tracks.length <= 3 ? 1 : Math.max(1, Math.ceil(tracks.length * 0.5));
    if (offlineCount >= threshold) {
      return true;
    }
  }

  // 3. Verificación por canciones offline que pertenezcan a este álbum (por albumFolder o nombre de álbum)
  if (albumTitle || normTitle) {
    const list = getOfflineTracks();
    const matchingTracks = list.filter(t => {
      const tAlbum = String(t.album || '').trim().toLowerCase();
      if (tAlbum && (tAlbum === albumTitle || tAlbum.includes(albumTitle) || albumTitle.includes(tAlbum))) return true;
      if (normTitle) {
        const tNorm = normalizeCleanText(t.album);
        if (tNorm && (tNorm === normTitle || tNorm.includes(normTitle) || normTitle.includes(tNorm))) return true;
      }
      if (t.albumFolder) {
        const safeTargetFolder = (album.title || '').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().substring(0, 45).toLowerCase();
        if (safeTargetFolder && t.albumFolder.toLowerCase() === safeTargetFolder) return true;
      }
      return false;
    });
    if (matchingTracks.length > 0 && (!tracks.length || matchingTracks.length >= Math.max(1, Math.ceil((tracks.length || 1) * 0.5)))) {
      return true;
    }
  }

  return false;
}

/**
 * Descarga una playlist completa para modo offline
 */
export async function downloadPlaylistOffline(playlist, onOverallProgress = null) {
  if (!playlist || !Array.isArray(playlist.tracks) || playlist.tracks.length === 0) {
    throw new Error('La playlist no contiene canciones para descargar');
  }

  const tracks = playlist.tracks;
  const total = tracks.length;
  let completed = 0;
  const results = [];

  for (let i = 0; i < total; i++) {
    const track = tracks[i];
    if (typeof onOverallProgress === 'function') {
      onOverallProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i) / total) * 100),
        trackTitle: track.title
      });
    }

    try {
      if (isTrackOffline(track.id, track.title, track.artist)) {
        results.push(getOfflineTrack(track.id, track.title, track.artist) || track);
      } else {
        const downloaded = await downloadTrackOffline(track);
        if (downloaded) results.push(downloaded);
      }
    } catch (err) {
      console.warn(`[musicOfflineService] Falló descarga de canción en playlist: "${track.title}":`, err);
    }

    completed++;
    if (typeof onOverallProgress === 'function') {
      onOverallProgress({
        current: completed,
        total,
        percentage: Math.round((completed / total) * 100),
        trackTitle: track.title
      });
    }
  }

  return results;
}

/**
 * Elimina una canción guardada en modo offline para liberar almacenamiento
 */
export async function deleteOfflineTrack(trackId) {
  if (!trackId) return;
  const idStr = String(trackId);
  const track = getOfflineTrack(idStr);

  if (!track) return;

  try {
    if (isNativeStorage() && track.storageType === 'native_sandbox' && track.filePath) {
      await Filesystem.deleteFile({
        path: track.filePath,
        directory: Directory.Data
      });
      console.log('[musicOfflineService] Archivo físico eliminado:', track.filePath);
    } else if (track.storageType === 'cache_api' && track.filePath) {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(track.filePath);
      console.log('[musicOfflineService] Archivo en Cache API eliminado:', track.filePath);
    }
  } catch (err) {
    console.warn('[musicOfflineService] Advertencia eliminando archivo físico:', err?.message);
  }

  const updatedList = getOfflineTracks().filter((t) => String(t.id) !== idStr);
  saveOfflineTracks(updatedList);
}

/**
 * Elimina todas las canciones offline
 */
export async function clearAllOfflineTracks() {
  const list = getOfflineTracks();
  for (const track of list) {
    try {
      await deleteOfflineTrack(track.id);
    } catch (_) {}
  }
  saveOfflineTracks([]);
}

/**
 * Elimina un álbum completo del almacenamiento offline (archivos físicos y registros)
 */
export async function deleteOfflineAlbum(album) {
  if (!album) return;
  const albumId = String(album.id || '').trim();
  const albumTitle = String(album.title || '').trim().toLowerCase();
  const albumArtist = String(album.artist || '').trim().toLowerCase();

  const allTracks = getOfflineTracks();
  const tracksToDelete = allTracks.filter(t => {
    if (albumId && t.albumId && String(t.albumId).trim() === albumId) return true;
    if (albumTitle && t.album && String(t.album).trim().toLowerCase() === albumTitle) {
      if (!albumArtist || !t.artist) return true;
      const tArt = String(t.artist).trim().toLowerCase();
      return tArt === albumArtist || tArt.includes(albumArtist) || albumArtist.includes(tArt);
    }
    return false;
  });

  for (const track of tracksToDelete) {
    try {
      await deleteOfflineTrack(track.id);
    } catch (_) {}
  }

  // Actualizar lista de álbumes guardados
  const currentAlbums = getOfflineAlbums();
  const updatedAlbums = currentAlbums.filter(a => {
    if (albumId && String(a.id).trim() === albumId) return false;
    if (albumTitle && String(a.title || '').trim().toLowerCase() === albumTitle) return false;
    return true;
  });
  saveOfflineAlbums(updatedAlbums);

  // Si en nativo existe la carpeta del álbum, intentar limpiarla
  if (isNativeStorage()) {
    try {
      const safeFolder = (albumTitle || albumId).replace(/[^a-zA-Z0-9_\-\. ]/g, '_').slice(0, 50);
      await Filesystem.rmdir({
        path: `${OFFLINE_MUSIC_FOLDER}/${safeFolder}`,
        directory: Directory.Data,
        recursive: true
      });
    } catch (_) {}
  }

  window.dispatchEvent(new CustomEvent('teamg:music-offline-update', {
    detail: {
      tracks: getOfflineTracks(),
      albums: updatedAlbums
    }
  }));
}

/**
 * Obtiene la URL reproducible localmente (100% offline, sin conexión a internet)
 * Retorna { nativeUrl, webUrl }
 */
export async function getOfflinePlaybackUrls(trackId) {
  const track = getOfflineTrack(trackId);
  if (!track) {
    throw new Error('Canción no encontrada en almacenamiento offline.');
  }

  // Validación de Licencia Offline vinculada al estado de suscripción
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const u = getActiveUser();

  if (isOnline) {
    if (!isUserSubscriptionActive(u)) {
      throw new Error('Tu suscripción ha vencido en TeamG Play. Por favor contacta a tu proveedor para renovar tu suscripción y reactivar tus canciones offline.');
    }
    const allowedDuration = calculateAllowedLicenseDuration(u);
    const now = Date.now();
    track.licenseExpiresAt = now + allowedDuration;
    track.lastOnlineValidation = now;
    const list = getOfflineTracks().map((t) => String(t.id) === String(trackId) ? track : t);
    saveOfflineTracks(list);
  } else {
    // Si está offline, comprobar si los días permitidos siguen vigentes
    const lic = getTrackLicenseInfo(track, u);
    if (!lic.isValid) {
      if (lic.isSubscriptionExpired) {
        throw new Error('Tu suscripción ha vencido en TeamG Play. Por favor renueva tu servicio con tu administrador para reactivar la reproducción de tu música offline.');
      }
      throw new Error('Tu licencia offline de 30 días ha caducado. Conecta el dispositivo a internet para renovar el acceso a esta canción.');
    }
  }

  if (isNativeStorage() && track.storageType === 'native_sandbox') {
    const uriResult = await Filesystem.getUri({
      path: track.filePath,
      directory: Directory.Data
    });
    // uriResult.uri suele ser: "file:///data/user/0/play.teamg.store/files/teamg_offline_music/..."
    const nativeUri = uriResult.uri;
    const webUri = Capacitor.convertFileSrc(uriResult.uri);
    return {
      nativeUrl: nativeUri, // Aceptado directamente por ExoPlayer nativo en Android
      webUrl: webUri       // Aceptado por elementos <audio> en el WebView
    };
  } else if (track.storageType === 'cache_api') {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(track.filePath);
    if (!cachedResponse) {
      throw new Error('El archivo de audio en caché ya no existe.');
    }
    const blob = await cachedResponse.blob();
    const objectUrl = URL.createObjectURL(blob);
    return {
      nativeUrl: objectUrl,
      webUrl: objectUrl
    };
  }

  throw new Error('Tipo de almacenamiento offline no soportado.');
}

/**
 * Retorna el total de espacio ocupado por descargas de música
 */
export function getTotalOfflineSize() {
  const list = getOfflineTracks();
  const totalBytes = list.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  return formatBytes(totalBytes);
}
