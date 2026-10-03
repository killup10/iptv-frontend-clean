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
  if (typeof lrcText !== 'string' || !lrcText) return null;
  const offset = Number(lrcText.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
  const result = [];
  for (const line of lrcText.split('\n')) {
    const stamps = [...line.matchAll(/\[(\d+):(\d{2}(?:\.\d{1,3})?)\]/g)];
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    // Empty lines mark instrumental passages and must clear the previous lyric.
    for (const stamp of stamps) result.push({ time: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + offset), text });
  }
  result.sort((a, b) => a.time - b.time);
  return result.length ? result : null;
}

// Consulta de letras en tiempo real a LRCLIB (0% consumo de backend Render / API pública gratuita)
async function fetchLyricsFromLrcLib(artist, title, trackDuration = 0) {
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
        const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matching = results.filter(r => normalize(r.artistName) === normalize(cleanArtist) && normalize(r.trackName) === normalize(cleanTitle));
        matching.sort((a, b) => {
          const score = r => (r.syncedLyrics ? 0 : 1000) + (trackDuration > 0 ? Math.abs((r.duration || 0) - trackDuration) : 0);
          return score(a) - score(b);
        });
        const found = matching[0];
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

function PlayerAction({ icon: Icon, label, active = false, onClick, disabled = false, busy = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active}
    className="group flex min-w-0 flex-col items-center gap-2 py-1 text-[10px] font-medium text-white/65 transition active:scale-95 disabled:opacity-50">
    <span className={`grid h-11 w-11 place-items-center rounded-full transition duration-200 ${active ? 'bg-fuchsia-400 text-[#170d20] shadow-[0_4px_16px_rgba(217,70,239,0.22)]' : 'bg-white/10 text-white/90 group-hover:bg-white/20'}`}>
      <Icon className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} strokeWidth={1.8} />
    </span>
    <span className={`w-full truncate text-center ${active ? 'text-fuchsia-200' : ''}`}>{label}</span>
  </button>;
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
    handlePlaybackError,
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
    officialVideoPlayerRef,
    seekPendingRef,
    playIntentRef,
    setVideoPlaybackActive,
    videoPlaybackActive,
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
  const videoPlayerRef = officialVideoPlayerRef;
  const [officialVideo, setOfficialVideo] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [largeVideo, setLargeVideo] = useState(false);
  const requestedVideoTrackRef = useRef(null);
  const playbackTimeRef = useRef(currentTime);
  playbackTimeRef.current = currentTime;
  const [gestureOffset, setGestureOffset] = useState({ x: 0, y: 0 });
  const [gestureAnimating, setGestureAnimating] = useState(false);
  const gestureTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(gestureTimerRef.current), []);
  useEffect(() => {
    setVideoPlaybackActive(Boolean(isVideoMode && officialVideo && !videoError && isExpandedPlayer));
  }, [isVideoMode, officialVideo, videoError, isExpandedPlayer, setVideoPlaybackActive]);
  useEffect(() => () => setVideoPlaybackActive(false), [setVideoPlaybackActive]);
  useEffect(() => {
    requestedVideoTrackRef.current = currentTrack?.id;
    setOfficialVideo(null);
    setIsVideoMode(false);
    setVideoError('');
    setLargeVideo(false);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (isPremium && currentTrack?.artist && !currentTrack.isRadio) {
      musicService.getArtistDetails(currentTrack.artist).catch(() => {});
    }
  }, [currentTrack?.artist, currentTrack?.isRadio, isPremium]);

  // Efecto: Cargar letra oficial cuando cambia la canción (0% consumo en Render)
  useEffect(() => {
    if (!currentTrack || currentTrack.isRadio) {
      setLyricsData(null);
      return;
    }
    let cancelled = false;
    setLyricsData(null);
    setIsLoadingLyrics(true);
    fetchLyricsFromLrcLib(currentTrack.artist, currentTrack.title, currentTrack.fullDuration || currentTrack.duration).then((res) => {
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

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setIsVideoMode(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Atajos de teclado para PC (Esc, Espacio, Flechas)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'Escape' && isExpandedPlayer) {
        setIsExpandedPlayer(false);
      } else if (e.code === 'Space' && isExpandedPlayer) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        nextTrack();
      } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        prevTrack();
      } else if (e.key === 'ArrowRight' && isExpandedPlayer) {
        e.preventDefault();
        seekTo(Math.min((duration || currentTrack?.fullDuration || 210), currentTime + 5));
      } else if (e.key === 'ArrowLeft' && isExpandedPlayer) {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpandedPlayer, togglePlay, nextTrack, prevTrack, seekTo, currentTime, duration, currentTrack?.fullDuration]);

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
      } else window.dispatchEvent(new CustomEvent('teamg:open-artist', {
        detail: { name: artistName, id: artistId }
      }));
    }
  };

  const handleToggleVideoMode = async () => {
    if (!currentTrack || videoLoading) return;
    if (isVideoMode) { setIsVideoMode(false); setLargeVideo(false); return; }
    setVideoError('');
    setVideoLoading(true);
    const id = currentTrack.id;
    const video = officialVideo || await musicService.getOfficialVideo(currentTrack.artist, currentTrack.title);
    if (requestedVideoTrackRef.current !== id) { setVideoLoading(false); return; }
    setVideoLoading(false);
    if (!video) { showGestureToast('No hay videoclip oficial disponible'); return; }
    setOfficialVideo(video);
    setShowLyrics(false);
    setIsVideoMode(true);
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current.time = 0;
    if (gestureAnimating || isSeeking || e.target.closest('button, input, [role="button"], a, select, textarea, .custom-scrollbar')) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current.time || e.touches.length !== 1) return;
    const x = e.touches[0].clientX - touchStartRef.current.x;
    const y = e.touches[0].clientY - touchStartRef.current.y;
    setGestureOffset(Math.abs(y) > Math.abs(x) ? { x: 0, y } : { x, y: 0 });
  };
  const animateTrackGesture = (direction, action) => {
    setGestureAnimating(true);
    setGestureOffset({ x: direction * window.innerWidth, y: 0 });
    gestureTimerRef.current = setTimeout(() => {
      action();
      setGestureOffset({ x: -direction * window.innerWidth, y: 0 });
      setGestureAnimating(false);
      gestureTimerRef.current = setTimeout(() => {
        setGestureAnimating(true);
        setGestureOffset({ x: 0, y: 0 });
        gestureTimerRef.current = setTimeout(() => setGestureAnimating(false), 220);
      }, 40);
    }, 180);
  };
  const handleTouchEnd = (e) => {
    setGestureOffset({ x: 0, y: 0 });
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    if (!touchStartRef.current.time) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = { x: 0, y: 0, time: 0 };

    // Permitir gestos de hasta 1200ms
    if (elapsed > 2500) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absY > 70 && absY > absX * 1.2) {
      if (deltaY > 0) {
        // Deslizar hacia abajo: Minimizar reproductor
        setIsExpandedPlayer(false);
        showGestureToast('Minimizado');
      } else {
        // Deslizar hacia arriba: Letra
        setIsVideoMode(false);
        setLargeVideo(false);
        setShowLyrics(true);
        showGestureToast('Letra');
      }
      return;
    }
    if (absX > 70 && absX > absY * 1.2 && !currentTrack.isRadio) {
      if (deltaX < 0) {
        if (queueIndex < queue.length - 1 || repeatMode === 'all' || isShuffle) animateTrackGesture(-1, nextTrack);
        showGestureToast('Siguiente canción');
      } else {
        if (queueIndex > 0 || repeatMode === 'all') animateTrackGesture(1, () => prevTrack(true));
        showGestureToast('Canción anterior');
      }
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
    setSeekVal(currentTime);
    setIsSeeking(true);
  };

  const handleSeekChange = (e) => {
    const value = parseFloat(e.target.value);
    setSeekVal(value);
    if (!isSeeking) seekTo(value);
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
          onPointerDown={e => {
            if (!e.isPrimary || e.target.closest('button, input, a, select, textarea, .custom-scrollbar')) return;
            handleTouchStart({ target: e.target, touches: [{ clientX: e.clientX, clientY: e.clientY }] });
            if (touchStartRef.current.time) e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => handleTouchMove({ touches: [{ clientX: e.clientX, clientY: e.clientY }] })}
          onPointerUp={e => handleTouchEnd({ changedTouches: [{ clientX: e.clientX, clientY: e.clientY }] })}
          onPointerCancel={() => { touchStartRef.current.time = 0; setGestureOffset({ x: 0, y: 0 }); }}
          style={{ touchAction: 'none', paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          className="fixed inset-0 z-[99999] bg-gradient-to-b from-[#251b30] via-[#120f18] to-[#09080c] flex flex-col justify-between pt-6 sm:pt-10 pb-8 sm:pb-12 px-5 sm:px-12 select-none overflow-hidden animate-in fade-in duration-300"
        >
          {/* Indicador de acción del gesto */}
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

            <div className="flex-1 flex flex-col items-center min-w-0">
              <span className="max-w-full text-[10px] sm:text-xs uppercase tracking-wide text-fuchsia-300/80 font-bold truncate">
                {currentTrack.isRadio ? 'Radio en Vivo' : 'Reproduciendo de TeamG Music'}
              </span>
              <span className="text-xs text-gray-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
                {currentTrack.album || currentTrack.artist || 'TeamG Play'}
              </span>
            </div>

            <div className="w-10 shrink-0" />
          </div>

          {/* Cuerpo Central: Carátula / Video / Letras + Título + Acciones */}
          <div className="flex flex-col items-center justify-center my-auto max-w-lg mx-auto w-full px-2 gap-4 sm:gap-6"
            style={{ touchAction: 'none', transform: largeVideo ? 'none' : `translate3d(${gestureOffset.x}px, ${gestureOffset.y}px, 0)`, transition: gestureAnimating ? 'transform 180ms ease-out' : 'none' }}
          >
            
            {/* Visualizador Central con soporte de gestos táctiles directos */}
            <div 
              className="relative group w-full flex items-center justify-center min-h-[220px] sm:min-h-[280px]"
            >
              {/* VISTA 1: MODO VIDEO MUSICAL OFICIAL */}
              {isVideoMode && officialVideo ? (
                <div id="teamg-music-video-player" className={largeVideo ? "teamg-music-video-container fixed inset-0 z-[100001] bg-black flex items-center justify-center" : "teamg-music-video-container relative w-full aspect-video max-h-[34vh] rounded-2xl overflow-hidden border border-white/15 bg-black"}>
                  <div className="absolute inset-0 pointer-events-none">
                  <ReactPlayer
                    key={officialVideo.id}
                    ref={videoPlayerRef}
                    url={`https://www.youtube.com/watch?v=${officialVideo.id}`}
                    playing={isPlaying && !videoError}
                    volume={isMuted ? 0 : volume}
                    controls={false}
                    width="100%"
                    height="100%"
                    onProgress={p => { if (!isSeeking && !videoError && Date.now() >= seekPendingRef.current) setCurrentTime(p.playedSeconds); }}
                    progressInterval={250}
                    onDuration={d => { if (d > 0) setDuration(d); }}
                    onEnded={nextTrack}
                    onError={error => { const code = Number(error?.data ?? error); setVideoError(code === 101 || code === 150 ? 'El propietario no permite reproducir este videoclip aquí.' : 'No se pudo reproducir este videoclip dentro de la app.'); setLargeVideo(false); }}
                    onReady={(video) => video.seekTo(playbackTimeRef.current, 'seconds')}
                    config={{ youtube: { playerVars: { playsinline: 1, controls: 0 } } }}
                  />
                  </div>
                  <button type="button" onClick={() => setLargeVideo(v => !v)} aria-label={largeVideo ? 'Reducir video' : 'Ampliar video'} className="absolute right-3 top-3 z-10 p-3 rounded-xl bg-black/70 text-white">
                    {largeVideo ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                  {largeVideo && <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'} className="absolute bottom-8 left-1/2 -translate-x-1/2 p-4 bg-black/70 rounded-full text-white">{isPlaying ? <Pause /> : <Play />}</button>}
                  {videoError && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-[#100d17] text-sm text-gray-200">
                    <span>{videoError}</span>
                    <a href={`https://www.youtube.com/watch?v=${officialVideo.id}`} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-white/10">Abrir en YouTube</a>
                    <button type="button" onClick={() => setIsVideoMode(false)} className="px-4 py-2 rounded-lg bg-white/10">Volver al audio</button>
                  </div>}
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
                    className="relative w-64 h-64 max-h-[34vh] aspect-square sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl object-cover shadow-2xl border border-white/15 transition-transform duration-500 hover:scale-[1.02] pointer-events-none"
                  />
                </>
              )}
            </div>

            {/* Metadatos: Título, Artista y Pestañas */}
            <div className="w-full flex flex-col items-center text-center space-y-2">
              <div className="w-full">
                <h2 className="text-xl sm:text-3xl font-black text-white leading-tight break-words px-2" title={currentTrack.title}>
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
                      className="max-w-full inline-flex items-center gap-1.5 text-sm sm:text-lg font-bold text-gray-300 hover:text-fuchsia-300 hover:underline transition cursor-pointer"
                      title={`Ver discografía y álbumes de ${currentTrack.artist}`}
                    >
                      <span className="truncate">{currentTrack.artist}</span>

                    </button>
                  </div>
                )}
              </div>

              {/* Compact icon controls with clear active states and a single visual hierarchy. */}
              <div className="grid grid-cols-6 gap-1 w-full max-w-md pt-3" data-testid="music-actions">
                <PlayerAction icon={Disc3} label="Artista" onClick={handleGoToArtist} />
                <PlayerAction icon={Heart} label={isFav ? 'Guardada' : 'Guardar'} active={isFav} onClick={() => toggleFavorite(currentTrack)} />
                <PlayerAction icon={Mic2} label="Letra" active={showLyrics} onClick={() => { setShowLyrics(v => !v); setIsVideoMode(false); setLargeVideo(false); }} disabled={currentTrack.isRadio} />
                <PlayerAction icon={videoLoading ? Loader2 : Video} label={videoLoading ? 'Buscando' : isVideoMode ? 'Audio' : 'Videoclip'} active={isVideoMode} onClick={handleToggleVideoMode} disabled={currentTrack.isRadio || videoLoading} busy={videoLoading} />
                <PlayerAction icon={ListPlus} label="Playlist" onClick={() => openAddToPlaylistModal(currentTrack)} disabled={currentTrack.isRadio} />
                <PlayerAction icon={isDownloaded ? Check : isDownloading ? Loader2 : Download} label={isDownloaded ? 'Offline' : isDownloading ? `${dlStatus?.progress || 0}%` : 'Descargar'} active={isDownloaded} busy={isDownloading} disabled={currentTrack.isRadio || isDownloading} onClick={() => isDownloaded ? deleteOfflineTrack(currentTrack.id) : downloadTrack(currentTrack)} />
              </div>

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
      {currentTrack?.youtubeId && playbackMode === 'youtube' && !videoPlaybackActive && (
        <div 
          className="fixed bottom-0 right-0 w-[300px] h-[200px] overflow-hidden pointer-events-none z-[10] opacity-5"
          aria-hidden="true"
        >
          <ReactPlayer
            key={currentTrack.id}
            ref={ytPlayerRef}
            onReady={p => p.seekTo(playbackTimeRef.current, 'seconds')}
            url={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            controls={false}
            width="100%"
            height="100%"
            onPlay={() => {
              console.log('[ReactPlayer] ✓ YouTube reproduciendo canción completa');
              if (!playIntentRef.current) return;
              setIsPlaying(true);
              if (audioRef?.current && !audioRef.current.paused) {
                audioRef.current.pause();
              }
            }}
            onPause={() => { /* Source changes and buffering preserve play intent. */ }}
            onEnded={nextTrack}
            progressInterval={250}
            onProgress={(progress) => {
              if (!isSeeking && Date.now() >= seekPendingRef.current && progress.playedSeconds !== undefined) {
                setCurrentTime(progress.playedSeconds);
              }
            }}
            onDuration={(dur) => {
              if (dur && dur > 0) setDuration(dur);
            }}
            onError={(err) => {
              console.warn('[MusicPlayer] No se pudo reproducir la canción completa:', err);
              handlePlaybackError();
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
