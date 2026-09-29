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

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

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
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, []);

  // Manejo de final de pista (Ended) para audio nativo
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      // Si la versión completa ya está activa o en camino en YouTube, NO saltar al acabarse el preview de 30s
      if (currentTrackRef.current?.youtubeId) {
        console.log('[MusicContext] Preview de 30s finalizado; versión completa en YouTube activa.');
        return;
      }
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        handleNext();
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeatMode, queue, queueIndex, isShuffle, handleNext]);

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
        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
      }
    } catch (err) {
      console.warn('[MusicContext] Error configurando MediaSession:', err);
    }
  }, [currentTrack]);

  // Reproducir pista: arranque instantáneo con preview (30s) y cambio
  // automático a canción COMPLETA en YouTube en cuanto se resuelve.
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

    // Caso 2: Pista con youtubeId ya resuelto (canción completa directa, sin preview de 30s)
    if (track.youtubeId) {
      if (audio) {
        try { audio.pause(); } catch {}
        audio.removeAttribute('src');
        audio.load();
      }
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsLoadingAudio(false);
      setDuration(track.fullDuration || track.duration || 210);
      setAudioQuality('full');
      if (activeQueue) {
        const idx = activeQueue.findIndex(t => t.id === track.id);
        prefetchNextFullVersion(activeQueue, idx);
      }
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
        setAudioQuality('full');
        const currentQueue = activeQueue || [];
        const idx = currentQueue.findIndex(t => t.id === track.id);
        prefetchNextFullVersion(currentQueue, idx);
      } else {
        // Sin versión completa: se queda el preview de 30s (se informa en UI)
        console.warn('[MusicContext] Sin versión completa, se mantiene preview 30s');
        setAudioQuality('preview-fallback');
      }
    } catch (err) {
      console.warn('[MusicContext] Error resolviendo canción completa:', err);
      setAudioQuality('preview-fallback');
    } finally {
      setIsLoadingAudio(false);
    }
  }, [prefetchNextFullVersion]);

  // Reproducir estación de radio
  const playRadio = useCallback((radio) => {
    playTrack(radio, [radio]);
  }, [playTrack]);

  // Alternar Play / Pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;

    const audio = audioRef.current;

    if (currentTrack.youtubeId) {
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
  }, [isPlaying, currentTrack]);

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

  // Pista anterior
  const handlePrev = useCallback(() => {
    if (currentTrack?.youtubeId && ytPlayerRef.current && currentTime > 3) {
      ytPlayerRef.current.seekTo(0, 'seconds');
      setCurrentTime(0);
      return;
    }

    const audio = audioRef.current;
    if (!currentTrack?.youtubeId && audio && audio.currentTime > 3) {
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
  }, [queue, queueIndex, repeatMode, playTrack, currentTrack, currentTime]);

  // Cambiar posición de la pista (Seek)
  const seekTo = useCallback((seconds) => {
    if (!Number.isFinite(seconds)) return;

    if (currentTrack?.youtubeId && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, 'seconds');
      setCurrentTime(seconds);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, [currentTrack]);

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
