// src/components/music/GlobalMusicPlayer.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Heart, 
  Maximize2, 
  Minimize2, 
  Music, 
  Radio, 
  ListMusic, 
  ListPlus,
  X,
  Loader2,
  Check,
  Download,
  DownloadCloud,
  Disc3,
  ChevronDown,
  Video,
  Mic2
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { isPremiumUser } from '../../utils/planAccess.js';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactPlayer from 'react-player/youtube';
import AddToPlaylistModal from './AddToPlaylistModal.jsx';
import { musicService } from '../../services/musicService.js';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Parser de letras sincronizadas formato LRC [mm:ss.xx]
function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return null;
  const lines = lrcText.split('\n');
  const result = [];
  const regex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;

  for (const line of lines) {
    const match = regex.exec(line.trim());
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseFloat(match[2]);
      const time = mins * 60 + secs;
      const text = match[3].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result.length > 0 ? result : null;
}

// Consulta de letras en tiempo real a LRCLIB (0% consumo de backend Render / API pública gratuita)
async function fetchLyricsFromLrcLib(artist, title) {
  if (!artist || !title) return null;
  const cleanTitle = title
    .replace(/\s*[\(\[](feat|ft|with|remix|version|remastered|deluxe|official|video)[\s\S]*?[\)\]]/gi, '')
    .trim();
  const cleanArtist = artist.split(/[,&]|\bfeat\.?|\bft\.?/i)[0].trim();

  // 1. Intento por parámetros exactos
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.syncedLyrics || data.plainLyrics)) {
        return {
          syncedLyrics: parseLrc(data.syncedLyrics),
          plainLyrics: data.plainLyrics || '',
          isSynced: Boolean(data.syncedLyrics)
        };
      }
    }
  } catch {}

  // 2. Búsqueda libre fallback
  try {
    const query = `${cleanArtist} ${cleanTitle}`;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const found = results.find(r => r.syncedLyrics) || results[0];
        if (found && (found.syncedLyrics || found.plainLyrics)) {
          return {
            syncedLyrics: parseLrc(found.syncedLyrics),
            plainLyrics: found.plainLyrics || '',
            isSynced: Boolean(found.syncedLyrics)
          };
        }
      }
    }
  } catch {}

  return null;
}

