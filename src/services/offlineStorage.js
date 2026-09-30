import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'teamg_offline_items';
const OFFLINE_FOLDER = 'teamg_offline_vod';
const MAGIC_HEADER = 'TGPLAY_ENC_V1';

// Mapa de descargas en curso: id -> { progress: number, status: 'downloading' | 'error' | 'completed' }
const activeDownloads = new Map();

/**
 * Verifica si la plataforma es nativa (Android / iOS)
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

// Duración de la licencia offline: 30 días renovables conectándose a internet
export const OFFLINE_LICENSE_DURATION_DAYS = 30;
export const OFFLINE_LICENSE_DURATION_MS = OFFLINE_LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Obtiene la información de validez de la licencia offline de un video
 */
export function getLicenseInfo(itemOrId) {
  const item = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId : getDownloadedItem(itemOrId);
  if (!item) return { isValid: false, daysRemaining: 0, isExpired: true, expiresAt: 0 };

  const now = Date.now();
  const expiresAt = item.licenseExpiresAt || ((item.downloadedAt || now) + OFFLINE_LICENSE_DURATION_MS);
  const diffMs = expiresAt - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const isExpired = diffMs <= 0;

  return {
    isValid: !isExpired,
    daysRemaining,
    isExpired,
    expiresAt,
    lastOnlineValidation: item.lastOnlineValidation || item.downloadedAt || now,
  };
}

/**
 * Renueva el período de 30 días para todos los videos offline si el dispositivo está en línea
 */
export function renewAllOfflineLicenses() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const list = getDownloads();
  if (!list || list.length === 0) return true;

  let hasChanged = false;
  const now = Date.now();
  const updated = list.map((item) => {
    const lastCheck = item.lastOnlineValidation || 0;
    // Renovar si no tiene fecha, si está vencida, o si pasaron más de 6 horas desde la última comprobación
    if (!item.licenseExpiresAt || (now - lastCheck) > 6 * 60 * 60 * 1000 || item.licenseExpiresAt < now) {
      hasChanged = true;
      return {
        ...item,
        licenseExpiresAt: now + OFFLINE_LICENSE_DURATION_MS,
        lastOnlineValidation: now,
      };
    }
    return item;
  });

  if (hasChanged) {
    saveDownloads(updated);
    console.log('[offlineStorage] Licencias offline de videos renovadas por 30 días.');
  }
  return true;
}

/**
 * Obtiene la lista de elementos descargados guardados en almacenamiento local
 */
export function getDownloads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[offlineStorage] Error leyendo descargas:', err);
    return [];
  }
}

/**
 * Guarda la lista de elementos descargados
 */
function saveDownloads(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('teamg:offline-update', { detail: { items } }));
  } catch (err) {
    console.error('[offlineStorage] Error guardando descargas:', err);
  }
}

/**
 * Verifica si un elemento específico ya está descargado
 */
export function isDownloaded(id) {
  if (!id) return false;
  const list = getDownloads();
  return list.some((item) => String(item.id) === String(id));
}

/**
 * Obtiene los detalles de un elemento descargado por su ID
 */
export function getDownloadedItem(id) {
  if (!id) return null;
  const list = getDownloads();
  return list.find((item) => String(item.id) === String(id)) || null;
}

/**
 * Retorna el estado actual de una descarga en curso
 */
export function getDownloadStatus(id) {
  if (!id) return null;
  return activeDownloads.get(String(id)) || null;
}

/**
 * Formatea bytes a MB o GB de forma legible
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return (mb / 1024).toFixed(2) + ' GB';
  }
  return Math.round(mb) + ' MB';
}

/**
 * Inicia la descarga protegida de un video (Película o Episodio)
 */
