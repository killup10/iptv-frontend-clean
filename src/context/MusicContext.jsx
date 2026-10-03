import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { backgroundPlaybackService } from '../services/backgroundPlayback.js';
import { musicService } from '../services/musicService.js';
import * as musicOfflineService from '../services/musicOfflineService.js';
import { useAuth } from './AuthContext.jsx';
import { PlaylistSync } from '../services/playlistSync.js';
import { storage } from '../utils/storage.js';

const MusicContext = createContext(null);
const MusicLibraryContext = createContext(null);

const STORAGE_FAVORITES_KEY = 'teamg_music_favorites';
const STORAGE_PLAYLISTS_KEY = 'teamg_music_custom_playlists_v1';

export function MusicProvider({ children }) {
  const { user: accountUser } = useAuth();
  const cloudPlaylistsRef = useRef(null);
  const [playlistCloudStatus, setPlaylistCloudStatus] = useState('pending');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setPlayingState] = useState(false);
  const playIntentRef = useRef(false);
  const transitionRef = useRef(false);
  const playbackGenerationRef = useRef(0);
  const setIsPlaying = useCallback(value => {
    const playing = typeof value === 'function' ? value(playIntentRef.current) : value;
    playIntentRef.current = playing;
    setPlayingState(playing);
  }, []);
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  queueRef.current = queue;
  const [queueIndex, setQueueIndex] = useState(-1);
  const queueIndexRef = useRef(-1);
  queueIndexRef.current = queueIndex;
  const consecutiveErrorsRef = useRef(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioQuality, setAudioQuality] = useState('idle');
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
  const officialVideoPlayerRef = useRef(null);
  const [videoPlaybackActive, setVideoActive] = useState(false);
  const videoPlaybackActiveRef = useRef(false);
  const setVideoPlaybackActive = useCallback((active) => {
    videoPlaybackActiveRef.current = active;
    setVideoActive(active);
  }, []);
  useEffect(() => {
    if (videoPlaybackActive) {
      audioRef.current?.pause();
      backgroundPlaybackService.pausePlayback();
    } else if (currentTrackRef.current && !transitionRef.current && fullStreamRef.current) {
      if (playbackModeRef.current === 'native') {
        backgroundPlaybackService.updatePlaybackState(isPlaying, currentTrackRef.current, currentTime, duration);
        backgroundPlaybackService.seekTo(currentTime);
      }
      if (playbackModeRef.current === 'native' && isPlaying) {
        backgroundPlaybackService.resumePlayback();
        if (audioRef.current) {
          audioRef.current.currentTime = currentTime;
          audioRef.current.play().catch(() => {});
        }
      }
    }
  }, [videoPlaybackActive]);
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

    const onPlay = () => {
      if (playIntentRef.current && !transitionRef.current && !videoPlaybackActiveRef.current && playbackModeRef.current !== 'youtube' && !(Capacitor.isNativePlatform() && fullStreamRef.current)) setIsPlaying(true);
    };
    // Buffering, source replacement and WebView suspension are not manual pauses.
    const onPause = () => {};
    const onWaiting = () => setIsLoadingAudio(true);
    const onPlaying = () => {
      consecutiveErrorsRef.current = 0;
      setIsLoadingAudio(false);
    };
    const onCanPlay = () => setIsLoadingAudio(false);

    const onTimeUpdate = () => {
      if (audio && !videoPlaybackActiveRef.current && playbackModeRef.current !== 'youtube' && !(Capacitor.isNativePlatform() && fullStreamRef.current)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      if (transitionRef.current) return;
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0 && !(Capacitor.isNativePlatform() && fullStreamRef.current)) {
        setDuration(audio.duration);
      }
      setIsLoadingAudio(false);
    };

    const onError = (e) => {
      if (transitionRef.current || !audio.src) return;
      if (Capacitor.isNativePlatform() && fullStreamRef.current) return;
      console.warn('[MusicContext] Error en audio nativo:', e);
      setIsLoadingAudio(false);
      const track = currentTrackRef.current;
      if (track?.youtubeId) {
        console.warn('[MusicContext] Fallo de audio nativo, conmutando a YouTube iframe:', track.youtubeId);
        fullStreamRef.current = null;
        setPlaybackMode('youtube');
      } else {
        handlePlaybackError();
      }
    };

    const onEnded = () => {
      if (transitionRef.current || !playIntentRef.current) return;
      if (Capacitor.isNativePlatform() && fullStreamRef.current) return;
      const track = currentTrackRef.current;
      // En modo YouTube el iframe maneja el fin (su onEnded avanza solo).
      if (track?.youtubeId && playbackModeRef.current === 'youtube') return;
      // Fin de la pista (canción terminada): avanzar a la siguiente para que nunca deje de sonar
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

  // ExoPlayer is the authoritative clock when Android owns the full stream.
  const seekPendingRef = useRef(0);
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || playbackMode !== 'native' || !currentTrack) return;
    let cancelled = false;
    let timer;
    const trackId = currentTrack.id;
    const poll = async () => {
      const started = Date.now();
      const state = await backgroundPlaybackService.getNativePosition();
      if (cancelled) return;
      if (!videoPlaybackActiveRef.current && fullStreamRef.current && state?.audioUrl === fullStreamRef.current && currentTrackRef.current?.id === trackId && started >= seekPendingRef.current && Date.now() >= seekPendingRef.current) {
        if (Number.isFinite(state?.position)) setCurrentTime(state.position);
        if (state?.duration > 0) setDuration(state.duration);
      }
      timer = setTimeout(poll, 250);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentTrack?.id, playbackMode]);

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

  const syncWithCloud = useCallback(() => cloudPlaylistsRef.current?.flush({force:true}).catch(() => {}), []);
  useEffect(() => {
    if (!accountUser?.username) return;
    const controller = new PlaylistSync({
      account: accountUser.username.trim().toLowerCase(), storage: localStorage, api: musicService,
      onChange: items => { customPlaylistsRef.current=items;setCustomPlaylists(items); },
      onStatus: setPlaylistCloudStatus
    });
    cloudPlaylistsRef.current=controller;
    const sync=()=>controller.flush().catch(()=>{});
    sync(); window.addEventListener('online',sync); window.addEventListener('focus',sync);
    return ()=>{controller.close();if(cloudPlaylistsRef.current===controller)cloudPlaylistsRef.current=null;window.removeEventListener('online',sync);window.removeEventListener('focus',sync);};
  }, [accountUser?.username]);
  const commitPlaylists = useCallback((updater, dirtyIds=[], deletedIds=[]) => {
    const next=updater(customPlaylistsRef.current);
    customPlaylistsRef.current=next;setCustomPlaylists(next);
    cloudPlaylistsRef.current?.update(next,dirtyIds,deletedIds);
  }, []);

  // Sincronizar posición y estado nativo cuando la app vuelve de segundo plano
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onNativeResume = async () => {
      if (videoPlaybackActiveRef.current) return;
      const state = await backgroundPlaybackService.getNativePosition();
      if (!transitionRef.current && state?.audioUrl === fullStreamRef.current && state && typeof state.position === 'number') {
        setCurrentTime(state.position);
        if (state.duration > 0) setDuration(state.duration);
        // Preserve the user's play intent through native buffering.
        if (audioRef.current && playIntentRef.current && state.isPlaying) {
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
    if (!currentTrack || videoPlaybackActiveRef.current) return;

    try {
      const isPreview = currentTrack.audioUrl && (currentTrack.audioUrl.includes('apple-assets-us-std') || currentTrack.audioUrl.includes('AudioPreview'));
      const safeAudio = currentTrack.streamUrl || (!isPreview ? currentTrack.audioUrl : '') || '';

      backgroundPlaybackService.startPlayback({
        id: currentTrack.id,
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
    if (currentTrack && !videoPlaybackActiveRef.current) {
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
      setIsPlaying(true);
      if (transitionRef.current || videoPlaybackActiveRef.current) return;
      if (playbackModeRef.current === 'native') {
        backgroundPlaybackService.resumePlayback();
        if (audioRef.current?.src) audioRef.current.play().catch(() => {});
      }
    };
    const onBgPause = () => {
      setIsPlaying(false);
      audioRef.current?.pause();
      backgroundPlaybackService.pausePlayback();
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
    const generation = playbackGenerationRef.current;
    try {
      const url = await musicService.getFullAudioUrl(ytId);
      if (generation !== playbackGenerationRef.current || currentTrackRef.current?.id !== track.id) {
        return;
      }
      if (!url) {
        console.warn('[MusicContext] Sin stream directo para', ytId, '-> conmutando a YouTube iframe');
        transitionRef.current = false;
        setPlaybackMode('youtube');
        setAudioQuality('full');
        setIsLoadingAudio(false);
        return;
      }

      transitionRef.current = false;
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
      if (!videoPlaybackActiveRef.current) backgroundPlaybackService.updatePlaybackState(playIntentRef.current, fullTrack, 0, fullTrack.fullDuration);

      const audio = audioRef.current;
      if (audio && !videoPlaybackActiveRef.current) {
        audio.src = url;
        audio.muted = isNative; // En móvil nativo silenciar web <audio> para evitar eco (suena por ExoPlayer)
        let directFailed = false;
        if (playIntentRef.current) await audio.play().catch((playErr) => {
          directFailed = !isNative;
          console.warn('[MusicContext] audio.play() advertencia:', playErr);
          if (!isNative && currentTrackRef.current?.id === track.id) {
            setPlaybackMode('youtube');
          }
        });
        if (directFailed) return;
      }

      if (generation === playbackGenerationRef.current && currentTrackRef.current?.id === track.id) {
        consecutiveErrorsRef.current = 0;
        setAudioQuality('full');
        setPlaybackMode('native');
      }
    } catch (e) {
      console.warn('[MusicContext] Error en loadFullAudio, conmutando a YouTube iframe:', e);
      if (generation === playbackGenerationRef.current && currentTrackRef.current?.id === track.id) {
        transitionRef.current = false;
        setPlaybackMode('youtube');
      }
    } finally {
      if (generation === playbackGenerationRef.current && currentTrackRef.current?.id === track.id) {
        setIsLoadingAudio(false);
      }
    }
  }, []);

  const handlePlaybackError = useCallback(() => {
    transitionRef.current = false;
    setIsLoadingAudio(false);
    setAudioQuality('unavailable');

    const curQueue = queueRef.current.length > 0 ? queueRef.current : queue;
    if (playIntentRef.current && curQueue.length > 1) {
      if (consecutiveErrorsRef.current < Math.min(curQueue.length, 5)) {
        consecutiveErrorsRef.current += 1;
        console.warn(`[MusicContext] Canción no disponible (#${consecutiveErrorsRef.current}), avanzando automáticamente para mantener reproducción continua...`);
        setTimeout(() => {
          handleNextRef.current?.();
        }, 400);
        return;
      }
    }

    consecutiveErrorsRef.current = 0;
    setIsPlaying(false);
    audioRef.current?.pause();
    backgroundPlaybackService.pausePlayback();
  }, [queue, setIsPlaying]);

  // Prefetch de la versión completa de la siguiente pista en segundo plano
  const prefetchNextFullVersion = useCallback((currentQueue, currentIdx) => {
    if (!Array.isArray(currentQueue) || currentQueue.length === 0) return;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= currentQueue.length) return;
    const next = currentQueue[nextIdx];
    if (!next || next.isRadio || !next.title) return;
    Promise.resolve(next.youtubeId || musicService.getYouTubeId(next.artist, next.title)).then((ytId) => {
      if (!ytId) return;
      if (Capacitor.isNativePlatform()) musicService.getFullAudioUrl(ytId, { deviceOnly: true }).catch(() => {});
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
    const generation = ++playbackGenerationRef.current;
    transitionRef.current = true;
    currentTrackRef.current = track;
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsLoadingAudio(true);
    // Stop the previous native source before any metadata for the new track is sent.
    backgroundPlaybackService.pausePlayback();

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
      try { audio.pause(); audio.removeAttribute?.('src'); audio.src = ''; audio.load(); } catch {}
    }

    const safeTrack = {
      ...track,
      audioUrl: track.streamUrl || (!track.isPreviewOnly && track.audioUrl !== track.previewUrl ? track.audioUrl : null),
      previewUrl: null
    };
    currentTrackRef.current = safeTrack;
    setCurrentTrack(safeTrack);

    // Caso 0: Pista guardada en Modo Offline (reproducción local instantánea sin internet)
    if (musicOfflineService.isTrackOffline(track.id) || track.isOffline) {
      try {
        const offlineRecord = musicOfflineService.getOfflineTrack(track.id) || track;
        const urls = await musicOfflineService.getOfflinePlaybackUrls(track.id);
        if (generation !== playbackGenerationRef.current) return;
        const isNative = Capacitor.isNativePlatform();
        const effectiveUrl = isNative ? urls.nativeUrl : urls.webUrl;

        const offlineTrack = {
          ...safeTrack,
          ...offlineRecord,
          isOffline: true,
          audioUrl: effectiveUrl,
          streamUrl: effectiveUrl
        };

        currentTrackRef.current = offlineTrack;
        transitionRef.current = false;
        setCurrentTrack(offlineTrack);
        setIsLoadingAudio(false);
        setDuration(offlineTrack.fullDuration || offlineTrack.duration || 210);
        setAudioQuality('offline');
        setPlaybackMode('native');
        fullStreamRef.current = effectiveUrl;

        backgroundPlaybackService.updatePlaybackState(
          playIntentRef.current,
          offlineTrack,
          0,
          offlineTrack.fullDuration || offlineTrack.duration || 210
        );

        if (audio) {
          audio.src = urls.webUrl;
          audio.muted = isNative;
          if (playIntentRef.current) await audio.play().catch(console.warn);
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
      transitionRef.current = false;
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

    // Pista resuelta: cargar exclusivamente la canción completa.
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

    // Caso 3: Pista sin youtubeId resuelto todavía -> REPRODUCCIÓN INMEDIATA (CERO SILENCIO TRAS BÚSQUEDA)
    setCurrentTrack(safeTrack);
    setIsPlaying(true);
    setDuration(safeTrack.fullDuration || safeTrack.duration || 210);
    setIsLoadingAudio(true);

    setAudioQuality('loading-full');

    try {
      let ytId = await musicService.getYouTubeId(safeTrack.artist, safeTrack.title);
      if (generation !== playbackGenerationRef.current) return;
      if (!ytId && safeTrack.title) {
        ytId = await musicService.getYouTubeId('', safeTrack.title);
      }
      if (generation !== playbackGenerationRef.current) return;
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
        await loadFullAudio(enriched, ytId);
      } else if (generation === playbackGenerationRef.current) {
        handlePlaybackError();
      }
    } catch (err) {
      console.warn('[MusicContext] Error resolviendo canción completa:', err);
      if (generation === playbackGenerationRef.current) handlePlaybackError();
    } finally {
      if (currentTrackRef.current?.id === safeTrack.id) {
        setIsLoadingAudio(false);
      }
    }
  }, [prefetchNextFullVersion, loadFullAudio, handlePlaybackError, setIsPlaying]);

  // Reproducir estación de radio
  const playRadio = useCallback((radio) => {
    playTrack(radio, [radio]);
  }, [playTrack]);

  // Alternar Play / Pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (transitionRef.current) { setIsPlaying(prev => !prev); return; }
    if (videoPlaybackActiveRef.current) { setIsPlaying(prev => !prev); return; }

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
    const curQueue = queueRef.current.length > 0 ? queueRef.current : queue;
    if (curQueue.length === 0) return;

    if (repeatModeRef.current === 'one') {
      const cur = currentTrackRef.current || curQueue[queueIndexRef.current >= 0 ? queueIndexRef.current : 0];
      if (cur) {
        playTrack(cur, curQueue);
        return;
      }
    }

    let nextIdx;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * curQueue.length);
    } else {
      const curIdx = queueIndexRef.current >= 0 ? queueIndexRef.current : queueIndex;
      nextIdx = curIdx + 1;
      if (nextIdx >= curQueue.length) {
        nextIdx = 0; // Reproducción continua sin fin
      }
    }

    const nextSong = curQueue[nextIdx];
    if (nextSong) {
      setQueueIndex(nextIdx);
      playTrack(nextSong, curQueue);
    }
  }, [queue, queueIndex, isShuffle, playTrack]);
  handleNextRef.current = handleNext;

  const clockRef = useRef({time:0,duration:0});
  clockRef.current = {time:currentTime,duration};
  // Pista anterior
  const handlePrev = useCallback((skipRestart = false) => {
    if (skipRestart !== true && videoPlaybackActiveRef.current && clockRef.current.time > 3) {
      officialVideoPlayerRef.current?.seekTo(0, 'seconds');
      setCurrentTime(0);
      return;
    }
    const useYouTube = currentTrack?.youtubeId && playbackMode === 'youtube';
    if (skipRestart !== true && useYouTube && ytPlayerRef.current && clockRef.current.time > 3) {
      ytPlayerRef.current.seekTo(0, 'seconds');
      setCurrentTime(0);
      return;
    }

    const audio = audioRef.current;
    if (skipRestart !== true && !useYouTube && audio && clockRef.current.time > 3) {
      audio.currentTime = 0;
      backgroundPlaybackService.seekTo(0);
      setCurrentTime(0);
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
  }, [queue, queueIndex, repeatMode, playTrack, currentTrack, playbackMode]);
  handlePrevRef.current = handlePrev;

  // Cambiar posición de la pista (Seek)
  const seekTo = useCallback((seconds) => {
    if (!Number.isFinite(seconds)) return;
    const cleanSeconds = Math.max(0, Math.min(seconds, duration > 0 ? duration : seconds));
    seekPendingRef.current = Date.now() + 800;
    if (videoPlaybackActiveRef.current) {
      setCurrentTime(cleanSeconds);
      officialVideoPlayerRef.current?.seekTo(cleanSeconds, 'seconds');
      return;
    }
    setCurrentTime(cleanSeconds);
    seekPendingRef.current = Date.now() + 600;
    if (playbackMode === 'native') backgroundPlaybackService.seekTo(cleanSeconds);

    const useYouTube = currentTrack?.youtubeId && playbackMode === 'youtube';
    if (useYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(cleanSeconds, 'seconds');
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = cleanSeconds;
      } catch {}
    }
  }, [currentTrack, playbackMode, duration]);

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
  const createPlaylist = useCallback((name, description='', isPublic=false, initialTracks=[]) => {
    const clean=String(name||'').trim();if(!clean)return null;
    const tracks = Array.isArray(initialTracks) ? initialTracks : [];
    const item={
      id:'pl_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      name:clean,
      description:String(description).trim(),
      isPublic:Boolean(isPublic),
      createdAt:Date.now(),
      updatedAt:Date.now(),
      cover:tracks[0]?.cover || '',
      tracks
    };
    commitPlaylists(list=>[item,...list],[item.id]);return item;
  }, [commitPlaylists]);

  const saveAlbumAsPlaylist = useCallback(async (album) => {
    if (!album || !album.title) return null;
    const albumTitle = String(album.title).trim();
    const artistName = String(album.artist || '').trim();
    const defaultName = artistName ? `${albumTitle} - ${artistName}` : albumTitle;

    const existing = customPlaylistsRef.current.find(
      p => p.name.toLowerCase() === defaultName.toLowerCase() || p.name.toLowerCase() === albumTitle.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    let tracks = Array.isArray(album.tracks) && album.tracks.length > 0 ? album.tracks : [];
    if (tracks.length === 0 && album.id) {
      try {
        tracks = await musicService.getAlbumTracks(album.id, album.title, album.artist);
      } catch (err) {
        console.warn('[MusicContext] No se pudieron obtener pistas al guardar álbum:', err);
      }
    }

    const cover = album.cover || tracks[0]?.cover || '';
    const item = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: defaultName,
      description: `Álbum guardado${artistName ? ` de ${artistName}` : ''}${album.releaseDate ? ` (${album.releaseDate})` : ''}`,
      isPublic: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cover: cover,
      tracks: tracks
    };

    commitPlaylists(list => [item, ...list], [item.id]);
    return item;
  }, [commitPlaylists]);

  const isAlbumSavedAsPlaylist = useCallback((album) => {
    if (!album || !album.title) return false;
    const albumTitle = String(album.title).trim().toLowerCase();
    const artistName = String(album.artist || '').trim().toLowerCase();
    const fullName = artistName ? `${albumTitle} - ${artistName}` : albumTitle;
    return customPlaylists.some(
      p => p.name.toLowerCase() === fullName || p.name.toLowerCase() === albumTitle
    );
  }, [customPlaylists]);
  const togglePlaylistPrivacy=useCallback(id=>{
    commitPlaylists(list=>list.map(p=>p.id===id?{...p,isPublic:!p.isPublic,updatedAt:Date.now()}:p),[id]);
  },[commitPlaylists]);
  const deletePlaylist=useCallback(id=>commitPlaylists(list=>list.filter(p=>p.id!==id),[],[id]),[commitPlaylists]);
  const renamePlaylist=useCallback((id,name,description,isPublic)=>{
    const clean=String(name||'').trim();if(!clean)return;
    commitPlaylists(list=>list.map(p=>p.id===id?{...p,name:clean,...(description!==undefined?{description:String(description).trim()}:{}),...(isPublic!==undefined?{isPublic:Boolean(isPublic)}:{}),updatedAt:Date.now()}:p),[id]);
  },[commitPlaylists]);
  const addTrackToPlaylist=useCallback((id,track)=>{
    const item=customPlaylistsRef.current.find(p=>p.id===id);
    if(!item||!track||item.tracks.some(t=>t.id===track.id))return false;
    commitPlaylists(list=>list.map(p=>p.id===id?{...p,tracks:[...p.tracks,track],cover:p.cover||track.cover||'',updatedAt:Date.now()}:p),[id]);return true;
  },[commitPlaylists]);
  const removeTrackFromPlaylist=useCallback((id,trackId)=>{
    commitPlaylists(list=>list.map(p=>{if(p.id!==id)return p;const tracks=p.tracks.filter(t=>t.id!==trackId);return {...p,tracks,cover:tracks[0]?.cover||'',updatedAt:Date.now()};}),[id]);
  },[commitPlaylists]);
  const toggleTrackInPlaylist=useCallback((id,track)=>{
    if(!track)return;const item=customPlaylistsRef.current.find(p=>p.id===id);if(!item)return;
    if(item.tracks.some(t=>t.id===track.id))removeTrackFromPlaylist(id,track.id);else addTrackToPlaylist(id,track);
  },[addTrackToPlaylist,removeTrackFromPlaylist]);

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
    handlePlaybackError,
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
    playlistCloudStatus,
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
    saveAlbumAsPlaylist,
    isAlbumSavedAsPlaylist,
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
    ytPlayerRef,
    officialVideoPlayerRef,
    seekPendingRef,
    playIntentRef,
    setVideoPlaybackActive,
    videoPlaybackActive
  };

  const libraryValue = useMemo(() => {
    const {currentTime: _time, duration: _duration, ...library} = value;
    return library;
  }, Object.values(value).filter((_, index) => !['currentTime','duration'].includes(Object.keys(value)[index])));
  return (
    <MusicLibraryContext.Provider value={libraryValue}>
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
    </MusicLibraryContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic debe usarse dentro de un MusicProvider');
  }
  return context;
}

export function useMusicLibrary() { return useContext(MusicLibraryContext); }
