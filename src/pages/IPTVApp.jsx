// src/pages/IPTVApp.jsx
import React, { useEffect, useState } from 'react';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizeSearchText } from '../utils/searchUtils.js';

export default function IPTVApp({ defaultTab = 'live' }) {
  // ... (otros estados y hooks como estaban: user, channels, videoFiles, etc.)
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;
  const { token } = user || {};
  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    if (activeTab === 'live') {
      loadChannels();
    } else {
      loadVideos();
    }
  }, [activeTab, user]);

  async function loadChannels() {
    if (!token) {
      setIsLoading(false);
      setChannels([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/channels/list`, { headers: authHeader });
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Error cargando canales: ${res.status} ${errorData}`);
      }
      const data = await res.json();
      console.log('IPTVApp: Canales cargados de /api/channels/list:', data);
      setChannels(data || []);
    } catch (err) {
      console.error("Error en loadChannels:", err);
      setError(err.message);
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadVideos() {
    if (!token) {
      setIsLoading(false);
      setVideoFiles([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/videos`, { headers: authHeader });
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Error cargando videos: ${res.status} ${errorData}`);
      }
      const data = await res.json();
      setVideoFiles(data || []);
    } catch (err) {
      console.error("Error en loadVideos:", err);
      setError(err.message);
      setVideoFiles([]);
    } finally {
      setIsLoading(false);
    }
  }
  
  function getPlayableUrl(originalUrl) {
    if (!originalUrl) {
      console.warn("getPlayableUrl recibió una URL nula o undefined");
      return originalUrl;
    }
    console.log("IPTVApp: getPlayableUrl - evaluando originalUrl:", originalUrl);

    // 1. URLs que ya usan tu dominio teamg.store (manejadas por tu Cloudflare Worker)
    if (originalUrl.startsWith('https://teamg.store/')) {
      console.log(`   সিদ্ধান্ত: Reproduciendo directamente (URL de teamg.store): ${originalUrl}`);
      return originalUrl;
    }

    // 2. TEST: URLs de Bitel (como la de Latina) se intentarán reproducir directamente
    if (originalUrl.startsWith('https://live-evg25.tv360.bitel.com.pe/')) {
      console.log(`  TEST: Reproduciendo directamente URL de Bitel (sin proxy Node.js): ${originalUrl}`);
      return originalUrl;
    }

    // 3. NUEVO TEST: URLs de 179.51.136.19 se intentarán reproducir directamente
    if (originalUrl.startsWith('http://179.51.136.19')) {
      console.log(`  TEST: Reproduciendo directamente URL de 179.51.136.19 (sin proxy Node.js): ${originalUrl}`);
      return originalUrl;
    }

    // 4. URLs que necesitan pasar por el proxy de tu backend Node.js
    //    (canales M3U8 de otras fuentes, MKV/MP4 directos de Dropbox u otras fuentes no manejadas arriba)
    if (originalUrl.match(/\.(m3u8|mp4|mkv)(\?|$)/i)) {
      const encodedUrl = encodeURIComponent(originalUrl);
      const proxiedUrl = `${API_URL}/proxy?url=${encodedUrl}`;
      console.log(`   সিদ্ধান্ত: Reproduciendo vía proxy del backend Node.js: ${proxiedUrl} (Original: ${originalUrl})`);
      return proxiedUrl;
    }

    // 5. Otros tipos de URL (si los hubiera) - reproducir directamente por defecto
    console.log(`   সিদ্ধান্ত: Reproduciendo directamente (otro tipo de URL): ${originalUrl}`);
    return originalUrl;
  }

  const handleSelectVideo = (urlOriginal) => {
    if (!urlOriginal) {
      console.error("IPTVApp: Se intentó seleccionar un video con URL undefined!");
      setError("La URL del video seleccionado no es válida.");
      setSelectedVideoUrl(null);
      return;
    }
    console.log("IPTVApp: handleSelectVideo - urlOriginal seleccionada:", urlOriginal);
    setSelectedVideoUrl(urlOriginal);
  };

  const filteredChannels = Array.isArray(channels) ? channels.filter(c => {
    if (!c || !c.name) return false;
    const normalizedSearch = normalizeSearchText(search);
    const normalizedName = normalizeSearchText(c.name);
    return normalizedName.includes(normalizedSearch);
  }) : [];

  const filteredVideos = Array.isArray(videoFiles) ? videoFiles.filter(v => {
    if (!v || !v.title) return false;
    const normalizedSearch = normalizeSearchText(search);
    const normalizedTitle = normalizeSearchText(v.title);
    return normalizedTitle.includes(normalizedSearch);
  }) : [];

  if (!user) return <p className="p-4 text-center">Debes iniciar sesión para acceder.</p>;

  const finalUrlForPlayer = selectedVideoUrl ? getPlayableUrl(selectedVideoUrl) : null;
  if (selectedVideoUrl && finalUrlForPlayer) {
      console.log("IPTVApp: URL final para VideoPlayer:", finalUrlForPlayer);
  }

  // ... (el resto de tu JSX para renderizar, sin cambios)
  return (
    <div className="min-h-screen bg-black text-white">
      {finalUrlForPlayer ? (
        <div className="p-4">
          <button onClick={() => setSelectedVideoUrl(null)} className="mb-4 text-gray-400 hover:text-white">
            ← Volver
          </button>
          <VideoPlayer url={finalUrlForPlayer} />
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">
                {activeTab === 'live' ? 'TV en Vivo' : 'Películas'}
              </h1>
              <p className="text-gray-400">
                {activeTab === 'live'
                  ? 'Disfruta de tus canales favoritos.'
                  : 'Explora nuestra colección.'}
              </p>
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 font-medium ${activeTab === 'live' ? 'border-b-2 border-red-600 text-white' : 'text-gray-400'}`}
            >
              Live
            </button>
            <button
              onClick={() => setActiveTab('vod')}
              className={`px-4 py-2 font-medium ${activeTab === 'vod' ? 'border-b-2 border-red-600 text-white' : 'text-gray-400'}`}
            >
              VOD
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-12 w-12 border-t-2 border-red-600 rounded-full"></div>
            </div>
          ) : error ? (
            <p className="mt-4 text-center text-red-500">{error}</p>
          ) : activeTab === 'live' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredChannels.length > 0 ? filteredChannels.map(c => {
                if (!c || !c.url) {
                  console.warn("Canal sin URL:", c);
                  return null; 
                }
                return (
                  <div key={c.id || c._id} onClick={() => handleSelectVideo(c.url)} className="cursor-pointer rounded overflow-hidden">
                    <img src={c.customThumbnail || c.thumbnail || c.logo || '/placeholder-thumbnail.png'} alt={c.name || 'Canal sin nombre'} className="w-full h-32 object-cover" />
                    <p className="mt-2 truncate">{c.name || 'Canal sin nombre'}</p>
                  </div>
                );
              }) : <p>No hay canales disponibles.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredVideos.length > 0 ? filteredVideos.map(v => {
                 if (!v || !v.url) {
                  console.warn("Video sin URL:", v);
                  return null; 
                }
                return (
                  <div key={v._id} onClick={() => handleSelectVideo(v.url)} className="cursor-pointer rounded overflow-hidden">
                    <div className="aspect-video bg-gray-800 flex items-center justify-center rounded">
                      <img src={v.customThumbnail || v.thumbnail || v.logo || v.tmdbThumbnail || '/placeholder-thumbnail.png'} alt={v.title || 'Video sin título'} className="w-full h-full object-cover" />
                    </div>
                    <p className="mt-2 truncate">{v.title || 'Video sin título'}</p>
                  </div>
                );
              }) : <p>No hay películas disponibles.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
