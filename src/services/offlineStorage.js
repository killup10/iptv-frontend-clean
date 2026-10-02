import { Filesystem, Directory } from '@capacitor/filesystem';
import { DownloadQueue } from './downloadQueue.js';
import { Capacitor, registerPlugin } from '@capacitor/core';
import axiosInstance from '../utils/axiosInstance.js';

const STORAGE_KEY = 'teamg_offline_items';
const OFFLINE_FOLDER = 'teamg_offline_vod';
const MAGIC_HEADER = 'TGPLAY_ENC_V1';

// Mapa de descargas en curso: id -> { progress: number, status: 'downloading' | 'error' | 'completed' }
const activeDownloads = new Map();
const queue = new DownloadQueue(2);
const NativeVodDownload = registerPlugin('VodDownload');
let nativeProgressReady;
function publishDownload(id, state) {
  const previous=activeDownloads.get(id)||{};
  const next={...previous,...state};activeDownloads.set(id,next);
  window.dispatchEvent(new CustomEvent('teamg:offline-progress',{detail:{id,...next}}));
}
export function retryDownload(id){const item=activeDownloads.get(String(id))?.mediaItem;return item?startDownload(item):Promise.reject(new Error('Vuelve a abrir el detalle para reintentar.'));}
export function getActiveDownloads(){return [...activeDownloads].map(([id,state])=>({id,...state}));}
function nativeProgressListener(){
  if(!nativeProgressReady)nativeProgressReady=NativeVodDownload.addListener('progress',event=>{
    const id=String(event.id);if(!activeDownloads.has(id))return;
    const bytes=Number(event.bytes)||0,total=Number(event.total)||0;
    publishDownload(id,{status:'downloading',bytes,total,progress:total>0?Math.min(99,Math.round(bytes/total*100)):0});
  }).catch(error=>{nativeProgressReady=null;throw error;});
  return nativeProgressReady;
}

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

// Duración máxima de la licencia offline: 30 días (acotada al vencimiento de la suscripción del cliente)
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
  if (!u) return false;
  if (u.role === 'admin') return true;
  if (u.isActive === false) return false;
  if (u.expiresAt) {
    const exp = new Date(u.expiresAt).getTime();
    if (isNaN(exp) || exp <= Date.now()) {
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
  if (!u || !isUserSubscriptionActive(u)) {
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

  // Máximo 30 días o lo que le quede de suscripción pagada
  return Math.min(OFFLINE_LICENSE_DURATION_MS, subRemainingMs);
}

/**
 * Obtiene la información de validez de la licencia offline de un video,
 * considerando tanto el límite de 30 días como el estado de suscripción en AdminPanel.
 */
export function getLicenseInfo(itemOrId, user = null) {
  const item = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId : getDownloadedItem(itemOrId);
  if (!item) return { isValid: false, daysRemaining: 0, isExpired: true, expiresAt: 0, isSubscriptionExpired: false };

  const now = Date.now();
  const u = user || getActiveUser();
  const subActive = isUserSubscriptionActive(u);

  // Si la suscripción del cliente ya venció en AdminPanel
  if (!subActive) {
    return {
      isValid: false,
      daysRemaining: 0,
      isExpired: true,
      expiresAt: item.licenseExpiresAt || 0,
      isSubscriptionExpired: true,
    };
  }

  const baseExpiresAt = item.licenseExpiresAt || ((item.downloadedAt || now) + OFFLINE_LICENSE_DURATION_MS);

  // Acotar a la fecha de vencimiento pagada del usuario si no es admin
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
    lastOnlineValidation: item.lastOnlineValidation || item.downloadedAt || now,
    isSubscriptionExpired: false,
  };
}

/**
 * Renueva el período de licencia para todos los videos offline SOLO si el cliente
 * tiene suscripción activa y pagada en el AdminPanel.
 */
export function renewAllOfflineLicenses(user = null) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const list = getDownloads();
  if (!list || list.length === 0) return true;

  const u = user || getActiveUser();
  const subActive = isUserSubscriptionActive(u);
  const now = Date.now();
  let hasChanged = false;

  // Si el cliente no tiene suscripción activa o no ha renovado el pago en AdminPanel:
  if (!subActive) {
    console.warn('[offlineStorage] Suscripción inactiva o expirada en AdminPanel. Bloqueando licencias offline.');
    const updated = list.map((item) => {
      if (item.licenseExpiresAt !== 0) {
        hasChanged = true;
        return {
          ...item,
          licenseExpiresAt: 0, // Bloquear de inmediato
          lastOnlineValidation: now,
        };
      }
      return item;
    });
    if (hasChanged) {
      saveDownloads(updated);
    }
    return false;
  }

  // Si el cliente SÍ renovó y está al día: extender período según su fecha de suscripción
  const allowedDuration = calculateAllowedLicenseDuration(u);
  const newExpiry = now + allowedDuration;

  const updated = list.map((item) => {
    const lastCheck = item.lastOnlineValidation || 0;
    if (!item.licenseExpiresAt || item.licenseExpiresAt < now || (now - lastCheck) > 6 * 60 * 60 * 1000 || item.licenseExpiresAt > newExpiry) {
      hasChanged = true;
      return {
        ...item,
        licenseExpiresAt: newExpiry,
        lastOnlineValidation: now,
      };
    }
    return item;
  });

  if (hasChanged) {
    saveDownloads(updated);
    console.log(`[offlineStorage] Licencias offline de videos renovadas exitosamente por suscripción activa (${Math.ceil(allowedDuration / (24*60*60*1000))} días).`);
  }
  return true;
}

