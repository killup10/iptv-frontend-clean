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
 * Detecta si una URL es un stream HLS (M3U8)
 * @param {string} url - La URL a verificar
 * @returns {boolean} - true si es M3U8, false si no
 */
export function isHLSStream(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return url.toLowerCase().endsWith('.m3u8') || 
         url.toLowerCase().includes('.m3u8?');
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

import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin.js';
import { fetchChannelForPlayback } from './api.js';

export async function playLiveChannel(channel, allChannels = []) {
  if (!channel) return;
  const channelId = channel.id || channel._id;
  let streamUrl = channel.url || channel.streamUrl || channel.stream_url || channel.playbackUrl || channel.videoUrl;

  if (!streamUrl && channelId) {
    try {
      const detailed = await fetchChannelForPlayback(channelId);
      streamUrl = detailed?.url || detailed?.streamUrl || detailed?.stream_url || detailed?.playbackUrl || detailed?.videoUrl;
    } catch (e) {
      console.warn('[playLiveChannel] Error fetching channel url:', e);
    }
  }

  if (!streamUrl) {
    throw new Error('No se pudo obtener la señal del canal');
  }

  const rawList = Array.isArray(allChannels) && allChannels.length > 0 ? allChannels : [channel];
  const formattedChannels = rawList.map((c) => ({
    id: c.id || c._id,
    name: c.name || c.title || 'Canal',
    url: c.url || c.streamUrl || c.stream_url || c.playbackUrl || c.videoUrl || '',
    logo: c.logo || c.customThumbnail || c.thumbnail || '',
    number: c.number || c.channelNumber || '',
    epg: c.epg || c.currentProgram || c.section || 'En vivo'
  })).filter((c) => c.url);

  await VideoPlayerPlugin.playVideo({
    url: streamUrl,
    title: channel.name || channel.title || 'Canal en vivo',
    metaLine: channel.epg || channel.currentProgram || channel.section || 'En vivo',
    isLiveTV: true,
    channels: formattedChannels.length > 0 ? formattedChannels : [{
      id: channelId,
      name: channel.name || channel.title || 'Canal',
      url: streamUrl,
      logo: channel.logo || channel.customThumbnail || channel.thumbnail || '',
      number: channel.number || channel.channelNumber || '',
      epg: channel.epg || channel.currentProgram || channel.section || 'En vivo'
    }],
    contentType: 'channel',
    startTime: 0
  });
}
