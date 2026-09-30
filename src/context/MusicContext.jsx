import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { backgroundPlaybackService } from '../services/backgroundPlayback.js';
import { musicService } from '../services/musicService.js';
import * as musicOfflineService from '../services/musicOfflineService.js';
import { storage } from '../utils/storage.js';

const MusicContext = createContext(null);

const STORAGE_FAVORITES_KEY = 'teamg_music_favorites';
const STORAGE_PLAYLISTS_KEY = 'teamg_music_custom_playlists_v1';

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
  const [customPlaylists, setCustomPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [playlistModalTrack, setPlaylistModalTrack] = useState(null);
  const [offlineTracks, setOfflineTracks] = useState(() => musicOfflineService.getOfflineTracks());
  const [activeDownloadsMap, setActiveDownloadsMap] = useState({});
  const [isDownloadingPlaylistId, setIsDownloadingPlaylistId] = useState(null);
  const [playlistDownloadProgress, setPlaylistDownloadProgress] = useState(null);

  // Escuchar eventos de descargas offline y sincronizar estado reactivo
  useEffect(() => {
    const handleOfflineUpdate = (e) => {
      setOfflineTracks(e.detail?.tracks || musicOfflineService.getOfflineTracks());
    };

    const handleOfflineProgress = (e) => {
      const detail = e.detail;
      if (!detail || !detail.id) return;
      setActiveDownloadsMap(prev => {
        if (detail.status === 'completed' || detail.status === 'error') {
          const next = { ...prev };
          delete next[detail.id];
          return next;
        }
        return {
          ...prev,
          [detail.id]: detail
        };
      });
    };

    window.addEventListener('teamg:music-offline-update', handleOfflineUpdate);
    window.addEventListener('teamg:music-offline-progress', handleOfflineProgress);

    return () => {
      window.removeEventListener('teamg:music-offline-update', handleOfflineUpdate);
      window.removeEventListener('teamg:music-offline-progress', handleOfflineProgress);
    };
  }, []);

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

  const customPlaylistsRef = useRef(customPlaylists);
  useEffect(() => {
    customPlaylistsRef.current = customPlaylists;
  }, [customPlaylists]);

  // Inicializar elemento de audio nativo UNA SOLA VEZ al montar
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      // En móvil nativo, cuando la app se minimiza o se apaga la pantalla,
      // el WebView de Android pausa automáticamente el elemento <audio> de HTML5.
      // NO debemos pausar la app porque ExoPlayer sigue reproduciendo en segundo plano.
      if (Capacitor.isNativePlatform() && document.hidden) {
        console.log('[MusicContext] HTML5 <audio> pausado en background por WebView; ignorando');
        return;
      }
      setIsPlaying(false);
    };
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
      const track = currentTrackRef.current;
      if (track?.youtubeId) {
        console.warn('[MusicContext] Fallo de audio nativo, conmutando a YouTube iframe:', track.youtubeId);
        fullStreamRef.current = null;
        setPlaybackMode('youtube');
      } else if (track?.audioUrl) {
        fallbackToPreview();
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

  // Guardar playlists personalizadas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(customPlaylists));
    } catch (e) {
      console.warn('[MusicContext] No se pudo guardar playlists:', e);
    }
  }, [customPlaylists]);

  // Sincronizar automáticamente playlists con el servidor si el usuario tiene sesión activa
  const syncWithCloud = useCallback(async () => {
    try {
      const token = await storage.getItem('token');
      if (!token) return;
      const localPlaylists = customPlaylistsRef.current || [];
      const remotePlaylists = await musicService.syncUserPlaylists(localPlaylists);
      if (Array.isArray(remotePlaylists)) {
        setCustomPlaylists(remotePlaylists);
        try {
          localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(remotePlaylists));
        } catch {}
      }
    } catch (e) {
      console.warn('[MusicContext] Error en syncWithCloud:', e);
    }
  }, []);

  useEffect(() => {
    syncWithCloud();
    const handleAuthChange = () => {
      syncWithCloud();
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('teamg:auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('teamg:auth-change', handleAuthChange);
    };
  }, [syncWithCloud]);

  // Sincronizar posición y estado nativo cuando la app vuelve de segundo plano
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onNativeResume = async () => {
      const state = await backgroundPlaybackService.getNativePosition();
      if (state && typeof state.position === 'number') {
        setCurrentTime(state.position);
        if (state.duration > 0) setDuration(state.duration);
        if (typeof state.isPlaying === 'boolean') setIsPlaying(state.isPlaying);
        if (audioRef.current && state.isPlaying) {
          try {
            audioRef.current.currentTime = state.position;
            audioRef.current.play().catch(() => {});
          } catch {}
        }
      }
    };
    window.addEventListener('backgroundPlayback:resume', onNativeResume);
    return () => window.removeEventListener('backgroundPlayback:resume', onNativeResume);
  }, []);

  // Actualizar MediaSession y servicio nativo en cada cambio de canción
  useEffect(() => {
    if (!currentTrack) return;

    try {
      const isPreview = currentTrack.audioUrl && (currentTrack.audioUrl.includes('apple-assets-us-std') || currentTrack.audioUrl.includes('AudioPreview'));
      const safeAudio = currentTrack.streamUrl || (!isPreview ? currentTrack.audioUrl : '') || '';

      backgroundPlaybackService.startPlayback({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'TeamG Music',
        artwork: [
          { src: currentTrack.cover || '/logo-teamg.png', sizes: '512x512', type: 'image/png' }
        ],
        coverUrl: currentTrack.cover || '',
        audioUrl: safeAudio,
        isPlaying: isPlaying,
        duration: duration,
        position: currentTime
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

  // Sincronizar estado play/pause con MediaSession y servicio nativo para pantalla de bloqueo en móviles
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
    if (currentTrack) {
      const isPreview = currentTrack.audioUrl && (currentTrack.audioUrl.includes('apple-assets-us-std') || currentTrack.audioUrl.includes('AudioPreview'));
      const safeAudio = currentTrack.streamUrl || (!isPreview ? currentTrack.audioUrl : '') || '';
      backgroundPlaybackService.updatePlaybackState(isPlaying, {
        ...currentTrack,
        audioUrl: safeAudio
      }, currentTime, duration);
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

  // Escuchar eventos de BackgroundPlaybackService emitidos desde la barra de notificaciones del móvil y pantalla bloqueada
  useEffect(() => {
    const onBgPlay = () => {
      const audio = audioRef.current;
      if (audio && audio.paused) {
        audio.play().catch(console.warn);
      } else if (!isPlaying) {
        togglePlayRef.current?.();
      }
    };

    const onBgPause = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        audio.pause();
      } else if (isPlaying) {
        togglePlayRef.current?.();
      }
    };

    const onBgToggle = () => togglePlayRef.current?.();
    const onBgPrev = () => handlePrevRef.current?.();
    const onBgNext = () => handleNextRef.current?.();

    window.addEventListener('backgroundPlayback:play', onBgPlay);
    window.addEventListener('backgroundPlayback:pause', onBgPause);
    window.addEventListener('backgroundPlayback:toggle', onBgToggle);
    window.addEventListener('backgroundPlayback:prev', onBgPrev);
    window.addEventListener('backgroundPlayback:next', onBgNext);
    return () => {
      window.removeEventListener('backgroundPlayback:play', onBgPlay);
      window.removeEventListener('backgroundPlayback:pause', onBgPause);
      window.removeEventListener('backgroundPlayback:toggle', onBgToggle);
      window.removeEventListener('backgroundPlayback:prev', onBgPrev);
      window.removeEventListener('backgroundPlayback:next', onBgNext);
    };
  }, [isPlaying]);

  // Watchdog de seguridad: si isLoadingAudio se queda atascado > 5s, liberar el control de UI
  useEffect(() => {
    if (!isLoadingAudio) return;
    const timer = setTimeout(() => {
      console.warn('[MusicContext] Watchdog: isLoadingAudio activo > 5s, liberando spinner');
      setIsLoadingAudio(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoadingAudio]);

  // Carga el stream COMPLETO (mp3/m4a directo) en el motor de reproducción.
  // Si no hay stream directo disponible, delega al iframe YouTube como respaldo seguro.
  const loadFullAudio = useCallback(async (track, ytId) => {
    try {
      const url = await musicService.getFullAudioUrl(ytId);
      if (currentTrackRef.current?.id !== track.id) {
        return;
      }
      if (!url) {
        console.warn('[MusicContext] Sin stream directo para', ytId, '-> conmutando a YouTube iframe');
        setPlaybackMode('youtube');
        setAudioQuality('full');
        setIsLoadingAudio(false);
        return;
      }

      fullStreamRef.current = url;
      const isNative = Capacitor.isNativePlatform();

      const fullTrack = {
        ...track,
        youtubeId: ytId,
        audioUrl: url,
        streamUrl: url,
        fullDuration: track.fullDuration || track.duration || 210,
        isPreviewOnly: false
      };

      currentTrackRef.current = fullTrack;
      setCurrentTrack(fullTrack);
      setQueue(prev => prev.map(t => t.id === track.id ? { ...t, ...fullTrack } : t));

      // En Android nativo, ExoPlayer reproduce el audio en segundo plano (100% inmune a pantalla apagada)
      backgroundPlaybackService.updatePlaybackState(true, fullTrack, 0, fullTrack.fullDuration);

      const audio = audioRef.current;
      if (audio) {
        audio.src = url;
        audio.muted = isNative; // En móvil nativo silenciar web <audio> para evitar eco (suena por ExoPlayer)
        await audio.play().catch((playErr) => {
          console.warn('[MusicContext] audio.play() advertencia:', playErr);
          if (!isNative && currentTrackRef.current?.id === track.id) {
            setPlaybackMode('youtube');
          }
        });
      }

      if (currentTrackRef.current?.id === track.id) {
        setAudioQuality('full');
        setPlaybackMode('native');
      }
    } catch (e) {
      console.warn('[MusicContext] Error en loadFullAudio, conmutando a YouTube iframe:', e);
      if (currentTrackRef.current?.id === track.id) {
        setPlaybackMode('youtube');
      }
    } finally {
      if (currentTrackRef.current?.id === track.id) {
        setIsLoadingAudio(false);
      }
    }
  }, []);

  // Regreso honesto al preview de 30s solo en caso de falla extrema
  const fallbackToPreview = useCallback(() => {
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    fullStreamRef.current = null;
    setPlaybackMode('native');
    setAudioQuality('preview-fallback');
    setIsLoadingAudio(false);
    if (track && audio && track.audioUrl) {
      try {
        audio.src = track.audioUrl;
        audio.muted = false;
        audio.load();
        audio.play().catch(() => {});
      } catch {}
    }
  }, []);

  // Prefetch de la versión completa de la siguiente pista en segundo plano
  const prefetchNextFullVersion = useCallback((currentQueue, currentIdx) => {
    if (!Array.isArray(currentQueue) || currentQueue.length === 0) return;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= currentQueue.length) return;
    const next = currentQueue[nextIdx];
    if (!next || next.isRadio || next.youtubeId || !next.title) return;
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

    // 1. Sincronización inmediata de ref para evitar condiciones de carrera al cambiar rápido de canción
    currentTrackRef.current = track;

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

    // Detener cualquier audio previo de inmediato
    if (audio) {
      try { audio.pause(); } catch {}
    }

    // Sanitizar pista para evitar que el preview de 30s de iTunes se asigne como audioUrl a reproducir
    const isPreview = (url) => url && (url.includes('apple-assets-us-std') || url.includes('AudioPreview'));
    const safeTrack = {
      ...track,
      audioUrl: (!isPreview(track.audioUrl) ? track.audioUrl : null) || track.streamUrl || null,
      previewUrl: track.previewUrl || track.audioUrl || null
    };

    // Caso 0: Pista guardada en Modo Offline (reproducción local instantánea sin internet)
    if (musicOfflineService.isTrackOffline(track.id) || track.isOffline) {
      try {
        const offlineRecord = musicOfflineService.getOfflineTrack(track.id) || track;
        const urls = await musicOfflineService.getOfflinePlaybackUrls(track.id);
        const isNative = Capacitor.isNativePlatform();
        const effectiveUrl = isNative ? urls.nativeUrl : urls.webUrl;

        const offlineTrack = {
          ...safeTrack,
          ...offlineRecord,
          isOffline: true,
          audioUrl: effectiveUrl,
          streamUrl: effectiveUrl
        };

        setCurrentTrack(offlineTrack);
        setIsPlaying(true);
        setIsLoadingAudio(false);
        setDuration(offlineTrack.fullDuration || offlineTrack.duration || 210);
        setAudioQuality('offline');
        setPlaybackMode('native');
        fullStreamRef.current = effectiveUrl;

        backgroundPlaybackService.updatePlaybackState(
          true,
          offlineTrack,
          0,
          offlineTrack.fullDuration || offlineTrack.duration || 210
        );

        if (audio) {
          audio.src = urls.webUrl;
          audio.muted = isNative;
          await audio.play().catch(console.warn);
        }
        return;
      } catch (offlineErr) {
        console.warn('[MusicContext] No se pudo reproducir offline local, reintentando online:', offlineErr);
        if (offlineErr?.message?.includes('licencia offline')) {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            alert('⚠️ ' + (offlineErr.message || 'Tu licencia offline de 30 días ha caducado. Conecta el dispositivo a internet para renovarla.'));
            setIsLoadingAudio(false);
            setIsPlaying(false);
            return;
          }
        }
      }
    }

    // Caso 1: Estación de Radio en Vivo (siempre completa, sin límite)
    if (track.isRadio) {
      const isNative = Capacitor.isNativePlatform();
      backgroundPlaybackService.updatePlaybackState(true, {
        ...track,
        audioUrl: track.audioUrl,
        streamUrl: track.audioUrl
      }, 0, 0);

      if (audio) {
        audio.src = track.audioUrl;
        audio.muted = isNative;
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

    // Caso 2: Pista con youtubeId ya resuelto -> stream COMPLETO directo (CERO preview)
    if (safeTrack.youtubeId) {
      setCurrentTrack(safeTrack);
      setIsPlaying(true);
      setIsLoadingAudio(true);
      setDuration(safeTrack.fullDuration || safeTrack.duration || 210);
      setAudioQuality('loading-full');
      setPlaybackMode('native');
      fullStreamRef.current = null;
      if (activeQueue) {
        const idx = activeQueue.findIndex(t => t.id === safeTrack.id);
        prefetchNextFullVersion(activeQueue, idx);
      }
      try {
        await loadFullAudio(safeTrack, safeTrack.youtubeId);
      } finally {
        if (currentTrackRef.current?.id === safeTrack.id) {
          setIsLoadingAudio(false);
        }
      }
      return;
    }

    // Caso 3: Pista sin youtubeId resuelto todavía -> RESOLVER Y REPRODUCIR DIRECTAMENTE LA COMPLETA
    // (🚫 ELIMINADO EL PREVIEW DE 30 SEGUNDOS: la canción arranca directamente completa)
    setCurrentTrack(safeTrack);
    setIsPlaying(true);
    setDuration(safeTrack.fullDuration || safeTrack.duration || 210);
    setAudioQuality('loading-full');
    setIsLoadingAudio(true);

    try {
      let ytId = await musicService.getYouTubeId(safeTrack.artist, safeTrack.title);
      if (!ytId && safeTrack.title) {
        ytId = await musicService.getYouTubeId('', safeTrack.title);
      }
      if (ytId) {
        console.log('[MusicContext] Canción completa resuelta en YouTube:', ytId);
        const enriched = { ...safeTrack, youtubeId: ytId, isPreviewOnly: false };
        if (currentTrackRef.current?.id !== safeTrack.id) {
          setQueue(prev => prev.map(t => (
            t.id === safeTrack.id && !t.youtubeId ? enriched : t
          )));
          return;
        }
        setCurrentTrack(prev => {
          if (prev?.id === safeTrack.id) {
            return { ...prev, youtubeId: ytId, isPreviewOnly: false };
          }
          return prev;
        });
        setQueue(prev => prev.map(t => (
          t.id === safeTrack.id && !t.youtubeId ? enriched : t
        )));
        const currentQueue = activeQueue || [];
        const idx = currentQueue.findIndex(t => t.id === safeTrack.id);
        prefetchNextFullVersion(currentQueue, idx);
        await loadFullAudio(safeTrack, ytId);
      } else {
        console.warn('[MusicContext] Sin versión completa resuelta');
        if (currentTrackRef.current?.id === safeTrack.id) {
          if (safeTrack.audioUrl) {
            setAudioQuality('preview-fallback');
          } else {
            setPlaybackMode('youtube');
          }
        }
      }
    } catch (err) {
      console.warn('[MusicContext] Error resolviendo canción completa:', err);
      if (currentTrackRef.current?.id === safeTrack.id) {
        if (safeTrack.audioUrl) {
          setAudioQuality('preview-fallback');
        } else {
          setPlaybackMode('youtube');
        }
      }
    } finally {
      if (currentTrackRef.current?.id === safeTrack.id) {
        setIsLoadingAudio(false);
      }
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

    if (isPlaying) {
      if (audio) audio.pause();
      setIsPlaying(false);
      backgroundPlaybackService.pausePlayback();
    } else {
      if (audio) {
        audio.play().catch(err => {
          console.warn('[MusicContext] Error reanudando audio:', err);
        });
      }
      setIsPlaying(true);
      backgroundPlaybackService.resumePlayback();
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
    const cleanSeconds = Math.max(0, seconds);
    setCurrentTime(cleanSeconds);
    backgroundPlaybackService.seekTo(cleanSeconds);

    const useYouTube = currentTrack?.youtubeId && playbackMode === 'youtube';
    if (useYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(cleanSeconds, 'seconds');
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = cleanSeconds;
      } catch {}
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

  // --- PLAYLISTS PERSONALIZADAS (CON SOPORTE PÚBLICA / PRIVADA Y SINCRONIZACIÓN EN LA NUBE) ---
  const createPlaylist = useCallback((name, description = '', isPublic = false) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const newPlaylist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      description: description.trim(),
      isPublic: Boolean(isPublic),
      createdAt: Date.now(),
      cover: '',
      tracks: []
    };
    setCustomPlaylists(prev => [newPlaylist, ...prev]);
    // Guardar en la nube en segundo plano
    musicService.saveUserPlaylist(newPlaylist).catch(e => {
      console.warn('[MusicContext] Error guardando playlist en la nube:', e);
    });
    return newPlaylist;
  }, []);

  const togglePlaylistPrivacy = useCallback((playlistId) => {
    let nextStatus = false;
    setCustomPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        nextStatus = !pl.isPublic;
        return { ...pl, isPublic: nextStatus };
      }
      return pl;
    }));
    // Actualizar visibilidad en la nube
    musicService.updateUserPlaylist(playlistId, { isPublic: nextStatus }).catch(() => {});
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setCustomPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    // Eliminar en la nube
    musicService.deleteUserPlaylist(playlistId).catch(() => {});
  }, []);

  const renamePlaylist = useCallback((playlistId, newName, newDescription = undefined, newIsPublic = undefined) => {
    const trimmed = String(newName || '').trim();
    if (!trimmed) return;
    const updateData = { name: trimmed };
    if (newDescription !== undefined) updateData.description = String(newDescription).trim();
    if (newIsPublic !== undefined) updateData.isPublic = Boolean(newIsPublic);

    setCustomPlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        ...updateData
      };
    }));
    // Actualizar en la nube
    musicService.updateUserPlaylist(playlistId, updateData).catch(() => {});
  }, []);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    if (!track || !playlistId) return false;
    let added = false;
    let updatedTracks = [];
    let updatedCover = '';
    setCustomPlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      const alreadyHas = pl.tracks.some(t => t.id === track.id);
      if (alreadyHas) return pl;
      added = true;
      updatedTracks = [...pl.tracks, track];
      updatedCover = pl.cover || track.cover || '';
      return {
        ...pl,
        cover: updatedCover,
        tracks: updatedTracks
      };
    }));
    if (added) {
      musicService.updateUserPlaylist(playlistId, { tracks: updatedTracks, cover: updatedCover }).catch(() => {});
    }
    return added;
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    let updatedTracks = [];
    let updatedCover = '';
    setCustomPlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      updatedTracks = pl.tracks.filter(t => t.id !== trackId);
      updatedCover = updatedTracks[0]?.cover || '';
      return {
        ...pl,
        cover: updatedCover,
        tracks: updatedTracks
      };
    }));
    musicService.updateUserPlaylist(playlistId, { tracks: updatedTracks, cover: updatedCover }).catch(() => {});
  }, []);

  const toggleTrackInPlaylist = useCallback((playlistId, track) => {
    if (!track || !playlistId) return;
    let updatedTracks = [];
    let updatedCover = '';
    setCustomPlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      const exists = pl.tracks.some(t => t.id === track.id);
      updatedTracks = exists
        ? pl.tracks.filter(t => t.id !== track.id)
        : [...pl.tracks, track];
      updatedCover = updatedTracks[0]?.cover || '';
      return {
        ...pl,
        cover: updatedCover,
        tracks: updatedTracks
      };
    }));
    musicService.updateUserPlaylist(playlistId, { tracks: updatedTracks, cover: updatedCover }).catch(() => {});
  }, []);

  const isTrackInPlaylist = useCallback((playlistId, trackId) => {
    const pl = customPlaylists.find(p => p.id === playlistId);
    return Boolean(pl && pl.tracks.some(t => t.id === trackId));
  }, [customPlaylists]);

  const openAddToPlaylistModal = useCallback((track) => {
    setPlaylistModalTrack(track || null);
  }, []);

  const closeAddToPlaylistModal = useCallback(() => {
    setPlaylistModalTrack(null);
  }, []);

  // --- MODO OFFLINE (DESCARGAS INDIVIDUALES Y PLAYLISTS) ---
  const downloadTrack = useCallback(async (track) => {
    if (!track) return null;
    return await musicOfflineService.downloadTrackOffline(track);
  }, []);

  const deleteOfflineTrack = useCallback(async (trackId) => {
    if (!trackId) return;
    await musicOfflineService.deleteOfflineTrack(trackId);
  }, []);

  const isTrackDownloaded = useCallback((trackId) => {
    return musicOfflineService.isTrackOffline(trackId);
  }, [offlineTracks]);

  const downloadPlaylist = useCallback(async (playlist) => {
    if (!playlist || !Array.isArray(playlist.tracks) || playlist.tracks.length === 0) return;
    setIsDownloadingPlaylistId(playlist.id);
    setPlaylistDownloadProgress({ current: 0, total: playlist.tracks.length, percentage: 0 });
    try {
      await musicOfflineService.downloadPlaylistOffline(playlist, (progress) => {
        setPlaylistDownloadProgress(progress);
      });
    } catch (err) {
      console.error('[MusicContext] Error descargando playlist offline:', err);
    } finally {
      setIsDownloadingPlaylistId(null);
      setPlaylistDownloadProgress(null);
    }
  }, []);

  const isPlaylistDownloaded = useCallback((playlist) => {
    if (!playlist || !Array.isArray(playlist.tracks) || playlist.tracks.length === 0) return false;
    return playlist.tracks.every(t => musicOfflineService.isTrackOffline(t.id));
  }, [offlineTracks]);

  const clearAllOffline = useCallback(async () => {
    await musicOfflineService.clearAllOfflineTracks();
  }, []);

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
    customPlaylists,
    playlistModalTrack,
    offlineTracks,
    activeDownloadsMap,
    isDownloadingPlaylistId,
    playlistDownloadProgress,
    downloadTrack,
    deleteOfflineTrack,
    isTrackDownloaded,
    downloadPlaylist,
    isPlaylistDownloaded,
    clearAllOffline,
    getOfflineTotalStorage: musicOfflineService.getTotalOfflineSize,
    getTrackLicenseInfo: musicOfflineService.getTrackLicenseInfo,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    togglePlaylistPrivacy,
    syncPlaylists: syncWithCloud,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    toggleTrackInPlaylist,
    isTrackInPlaylist,
    openAddToPlaylistModal,
    closeAddToPlaylistModal,
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
