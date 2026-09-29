// src/services/musicService.js
// Servicio de música TeamG Play: catálogo fresco + CANCIÓN COMPLETA.
import axiosInstance from '../utils/axiosInstance.js';

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
    audioUrl: '',
    previewUrl: '',
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
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
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
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 196,
    fullDuration: 196,
    genre: 'Reggaetón',
    isRadio: false
  },
  {
    id: 'feat-4',
    title: 'Monaco',
    artist: 'Bad Bunny',
    album: 'nadie sabe lo que va a pasar mañana',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 267,
    fullDuration: 267,
    genre: 'Trap Latino',
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
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
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
        return res.data.tracks.map(normalizeBackendTrack).filter(Boolean);
      }
    } catch (err) {
      console.warn('[MusicService] Backend charts no disponible, usando feed oficial Apple v2:', err?.message);
    }

    // 2) Fallback directo al feed oficial de Apple Music Most-Played (v2 en vivo, NO búsquedas antiguas)
    try {
      const key = String(country || 'global').toLowerCase();
      const feedCountry = ['pe', 'es', 'mx', 'us'].includes(key) ? key : (key === 'latin' ? 'pe' : 'us');
      const res = await fetch(`https://rss.applemarketingtools.com/api/v2/${feedCountry}/music/most-played/50/songs.json`);
      if (res.ok) {
        const data = await res.json();
        const results = data?.feed?.results || [];
        if (results.length > 0) {
          return results.map((item) => {
            const rawCover = item.artworkUrl100 || '';
            const hdCover = rawCover
              ? rawCover.replace(/100x100bb/, '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
            return {
              id: `apple-${item.id}`,
              trackId: item.id,
              title: item.name || 'Canción Desconocida',
              artist: item.artistName || 'Artista Desconocido',
              album: item.name || 'Sencillo',
              cover: hdCover,
              audioUrl: '',
              previewUrl: '',
              duration: 210,
              fullDuration: 210,
              isPreviewOnly: true,
              youtubeId: null,
              genre: item.genres && item.genres[0] ? item.genres[0].name : 'Música',
              releaseDate: item.releaseDate ? String(item.releaseDate).substring(0, 4) : '2026',
              isRadio: false,
              externalUrl: item.url || '',
            };
          });
        }
      }
    } catch (err) {
      console.warn('[MusicService] Fallback RSS Apple falló:', err);
    }

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

    // 1. Electron IPC (proceso principal Node.js: ultra rápido, sin restricciones del navegador)
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

    // 2. Backend vía axiosInstance (inyecta x-app-version: 1.5.12 y puente HTTP sin CORS)
    try {
      const res = await axiosInstance.get('/api/music/resolve', {
        params: { artist: cleanArtist, title: cleanTitle },
        timeout: 12000
      });
      if (res.data?.youtubeId) {
        ytCacheSet(query, res.data.youtubeId);
        return res.data.youtubeId;
      }
    } catch (err) {
      console.warn('[MusicService] Backend resolve vía axiosInstance falló:', err?.message);
    }

    // 3. Fallback directo con fetch enviando x-app-version
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/music/resolve?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`,
        {
          headers: {
            'Accept': 'application/json',
            'x-app-version': '1.5.12'
          }
        },
        12000
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

    try {
      const res = await axiosInstance.get('/api/music/audio', {
        params: { youtubeId: yid },
        timeout: 20000
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
      console.warn('[MusicService] Sin stream directo de audio:', err?.message);
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
