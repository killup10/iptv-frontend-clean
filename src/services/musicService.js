// src/services/musicService.js
// Servicio de música TeamG Play: catálogo fresco + CANCIÓN COMPLETA.
import axiosInstance from '../utils/axiosInstance.js';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) ||
  'https://api.teamg.store';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

// Radios en vivo de alta fidelidad (streaming 24/7 directo, siempre completas)
export const LIVE_RADIOS = [
  {
    id: 'radio-moda',
    title: 'Radio Moda 97.3 FM',
    artist: 'Te Mueve! - Reggaetón & Urbano',
    album: 'Emisora en Vivo',
    category: 'Reggaetón & Urbano',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://18493.live.streamtheworld.com/MODA_SC',
    isRadio: true,
    frequency: '97.3 FM',
    country: 'PE'
  },
  {
    id: 'radio-los40',
    title: 'Los 40 Principales',
    artist: 'Todos los Éxitos Globales',
    album: 'Emisora en Vivo',
    category: 'Pop & Éxitos',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://stream.zeno.fm/fvrx452618uvv',
    isRadio: true,
    frequency: 'Online',
    country: 'ES'
  },
  {
    id: 'radio-planeta',
    title: 'Radio Planeta 107.7 FM',
    artist: 'Tu Música en Inglés',
    album: 'Emisora en Vivo',
    category: 'Pop Internacional',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://18483.live.streamtheworld.com/PLANETA_SC',
    isRadio: true,
    frequency: '107.7 FM',
    country: 'PE'
  },
  {
    id: 'radio-oxigeno',
    title: 'Radio Oxígeno',
    artist: 'Clásicos del Rock & Pop',
    album: 'Emisora en Vivo',
    category: 'Rock Clásico',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://18483.live.streamtheworld.com/OXIGENO_SC',
    isRadio: true,
    frequency: '102.1 FM',
    country: 'PE'
  },
  {
    id: 'radio-ibiza',
    title: 'Ibiza Global Radio',
    artist: 'Electronic & Deep House 24/7',
    album: 'Emisora en Vivo',
    category: 'Electrónica & EDM',
    cover: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://listenssl.ibizaglobalradio.com:8024/ibizaglobalradio.mp3',
    isRadio: true,
    frequency: 'Online',
    country: 'IBZ'
  },
  {
    id: 'radio-chillhop',
    title: 'Chillhop Beats Radio',
    artist: 'Lo-Fi / Relax / Study 24/7',
    album: 'Emisora en Vivo',
    category: 'Lo-Fi & Chill',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    isRadio: true,
    frequency: 'Online',
    country: 'Global'
  },
  {
    id: 'radio-panamericana',
    title: 'Radio Panamericana',
    artist: 'Lo que el Perú quiere escuchar - Salsa',
    album: 'Emisora en Vivo',
    category: 'Salsa & Cumbia',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://18483.live.streamtheworld.com/PANAMERICANA_SC',
    isRadio: true,
    frequency: '101.1 FM',
    country: 'PE'
  },
  {
    id: 'radio-disney',
    title: 'Radio Disney Latinoamérica',
    artist: 'Escucha lo que quieres sentir',
    album: 'Emisora en Vivo',
    category: 'Pop Latino',
    cover: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://stream.zeno.fm/cvuuvkypgahvv',
    isRadio: true,
    frequency: 'Online',
    country: 'LATAM'
  }
];

// Géneros con queries vivas (sin año hardcodeado para no congelar el catálogo)
export const GENRES = [
  {
    id: 'reggaeton',
    name: 'Reggaetón',
    subtitle: 'Urbano & Perreo',
    bg: 'linear-gradient(135deg, #e1118c 0%, #8c0b57 100%)',
    query: 'reggaeton exitos urbano',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'pop',
    name: 'Pop Latino',
    subtitle: 'Éxitos Globales',
    bg: 'linear-gradient(135deg, #27856a 0%, #134637 100%)',
    query: 'pop latino exitos',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'rock',
    name: 'Rock Clásico',
    subtitle: 'En Español & Clásicos',
    bg: 'linear-gradient(135deg, #e91429 0%, #7d0b16 100%)',
    query: 'rock en espanol exitos',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'electronic',
    name: 'Electrónica',
    subtitle: 'EDM & House',
    bg: 'linear-gradient(135deg, #8400e7 0%, #46007b 100%)',
    query: 'electronic dance hits',
    cover: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'cumbia',
    name: 'Salsa & Cumbia',
    subtitle: 'Fiesta Latina',
    bg: 'linear-gradient(135deg, #ba5d07 0%, #633204 100%)',
    query: 'salsa cumbia fiesta exitos',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'lofi',
    name: 'Chill & Lo-Fi',
    subtitle: 'Enfoque & Relax',
    bg: 'linear-gradient(135deg, #1e3264 0%, #0e1830 100%)',
    query: 'lofi hip hop chill beats',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'gym',
    name: 'Gym Beast',
    subtitle: 'Workout & Energía',
    bg: 'linear-gradient(135deg, #e61e32 0%, #300005 100%)',
    query: 'workout motivation hits',
    cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'trap',
    name: 'Trap & Drill',
    subtitle: 'Tendencias Callejeras',
    bg: 'linear-gradient(135deg, #477d95 0%, #1e3540 100%)',
    query: 'trap latino exitos',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80'
  }
];