/**
 * Obtiene la lista de elementos descargados guardados en almacenamiento local,
 * limpiando automáticamente registros incompletos o vacíos (0 MB).
 */
export function getDownloads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // Limpieza automática de descargas corruptas o vacías (0 MB)
    const valid = list.filter((item) => {
      const bytes = Number(item.sizeBytes || 0);
      if (bytes > 0 && bytes < 100 * 1024) return false;
      if (item.sizeFormatted === '0 MB' && bytes < 100 * 1024) return false;
      return true;
    });
    if (valid.length !== list.length) {
      saveDownloads(valid);
    }
    return valid;
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
 * Verifica si un elemento específico ya está descargado y es válido
 */
export function isDownloaded(id) {
  if (!id) return false;
  const list = getDownloads();
  return list.some((item) => String(item.id) === String(id) && (item.sizeBytes === undefined || item.sizeBytes >= 100 * 1024));
}

/**
 * Obtiene los detalles de un elemento descargado por su ID
 */
export function getDownloadedItem(id) {
  if (!id) return null;
  const list = getDownloads();
  const item = list.find((item) => String(item.id) === String(id)) || null;
  if (item && item.sizeBytes !== undefined && item.sizeBytes < 100 * 1024) {
    return null; // Descarga corrupta
  }
  return item;
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
 * Resuelve la URL directa de descarga de un video (resolviendo tokens de backend o normalizando Dropbox)
 */
export async function resolveDirectVideoUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return null;

  let finalUrl = videoUrl.trim();
  const apiOrigin=new URL(axiosInstance.defaults?.baseURL || 'https://api.teamg.store').origin;
  if(finalUrl.startsWith('/api/'))finalUrl=new URL(finalUrl,apiOrigin).href;
  if(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\//i.test(finalUrl)) {
    const local=new URL(finalUrl);finalUrl=apiOrigin+local.pathname+local.search;
  }

  // Si es una URL protegida de playback (/api/videos/playback/...)
  if (finalUrl.includes('/api/videos/playback/')) {
    try {
      const sep = finalUrl.includes('?') ? '&' : '?';
      const resolveUrl = `${finalUrl}${sep}resolve=1`;
      const res = await axiosInstance.get(resolveUrl);
      if (res.data?.downloadUrl || res.data?.sourceUrl) {
        finalUrl = res.data.downloadUrl || res.data.sourceUrl;
      } else throw new Error('El servidor no devolvió el enlace directo del video.');
    } catch (e) {
      console.error('[offlineStorage] Error resolviendo URL directa vía backend:', e?.message || e);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Sin conexión a internet. Para descargar contenido offline debes conectarte a una red Wi-Fi o datos móviles.');
      }
      throw new Error(e?.response?.data?.error || e?.message || 'No se pudo obtener el enlace de descarga directa del servidor.');
    }
  }

  // Normalizar enlaces de Dropbox a dl.dropboxusercontent.com para descarga directa sin saltos 302
  if (finalUrl.includes('dl.dropbox.com')) {
    finalUrl = finalUrl.replace('dl.dropbox.com', 'dl.dropboxusercontent.com');
  } else if (finalUrl.includes('www.dropbox.com')) {
    finalUrl = finalUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }

  let parsed;try{parsed=new URL(finalUrl);}catch{throw new Error('El enlace de descarga del contenido no es válido.');}
  if(!['https:','http:'].includes(parsed.protocol)||['localhost','127.0.0.1'].includes(parsed.hostname))throw new Error('El enlace de descarga no apunta al servidor de contenido. Abre el detalle nuevamente.');
  return finalUrl;
}

/**
 * Inicia la descarga protegida de un video (Película o Episodio)
 */
