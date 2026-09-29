// src/context/MusicContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { backgroundPlaybackService } from '../services/backgroundPlayback.js';
import { musicService } from '../services/musicService.js';

const MusicContext = createContext(null);

const STORAGE_FAVORITES_KEY = 'teamg_music_favorites';

export function MusicProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  // Calidad de audio actual: 'radio' | 'preview' | 'loading-full' | 'full' | 'preview-fallback'
  const [audioQuality, setAudioQuality] = useState('preview');
  // Motor de reproducción de la versión completa:
  // 'native'  = stream mp3/m4a directo en <audio> (progreso/seek reales, sin bloqueos de embed)
  // 'youtube' = iframe YouTube como respaldo (videos sin stream directo disponible)
  const [playbackMode, setPlaybackMode] = useState('native');
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const currentTrackRef = useRef(currentTrack);
  const repeatModeRef = useRef(repeatMode);
  const playbackModeRef = useRef(playbackMode);
  // URL del stream completo actualmente asignado al <audio> (para detectar su fallo)
  const fullStreamRef = useRef(null);
  const handleNextRef = useRef(null);
  const handlePrevRef = useRef(null);
  const togglePlayRef = useRef(null);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  // Inicializar elemento de audio nativo UNA SOLA VEZ al montar
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoadingAudio(true);
    const onPlaying = () => setIsLoadingAudio(false);
    const onCanPlay = () => setIsLoadingAudio(false);

    const onTimeUpdate = () => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      if (audio && !audio.paused) {
        setDuration(audio.duration || 30);
      }
      setIsLoadingAudio(false);
    };

    const onError = (e) => {
      console.warn('[MusicContext] Error en audio nativo:', e);
      setIsLoadingAudio(false);
      // Si falló el STREAM COMPLETO (no el preview): delegar al iframe YouTube
      const audioEl = audioRef.current;
      if (
        audioEl &&
        fullStreamRef.current &&
        audioEl.src === fullStreamRef.current &&
        currentTrackRef.current?.youtubeId
      ) {
        console.warn('[MusicContext] Stream completo falló, cambiando a iframe YouTube');
        fullStreamRef.current = null;
        setPlaybackMode('youtube');
      }
    };

    const onEnded = () => {
      const track = currentTrackRef.current;
      // En modo YouTube el iframe maneja el fin (su onEnded avanza solo).
      if (track?.youtubeId && playbackModeRef.current === 'youtube') return;
      // Preview de 30s terminado pero la completa viene en camino: NO saltar.
      if (track?.youtubeId && !fullStreamRef.current) {
        console.log('[MusicContext] Preview finalizado; versión completa en camino.');
        return;
      }
      // Fin real (radio no llega aquí; preview sin completa o stream completo):
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        handleNextRef.current?.();
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, []);

  // Actualizar volumen del elemento audio nativo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Guardar favoritos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('[MusicContext] No se pudo guardar favoritos:', e);
    }
  }, [favorites]);

  // Actualizar MediaSession en cada cambio de canción
  useEffect(() => {
    if (!currentTrack) return;

    try {
      backgroundPlaybackService.startPlayback({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'TeamG Music',
        artwork: [
          { src: currentTrack.cover || '/logo-teamg.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => togglePlayRef.current?.());
        navigator.mediaSession.setActionHandler('pause', () => togglePlayRef.current?.());
        navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevRef.current?.());
        navigator.mediaSession.setActionHandler('nexttrack', () => handleNextRef.current?.());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== null && details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
          }
        });
      }
    } catch (err) {
      console.warn('[MusicContext] Error configurando MediaSession:', err);
    }
  }, [currentTrack]);

  // Sincronizar estado play/pause con MediaSession para pantalla de bloqueo en móviles
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying, currentTrack]);

  // Sincronizar posición con la barra scrubber de MediaSession en pantalla de bloqueo
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && currentTrack && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 1),
          playbackRate: 1.0,
          position: Math.min(Math.max(currentTime, 0), duration)
        });
      } catch (e) {
        // Ignorar posibles inconsistencias numéricas transitorias
      }
    }
  }, [currentTime, duration, currentTrack]);

  // Escuchar eventos de BackgroundPlaybackService emitidos desde la barra de notificaciones del móvil
  useEffect(() => {
    const onBgPlay = () => { if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(console.warn); };
    const onBgPause = () => { if (audioRef.current && !audioRef.current.paused) audioRef.current.pause(); };
    const onBgPrev = () => handlePrevRef.current?.();
    const onBgNext = () => handleNextRef.current?.();

    window.addEventListener('backgroundPlayback:play', onBgPlay);
    window.addEventListener('backgroundPlayback:pause', onBgPause);
    window.addEventListener('backgroundPlayback:prev', onBgPrev);
    window.addEventListener('backgroundPlayback:next', onBgNext);
    return () => {
      window.removeEventListener('backgroundPlayback:play', onBgPlay);
      window.removeEventListener('backgroundPlayback:pause', onBgPause);
      window.removeEventListener('backgroundPlayback:prev', onBgPrev);
      window.removeEventListener('backgroundPlayback:next', onBgNext);
    };
  }, []);

  // Carga el stream COMPLETO (mp3/m4a directo) en el <audio> nativo.
  // Si no hay stream disponible, delega al iframe YouTube como respaldo.
  const loadFullAudio = useCallback(async (track, ytId) => {
    try {
      const url = await musicService.getFullAudioUrl(ytId);
      // ¿Sigue vigente la misma pista? (el usuario pudo cambiar de canción)
      if (!url || currentTrackRef.current?.id !== track.id) {
        if (!url && currentTrackRef.current?.id === track.id) {
          setPlaybackMode('youtube');
        }
        return;
      }
      const audio = audioRef.current;
      if (!audio) {
        setPlaybackMode('youtube');
        return;
      }
      // Conservar la posición del preview para un cambio sin saltos
      let pos = 0;
      try { pos = Number.isFinite(audio.currentTime) ? audio.currentTime : 0; } catch {}
      fullStreamRef.current = url;
      audio.src = url;
      if (pos > 0.5 && pos < 28) {
        const restorePos = () => {
          try { audio.currentTime = pos; } catch {}
        };
        audio.addEventListener('loadedmetadata', restorePos, { once: true });
      }
      await audio.play().catch(() => {});
      if (currentTrackRef.current?.id === track.id) {
        setAudioQuality('full');
        setPlaybackMode('native');
      }
    } catch {
      if (currentTrackRef.current?.id === track.id) {
        setPlaybackMode('youtube');
      }
    }
  }, []);

  // Regreso honesto al preview de 30s (cuando ni stream ni iframe funcionan)
  const fallbackToPreview = useCallback(() => {
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    fullStreamRef.current = null;
    setPlaybackMode('native');
    setAudioQuality('preview-fallback');
    if (track && audio && track.audioUrl) {
      try {
        audio.src = track.audioUrl;
        audio.load();
        audio.play().catch(() => {});
      } catch {}
    }
  }, []);
  // Reproducir pista: arranque instantáneo con preview (30s) y cambio
  // automático a canción COMPLETA en cuanto se resuelve.
  const prefetchNextFullVersion = useCallback((currentQueue, currentIdx) => {
    if (!Array.isArray(currentQueue) || currentQueue.length === 0) return;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= currentQueue.length) return;
    const next = currentQueue[nextIdx];
    if (!next || next.isRadio || next.youtubeId || !next.title) return;
    // Prefetch en segundo plano: la siguiente canción ya tendrá versión completa
    musicService.getYouTubeId(next.artist, next.title).then((ytId) => {
      if (!ytId) return;
      setQueue((prev) => prev.map((t) => (
        t.id === next.id && !t.youtubeId
          ? { ...t, youtubeId: ytId, isPreviewOnly: false }
          : t
      )));
    }).catch(() => {});
  }, []);

  const playTrack = useCallback(async (track, newQueue = null) => {
    if (!track) return;
    const audio = audioRef.current;

    // Actualizar cola
    let activeQueue = newQueue && Array.isArray(newQueue) ? newQueue : null;
    if (activeQueue) {
      setQueue(activeQueue);
      const foundIdx = activeQueue.findIndex(t => t.id === track.id);
      setQueueIndex(foundIdx !== -1 ? foundIdx : 0);
    } else {
      setQueue(prev => {
        const idx = prev.findIndex(t => t.id === track.id);
        if (idx === -1) {
          setQueueIndex(prev.length);
          activeQueue = [...prev, track];
          return activeQueue;
        } else {
          setQueueIndex(idx);
          activeQueue = prev;
          return prev;
        }
      });
    }

    setCurrentTime(0);
    fullStreamRef.current = null;
    setPlaybackMode('native');

    // Caso 1: Estación de Radio en Vivo (siempre completa, sin límite)
    if (track.isRadio) {
      if (audio) {
        try { audio.pause(); } catch {}
        audio.src = track.audioUrl;
        audio.load();
        audio.play().catch(console.warn);
      }
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsLoadingAudio(false);
      setDuration(0);
      setAudioQuality('radio');
      return;
    }

    // Caso 2: Pista con youtubeId ya resuelto -> stream COMPLETO nativo directo
    if (track.youtubeId) {
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsLoadingAudio(true);
      setDuration(track.fullDuration || track.duration || 210);
      setAudioQuality('loading-full');
      setPlaybackMode('native');
      fullStreamRef.current = null;
      if (activeQueue) {
        const idx = activeQueue.findIndex(t => t.id === track.id);
        prefetchNextFullVersion(activeQueue, idx);
      }
      loadFullAudio(track, track.youtubeId);
      return;
    }

    // Caso 3: Pista con audioUrl disponible (preview de 30s para arranque instantáneo mientras se resuelve la completa)
    if (audio && track.audioUrl) {
      try { audio.pause(); } catch {}
      audio.src = track.audioUrl;
      audio.load();
      audio.play().catch(err => {
        console.warn('[MusicContext] Error iniciando preview nativo:', err);
      });
    } else if (audio) {
      try { audio.pause(); } catch {}
      audio.removeAttribute('src');
      audio.load();
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setDuration(track.fullDuration || track.duration || 210);
    setAudioQuality('loading-full');

    // Resolver versión completa en YouTube en segundo plano
    setIsLoadingAudio(true);
    try {
      const ytId = await musicService.getYouTubeId(track.artist, track.title);
      if (ytId) {
        console.log('[MusicContext] Canción completa resuelta en YouTube:', ytId);
        const enriched = { ...track, youtubeId: ytId, isPreviewOnly: false };
        // Si el usuario ya cambió de canción, solo propagar a la cola
        if (currentTrackRef.current?.id !== track.id) {
          setQueue(prev => prev.map(t => (
            t.id === track.id && !t.youtubeId ? enriched : t
          )));
          return;
        }
        setCurrentTrack(prev => {
          if (prev?.id === track.id) {
            return { ...prev, youtubeId: ytId, isPreviewOnly: false };
          }
          return prev;
        });
        // Propagar a la cola para que next/prev/favoritos conserven la versión completa
        setQueue(prev => prev.map(t => (
          t.id === track.id && !t.youtubeId ? enriched : t
        )));
        const currentQueue = activeQueue || [];
        const idx = currentQueue.findIndex(t => t.id === track.id);
        prefetchNextFullVersion(currentQueue, idx);
        // Cargar el stream completo nativo (o iframe como respaldo)
        await loadFullAudio(track, ytId);
      } else {
        // Sin versión completa: se queda el preview de 30s (se informa en UI)
        console.warn('[MusicContext] Sin versión completa, se mantiene preview 30s');
        if (currentTrackRef.current?.id === track.id) {
          setAudioQuality('preview-fallback');
        }
      }
    } catch (err) {
      console.warn('[MusicContext] Error resolviendo canción completa:', err);
      if (currentTrackRef.current?.id === track.id) {
        setAudioQuality('preview-fallback');
      }
    } finally {
      setIsLoadingAudio(false);
    }
  }, [prefetchNextFullVersion, loadFullAudio]);

  // Reproducir estación de radio
  const playRadio = useCallback((radio) => {
    playTrack(radio, [radio]);
  }, [playTrack]);

  // Alternar Play / Pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;

    const audio = audioRef.current;
    const useYouTube = currentTrack.youtubeId && playbackMode === 'youtube';

    if (useYouTube) {
      if (audio && !audio.paused) {
        audio.pause();
      }
      setIsPlaying(prev => !prev);
      return;
    }

    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('[MusicContext] Error reanudando audio:', err);
      });
    }
  }, [isPlaying, currentTrack, playbackMode]);
  togglePlayRef.current = togglePlay;

  // Siguiente pista
  const handleNext = useCallback(() => {
    if (queue.length === 0) return;

    let nextIdx;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    const nextSong = queue[nextIdx];
    if (nextSong) {
      setQueueIndex(nextIdx);
      playTrack(nextSong, queue);
    }
  }, [queue, queueIndex, isShuffle, repeatMode, playTrack]);
  handleNextRef.current = handleNext;

  // Pista anterior
  const handlePrev = useCallback(() => {
    const useYouTube = currentTrack?.youtubeId && playbackMode === 'youtube';
    if (useYouTube && ytPlayerRef.current && currentTime > 3) {
      ytPlayerRef.current.seekTo(0, 'seconds');
      setCurrentTime(0);
      return;
    }

    const audio = audioRef.current;
    if (!useYouTube && audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (queue.length === 0) return;

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === 'all' ? queue.length - 1 : 0;
    }

    const prevSong = queue[prevIdx];
    if (prevSong) {
      setQueueIndex(prevIdx);
      playTrack(prevSong, queue);
    }
  }, [queue, queueIndex, repeatMode, playTrack, currentTrack, currentTime, playbackMode]);
  handlePrevRef.current = handlePrev;

  // Cambiar posición de la pista (Seek)
  const seekTo = useCallback((seconds) => {
    if (!Number.isFinite(seconds)) return;

    const useYouTube = currentTrack?.youtubeId && playbackMode === 'youtube';
    if (useYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, 'seconds');
      setCurrentTime(seconds);
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = seconds;
      } catch {}
      setCurrentTime(seconds);
    }
  }, [currentTrack, playbackMode]);

  // Cambiar volumen
  const setVolume = useCallback((val) => {
    const cleanVal = Math.max(0, Math.min(1, val));
    setVolumeState(cleanVal);
    if (isMuted && cleanVal > 0) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Alternar Mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Alternar Modo Shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => !prev);
  }, []);

  // Alternar Modo Repetición: off -> all -> one -> off
  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Favoritos
  const toggleFavorite = useCallback((track) => {
    if (!track) return;
    setFavorites(prev => {
      const exists = prev.some(t => t.id === track.id);
      if (exists) {
        return prev.filter(t => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  }, []);

  const isFavorite = useCallback((trackId) => {
    return favorites.some(t => t.id === trackId);
  }, [favorites]);

  const value = {
    currentTrack,
    isPlaying,
    isLoadingAudio,
    audioQuality,
    playbackMode,
    fallbackToPreview,
    queue,
    queueIndex,
    volume,
    isMuted,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    favorites,
    isExpandedPlayer,
    setIsExpandedPlayer,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    playTrack,
    playRadio,
    togglePlay,
    nextTrack: handleNext,
    prevTrack: handlePrev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    isFavorite,
    audioRef,
    ytPlayerRef
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic debe usarse dentro de un MusicProvider');
  }
  return context;
}
