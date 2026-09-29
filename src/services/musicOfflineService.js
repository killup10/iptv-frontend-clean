// src/services/musicOfflineService.js
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { musicService } from './musicService.js';

const STORAGE_MUSIC_KEY = 'teamg_music_offline_tracks_v1';
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

/**
 * Obtiene la lista de canciones guardadas para Modo Offline
 */
export function getOfflineTracks() {
  try {
    const raw = localStorage.getItem(STORAGE_MUSIC_KEY);
    return raw ? JSON.parse(raw) : [];
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
 * Comprueba si una canción específica está descargada en modo offline
 */
export function isTrackOffline(trackId) {
  if (!trackId) return false;
  const list = getOfflineTracks();
  return list.some((item) => String(item.id) === String(trackId));
}

/**
 * Obtiene el registro de una canción descargada
 */
export function getOfflineTrack(trackId) {
  if (!trackId) return null;
  const list = getOfflineTracks();
  return list.find((item) => String(item.id) === String(trackId)) || null;
}

/**
 * Retorna el estado actual de una descarga en curso
 */
export function getActiveDownloadStatus(trackId) {
  if (!trackId) return null;
  return activeMusicDownloads.get(String(trackId)) || null;
}

/**
 * Resuelve la URL de audio a descargar (canción completa o stream directo)
 */
async function resolveAudioUrlForDownload(track) {
  if (!track) return null;

  // 1. Si ya tiene streamUrl directa
  if (track.streamUrl && /^https?:\/\//i.test(track.streamUrl)) {
    return track.streamUrl;
  }

  // 2. Si ya tiene youtubeId resuelto, obtener stream directo de alta calidad
  if (track.youtubeId) {
    try {
      const fullUrl = await musicService.getFullAudioUrl(track.youtubeId);
      if (fullUrl && /^https?:\/\//i.test(fullUrl)) {
        return fullUrl;
      }
    } catch (e) {
      console.warn('[musicOfflineService] Error obteniendo audio completo por youtubeId:', e);
    }
  }

  // 3. Si no tiene youtubeId, resolverlo primero
  if (track.title) {
    try {
      const ytId = await musicService.getYouTubeId(track.artist, track.title);
      if (ytId) {
        track.youtubeId = ytId;
        const fullUrl = await musicService.getFullAudioUrl(ytId);
        if (fullUrl && /^https?:\/\//i.test(fullUrl)) {
          return fullUrl;
        }
      }
    } catch (e) {
      console.warn('[musicOfflineService] Error resolviendo youtubeId:', e);
    }
  }

  // 4. Fallback: Si tiene audioUrl estándar (mp3 de vista previa / fuente directa)
  if (track.audioUrl && /^https?:\/\//i.test(track.audioUrl)) {
    return track.audioUrl;
  }

  return null;
}

/**
 * Descarga una canción individual para escuchar en Modo Offline
 */
export async function downloadTrackOffline(track, onProgress = null) {
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

    const safeTitle = (track.title || 'cancion').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const safeFileName = `tg_track_${trackId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.mp3`;
    const relativeFilePath = `${OFFLINE_MUSIC_FOLDER}/${safeFileName}`;

    let finalSizeBytes = 0;
    let storageType = 'cache_api';
    let localFilePath = relativeFilePath;

    if (isNativeStorage()) {
      // === ALMACENAMIENTO MÓVIL ANDROID/CAPACITOR (SANDBOX PRIVADO) ===
      storageType = 'native_sandbox';

      // Crear directorio privado si no existe
      try {
        await Filesystem.mkdir({
          path: OFFLINE_MUSIC_FOLDER,
          directory: Directory.Data,
          recursive: true
        });
      } catch (_) {}

      let progressSub = null;
      try {
        progressSub = await Filesystem.addListener('downloadProgress', (event) => {
          if (event.contentLength > 0) {
            const pct = Math.min(98, Math.max(25, Math.round(25 + ((event.bytesWritten / event.contentLength) * 73))));
            notifyProgress({
              id: trackId,
              progress: pct,
              status: 'downloading',
              bytes: event.bytesWritten,
              total: event.contentLength
            });
          }
        });
      } catch (subErr) {
        console.warn('[musicOfflineService] No se pudo vincular listener de progreso nativo:', subErr);
      }

      console.log(`[musicOfflineService] Descargando audio nativo: "${track.title}"`);
      await Filesystem.downloadFile({
        url: audioDownloadUrl,
        path: relativeFilePath,
        directory: Directory.Data,
        progress: true
      });

      if (progressSub && typeof progressSub.remove === 'function') {
        progressSub.remove();
      }

      // Obtener tamaño final del archivo
      try {
        const stat = await Filesystem.stat({
          path: relativeFilePath,
          directory: Directory.Data
        });
        finalSizeBytes = stat.size || 0;
      } catch (_) {}

      localFilePath = relativeFilePath;

    } else {
      // === ALMACENAMIENTO WEB / DESKTOP (CACHE API / BLOB) ===
      storageType = 'cache_api';
      console.log(`[musicOfflineService] Descargando audio web vía Cache API: "${track.title}"`);

      const response = await fetch(audioDownloadUrl);
      if (!response.ok) {
        throw new Error(`Error HTTP al descargar audio: ${response.status}`);
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
      const blob = new Blob(chunks, { type: 'audio/mpeg' });

      const cache = await caches.open(CACHE_NAME);
      const fakeUrl = `https://offline.teamg.store/music/${safeFileName}`;
      await cache.put(fakeUrl, new Response(blob, {
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(receivedBytes) }
      }));

      localFilePath = fakeUrl;
    }

    // Registrar metadata de la canción offline
    const record = {
      id: trackId,
      title: track.title || 'Canción',
      artist: track.artist || 'Artista Desconocido',
      album: track.album || 'TeamG Music',
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
      if (isTrackOffline(track.id)) {
        results.push(getOfflineTrack(track.id));
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
 * Obtiene la URL reproducible localmente (100% offline, sin conexión a internet)
 * Retorna { nativeUrl, webUrl }
 */
export async function getOfflinePlaybackUrls(trackId) {
  const track = getOfflineTrack(trackId);
  if (!track) {
    throw new Error('Canción no encontrada en almacenamiento offline.');
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