// Helper para transformar resultados de iTunes a formato uniforme de TeamG Music.
// NOTA: previewUrl de Apple = SOLO 30 segundos. Se usa como arranque instantáneo;
// la versión COMPLETA llega vía youtubeId (resuelto por el backend).
function formatItunesTrack(item) {
  const rawCover = item.artworkUrl100 || item.artworkUrl60 || '';
  const hdCover = rawCover
    ? rawCover.replace(/100x100bb/, '600x600bb')
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  return {
    id: `itunes-${item.trackId || Math.random().toString(36).substring(7)}`,
    trackId: item.trackId,
    title: item.trackName || item.collectionName || 'Canción Desconocida',
    artist: item.artistName || 'Artista Desconocido',
    album: item.collectionName || 'Sencillo',
    cover: hdCover,
    audioUrl: item.previewUrl || '',
    previewUrl: item.previewUrl || '',
    duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
    // La duración REAL (trackTimeMillis) es la de la canción completa;
    // mientras solo haya preview, el reproductor muestra 0:30.
    fullDuration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 0,
    isPreviewOnly: true,
    youtubeId: null,
    genre: item.primaryGenreName || 'Música',
    releaseDate: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
    isRadio: false,
    externalUrl: item.trackViewUrl || ''
  };
}

function normalizeBackendTrack(t) {
  if (!t) return null;
  return {
    ...t,
    isPreviewOnly: !t.youtubeId,
    youtubeId: t.youtubeId || null
  };
}

// Canciones destacadas de arranque instantáneo.
// El youtubeId se resuelve dinámicamente (no hardcodeado) para no congelar el catálogo.
export const INITIAL_FEATURED_TRACKS = [
  {
    id: 'feat-1',
    title: 'BbY WOW',
    artist: 'KAROL G, Judeline & rusowsky',
    album: 'BbY WOW',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2b/66/b2/2b66b26c-ab23-faa1-c4ee-06fa2cce8f76/26UM1IM00558.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f3/08/da/f308da3d-00cc-7682-7be9-87cb882f4ea5/mzaf_129115212197250565.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f3/08/da/f308da3d-00cc-7682-7be9-87cb882f4ea5/mzaf_129115212197250565.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 225,
    fullDuration: 225,
    genre: 'Urbano Latino',
    isRadio: false
  },
  {
    id: 'feat-2',
    title: 'NUEVAYoL',
    artist: 'Bad Bunny',
    album: 'DeBÍ TiRAR MÁS FOToS',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/90/5e/7e/905e7ed5-a8fa-a8f3-cd06-0028fdf3afaa/199066342442.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2e/97/55/2e97555a-1ed3-9e07-de57-07e1213186c9/mzaf_7594924455925081680.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2e/97/55/2e97555a-1ed3-9e07-de57-07e1213186c9/mzaf_7594924455925081680.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 197,
    fullDuration: 197,
    genre: 'Urbano Latino',
    isRadio: false
  },
  {
    id: 'feat-3',
    title: 'LUNA',
    artist: 'Feid & ATL Jacob',
    album: 'FERXXOCALIPSIS',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/7c/54/aa/7c54aa94-9ae3-4b80-7b23-8b23955dc3a2/23UM1IM60703.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f8/b0/5b/f8b05b80-c7ea-9ea8-759c-5fd609c15341/mzaf_2589321753277640940.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f8/b0/5b/f8b05b80-c7ea-9ea8-759c-5fd609c15341/mzaf_2589321753277640940.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 196,
    fullDuration: 196,
    genre: 'Reggaetón',
    isRadio: false
  },
  {
    id: 'feat-4',
    title: 'Taste',
    artist: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f6/15/d0/f615d0ab-e0c4-575d-907e-1cc084642357/24UMGIM61704.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/26/57/a6/2657a620-c596-e0e4-efa2-e814f3572d1c/mzaf_5475540510703120797.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/26/57/a6/2657a620-c596-e0e4-efa2-e814f3572d1c/mzaf_5475540510703120797.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 157,
    fullDuration: 157,
    genre: 'Pop',
    isRadio: false
  },
  {
    id: 'feat-5',
    title: 'Touching The Sky',
    artist: 'Rauw Alejandro',
    album: 'Cosa Nuestra',
    cover: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 188,
    fullDuration: 188,
    genre: 'Pop Urbano',
    isRadio: false
  },
  {
    id: 'feat-6',
    title: 'Patient Zero',
    artist: 'Taylor Swift',
    album: 'Patient Zero',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a0/dd/fd/a0ddfd72-ee9e-f046-6466-a5dbefc696fa/26UM1IM21436.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0b/be/8c/0bbe8c0a-dc77-af41-97a5-c745cc43d38c/mzaf_11790447166833591507.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0b/be/8c/0bbe8c0a-dc77-af41-97a5-c745cc43d38c/mzaf_11790447166833591507.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 215,
    fullDuration: 215,
    genre: 'Pop',
    isRadio: false
  }
];