export function startDownload(mediaItem) {
  if(!mediaItem?.id || !mediaItem?.videoUrl)return Promise.reject(new Error('Información de video incompleta para iniciar la descarga'));
  const id=String(mediaItem.id);if(isDownloaded(id))return Promise.resolve(getDownloadedItem(id));
  return queue.enqueue(id,async()=>{try{return await performDownload(mediaItem);}catch(error){publishDownload(id,{status:'error',error:error.message});throw error;}},()=>publishDownload(id,{title:mediaItem.title,mediaItem,progress:0,status:'queued',bytes:0,total:0}));
}
async function performDownload(mediaItem) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Sin conexión a internet. Para descargar contenido offline debes conectarte a una red Wi-Fi o datos móviles.');
  }

  if (!mediaItem || !mediaItem.id || !mediaItem.videoUrl) {
    throw new Error('Información de video incompleta para iniciar la descarga');
  }

  const itemId = String(mediaItem.id);

  if (isDownloaded(itemId)) {
    console.warn('[offlineStorage] El contenido ya se encuentra descargado:', itemId);
    return;
  }

  let directVideoUrl;
  try { directVideoUrl=await resolveDirectVideoUrl(mediaItem.videoUrl); }
  catch(error){publishDownload(itemId,{status:'error',error:error.message});throw error;}
  if (!directVideoUrl) {
    throw new Error('No se pudo obtener el enlace de descarga del video');
  }

  if (directVideoUrl.toLowerCase().includes('.m3u8')) {
    publishDownload(itemId,{status:'error',error:'Este formato no permite descarga offline.'});
    throw new Error('Este contenido se emite en formato HLS en vivo y no está disponible para descarga offline.');
  }

  publishDownload(itemId,{title:mediaItem.title,status:'downloading',progress:0,bytes:0,total:0});

  let ext = '.mp4';
  const lowerUrl = directVideoUrl.toLowerCase();
  if (lowerUrl.includes('.mkv')) ext = '.mkv';
  else if (lowerUrl.includes('.webm')) ext = '.webm';
  else if (lowerUrl.includes('.avi')) ext = '.avi';

  const safeFileName = `tg_vod_${itemId}_${Date.now()}${ext}`;
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

      if(Capacitor.getPlatform()==='android') {
        await nativeProgressListener();
        await NativeVodDownload.download({id:itemId,url:directVideoUrl,path:relativeFilePath});
      } else {
        let subscription;
        try {
          subscription=await Filesystem.addListener('progress',event=>{
            if(event.url!==directVideoUrl)return;
            const bytes=Number(event.bytes)||0,total=Number(event.contentLength)||0;
            publishDownload(itemId,{status:'downloading',bytes,total,progress:total>0?Math.min(99,Math.round(bytes/total*100)):0});
          });
          await Filesystem.downloadFile({url:directVideoUrl,path:relativeFilePath,directory:Directory.Data,progress:true,connectTimeout:20000,readTimeout:45000});
        } finally {await subscription?.remove();}
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

      // Validación de integridad: un archivo de video real debe tener al menos 100 KB
      if (sizeBytes < 100 * 1024) {
        try {
          await Filesystem.deleteFile({
            path: relativeFilePath,
            directory: Directory.Data,
          });
        } catch (_) {}
        throw new Error('La descarga falló o el archivo recibido está incompleto (0 MB). Verifica tu conexión a internet.');
      }

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
      
      const response = await fetch(directVideoUrl);
      if (!response.ok) {
        throw new Error(`Error HTTP al descargar: ${response.status}`);
      }

      const contentLength=Number(response.headers.get('content-length'))||0;
      const mimeType=response.headers.get('content-type')||'video/mp4';
      if(/text\/html|application\/json/i.test(mimeType))throw new Error('El enlace no devolvió un archivo de video.');
      let receivedBytes=0,lastProgress=0;
      const progressStream=new TransformStream({
        transform(chunk,controller){
          receivedBytes+=chunk.byteLength;controller.enqueue(chunk);
          if(Date.now()-lastProgress>=500){lastProgress=Date.now();publishDownload(itemId,{status:'downloading',bytes:receivedBytes,total:contentLength,progress:contentLength>0?Math.min(99,Math.round(receivedBytes/contentLength*100)):0});}
        },
        flush(){if(receivedBytes<102400 || (contentLength>0 && receivedBytes!==contentLength))throw new Error('La conexión se interrumpió antes de completar el video.');}
      });
      const cache=await caches.open('teamg-offline-vod-v1');
      const fakeUrl=`https://offline.teamg.store/vod/${safeFileName}`;
      await cache.put(fakeUrl,new Response(response.body.pipeThrough(progressStream),{headers:{'Content-Type':mimeType}}));

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
    if(isNativeStorage()){try{await Filesystem.deleteFile({path:relativeFilePath,directory:Directory.Data});}catch{}}
    publishDownload(itemId,{progress:0,status:'error',error:error.message});
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

  // Validación de la Licencia Offline vinculada al estado de suscripción
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const u = getActiveUser();

  if (isOnline) {
    if (!isUserSubscriptionActive(u)) {
      throw new Error('Tu suscripción ha vencido en TeamG Play. Por favor contacta a tu proveedor para renovar tu suscripción y reactivar tus contenidos offline.');
    }
    const allowedDuration = calculateAllowedLicenseDuration(u);
    const now = Date.now();
    item.licenseExpiresAt = now + allowedDuration;
    item.lastOnlineValidation = now;
    const list = getDownloads().map((it) => String(it.id) === String(id) ? item : it);
    saveDownloads(list);
  } else {
    // Si está offline, comprobar si la licencia sigue vigente (acotada a la suscripción pagada)
    const lic = getLicenseInfo(item, u);
    if (!lic.isValid) {
      if (lic.isSubscriptionExpired) {
        throw new Error('Tu suscripción ha vencido en TeamG Play. Por favor renueva tu servicio con tu administrador para reactivar la reproducción de tus descargas.');
      }
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