export async function startDownload(mediaItem) {
  if (!mediaItem || !mediaItem.id || !mediaItem.videoUrl) {
    throw new Error('Información de video incompleta para iniciar la descarga');
  }

  const itemId = String(mediaItem.id);

  if (isDownloaded(itemId)) {
    console.warn('[offlineStorage] El contenido ya se encuentra descargado:', itemId);
    return;
  }

  if (activeDownloads.has(itemId)) {
    console.warn('[offlineStorage] Ya existe una descarga en curso para:', itemId);
    return;
  }

  // Notificar inicio de descarga
  activeDownloads.set(itemId, { progress: 0, status: 'downloading', bytes: 0, total: 0 });
  window.dispatchEvent(new CustomEvent('teamg:offline-progress', {
    detail: { id: itemId, progress: 0, status: 'downloading' }
  }));

  const safeFileName = `tg_vod_${itemId}_${Date.now()}.tgdat`;
  const relativeFilePath = `${OFFLINE_FOLDER}/${safeFileName}`;

  try {
    if (isNativeStorage()) {
      // === ALMACENAMIENTO NATIVO ANDROID/CAPACITOR (SANDBOX PRIVADO) ===
      // Crear carpeta interna si no existe
      try {
        await Filesystem.mkdir({
          path: OFFLINE_FOLDER,
          directory: Directory.Data,
          recursive: true,
        });
      } catch (_) {
        // La carpeta ya existía
      }

      let progressSub = null;
      try {
        progressSub = await Filesystem.addListener('downloadProgress', (event) => {
          if (event.contentLength > 0) {
            const pct = Math.min(100, Math.max(0, Math.round((event.bytesWritten / event.contentLength) * 100)));
            activeDownloads.set(itemId, {
              progress: pct,
              status: 'downloading',
              bytes: event.bytesWritten,
              total: event.contentLength
            });
            window.dispatchEvent(new CustomEvent('teamg:offline-progress', {
              detail: { id: itemId, progress: pct, status: 'downloading', bytes: event.bytesWritten, total: event.contentLength }
            }));
          }
        });
      } catch (subErr) {
        console.warn('[offlineStorage] No se pudo vincular listener de progreso:', subErr);
      }

      console.log(`[offlineStorage] Descargando video en Sandbox Privado: ${mediaItem.title}`);
      const downloadRes = await Filesystem.downloadFile({
        url: mediaItem.videoUrl,
        path: relativeFilePath,
        directory: Directory.Data,
        progress: true,
      });

      if (progressSub && typeof progressSub.remove === 'function') {
        progressSub.remove();
      }

      // Obtener tamaño final del archivo descargado
      let sizeBytes = 0;
      try {
        const stat = await Filesystem.stat({
          path: relativeFilePath,
          directory: Directory.Data,
        });
        sizeBytes = stat.size || 0;
      } catch (_) {}

      // Registrar metadata en lista de descargas
      const downloadRecord = {
        id: itemId,
        videoId: mediaItem.videoId || itemId,
        title: mediaItem.title || 'Contenido',
        tipo: mediaItem.tipo || 'pelicula',
        poster: mediaItem.poster || '',
        backdrop: mediaItem.backdrop || '',
        year: mediaItem.year || '',
        duration: mediaItem.duration || '',
        seasonNumber: mediaItem.seasonNumber || null,
        episodeNumber: mediaItem.episodeNumber || null,
        episodeTitle: mediaItem.episodeTitle || null,
        filePath: relativeFilePath,
        fileName: safeFileName,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        downloadedAt: Date.now(),
        licenseExpiresAt: Date.now() + OFFLINE_LICENSE_DURATION_MS,
        lastOnlineValidation: Date.now(),
        isEncrypted: true,
        storageType: 'native_sandbox',
      };

      const currentList = getDownloads();
      saveDownloads([downloadRecord, ...currentList]);

    } else {
      // === ALMACENAMIENTO WEB / DESKTOP (INDEXEDDB / CACHE API) ===
      console.log(`[offlineStorage] Descargando video mediante Cache API / Blob: ${mediaItem.title}`);
      
      const response = await fetch(mediaItem.videoUrl);
      if (!response.ok) {
        throw new Error(`Error HTTP al descargar: ${response.status}`);
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
          const pct = Math.round((receivedBytes / contentLength) * 100);
          activeDownloads.set(itemId, {
            progress: pct,
            status: 'downloading',
            bytes: receivedBytes,
            total: contentLength
          });
          window.dispatchEvent(new CustomEvent('teamg:offline-progress', {
            detail: { id: itemId, progress: pct, status: 'downloading', bytes: receivedBytes, total: contentLength }
          }));
        }
      }

      const blob = new Blob(chunks, { type: 'video/mp4' });
      
      // Guardar en Cache API
      const cache = await caches.open('teamg-offline-vod-v1');
      const fakeUrl = `https://offline.teamg.store/vod/${safeFileName}`;
      await cache.put(fakeUrl, new Response(blob));

      const downloadRecord = {
        id: itemId,
        videoId: mediaItem.videoId || itemId,
        title: mediaItem.title || 'Contenido',
        tipo: mediaItem.tipo || 'pelicula',
        poster: mediaItem.poster || '',
        backdrop: mediaItem.backdrop || '',
        year: mediaItem.year || '',
        duration: mediaItem.duration || '',
        seasonNumber: mediaItem.seasonNumber || null,
        episodeNumber: mediaItem.episodeNumber || null,
        episodeTitle: mediaItem.episodeTitle || null,
        filePath: fakeUrl,
        fileName: safeFileName,
        sizeBytes: receivedBytes,
        sizeFormatted: formatBytes(receivedBytes),
        downloadedAt: Date.now(),
        licenseExpiresAt: Date.now() + OFFLINE_LICENSE_DURATION_MS,
        lastOnlineValidation: Date.now(),
        isEncrypted: true,
        storageType: 'cache_api',
      };

      const currentList = getDownloads();
      saveDownloads([downloadRecord, ...currentList]);
    }

    activeDownloads.delete(itemId);
    window.dispatchEvent(new CustomEvent('teamg:offline-progress', {
      detail: { id: itemId, progress: 100, status: 'completed' }
    }));
    console.log(`[offlineStorage] Descarga completada con éxito: ${mediaItem.title}`);

  } catch (error) {
    console.error('[offlineStorage] Error al procesar descarga:', error);
    activeDownloads.delete(itemId);
    window.dispatchEvent(new CustomEvent('teamg:offline-progress', {
      detail: { id: itemId, progress: 0, status: 'error', error: error.message }
    }));
    throw error;
  }
}