// ---------------------------------------------------------------------------
// Caché local de youtubeId (memoria + localStorage, 7 días)
// ---------------------------------------------------------------------------
const YT_CACHE_KEY = 'teamg_music_ytids_v1';
const YT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const ytMemoryCache = new Map();

function readPersistentCache() {
  try {
    const raw = localStorage.getItem(YT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return {};
}

function writePersistentCache(obj) {
  try {
    const keys = Object.keys(obj);
    // Acotar a 500 entradas más recientes
    if (keys.length > 500) {
      const trimmed = {};
      keys.slice(-500).forEach((k) => { trimmed[k] = obj[k]; });
      localStorage.setItem(YT_CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(YT_CACHE_KEY, JSON.stringify(obj));
    }
  } catch {}
}

function ytCacheGet(query) {
  const key = query.toLowerCase().trim();
  if (ytMemoryCache.has(key)) return ytMemoryCache.get(key);
  const persisted = readPersistentCache();
  const entry = persisted[key];
  if (entry && Date.now() - entry.ts < YT_CACHE_TTL && entry.id) {
    ytMemoryCache.set(key, entry.id);
    return entry.id;
  }
  return null;
}

function ytCacheSet(query, id) {
  if (!id) return;
  const key = query.toLowerCase().trim();
  ytMemoryCache.set(key, id);
  const persisted = readPersistentCache();
  persisted[key] = { id, ts: Date.now() };
  writePersistentCache(persisted);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Caché de URLs de audio completo (memoria; el backend cachea 4h porque
// las URLs de googlevideo expiran ~6h)
// ---------------------------------------------------------------------------
const fullAudioCache = new Map(); // youtubeId -> { ts, url }
const FULL_AUDIO_TTL = 3 * 60 * 60 * 1000;
const YT_INNER_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

/**
 * Resuelve el ID de YouTube directamente en Android / Móvil sin pasar por el backend
 */
async function resolveYouTubeViaCapacitor(query) {
  if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform?.()) return null;
  try {
    const res = await CapacitorHttp.post({
      url: `https://www.youtube.com/youtubei/v1/search?key=${YT_INNER_KEY}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
      },
      data: {
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            androidSdkVersion: 30,
            hl: 'es',
            gl: 'PE'
          }
        },
        query: query + ' audio'
      }
    });
    const str = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const matches = [...str.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]);
    const uniqueIds = [...new Set(matches)];
    if (uniqueIds.length > 0) return uniqueIds[0];
  } catch (e) {
    console.warn('[MusicService] Capacitor InnerTube search failed:', e);
  }
  return null;
}

/**
 * Resuelve stream de audio directo en Android/Android TV/iOS usando CapacitorHttp nativo.
 * Se ejecuta en ~400ms directamente desde la IP del dispositivo del usuario (sin Render ni CORS).
 */
async function fetchAndroidStreamViaCapacitor(youtubeId) {
  if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform?.()) return null;
  try {
    const res = await CapacitorHttp.post({
      url: `https://www.youtube.com/youtubei/v1/player?key=${YT_INNER_KEY}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
      },
      data: {
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            androidSdkVersion: 30,
            hl: 'es',
            gl: 'PE'
          }
        },
        videoId: youtubeId,
        contentCheckOk: true,
        racyCheckOk: true
      }
    });

    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.playabilityStatus?.status !== 'OK') return null;

    // Priorizar format 18 (MP4 progresivo con AAC completo, sin límite de 1MB/1:04 de Google Video)
    const fmt18 = (data.streamingData?.formats || []).find(f => Number(f.itag) === 18 && f.url);
    const chosen = fmt18
      || (data.streamingData?.adaptiveFormats || []).find(f => Number(f.itag) === 140 && f.url)
      || (data.streamingData?.adaptiveFormats || []).find(f => f.mimeType && f.mimeType.startsWith('audio/') && f.url)
      || (data.streamingData?.formats || [])[0];

    return chosen?.url || null;
  } catch (e) {
    console.warn('[MusicService] CapacitorHttp direct audio failed:', e);
    return null;
  }
}