export default function GlobalMusicPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentTrack,
    isPlaying,
    isLoadingAudio,
    audioQuality,
    playbackMode,
    fallbackToPreview,
    volume,
    isMuted,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isExpandedPlayer,
    setIsExpandedPlayer,
    queue,
    queueIndex,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    isFavorite,
    openAddToPlaylistModal,
    playTrack,
    ytPlayerRef,
    audioRef,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    isTrackDownloaded,
    downloadTrack,
    deleteOfflineTrack,
    activeDownloadsMap
  } = useMusic();

  const { user } = useAuth();
  const isPremium = isPremiumUser(user);

  // Estados de control - TODOS LOS HOOKS DECLARADOS INCONDICIONALMENTE AL INICIO
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [gestureToast, setGestureToast] = useState('');
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsData, setLyricsData] = useState(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // Referencias para gestos y sincronización
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const toastTimeoutRef = useRef(null);
  const lyricsContainerRef = useRef(null);

  // Efecto: Cargar letra oficial cuando cambia la canción (0% consumo en Render)
  useEffect(() => {
    if (!currentTrack || currentTrack.isRadio) {
      setLyricsData(null);
      return;
    }
    let cancelled = false;
    setIsLoadingLyrics(true);
    fetchLyricsFromLrcLib(currentTrack.artist, currentTrack.title).then((res) => {
      if (!cancelled) {
        setLyricsData(res);
        setIsLoadingLyrics(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLyricsData(null);
        setIsLoadingLyrics(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.artist, currentTrack?.title, currentTrack?.isRadio]);

  // Efecto: Si el usuario apaga la pantalla o minimiza en modo video, conmutar a audio nativo de fondo
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isVideoMode) {
        console.log('[GlobalMusicPlayer] Pantalla apagada en modo video -> Volviendo a audio nativo de fondo');
        setIsVideoMode(false);
        if (audioRef.current) {
          audioRef.current.currentTime = currentTime;
          audioRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVideoMode, currentTime, audioRef]);

  // Cálculo de línea de letra activa según currentTime
  const activeLyricIdx = useMemo(() => {
    if (!lyricsData?.syncedLyrics || lyricsData.syncedLyrics.length === 0) return -1;
    for (let i = lyricsData.syncedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsData.syncedLyrics[i].time) {
        return i;
      }
    }
    return 0;
  }, [currentTime, lyricsData]);

  // Auto-scroll suave de letra sincronizada
  useEffect(() => {
    if (!showLyrics || !lyricsContainerRef.current) return;
    const activeEl = lyricsContainerRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLyricIdx, showLyrics]);

  // RETORNO TEMPRANO SEGURO: Después de que todos los hooks se registraron
  if (!isPremium || !currentTrack) return null;

  const showGestureToast = (msg) => {
    setGestureToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setGestureToast('');
    }, 1300);
  };

  const handleGoToArtist = (e) => {
    if (e) e.stopPropagation();
    if (isExpandedPlayer) setIsExpandedPlayer(false);

    const artistName = currentTrack?.artist;
    const artistId = currentTrack?.artistId;
    if (!artistName) return;

    const pathname = location?.pathname || '';
    const isAlreadyOnMusic = pathname.includes('musica') || pathname.includes('music');

    if (!isAlreadyOnMusic) {
      navigate('/musica', {
        state: {
          openArtist: artistName,
          openArtistId: artistId
        }
      });
    }

    if (typeof window !== 'undefined') {
      if (typeof window.__teamgOpenArtist === 'function') {
        window.__teamgOpenArtist(artistName, artistId);
      }
      window.dispatchEvent(new CustomEvent('teamg:open-artist', {
        detail: { name: artistName, id: artistId }
      }));
    }
  };

  const handleToggleVideoMode = async () => {
    if (!currentTrack) return;
    // Si no tiene youtubeId resuelto aún, buscarlo en vivo
    if (!currentTrack.youtubeId && !isVideoMode) {
      showGestureToast('🔍 Buscando video oficial...');
      try {
        const yid = await musicService.getYouTubeId(currentTrack.artist, currentTrack.title);
        if (yid) {
          currentTrack.youtubeId = yid;
        } else {
          showGestureToast('Video oficial no disponible');
          return;
        }
      } catch {
        showGestureToast('Video oficial no disponible');
        return;
      }
    }

    if (!isVideoMode) {
      setIsVideoMode(true);
      setShowLyrics(false);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      showGestureToast('🎬 Modo Video Oficial');
    } else {
      setIsVideoMode(false);
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.play().catch(() => {});
      }
      showGestureToast('🎵 Modo Audio');
    }
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    if (e.target.closest('button, input, [role="button"], a, select, textarea, .custom-scrollbar')) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    if (!touchStartRef.current.time) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = { x: 0, y: 0, time: 0 };

    // Permitir gestos de hasta 1200ms
    if (elapsed > 1200) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Gesto vertical dominante (umbral 40px)
    if (absY > 40 && absY > absX * 1.1) {
      if (deltaY > 0) {
        // Deslizar hacia abajo: siguiente canción
        if (!currentTrack.isRadio) {
          showGestureToast('⏭️ Siguiente canción');
          nextTrack();
        }
      } else {
        // Deslizar hacia arriba: canción anterior
        if (!currentTrack.isRadio) {
          showGestureToast('⏮️ Canción anterior');
          prevTrack();
        }
      }
      return;
    }

    // Gesto horizontal hacia la derecha: ver al artista tipo TikTok (umbral 40px)
    if (absX > 40 && absX > absY * 1.1 && deltaX > 0) {
      showGestureToast(`👤 ${currentTrack.artist || 'Discografía'}`);
      handleGoToArtist();
      return;
    }

    // Gesto horizontal hacia la izquierda: alternar letra de la canción
    if (absX > 40 && absX > absY * 1.1 && deltaX < 0) {
      setShowLyrics(prev => !prev);
      showGestureToast(!showLyrics ? '🎤 Letra' : '🎵 Carátula');
      return;
    }
  };

  const isFav = isFavorite(currentTrack.id);
  const isDownloaded = isTrackDownloaded(currentTrack.id);
  const dlStatus = activeDownloadsMap[currentTrack.id];
  const isDownloading = dlStatus?.status === 'downloading';
  const displayedTime = isSeeking ? seekVal : currentTime;
  const progressPercent = duration > 0 ? (displayedTime / duration) * 100 : 0;

  const VolumeIcon = isMuted || volume === 0 
    ? VolumeX 
    : volume < 0.5 
      ? Volume1 
      : Volume2;

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
  };

  const handleSeekChange = (e) => {
    setSeekVal(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e) => {
    const rawVal = e?.target?.value;
    const num = parseFloat(rawVal);
    const val = (!isNaN(num) && Number.isFinite(num)) ? num : seekVal;
    seekTo(val);
    setIsSeeking(false);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <>
      {/* BARRA INFERIOR / MINI-PLAYER ADAPTATIVO */}
      <div 
        className="fixed bottom-2 left-2 right-2 md:bottom-0 md:left-0 md:right-0 z-[99990] bg-[#0c0915]/95 backdrop-blur-2xl border border-white/10 md:border-b-0 md:border-x-0 md:border-t md:border-fuchsia-500/20 shadow-[0_10px_35px_rgba(0,0,0,0.85)] rounded-2xl md:rounded-none px-3 sm:px-6 py-2 transition-all duration-300"
      >
        {/* LÍNEA DE PROGRESO DISCRETA (EN MÓVIL: en el borde inferior de la píldora) */}
        {!currentTrack.isRadio && (
          <div className="md:hidden absolute bottom-0 left-2 right-2 h-[2.5px] bg-white/10 rounded-b-2xl overflow-hidden pointer-events-none">
            <div 
              className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* 1. INFO DE LA CANCIÓN / ARTISTA (Clic abre el reproductor completo) */}
          <div 
            onClick={() => setIsExpandedPlayer(true)}
            className="flex items-center gap-3 min-w-0 flex-1 md:w-1/4 md:flex-initial cursor-pointer group"
          >
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/10">
              <img 
                src={currentTrack.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
                alt={currentTrack.title} 
                className={`w-full h-full object-cover transition-transform duration-500 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
              {currentTrack.isRadio && (
                <div className="absolute top-0.5 left-0.5 bg-red-600 text-[8px] font-black text-white px-1 py-0.2 rounded flex items-center gap-1 shadow">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  FM
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-fuchsia-400 transition">
                {currentTrack.title}
              </h4>
              {currentTrack.isRadio ? (
                <p className="text-[11px] text-gray-400 truncate">
                  {currentTrack.artist}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleGoToArtist}
                  className="text-[11px] text-gray-400 hover:text-fuchsia-300 hover:underline truncate block text-left transition cursor-pointer"
                  title={`Ver discografía y álbumes de ${currentTrack.artist}`}
                >
                  {currentTrack.artist}
                </button>
              )}
            </div>

            {/* Acciones en Desktop */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(currentTrack);
                }}
                className={`p-1.5 rounded-full transition ${
                  isFav 
                    ? 'text-pink-500 hover:text-pink-400 scale-110' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title={isFav ? 'Quitar de Mis Me Gusta' : 'Guardar en Mis Me Gusta'}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500' : ''}`} />
              </button>

              {/* Botón Descarga Offline */}
              {!currentTrack.isRadio && (
                isDownloaded ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOfflineTrack(currentTrack.id);
                    }}
                    className="p-1.5 rounded-full text-emerald-400 hover:text-red-400 hover:bg-white/5 transition"
                    title="Canción descargada en tu dispositivo (Modo Offline). Toca para borrar archivo"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>
                ) : isDownloading ? (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full text-fuchsia-400"
                    title={`Descargando audio: ${dlStatus?.progress || 0}%`}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTrack(currentTrack);
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:text-fuchsia-400 hover:bg-white/5 transition"
                    title="Descargar para Modo Offline (escuchar sin internet)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )
              )}

              {!currentTrack.isRadio && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddToPlaylistModal(currentTrack);
                  }}
                  className="p-1.5 rounded-full text-gray-400 hover:text-fuchsia-400 transition"
                  title="Añadir a lista personalizada"
                >
                  <ListPlus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 2. CONTROLES CENTRALES (EN DESKTOP: Shuffle, Prev, Play, Next, Repeat + Barra completa) */}
          <div className="hidden md:flex flex-col items-center gap-1 flex-1 max-w-xl">
            <div className="flex items-center gap-5">
              <button
                onClick={toggleShuffle}
                className={`p-1.5 rounded-full transition ${
                  isShuffle ? 'text-fuchsia-400' : 'text-gray-400 hover:text-white'
                }`}
                title="Modo aleatorio"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={prevTrack}
                disabled={currentTrack.isRadio}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-40 transition"
                title="Pista anterior"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/25 hover:scale-105 active:scale-95 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                disabled={currentTrack.isRadio}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-40 transition"
                title="Siguiente pista"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-1.5 rounded-full transition ${
                  repeatMode !== 'off' ? 'text-fuchsia-400' : 'text-gray-400 hover:text-white'
                }`}
                title={`Repetir: ${repeatMode === 'all' ? 'Toda la cola' : repeatMode === 'one' ? 'Canción actual' : 'Desactivado'}`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Barra de progreso de tiempo o estado En Vivo en Desktop */}
            {currentTrack.isRadio ? (
              <div className="flex items-center gap-2 text-xs text-fuchsia-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Transmisión en vivo ({currentTrack.frequency || 'Streaming HD'})</span>
              </div>
            ) : (
              <div className="w-full flex items-center gap-2 text-[11px] text-gray-400">
                <span className="w-9 text-right font-mono">{formatTime(displayedTime)}</span>
                <div className="relative flex-1 flex items-center group">
                  <input
                    type="range"
                    min={0}
                    max={duration || currentTrack.fullDuration || currentTrack.duration || 210}
                    step={0.1}
                    value={displayedTime}
                    onMouseDown={handleSeekMouseDown}
                    onTouchStart={handleSeekMouseDown}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekMouseUp}
                    onTouchEnd={handleSeekMouseUp}
                    className="w-full h-1.5 bg-white/10 group-hover:bg-white/20 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #d946ef 0%, #a855f7 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%, rgba(255,255,255,0.15) 100%)`
                    }}
                  />
                </div>
                <span className="w-9 font-mono">{formatTime(duration || currentTrack.fullDuration || currentTrack.duration || 210)}</span>
              </div>
            )}
          </div>

          {/* 3. DERECHA: EN MÓVIL (Favorito + Play) | EN DESKTOP (Cola + Volumen + Expandir) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Solo Móvil: Botón Me Gusta */}
            <div className="md:hidden flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(currentTrack);
                }}
                className={`p-2 rounded-full transition active:scale-90 ${
                  isFav ? 'text-pink-500' : 'text-gray-400 hover:text-white'
                }`}
                title={isFav ? 'Quitar de Mis Me Gusta' : 'Guardar en Mis Me Gusta'}
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-pink-500' : ''}`} />
              </button>
            </div>

            {/* Solo Móvil: Botón Play/Pause grande y cómodo */}
            <div className="md:hidden flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/25 active:scale-95 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                )}
              </button>
            </div>

            {/* Solo Desktop: Cola, Volumen y Botón Expandir */}
            <div className="hidden md:flex items-center gap-3 w-48 justify-end">
              <button
                onClick={() => setShowQueueDrawer(prev => !prev)}
                className={`p-2 rounded-xl transition ${
                  showQueueDrawer ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lista de Reproducción"
              >
                <ListMusic className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 group">
                <button 
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white transition p-1"
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  <VolumeIcon className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
              </div>

              <button
                onClick={() => setIsExpandedPlayer(true)}
                className="text-gray-400 hover:text-white transition p-1.5 hover:bg-white/5 rounded-xl"
                title="Expandir reproductor"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* DRAWER LATERAL DE COLA DE REPRODUCCIÓN */}
      {showQueueDrawer && (
        <div className="fixed bottom-20 right-4 z-[99992] w-80 max-h-96 bg-[#120d20]/95 backdrop-blur-2xl border border-fuchsia-500/30 rounded-2xl shadow-2xl p-4 flex flex-col animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-fuchsia-400" />
              <h3 className="text-sm font-bold text-white">Lista de Reproducción ({queue.length})</h3>
            </div>
            <button
              onClick={() => setShowQueueDrawer(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {queue.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No hay canciones en la cola</p>
            ) : (
              queue.map((track, idx) => {
                const isSelected = track.id === currentTrack.id;
                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onClick={() => playTrack(track, queue)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition ${
                      isSelected 
                        ? 'bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-400/30 text-white' 
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <img 
                      src={track.cover} 
                      alt={track.title} 
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-fuchsia-300' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                    </div>
                    {isSelected && (
                      <div className="flex gap-0.5 items-end h-3">
                        <span className="w-0.5 h-3 bg-fuchsia-400 animate-pulse" />
                        <span className="w-0.5 h-2 bg-pink-400 animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-fuchsia-400 animate-pulse delay-150" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN / NOW PLAYING EXPANDIDO CON ENCUADRE PROFESIONAL Y GESTOS TÁCTILES */}
      {isExpandedPlayer && (
        <div 
          className="fixed inset-0 z-[99999] bg-gradient-to-b from-[#180e2b] via-[#0d0716] to-[#05020a] flex flex-col justify-between pt-6 sm:pt-10 pb-8 sm:pb-12 px-5 sm:px-12 select-none overflow-hidden animate-in fade-in duration-300"
        >
          {/* Toast flotante de retroalimentación de gestos (tipo TikTok / Spotify) */}
          {gestureToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-black/85 backdrop-blur-md border border-fuchsia-500/50 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <span>{gestureToast}</span>
            </div>
          )}

          {/* Header del Modal */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setIsExpandedPlayer(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer active:scale-90"
              title="Minimizar reproductor"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center min-w-0">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-fuchsia-300/80 font-bold truncate">
                {currentTrack.isRadio ? 'Radio en Vivo' : 'Reproduciendo de TeamG Music'}
              </span>
              <span className="text-xs text-gray-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
                {currentTrack.album || currentTrack.artist || 'TeamG Play'}
              </span>
            </div>

            {/* Toggle Modo Video (0% consumo de Render: stream directo de YouTube) */}
            {currentTrack.youtubeId && !currentTrack.isRadio ? (
              <button
                type="button"
                onClick={handleToggleVideoMode}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isVideoMode
                    ? 'bg-fuchsia-500 text-white border-fuchsia-400 shadow-lg shadow-fuchsia-500/30'
                    : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/15 hover:text-white'
                }`}
                title={isVideoMode ? 'Volver a carátula de audio' : 'Ver video musical oficial'}
              >
                <Video className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isVideoMode ? 'Audio' : 'Video'}</span>
              </button>
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>

          {/* Cuerpo Central: Carátula / Video / Letras + Título + Acciones */}
          <div className="flex flex-col items-center justify-center my-auto max-w-lg mx-auto w-full px-2 gap-4 sm:gap-6">
            
            {/* Visualizador Central con soporte de gestos táctiles directos */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
              className="relative group w-full flex items-center justify-center min-h-[220px] sm:min-h-[280px]"
            >
              {/* VISTA 1: MODO VIDEO MUSICAL OFICIAL */}
              {isVideoMode && currentTrack.youtubeId ? (
                <div id="teamg-music-video-player" className="teamg-music-video-container relative w-full aspect-video max-h-[34vh] rounded-3xl overflow-hidden shadow-2xl border border-fuchsia-500/40 bg-black">
                  <ReactPlayer
                    url={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                    playing={isPlaying}
                    volume={isMuted ? 0 : volume}
                    controls={true}
                    width="100%"
                    height="100%"
                    onReady={(player) => {
                      if (currentTime > 0) {
                        try { player.seekTo(currentTime, 'seconds'); } catch {}
                      }
                    }}
                    onPlay={() => {
                      setIsPlaying(true);
                      if (audioRef?.current && !audioRef.current.paused) {
                        audioRef.current.pause();
                      }
                    }}
                    onPause={() => setIsPlaying(false)}
                    onEnded={nextTrack}
                    progressInterval={250}
                    onProgress={(p) => {
                      if (!isSeeking && p.playedSeconds !== undefined) {
                        setCurrentTime(p.playedSeconds);
                      }
                    }}
                    onDuration={(dur) => {
                      if (dur && dur > 0) setDuration(dur);
                    }}
                    config={{
                      youtube: {
                        playerVars: {
                          autoplay: 1,
                          controls: 1,
                          modestbranding: 1,
                          playsinline: 1,
                          start: Math.floor(currentTime || 0)
                        }
                      }
                    }}
                  />
                </div>
              ) : showLyrics ? (
                /* VISTA 2: LETRA EN TIEMPO REAL (SINCRONIZADA O TEXTO PLANO) */
                <div 
                  ref={lyricsContainerRef}
                  className="relative w-full max-w-md h-64 sm:h-72 md:h-80 rounded-3xl overflow-y-auto px-4 py-6 bg-black/60 backdrop-blur-xl border border-fuchsia-500/30 shadow-2xl flex flex-col items-center text-center space-y-4 custom-scrollbar select-text"
                  style={{ touchAction: 'pan-y' }}
                >
                  <div className="sticky top-0 z-10 w-full pb-2 mb-2 border-b border-white/10 flex items-center justify-between text-xs text-fuchsia-300 font-bold bg-black/40 backdrop-blur-md px-2 rounded-lg">
                    <span className="flex items-center gap-1.5">
                      <Mic2 className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>{lyricsData?.isSynced ? 'Letra Sincronizada' : 'Letra Oficial'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLyrics(false)}
                      className="text-gray-400 hover:text-white p-1 rounded-md"
                      title="Volver a carátula"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isLoadingLyrics ? (
                    <div className="flex flex-col items-center justify-center my-auto text-gray-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
                      <span className="text-xs">Buscando letra oficial...</span>
                    </div>
                  ) : lyricsData?.syncedLyrics ? (
                    lyricsData.syncedLyrics.map((line, idx) => {
                      const isActive = idx === activeLyricIdx;
                      return (
                        <p
                          key={`lrc-${idx}`}
                          data-active={isActive ? 'true' : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            seekTo(line.time);
                          }}
                          className={`w-full py-1.5 px-3 rounded-xl transition-all duration-300 cursor-pointer font-bold ${
                            isActive
                              ? 'text-white text-base sm:text-lg scale-105 bg-fuchsia-500/25 border border-fuchsia-500/40 text-fuchsia-200 shadow-md'
                              : 'text-gray-400/80 hover:text-white text-xs sm:text-sm hover:bg-white/5'
                          }`}
                        >
                          {line.text}
                        </p>
                      );
                    })
                  ) : lyricsData?.plainLyrics ? (
                    <div className="whitespace-pre-line text-xs sm:text-sm text-gray-200 leading-relaxed font-medium px-2">
                      {lyricsData.plainLyrics}
                    </div>
                  ) : (
                    <div className="my-auto text-gray-400 text-xs flex flex-col items-center gap-2">
                      <Mic2 className="w-8 h-8 text-gray-600" />
                      <span>No se encontró la letra oficial de esta pista</span>
                    </div>
                  )}
                </div>
              ) : (
                /* VISTA 3: CARÁTULA HD CON GLOW AMBIENTAL */
                <>
                  <div className="absolute -inset-2 bg-gradient-to-r from-fuchsia-600/30 via-purple-600/30 to-pink-600/30 rounded-3xl blur-2xl opacity-60 animate-pulse pointer-events-none" />
                  <img 
                    src={currentTrack.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80'} 
                    alt={currentTrack.title}
                    className="relative w-56 h-56 max-h-[30vh] aspect-square sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl object-cover shadow-2xl border border-white/15 transition-transform duration-500 hover:scale-[1.02] pointer-events-none"
                  />
                </>
              )}
            </div>

            {/* Metadatos: Título, Artista y Pestañas */}
            <div className="w-full flex flex-col items-center text-center space-y-2">
              <div className="w-full">
                <h2 className="text-xl sm:text-3xl font-black text-white leading-tight truncate px-2" title={currentTrack.title}>
                  {currentTrack.title}
                </h2>

                {currentTrack.isRadio ? (
                  <p className="text-sm sm:text-base text-gray-300 font-medium mt-1">
                    {currentTrack.artist}
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleGoToArtist}
                      className="inline-flex items-center gap-1.5 text-sm sm:text-lg font-bold text-gray-300 hover:text-fuchsia-300 hover:underline transition cursor-pointer"
                      title={`Ver discografía y álbumes de ${currentTrack.artist}`}
                    >
                      <span>{currentTrack.artist}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/30 transition">
                        <Disc3 className="w-3 h-3 text-fuchsia-400" />
                        Discografía
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Barra de Acciones Elegante y Compacta */}
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                {/* Me Gusta */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(currentTrack);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer active:scale-95 ${
                    isFav 
                      ? 'border-pink-500/50 bg-pink-500/20 text-pink-300' 
                      : 'border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                  <span>{isFav ? 'Favorita' : 'Guardar'}</span>
                </button>

                {/* Letra de la canción (0% servidor Render) */}
                {!currentTrack.isRadio && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLyrics(prev => !prev);
                      if (isVideoMode) setIsVideoMode(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer active:scale-95 ${
                      showLyrics 
                        ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-300 shadow-md shadow-fuchsia-500/20' 
                        : 'border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={showLyrics ? 'Ocultar letra' : 'Ver letra oficial'}
                  >
                    <Mic2 className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Letra</span>
                    {lyricsData?.isSynced && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-fuchsia-500 text-white rounded-full font-bold">SYNC</span>
                    )}
                  </button>
                )}

                {/* Botón Video Musical */}
                {!currentTrack.isRadio && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVideoMode();
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer active:scale-95 ${
                      isVideoMode
                        ? 'border-fuchsia-400 bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={isVideoMode ? 'Volver a modo audio' : 'Ver video musical oficial'}
                  >
                    <Video className="w-3.5 h-3.5 text-fuchsia-300" />
                    <span>{isVideoMode ? 'Audio' : 'Video'}</span>
                  </button>
                )}

                {/* Añadir a Playlist */}
                {!currentTrack.isRadio && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddToPlaylistModal(currentTrack);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 text-xs font-semibold transition cursor-pointer active:scale-95"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Playlist</span>
                  </button>
                )}

                {/* Modo Offline */}
                {!currentTrack.isRadio && (
                  isDownloaded ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOfflineTrack(currentTrack.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 text-xs font-semibold transition cursor-pointer active:scale-95"
                      title="Descargada en Modo Offline. Toca para borrar archivo"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
                      <span>Offline</span>
                    </button>
                  ) : isDownloading ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300 text-xs font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-400" />
                      <span>{dlStatus?.progress || 0}%</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTrack(currentTrack);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-fuchsia-300 hover:bg-white/10 text-xs font-semibold transition cursor-pointer active:scale-95"
                      title="Descargar para escuchar sin internet (Modo Offline)"
                    >
                      <Download className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>Descargar</span>
                    </button>
                  )
                )}
              </div>

              {/* Guía visual sutil de gestos táctiles */}
              <p className="text-[11px] text-gray-400/80 font-medium tracking-wide pt-1">
                Desliza <span className="text-fuchsia-300 font-bold">↓</span> siguiente • <span className="text-fuchsia-300 font-bold">↑</span> anterior • <span className="text-fuchsia-300 font-bold">→</span> ver artista • <span className="text-fuchsia-300 font-bold">←</span> letra
              </p>
            </div>
          </div>

          {/* Controles Expandidos Inferiores con Espaciado Generoso Anticolisión */}
          <div className="max-w-xl mx-auto w-full flex flex-col gap-3 pb-2 sm:pb-0">
            {/* Barra de progreso */}
            {!currentTrack.isRadio && (
              <div className="w-full flex items-center gap-3 text-xs text-gray-400">
                <span className="w-10 text-right font-mono">{formatTime(displayedTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack.fullDuration || currentTrack.duration || 210}
                  step={0.1}
                  value={displayedTime}
                  onMouseDown={handleSeekMouseDown}
                  onTouchStart={handleSeekMouseDown}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  onTouchEnd={handleSeekMouseUp}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
                <span className="w-10 font-mono">{formatTime(duration || currentTrack.fullDuration || currentTrack.duration || 210)}</span>
              </div>
            )}

            {/* Botones de control con tamaño ergonómico */}
            <div className="flex items-center justify-between sm:justify-center sm:gap-10 px-4 sm:px-0">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-2 transition cursor-pointer active:scale-90 ${isShuffle ? 'text-fuchsia-400' : 'text-gray-500 hover:text-white'}`}
                title="Modo aleatorio"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={prevTrack}
                disabled={currentTrack.isRadio}
                className="p-2 text-gray-300 hover:text-white disabled:opacity-30 transition cursor-pointer active:scale-90"
                title="Canción anterior"
              >
                <SkipBack className="w-7 h-7" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-fuchsia-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-white text-white" />
                ) : (
                  <Play className="w-7 h-7 fill-white text-white ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                disabled={currentTrack.isRadio}
                className="p-2 text-gray-300 hover:text-white disabled:opacity-30 transition cursor-pointer active:scale-90"
                title="Siguiente canción"
              >
                <SkipForward className="w-7 h-7" />
              </button>

              <button
                type="button"
                onClick={toggleRepeat}
                className={`p-2 transition cursor-pointer active:scale-90 ${repeatMode !== 'off' ? 'text-fuchsia-400' : 'text-gray-500 hover:text-white'}`}
                title={repeatMode === 'one' ? 'Repitiendo una canción' : 'Repetir'}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPRODUCTOR DE YOUTUBE (SOLO RESPALDO: cuando no hay stream directo).
          El motor principal es el <audio> nativo con mp3/m4a directo. */}
      {currentTrack?.youtubeId && playbackMode === 'youtube' && (
        <div 
          className="fixed bottom-0 right-0 w-[300px] h-[200px] overflow-hidden pointer-events-none z-[10] opacity-5"
          aria-hidden="true"
        >
          <ReactPlayer
            ref={ytPlayerRef}
            url={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            controls={false}
            width="100%"
            height="100%"
            onPlay={() => {
              console.log('[ReactPlayer] ✓ YouTube reproduciendo canción completa');
              setIsPlaying(true);
              if (audioRef?.current && !audioRef.current.paused) {
                audioRef.current.pause();
              }
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={nextTrack}
            progressInterval={250}
            onProgress={(progress) => {
              if (!isSeeking && progress.playedSeconds !== undefined) {
                setCurrentTime(progress.playedSeconds);
              }
            }}
            onDuration={(dur) => {
              if (dur && dur > 0) setDuration(dur);
            }}
            onError={(err) => {
              console.warn('[ReactPlayer] Iframe YouTube falló, volviendo a preview 30s:', err);
              fallbackToPreview();
            }}
            config={{
              youtube: {
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  disablekb: 1,
                  fs: 0,
                  modestbranding: 1,
                  playsinline: 1,
                  rel: 0,
                  origin: (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://www.youtube.com'
                }
              }
            }}
          />
        </div>
      )}

      {/* Modal global para añadir canción a listas personalizadas */}
      <AddToPlaylistModal />
    </>
  );
}
