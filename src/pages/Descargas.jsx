import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, Play, Trash2, HardDrive, Film, Tv, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import {
  getDownloads,
  deleteDownload,
  getOfflinePlaybackUrl,
  getTotalStorageUsed,
  isNativeStorage,
  getLicenseInfo,
  renewAllOfflineLicenses,
} from '../services/offlineStorage.js';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin.js';

export default function Descargas() {
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState([]);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'pelicula' | 'serie'
  const [isPlayingId, setIsPlayingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [totalStorage, setTotalStorage] = useState('0 MB');

  // Cargar lista de descargas y validar renovación
  const refreshDownloads = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      renewAllOfflineLicenses();
    }
    const list = getDownloads();
    setDownloads(list);
    setTotalStorage(getTotalStorageUsed());
  }, []);

  useEffect(() => {
    refreshDownloads();

    const handleUpdate = () => refreshDownloads();
    window.addEventListener('teamg:offline-update', handleUpdate);
    window.addEventListener('teamg:offline-progress', handleUpdate);

    return () => {
      window.removeEventListener('teamg:offline-update', handleUpdate);
      window.removeEventListener('teamg:offline-progress', handleUpdate);
    };
  }, [refreshDownloads]);

  // Reproducir contenido sin conexión
  const handlePlayOffline = async (item) => {
    const lic = getLicenseInfo(item);
    if (lic.isExpired && typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('⚠️ Licencia Offline Caducada (30 días sin conexión)\n\nPara proteger los derechos del contenido, conecta tu dispositivo a internet para renovar el período de reproducción offline.');
      return;
    }

    try {
      setIsPlayingId(item.id);
      const playbackUrl = await getOfflinePlaybackUrl(item.id);

      console.log(`[Modo Offline] Reproduciendo localmente (${item.storageType}):`, playbackUrl);

      if (isNativeStorage() && VideoPlayerPlugin && typeof VideoPlayerPlugin.playVideo === 'function') {
        await VideoPlayerPlugin.playVideo({
          url: playbackUrl,
          title: item.title,
          isLiveTV: false,
          contentType: item.tipo === 'pelicula' ? 'movies' : 'series',
        });
      } else {
        // En navegador web o reproductor integrado
        const videoWindow = window.open('', '_blank');
        if (videoWindow) {
          videoWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${item.title} - TeamG Play Modo Offline</title>
                <style>
                  body { margin:0; background:#000; display:flex; align-items:center; justify-content:center; height:100vh; }
                  video { width:100%; height:100%; max-height:100vh; outline:none; }
                </style>
              </head>
              <body>
                <video src="${playbackUrl}" controls autoplay></video>
              </body>
            </html>
          `);
        }
      }
    } catch (err) {
      console.error('[Modo Offline] Error al reproducir:', err);
      alert('Error al reproducir el archivo sin conexión: ' + (err.message || err));
    } finally {
      setIsPlayingId(null);
    }
  };

  // Confirmar y eliminar contenido guardado
  const handleDelete = async (id) => {
    await deleteDownload(id);
    setDeleteConfirmId(null);
    refreshDownloads();
  };

  // Filtrar según pestaña seleccionada
  const filteredDownloads = downloads.filter((item) => {
    if (activeTab === 'pelicula') return item.tipo === 'pelicula';
    if (activeTab === 'serie') return item.tipo !== 'pelicula';
    return true;
  });

  const peliculasCount = downloads.filter((i) => i.tipo === 'pelicula').length;
  const seriesCount = downloads.filter((i) => i.tipo !== 'pelicula').length;

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[#07090f]">
      {/* Fondo ambiental */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-fuchsia-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07090f]/80 via-[#07090f]/95 to-[#07090f]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        {/* HEADER / TITULO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold rounded-full mb-3 tracking-wide backdrop-blur-md">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Modo Offline</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Modo Offline
            </h1>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Disfruta de tus películas, series y contenido guardado sin conexión a internet ni consumo de datos móviles.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold rounded-xl backdrop-blur-md mt-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Licencia offline: <strong>30 días válidos</strong>. Se renueva automáticamente cada vez que conectas a internet.</span>
            </div>
          </div>

          {/* INDICADOR DE ESPACIO OCUPADO */}
          <div className="flex items-center gap-3.5 bg-white/[0.03] backdrop-blur-xl border border-white/10 px-5 py-3.5 rounded-2xl shadow-xl">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/25">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Espacio utilizado</p>
              <p className="text-lg font-black text-white tracking-tight">{totalStorage}</p>
            </div>
          </div>
        </div>

        {/* BANNER INFORMATIVO: MODO OFFLINE EN MÚSICA */}
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-fuchsia-950/40 via-purple-950/30 to-black/60 border border-fuchsia-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/30 text-fuchsia-300 flex items-center justify-center shrink-0">
              <span className="text-lg">🎵</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                ¿Buscas tu música guardada sin conexión?
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  TeamG Music ♪
                </span>
              </h4>
              <p className="text-xs text-gray-300 mt-0.5">
                Tus canciones y playlists descargadas están disponibles de forma instantánea en la sección exclusiva de música.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/musica')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(217,70,239,0.35)] shrink-0 self-start sm:self-auto"
          >
            Abrir TeamG Music ♪
          </button>
        </div>

        {/* PESTAÑAS DE FILTRO */}
        {downloads.length > 0 && (
          <div className="flex items-center bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-1.5 gap-1.5 w-max mb-8 shadow-inner">
            <button
              onClick={() => setActiveTab('todos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'todos'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_4px_15px_rgba(168,85,247,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos ({downloads.length})
            </button>
            <button
              onClick={() => setActiveTab('pelicula')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'pelicula'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_4px_15px_rgba(168,85,247,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Películas ({peliculasCount})
            </button>
            <button
              onClick={() => setActiveTab('serie')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'serie'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_4px_15px_rgba(168,85,247,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              Series ({seriesCount})
            </button>
          </div>
        )}

        {/* LISTADO DE CONTENIDOS GUARDADOS */}
        {downloads.length === 0 ? (
          <div className="py-20 text-center bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl max-w-lg mx-auto p-8">
            <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
              <WifiOff className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No tienes películas o series guardadas</h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-6">
              Abre los detalles de cualquier película o episodio y pulsa <strong>"Guardar en Modo Offline"</strong> para disfrutarlo sin internet ni gastar tus datos en cualquier momento.
            </p>
            <button
              onClick={() => navigate('/peliculas')}
              className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-[0_4px_20px_rgba(217,70,239,0.35)]"
            >
              Explorar Catálogo VOD
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredDownloads.map((item) => {
              const lic = getLicenseInfo(item);
              return (
                <div
                  key={item.id}
                  className={`bg-white/[0.03] backdrop-blur-md rounded-2xl overflow-hidden border ${lic.isExpired ? 'border-red-500/40 hover:border-red-500/70' : 'border-white/10 hover:border-fuchsia-500/40'} flex flex-col justify-between transition-all duration-300 shadow-xl group hover:-translate-y-1`}
                >
                  <div className="relative aspect-[2/3] bg-gray-950 overflow-hidden">
                    <img
                      src={item.poster || '/img/placeholder-thumbnail.png'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => { e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
                    />

                    {/* BADGE OFFLINE */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow border bg-emerald-600/90 text-white border-emerald-400/30 flex items-center gap-1">
                        <WifiOff className="w-2.5 h-2.5" /> Offline
                      </span>
                    </div>

                    {/* BADGE LICENCIA 30 DÍAS */}
                    <div className="absolute top-2.5 right-2.5">
                      {lic.isExpired ? (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow border bg-red-600/90 text-white border-red-400/30 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Expirado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold backdrop-blur-md shadow border bg-black/75 text-purple-200 border-white/15 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-fuchsia-400" /> {lic.daysRemaining}d
                        </span>
                      )}
                    </div>

                    {/* TAMAÑO DEL ARCHIVO */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-purple-300 border border-white/10 shadow">
                      {item.sizeFormatted}
                    </div>
                  </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white line-clamp-1 mb-0.5" title={item.title}>
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-3">
                      {item.episodeNumber ? `T${item.seasonNumber || 1} E${item.episodeNumber}` : item.year || 'Película'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePlayOffline(item)}
                      disabled={isPlayingId === item.id}
                      className={`flex-1 ${lic.isExpired ? 'bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30' : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-[0_4px_15px_rgba(217,70,239,0.3)]'} active:scale-95 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5`}
                    >
                      {lic.isExpired ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Renovar Licencia</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isPlayingId === item.id ? 'Abriendo...' : 'Reproducir'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl transition"
                      title="Eliminar del Modo Offline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0b0f19] border border-white/15 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">¿Eliminar del Modo Offline?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                El archivo se eliminará del almacenamiento local de tu dispositivo. Podrás volver a guardarlo cuando tengas conexión a internet.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition shadow-[0_4px_15px_rgba(220,38,38,0.4)]"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