export const musicService = {
  /**
   * Top de éxitos frescos (vía backend; sin el RSS deprecado de Apple).
   * country: 'global' | 'latin' | 'PE' | 'US' | 'ES' | 'MX'
   */
  async getTopTracks(country = 'global') {
    // 1) Backend vía axiosInstance (incluye headers x-app-version: 1.5.12 y puente Electron)
    try {
      const res = await axiosInstance.get('/api/music/charts', {
        params: { country },
        timeout: 10000
      });
      if (res.data?.tracks && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
        const mapped = res.data.tracks.map(normalizeBackendTrack).filter(Boolean);
        try {
          localStorage.setItem('teamg_music_top_cached', JSON.stringify(mapped));
        } catch {}
        return mapped;
      }
    } catch (err) {
      console.warn('[MusicService] Backend charts no disponible, usando feed oficial Apple v2:', err?.message);
    }

    // 2) Fallback directo al feed oficial de Apple Music Most-Played con lookup de previews instantáneos
    try {
      const key = String(country || 'global').toLowerCase();
      const feedCountry = ['pe', 'es', 'mx', 'us'].includes(key) ? key : (key === 'latin' ? 'pe' : 'us');
      const res = await fetch(`https://rss.applemarketingtools.com/api/v2/${feedCountry}/music/most-played/50/songs.json`);
      if (res.ok) {
        const data = await res.json();
        const results = data?.feed?.results || [];
        if (results.length > 0) {
          const ids = results.map((r) => r.id).filter(Boolean);
          const lookupMap = new Map();
          try {
            const lRes = await fetch(
              `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${feedCountry.toUpperCase()}`
            );
            if (lRes.ok) {
              const lData = await lRes.json();
              (lData.results || []).forEach((item) => {
                if (item.trackId) lookupMap.set(String(item.trackId), item);
              });
            }
          } catch {}

          const mapped = results.map((item) => {
            const lItem = lookupMap.get(String(item.id));
            const rawCover = (lItem && lItem.artworkUrl100) || item.artworkUrl100 || '';
            const hdCover = rawCover
              ? rawCover.replace(/100x100bb/, '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
            const audioPreview = (lItem && lItem.previewUrl) || '';
            const trackDuration = lItem?.trackTimeMillis ? Math.round(lItem.trackTimeMillis / 1000) : 210;

            return {
              id: `apple-${item.id}`,
              trackId: item.id,
              title: (lItem && lItem.trackName) || item.name || 'Canción Desconocida',
              artist: (lItem && lItem.artistName) || item.artistName || 'Artista Desconocido',
              album: (lItem && lItem.collectionName) || item.name || 'Sencillo',
              cover: hdCover,
              audioUrl: audioPreview,
              previewUrl: audioPreview,
              duration: trackDuration,
              fullDuration: trackDuration,
              isPreviewOnly: true,
              youtubeId: null,
              genre: (lItem && lItem.primaryGenreName) || (item.genres && item.genres[0] ? item.genres[0].name : 'Música'),
              releaseDate: lItem?.releaseDate
                ? String(lItem.releaseDate).substring(0, 4)
                : (item.releaseDate ? String(item.releaseDate).substring(0, 4) : '2026'),
              isRadio: false,
              externalUrl: item.url || '',
            };
          });

          try {
            localStorage.setItem('teamg_music_top_cached', JSON.stringify(mapped));
          } catch {}

          return mapped;
        }
      }
    } catch (err) {
      console.warn('[MusicService] Fallback RSS Apple falló:', err);
    }

    // Si no hay conexión (offline), cargar la última caché persistida de éxitos
    try {
      const offlineCached = localStorage.getItem('teamg_music_top_cached');
      if (offlineCached) {
        const parsed = JSON.parse(offlineCached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return INITIAL_FEATURED_TRACKS;
  },

  /**
   * Busca cualquier canción, artista o álbum en tiempo real.
   */
  async searchTracks(query, limit = 30) {
    if (!query || query.trim().length === 0) return [];

    // 1) Backend vía axiosInstance (normalizado + sin CORS)
    try {
      const res = await axiosInstance.get('/api/music/search', {
        params: { q: query.trim(), limit },
        timeout: 10000
      });
      if (res.data?.tracks && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
        return res.data.tracks.map(normalizeBackendTrack).filter(Boolean);
      }
    } catch (err) {
      console.warn('[MusicService] Backend search no disponible, fallback directo:', err?.message);
    }

    // 2) Fallback directo a iTunes
    try {
      const cleanQuery = encodeURIComponent(query.trim());
      const res = await fetch(`${ITUNES_SEARCH_URL}?term=${cleanQuery}&entity=song&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return (data.results || []).map(formatItunesTrack);
    } catch (error) {
      console.error('[MusicService] Error buscando canciones:', error);
      return [];
    }
  },

  /**
   * Obtiene canciones por género musical.
   */
  async getTracksByGenre(genreQuery, limit = 24) {
    return this.searchTracks(genreQuery, limit);
  },

  /**
   * Lista de emisoras de radio en vivo.
   */
  getLiveRadios() {
    return LIVE_RADIOS;
  },

  /**
   * Géneros configurados.
   */
  getGenres() {
    return GENRES;
  },

  /**
   * Resuelve el ID de YouTube para reproducir la canción COMPLETA.
   * Orden: caché local -> backend /api/music/resolve -> Electron IPC -> Piped/Invidious.
   */
  async getYouTubeId(artist, title) {
    if (!title) return null;
    const cleanArtist = artist && artist !== 'Artista Desconocido' ? artist : '';
    const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const query = `${cleanArtist} ${cleanTitle}`.trim();
    if (!query) return null;

    // 0. Caché local
    const cached = ytCacheGet(query);
    if (cached) return cached;

    // 1. Electron IPC (proceso principal Node.js con InnerTube integrado: ~200ms)
    if (typeof window !== 'undefined' && window.electronAPI?.getMusicYouTubeId) {
      try {
        const id = await window.electronAPI.getMusicYouTubeId(query);
        if (id) {
          ytCacheSet(query, id);
          return id;
        }
      } catch (e) {
        console.warn('[MusicService] Electron IPC getMusicYouTubeId falló:', e);
      }
    }

    // 2. Móvil / Android TV (Capacitor nativo): resolución directa en dispositivo sin CORS (~300ms)
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
      try {
        const nativeId = await resolveYouTubeViaCapacitor(query);
        if (nativeId) {
          ytCacheSet(query, nativeId);
          return nativeId;
        }
      } catch (e) {
        console.warn('[MusicService] Capacitor native resolve falló:', e);
      }
    }

    // 3. Backend vía axiosInstance (timeout corto 4s)
    try {
      const res = await axiosInstance.get('/api/music/resolve', {
        params: { artist: cleanArtist, title: cleanTitle },
        timeout: 4000
      });
      if (res.data?.youtubeId) {
        ytCacheSet(query, res.data.youtubeId);
        return res.data.youtubeId;
      }
    } catch (err) {
      console.warn('[MusicService] Backend resolve vía axiosInstance falló:', err?.message);
    }

    // 4. Fallback directo con fetch enviando x-app-version
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/music/resolve?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`,
        {
          headers: {
            'Accept': 'application/json',
            'x-app-version': '1.5.12'
          }
        },
        5000
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.youtubeId) {
          ytCacheSet(query, data.youtubeId);
          return data.youtubeId;
        }
      }
    } catch (err) {
      console.warn('[MusicService] Backend resolve con fetch falló:', err?.message);
    }

    // 3. Piped / Invidious directos (solo web; última opción)
    const pipedInstances = [
      'https://pipedapi.adminforge.de',
      'https://pipedapi.reallyaweso.me',
      'https://pipedapi.leptons.xyz'
    ];
    for (const inst of pipedInstances) {
      try {
        const res = await fetchWithTimeout(
          `${inst}/search?q=${encodeURIComponent(query + ' audio')}&filter=videos`,
          {},
          8000
        );
        if (!res.ok) continue;
        const data = await res.json();
        const items = data.items || [];
        const video = items.find((v) => v.url && v.url.includes('/watch?v='));
        const idMatch = video ? String(video.url).match(/v=([a-zA-Z0-9_-]{11})/) : null;
        if (idMatch) {
          ytCacheSet(query, idMatch[1]);
          return idMatch[1];
        }
      } catch {}
    }

    const invidiousInstances = [
      'https://inv.tux.pizza',
      'https://invidious.nerdvpn.de',
      'https://yt.artemislena.eu',
      'https://iv.melmac.space'
    ];
    for (const inst of invidiousInstances) {
      try {
        const res = await fetchWithTimeout(
          `${inst}/api/v1/search?q=${encodeURIComponent(query + ' audio')}&type=video`,
          {},
          8000
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data[0]?.videoId) {
          ytCacheSet(query, data[0].videoId);
          return data[0].videoId;
        }
      } catch {}
    }

    return null;
  },

  /**
   * Obtiene la URL de AUDIO DIRECTO (mp3/m4a) de la canción completa.
   * Se reproduce en <audio> nativo: progreso y seek reales, sin bloqueos
   * de embed del iframe de YouTube. Retorna null si no hay stream.
   */
  async getFullAudioUrl(trackOrId) {
    const yid = typeof trackOrId === 'string' ? trackOrId : trackOrId?.youtubeId;
    if (!yid || !/^[a-zA-Z0-9_-]{11}$/.test(yid)) return null;

    const cached = fullAudioCache.get(yid);
    if (cached && Date.now() - cached.ts < FULL_AUDIO_TTL) return cached.url;

    // 1) Electron Desktop: extracción directa desde Node.js en ~400ms (sin CORS, sin Render)
    if (typeof window !== 'undefined' && window.electronAPI?.getMusicDirectAudio) {
      try {
        const directUrl = await window.electronAPI.getMusicDirectAudio(yid);
        if (directUrl) {
          if (fullAudioCache.size > 200) {
            const oldest = fullAudioCache.keys().next().value;
            fullAudioCache.delete(oldest);
          }
          fullAudioCache.set(yid, { ts: Date.now(), url: directUrl });
          return directUrl;
        }
      } catch (e) {
        console.warn('[MusicService] Electron getMusicDirectAudio error:', e);
      }
    }

    // 2) Móvil / Android TV (Capacitor nativo): extracción nativa en el dispositivo en ~400ms
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
      try {
        const directUrl = await fetchAndroidStreamViaCapacitor(yid);
        if (directUrl) {
          if (fullAudioCache.size > 200) {
            const oldest = fullAudioCache.keys().next().value;
            fullAudioCache.delete(oldest);
          }
          fullAudioCache.set(yid, { ts: Date.now(), url: directUrl });
          return directUrl;
        }
      } catch (e) {
        console.warn('[MusicService] Capacitor native direct audio error:', e);
      }
    }

    // 3) Backend /api/music/audio (timeout corto 6s para no bloquear la UI)
    try {
      const res = await axiosInstance.get('/api/music/audio', {
        params: { youtubeId: yid },
        timeout: 6000
      });
      if (res.data?.url) {
        if (fullAudioCache.size > 200) {
          const oldest = fullAudioCache.keys().next().value;
          fullAudioCache.delete(oldest);
        }
        fullAudioCache.set(yid, { ts: Date.now(), url: res.data.url });
        return res.data.url;
      }
    } catch (err) {
      console.warn('[MusicService] Backend stream directo no disponible:', err?.message);
    }
    return null;
  },

  /**
   * Enriquece una lista con youtubeId (versión completa) en segundo plano,
   * con concurrencia limitada. Devuelve las mismas instancias mutadas.
   */
  async enrichTracksWithYouTube(tracks, max = 10) {
    if (!Array.isArray(tracks) || tracks.length === 0) return tracks;
    const pending = tracks.filter((t) => t && !t.isRadio && !t.youtubeId).slice(0, max);
    const CONCURRENCY = 4;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);
      const ids = await Promise.all(
        batch.map((t) => this.getYouTubeId(t.artist, t.title).catch(() => null))
      );
      batch.forEach((t, j) => {
        if (ids[j]) {
          t.youtubeId = ids[j];
          t.isPreviewOnly = false;
        }
      });
    }
    return tracks;
  }
};