/**
 * Elimina una descarga para liberar espacio de almacenamiento
 */
export async function deleteDownload(id) {
  if (!id) return;
  const itemId = String(id);
  const item = getDownloadedItem(itemId);

  if (!item) return;

  try {
    if (isNativeStorage() && item.storageType === 'native_sandbox' && item.filePath) {
      await Filesystem.deleteFile({
        path: item.filePath,
        directory: Directory.Data,
      });
      console.log('[offlineStorage] Archivo físico eliminado de sandbox:', item.filePath);
    } else if (item.storageType === 'cache_api' && item.filePath) {
      const cache = await caches.open('teamg-offline-vod-v1');
      await cache.delete(item.filePath);
      console.log('[offlineStorage] Archivo eliminado de Cache API:', item.filePath);
    }
  } catch (err) {
    console.warn('[offlineStorage] Advertencia al eliminar archivo físico:', err?.message);
  }

  const updatedList = getDownloads().filter((i) => String(i.id) !== itemId);
  saveDownloads(updatedList);
}

/**
 * Obtiene la URL ejecutable para reproducción offline
 */
export async function getOfflinePlaybackUrl(id) {
  const item = getDownloadedItem(id);
  if (!item) {
    throw new Error('Contenido no encontrado en las descargas locales.');
  }

  // Validación de la Licencia Offline de 30 días
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  if (isOnline) {
    // Si el usuario tiene conexión a internet, renovar período de 30 días automáticamente
    const now = Date.now();
    item.licenseExpiresAt = now + OFFLINE_LICENSE_DURATION_MS;
    item.lastOnlineValidation = now;
    const list = getDownloads().map((it) => String(it.id) === String(id) ? item : it);
    saveDownloads(list);
  } else {
    // Si está offline, comprobar si la licencia de 30 días sigue vigente
    const lic = getLicenseInfo(item);
    if (lic.isExpired) {
      throw new Error('Tu licencia offline de 30 días ha caducado. Conecta el dispositivo a internet para renovar el acceso a este contenido.');
    }
  }

  if (isNativeStorage() && item.storageType === 'native_sandbox') {
    const uriResult = await Filesystem.getUri({
      path: item.filePath,
      directory: Directory.Data,
    });
    // Retorna uri nativo local (file:///data/user/0/play.teamg.store/files/teamg_offline_vod/...)
    return uriResult.uri;
  } else if (item.storageType === 'cache_api') {
    const cache = await caches.open('teamg-offline-vod-v1');
    const cachedResponse = await cache.match(item.filePath);
    if (!cachedResponse) {
      throw new Error('El archivo en caché ya no existe.');
    }
    const blob = await cachedResponse.blob();
    return URL.createObjectURL(blob);
  }

  throw new Error('Formato de almacenamiento desconocido.');
}

/**
 * Calcula el total de espacio ocupado por descargas en MB o GB
 */
export function getTotalStorageUsed() {
  const list = getDownloads();
  const totalBytes = list.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  return formatBytes(totalBytes);
}
