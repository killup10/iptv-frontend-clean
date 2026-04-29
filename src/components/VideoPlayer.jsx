import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getPlayerType } from '../utils/platformUtils';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { backgroundPlaybackService } from '../services/backgroundPlayback';
import useElectronMpvProgress from '../hooks/useElectronMpvProgress';
import { videoProgressService } from '../services/videoProgress';
import { App as CapacitorApp } from '@capacitor/app';
import { storage } from '../utils/storage';
import { apiBaseURL } from '../utils/axiosInstance';

const DEFAULT_WEB_PLAYBACK_MESSAGE =
  'La reproduccion en navegador web esta deshabilitada. Instala la app de TeamG Play para continuar.';
const WINDOWS_APP_URL = 'https://teamg.store/teamgplay-desktop.exe';
const ANDROID_APP_URL = 'https://teamg.store/teamgplay.apk';

export default function VideoPlayer({ url, itemId, startTime, initialAutoplay, title, metaLine, seasons, currentChapterInfo, onNextEpisode, isUnmountingRef, isNavigatingAwayRef, onReturnToChannelList, onNativePlayerClosed, disableProgressTracking = false, channels, isLiveTV, contentType, nativePlayerType, webPlaybackMessage }) {
  const platform = getPlayerType();
  const effectivePlayerType = nativePlayerType || platform;
  const isAndroidVlc = effectivePlayerType === 'android-vlc';
  const isAndroidExoplayer = effectivePlayerType === 'android-exoplayer';
  const isAndroidMobileVlc = platform === 'android' && isAndroidVlc;
  const supportsNativeProgress = isAndroidVlc || isAndroidExoplayer;
  const shouldBlockBrowserPlayback = platform === 'web';
  const videoRef = useRef(null);
  const isPlayingRef = useRef(false);
  const hasInitializedRef = useRef(false); // 🔥 CLAVE: Detecta si ya inicializó
  const playbackKeyRef = useRef('');
  const isStartingRef = useRef(false);
  const suppressNextAutoplayRef = useRef(false);
  const nativePlaybackSessionIdRef = useRef(
    `teamg-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [currentTime, setCurrentTime] = useState(0);
  const lastSavedTimeRef = useRef(0);
  const lastProgressSentAtRef = useRef(0);
  const latestProgressPayloadRef = useRef(null);
  const nativeChapterInfoRef = useRef({
    seasonIndex: currentChapterInfo?.seasonIndex,
    chapterIndex: currentChapterInfo?.chapterIndex
  });
  
  const seasonNumber = seasons?.[currentChapterInfo?.seasonIndex]?.seasonNumber;
  const chapterNumber = seasons?.[currentChapterInfo?.seasonIndex]?.chapters?.[currentChapterInfo?.chapterIndex]?.episodeNumber;
  const allChapters = useMemo(() => {
    return seasons?.flatMap((season, seasonIndex) =>
      season.chapters?.map((chapter, chapterIndex) => ({
        ...chapter,
        seasonNumber: season.seasonNumber || (seasonIndex + 1),
        chapterNumber: Number.isFinite(Number(chapter?.episodeNumber)) ? Number(chapter.episodeNumber) : (chapterIndex + 1),
        seasonIndex,
        chapterIndex
      })) || []
    ) || [];
  }, [seasons]);

  console.log('[VideoPlayer] Reproductor simplificado - sin proxy');

  useEffect(() => {
    if (Number.isInteger(currentChapterInfo?.seasonIndex) && currentChapterInfo.seasonIndex >= 0) {
      nativeChapterInfoRef.current.seasonIndex = currentChapterInfo.seasonIndex;
    }
    if (Number.isInteger(currentChapterInfo?.chapterIndex) && currentChapterInfo.chapterIndex >= 0) {
      nativeChapterInfoRef.current.chapterIndex = currentChapterInfo.chapterIndex;
    }
  }, [currentChapterInfo?.seasonIndex, currentChapterInfo?.chapterIndex]);

  const persistProgressCache = useCallback(async (payload) => {
    if (!itemId || !payload) return;
    latestProgressPayloadRef.current = payload;
    try {
      localStorage.setItem(`videoProgress_${itemId}`, JSON.stringify(payload));
    } catch (error) {
      console.warn('[VideoPlayer] No se pudo guardar cache local de progreso:', error);
    }
  }, [itemId]);

  const syncNativeProgressSnapshot = useCallback(async () => {
    if (!supportsNativeProgress || !itemId || disableProgressTracking || !VideoPlayerPlugin?.getCurrentTime) {
      return;
    }

    try {
      const snapshot = await VideoPlayerPlugin.getCurrentTime();
      const snapshotTime = Math.max(0, Math.floor(Number(snapshot?.currentTime || 0)));
      if (!Number.isFinite(snapshotTime) || snapshotTime < 0) {
        return;
      }

      const progressPayload = {
        lastTime: snapshotTime,
        progress: snapshotTime,
        completed: Boolean(snapshot?.completed),
      };

      if (Number.isInteger(snapshot?.seasonIndex) && snapshot.seasonIndex >= 0) {
        progressPayload.lastSeason = snapshot.seasonIndex;
      } else if (Number.isInteger(nativeChapterInfoRef.current?.seasonIndex) && nativeChapterInfoRef.current.seasonIndex >= 0) {
        progressPayload.lastSeason = nativeChapterInfoRef.current.seasonIndex;
      }

      if (Number.isInteger(snapshot?.chapterIndex) && snapshot.chapterIndex >= 0) {
        progressPayload.lastChapter = snapshot.chapterIndex;
      } else if (Number.isInteger(nativeChapterInfoRef.current?.chapterIndex) && nativeChapterInfoRef.current.chapterIndex >= 0) {
        progressPayload.lastChapter = nativeChapterInfoRef.current.chapterIndex;
      }

      lastSavedTimeRef.current = snapshotTime;
      setCurrentTime(snapshotTime);
      await videoProgressService.saveProgress(itemId, progressPayload);
      await persistProgressCache(progressPayload);
    } catch (error) {
      console.warn('[VideoPlayer] No se pudo sincronizar snapshot nativo:', error);
    }
  }, [disableProgressTracking, itemId, persistProgressCache, supportsNativeProgress]);

  // Android VLC playback - ROBUST VERSION
  useEffect(() => {
    if (!url || !isAndroidVlc) {
      return;
    }
    if (!initialAutoplay) {
      return;
    }
    if (isUnmountingRef?.current || isNavigatingAwayRef?.current) {
      isStartingRef.current = false;
      return;
    }
    if (suppressNextAutoplayRef.current) {
      suppressNextAutoplayRef.current = false;
      isStartingRef.current = false;
      console.log('[VideoPlayer] Android: auto-reproduccion suprimida tras cierre manual de VLC');
      return;
    }

    const playbackKey = `${itemId || ''}|${url}|${currentChapterInfo?.seasonIndex ?? ''}|${currentChapterInfo?.chapterIndex ?? ''}`;
    if (playbackKeyRef.current === playbackKey && (isPlayingRef.current || isStartingRef.current)) {
      return;
    }
    playbackKeyRef.current = playbackKey;
    isStartingRef.current = true;

    let isCancelled = false;
    const shouldCancel = () => isCancelled || isUnmountingRef?.current || isNavigatingAwayRef?.current;
    const normalizedStartTime = Number.isFinite(startTime) ? Math.max(0, Math.floor(startTime)) : 0;

    const handleAndroidPlayback = async () => {
      // Guard: Si el efecto fue limpiado o el componente se está desmontando, no hacer nada.
      if (shouldCancel()) {
        isStartingRef.current = false;
        console.log('[VideoPlayer] Android: Reproducción cancelada (cleanup o desmontaje).');
        return;
      }

      try {
        // Live TV keeps its hard reset. VOD must not send a stop broadcast here
        // because it can arrive after VLC opens and close the new player.
        if (isLiveTV) {
          console.log('[VideoPlayer] Android: Deteniendo reproductor anterior antes de iniciar Live TV...');
          isPlayingRef.current = false;
          await VideoPlayerPlugin.stopVideo();
          if (shouldCancel()) return;
        }

        // 2. Pequeña pausa para que el sistema libere recursos.
        if (isLiveTV) {
          await new Promise(resolve => setTimeout(resolve, 250));
          if (shouldCancel()) return;
        }

        // 3. Iniciar el servicio de notificaciones en segundo plano.
        if (isAndroidMobileVlc) {
          console.log('[VideoPlayer] Android: Iniciando servicio en segundo plano...');
          await backgroundPlaybackService.startPlayback({
            title: title || "TeamG Play",
            artist: "Reproduciendo contenido",
            album: "TeamG Play",
            artwork: [{ src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }]
          });
          if (shouldCancel()) return;
        }

        // 4. Iniciar la reproducción del nuevo video.
        console.log(`[VideoPlayer] Android: Iniciando reproducción de: ${url}`);
        const [sessionToken, deviceId] = await Promise.all([
          storage.getItem('token'),
          storage.getItem('deviceId'),
        ]);
        await VideoPlayerPlugin.playVideo({
          url: url,
          title: title || "Video",
          metaLine: metaLine || "",
          sessionId: nativePlaybackSessionIdRef.current,
          startTime: normalizedStartTime,
          chapters: allChapters,
          channels: channels,
          isLiveTV: isLiveTV,
          contentType: contentType,
          playerType: effectivePlayerType,
          seasonIndex: currentChapterInfo?.seasonIndex,
          chapterIndex: currentChapterInfo?.chapterIndex,
          sessionToken: sessionToken || "",
          deviceId: deviceId || "",
          apiBaseUrl: apiBaseURL,
        });
        if (shouldCancel()) return;

        isPlayingRef.current = true;
        isStartingRef.current = false;
        console.log('[VideoPlayer] Android: VLC iniciado correctamente.');

        // 5. Guardar el progreso inicial.
        const initialTime = normalizedStartTime;
        if (!disableProgressTracking && itemId) {
          const initialProgressPayload = {
            lastTime: initialTime,
            progress: initialTime,
            lastSeason: currentChapterInfo?.seasonIndex,
            lastChapter: currentChapterInfo?.chapterIndex,
            completed: false
          };
          await videoProgressService.saveProgress(itemId, initialProgressPayload);
          await persistProgressCache(initialProgressPayload);
          lastSavedTimeRef.current = initialTime;
        }

      } catch (err) {
        console.error("Error iniciando Android player:", err);
        isPlayingRef.current = false;
        isStartingRef.current = false;
        // Intentar detener el servicio de fondo si la reproducción falla.
        if (isAndroidMobileVlc) {
          try {
            await backgroundPlaybackService.stopPlayback();
          } catch (bgErr) {
            console.warn('[VideoPlayer] Error deteniendo background playback tras un fallo:', bgErr);
          }
        }
      }
    };

    handleAndroidPlayback();

    return () => {
      // La función de limpieza marca que el efecto ha sido cancelado.
      // Esto previene que las operaciones asíncronas (como playVideo) se ejecuten
      // si el usuario cambia de capítulo rápidamente.
      isCancelled = true;
      isStartingRef.current = false;
      console.log('[VideoPlayer] Android: Cleanup del efecto de reproducción.');
      // La detención global del video se maneja en el `useEffect` de desmontaje global.
    };
  }, [allChapters, contentType, currentChapterInfo, disableProgressTracking, effectivePlayerType, initialAutoplay, isAndroidMobileVlc, isAndroidVlc, isLiveTV, itemId, metaLine, startTime, title, url]);

  // Android TV / ExoPlayer playback
  useEffect(() => {
    if (!url || !isAndroidExoplayer) {
      return;
    }
    if (!initialAutoplay) {
      return;
    }
    if (isUnmountingRef?.current || isNavigatingAwayRef?.current) {
      isStartingRef.current = false;
      return;
    }
    if (suppressNextAutoplayRef.current) {
      suppressNextAutoplayRef.current = false;
      isStartingRef.current = false;
      console.log('[VideoPlayer] Android TV: auto-reproduccion suprimida tras cierre manual del reproductor');
      return;
    }

    const playbackKey = `${itemId || ''}|${url}|${currentChapterInfo?.seasonIndex ?? ''}|${currentChapterInfo?.chapterIndex ?? ''}`;
    if (playbackKeyRef.current === playbackKey && (isPlayingRef.current || isStartingRef.current)) {
      return;
    }
    playbackKeyRef.current = playbackKey;
    isStartingRef.current = true;

    let isCancelled = false;
    const shouldCancel = () => isCancelled || isUnmountingRef?.current || isNavigatingAwayRef?.current;
    const normalizedStartTime = Number.isFinite(startTime) ? Math.max(0, Math.floor(startTime)) : 0;

    const handleAndroidTvPlayback = async () => {
      if (shouldCancel()) {
        isStartingRef.current = false;
        return;
      }

      try {
        console.log('[VideoPlayer] Android TV: deteniendo reproductor anterior antes de iniciar ExoPlayer...');
        isPlayingRef.current = false;
        await VideoPlayerPlugin.stopVideo();
        if (shouldCancel()) return;

        await new Promise((resolve) => setTimeout(resolve, 180));
        if (shouldCancel()) return;

        const [sessionToken, deviceId] = await Promise.all([
          storage.getItem('token'),
          storage.getItem('deviceId'),
        ]);
        await VideoPlayerPlugin.playVideo({
          url: url,
          title: title || "Video",
          metaLine: metaLine || "",
          sessionId: nativePlaybackSessionIdRef.current,
          startTime: normalizedStartTime,
          chapters: allChapters,
          channels: channels,
          isLiveTV: isLiveTV,
          contentType: contentType,
          playerType: effectivePlayerType,
          seasonIndex: currentChapterInfo?.seasonIndex,
          chapterIndex: currentChapterInfo?.chapterIndex,
          sessionToken: sessionToken || "",
          deviceId: deviceId || "",
          apiBaseUrl: apiBaseURL,
        });
        if (shouldCancel()) return;

        isPlayingRef.current = true;
        isStartingRef.current = false;
        console.log('[VideoPlayer] Android TV: ExoPlayer iniciado correctamente.');

        if (!disableProgressTracking && itemId) {
          const initialProgressPayload = {
            lastTime: normalizedStartTime,
            progress: normalizedStartTime,
            lastSeason: currentChapterInfo?.seasonIndex,
            lastChapter: currentChapterInfo?.chapterIndex,
            completed: false
          };
          await videoProgressService.saveProgress(itemId, initialProgressPayload);
          await persistProgressCache(initialProgressPayload);
          lastSavedTimeRef.current = normalizedStartTime;
        }
      } catch (err) {
        console.error('Error iniciando Android TV player:', err);
        isPlayingRef.current = false;
        isStartingRef.current = false;
      }
    };

    handleAndroidTvPlayback();

    return () => {
      isCancelled = true;
      isStartingRef.current = false;
      console.log('[VideoPlayer] Android TV: cleanup del efecto de reproduccion.');
    };
  }, [allChapters, contentType, currentChapterInfo, disableProgressTracking, effectivePlayerType, initialAutoplay, isAndroidExoplayer, isLiveTV, isNavigatingAwayRef, isUnmountingRef, itemId, metaLine, persistProgressCache, startTime, title, url]);

  useEffect(() => {
    if ((!isAndroidVlc && !isAndroidExoplayer) || !isLiveTV || !Array.isArray(channels) || channels.length === 0) {
      return;
    }

    if (typeof VideoPlayerPlugin?.updateLiveChannels !== 'function') {
      return;
    }

    VideoPlayerPlugin.updateLiveChannels({ channels }).catch((error) => {
      console.warn('[VideoPlayer] No se pudo actualizar lista nativa de canales:', error);
    });
  }, [channels, isAndroidExoplayer, isAndroidVlc, isLiveTV]);

  // Android VLC progress tracking for "Continuar viendo"
  useEffect(() => {
    if (!supportsNativeProgress || !itemId || disableProgressTracking) return;

    const PROGRESS_INTERVAL_MS = 20000;
    let progressListener = null;
    let progressInterval = null;
    const normalizeIndex = (value) => (Number.isInteger(value) && value >= 0 ? value : undefined);

    const resolveChapterInfo = (data = {}) => {
      const seasonIndexFromNative = normalizeIndex(data?.seasonIndex);
      const chapterIndexFromNative = normalizeIndex(data?.chapterIndex);

      if (seasonIndexFromNative !== undefined) {
        nativeChapterInfoRef.current.seasonIndex = seasonIndexFromNative;
      }
      if (chapterIndexFromNative !== undefined) {
        nativeChapterInfoRef.current.chapterIndex = chapterIndexFromNative;
      }

      const fallbackSeasonIndex = normalizeIndex(currentChapterInfo?.seasonIndex);
      const fallbackChapterIndex = normalizeIndex(currentChapterInfo?.chapterIndex);

      return {
        seasonIndex: normalizeIndex(nativeChapterInfoRef.current?.seasonIndex) ?? fallbackSeasonIndex,
        chapterIndex: normalizeIndex(nativeChapterInfoRef.current?.chapterIndex) ?? fallbackChapterIndex
      };
    };

    const saveProgress = async (currentTimeValue, completed = false, data = {}) => {
      if (!completed && (!Number.isFinite(currentTimeValue) || currentTimeValue <= 0)) return;
      const chapterInfo = resolveChapterInfo(data);
      const progressPayload = {
        lastTime: Math.max(0, Math.floor(currentTimeValue || 0)),
        progress: Math.max(0, Math.floor(currentTimeValue || 0)),
        completed
      };
      if (chapterInfo.seasonIndex !== undefined) {
        progressPayload.lastSeason = chapterInfo.seasonIndex;
      }
      if (chapterInfo.chapterIndex !== undefined) {
        progressPayload.lastChapter = chapterInfo.chapterIndex;
      }
      await videoProgressService.saveProgress(itemId, progressPayload);
      await persistProgressCache(progressPayload);
      lastProgressSentAtRef.current = Date.now();
    };

    const handleTimeUpdate = (data) => {
      const currentTimeValue = Number(data?.currentTime || 0);
      const completed = Boolean(data?.completed);
      const forceSync = Boolean(data?.forceSync);

      if (Number.isFinite(currentTimeValue) && currentTimeValue >= 0) {
        lastSavedTimeRef.current = currentTimeValue;
        setCurrentTime(currentTimeValue);
      }

      if (completed) {
        saveProgress(currentTimeValue, true, data);
        return;
      }

      if (forceSync) {
        saveProgress(currentTimeValue, false, data);
        return;
      }

      const now = Date.now();
      if (currentTimeValue > 0 && now - lastProgressSentAtRef.current >= PROGRESS_INTERVAL_MS) {
        saveProgress(currentTimeValue, false, data);
      }
    };

    const registerProgressListener = async () => {
      if (!VideoPlayerPlugin?.addListener) {
        return;
      }

      try {
        progressListener = await VideoPlayerPlugin.addListener('timeupdate', handleTimeUpdate);
      } catch (error) {
        console.warn('[VideoPlayer] No se pudo registrar listener de progreso nativo:', error);
      }
    };

    registerProgressListener();

    progressInterval = setInterval(() => {
      const currentTimeValue = lastSavedTimeRef.current;
      if (currentTimeValue > 0) {
        saveProgress(currentTimeValue, false, nativeChapterInfoRef.current);
      }
    }, PROGRESS_INTERVAL_MS);

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      syncNativeProgressSnapshot();
      const finalTime = lastSavedTimeRef.current;
      if (finalTime > 0) {
        saveProgress(finalTime, false, nativeChapterInfoRef.current);
      }
      if (progressListener?.remove) {
        progressListener.remove();
      }
    };
  }, [currentChapterInfo, disableProgressTracking, itemId, persistProgressCache, supportsNativeProgress, syncNativeProgressSnapshot]);

  // Android background events - SIMPLIFICADO
  useEffect(() => {
    if (!isAndroidMobileVlc) return;

    const handlers = {
      'backgroundPlayback:play': () => {
        console.log('[VideoPlayer] Background play event received');
        if (VideoPlayerPlugin?.resumeVideo) VideoPlayerPlugin.resumeVideo();
        backgroundPlaybackService.resumePlayback();
      },
      'backgroundPlayback:pause': () => {
        console.log('[VideoPlayer] Background pause event received');
        if (VideoPlayerPlugin?.pauseVideo) VideoPlayerPlugin.pauseVideo();
        backgroundPlaybackService.pausePlayback();
      },
      'backgroundPlayback:stop': () => {
        console.log('[VideoPlayer] Background stop event received');
        try {
          if (VideoPlayerPlugin?.stopVideo) VideoPlayerPlugin.stopVideo();
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        } catch (err) {
          console.warn('[VideoPlayer] Error in background stop handler:', err);
        }
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [isAndroidMobileVlc]);

  // 🔥 NUEVO: Listener para eventos del VLC (cambiar canal, etc)
  useEffect(() => {
    if (!isAndroidVlc || !onReturnToChannelList) return;

    const handleChannelChangeRequest = () => {
      console.log('[VideoPlayer] Channel change requested from VLC');
      if (onReturnToChannelList) {
        onReturnToChannelList();
      }
    };

    if (VideoPlayerPlugin?.addListener) {
      const listener = VideoPlayerPlugin.addListener('changeChannel', handleChannelChangeRequest);
      return () => {
        if (listener?.remove) listener.remove();
      };
    }
  }, [isAndroidVlc, onReturnToChannelList]);

  // Cuando VLC se cierra manualmente (boton atras), evitar auto-reproduccion inmediata al volver al selector.
  useEffect(() => {
    if (!isAndroidVlc && !isAndroidExoplayer) return;
    if (!VideoPlayerPlugin?.addListener) return;

    const handlePlayerClosed = (data) => {
      console.log('[VideoPlayer] playerClosed recibido desde nativo:', data);
      syncNativeProgressSnapshot();
      isPlayingRef.current = false;
      isStartingRef.current = false;
      suppressNextAutoplayRef.current = true;
      if (typeof onNativePlayerClosed === 'function') {
        onNativePlayerClosed(data || {});
      }
    };

    const closedListener = VideoPlayerPlugin.addListener('playerClosed', handlePlayerClosed);
    return () => {
      if (closedListener?.remove) closedListener.remove();
    };
  }, [isAndroidExoplayer, isAndroidVlc, onNativePlayerClosed, syncNativeProgressSnapshot]);

  // Global cleanup - SIMPLE Y EFECTIVO
  useEffect(() => {
    return async () => {
      console.log('[VideoPlayer] Global cleanup starting...');
      hasInitializedRef.current = false; // Reset para permitir re-inicialización si es necesario
      
      // Pequeña espera para que otros effects vean la bandera
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        if (supportsNativeProgress) {
          await syncNativeProgressSnapshot();
          if ((isUnmountingRef?.current || isNavigatingAwayRef?.current) && VideoPlayerPlugin?.stopVideo) {
            console.log('[VideoPlayer] Stopping native player for current session...');
            await VideoPlayerPlugin.stopVideo({
              sessionId: nativePlaybackSessionIdRef.current
            });
          } else {
            console.log('[VideoPlayer] Cleanup without navigation; preserving native playback session.');
          }
        }
      } catch (err) {
        console.warn('[VideoPlayer] Error stopping native player:', err);
      }

      try {
        if (isAndroidMobileVlc && backgroundPlaybackService?.stopPlayback) {
          console.log('[VideoPlayer] Stopping background playback...');
          await backgroundPlaybackService.stopPlayback();
        }
      } catch (err) {
        console.warn('[VideoPlayer] Error stopping background playback:', err);
      }

      try {
        if (videoRef.current) {
          console.log('[VideoPlayer] Clearing video ref...');
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
      } catch (err) {
        console.warn('[VideoPlayer] Error clearing video ref:', err);
      }

      isPlayingRef.current = false;
      console.log('[VideoPlayer] Global cleanup complete');
    };
  }, [isAndroidMobileVlc, supportsNativeProgress, syncNativeProgressSnapshot]);

  // Android pauses the WebView while the native VLC activity is in front. Do not
  // stop VLC from these lifecycle events; Watch/VideoPlayer cleanup handles real exits.
  useEffect(() => {
    if (!isAndroidMobileVlc) return;

    let appStateListener = null;
    let pauseListener = null;
    let disposed = false;

    const syncProgressOnly = () => {
      console.log('[VideoPlayer] App lifecycle event while native VLC is active; syncing progress without stopping playback.');
      try {
        syncNativeProgressSnapshot();
      } catch (err) {
        console.warn('[VideoPlayer] Error syncing native progress on lifecycle event:', err);
      }
    };

    const setupListeners = async () => {
      try {
        appStateListener = await CapacitorApp.addListener('appStateChange', (state) => {
          if (disposed) return;
          console.log('[VideoPlayer] App state changed:', state.isActive);
          if (!state.isActive) syncProgressOnly();
        });

        pauseListener = await CapacitorApp.addListener('pause', () => {
          if (disposed) return;
          console.log('[VideoPlayer] Pause event received');
          syncProgressOnly();
        });
      } catch (err) {
        console.warn('[VideoPlayer] Error registering lifecycle listeners:', err);
      }
    };

    setupListeners();

    return () => {
      disposed = true;
      if (appStateListener?.remove) appStateListener.remove();
      if (pauseListener?.remove) pauseListener.remove();
    };
  }, [isAndroidMobileVlc, syncNativeProgressSnapshot]);

  // Web playback is intentionally disabled to force app-based playback.
  useEffect(() => {
    if (platform !== 'web' || shouldBlockBrowserPlayback || !videoRef.current) {
      return;
    }

    return undefined;
  }, [platform, shouldBlockBrowserPlayback]);

  // Render
  
  if (isAndroidVlc) {
    return (
      <div 
        className="w-full aspect-video rounded-lg flex items-center justify-center text-white relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, hsl(254 50% 8%) 0%, hsl(315 100% 25% / 0.3) 50%, hsl(190 100% 50% / 0.2) 100%)',
          border: '1px solid hsl(315 100% 25% / 0.5)'
        }}
      >
        <div className="text-center z-10">
          <h3 className="text-lg font-semibold mb-2" style={{
            color: 'hsl(190 100% 50%)',
            textShadow: '0 0 5px hsl(190 100% 50% / 0.8), 0 0 10px hsl(190 100% 50% / 0.6)'
          }}>
            {title}
          </h3>
          <p className="text-sm" style={{
            color: 'hsl(315 100% 60%)',
            textShadow: '0 0 5px hsl(315 100% 60% / 0.8), 0 0 10px hsl(315 100% 60% / 0.6)'
          }}>
            Reproduciendo en VLC
          </p>
        </div>
      </div>
    );
  }

  if (platform === 'web') {
    const installMessage = webPlaybackMessage || DEFAULT_WEB_PLAYBACK_MESSAGE;

    return (
      <div
        className="w-full aspect-video rounded-lg overflow-hidden text-white relative"
        style={{
          background: 'radial-gradient(circle at top, rgba(34, 211, 238, 0.18), rgba(2, 6, 23, 0.98) 58%)',
          border: '1px solid rgba(34, 211, 238, 0.22)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-slate-950 to-black" />
        <div className="relative z-10 h-full flex items-center justify-center p-6 sm:p-8">
          <div className="max-w-2xl text-center">
            <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Solo disponible en la app
            </div>
            <h3 className="mt-5 text-2xl sm:text-4xl font-bold leading-tight text-white">
              Instala TeamG Play para reproducir este contenido
            </h3>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              {installMessage}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={WINDOWS_APP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.02]"
              >
                Descargar para Windows
              </a>
              <a
                href={ANDROID_APP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Descargar APK Android
              </a>
            </div>
            <p className="mt-4 text-xs sm:text-sm text-slate-400">
              La reproduccion en navegador fue deshabilitada por seguridad.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAndroidExoplayer) {
    return (
      <div
        className="w-full aspect-video rounded-lg flex items-center justify-center text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(3, 7, 18, 1) 0%, rgba(12, 74, 110, 0.78) 48%, rgba(8, 145, 178, 0.35) 100%)',
          border: '1px solid rgba(34, 211, 238, 0.35)'
        }}
      >
        <div className="text-center z-10">
          <h3 className="text-lg font-semibold mb-2" style={{
            color: 'rgb(207 250 254)',
            textShadow: '0 0 14px rgba(34, 211, 238, 0.35)'
          }}>
            {title}
          </h3>
          <p className="text-sm" style={{
            color: 'rgb(103 232 249)',
            textShadow: '0 0 10px rgba(34, 211, 238, 0.25)'
          }}>
            Reproduciendo en ExoPlayer
          </p>
        </div>
      </div>
    );
  }

  if (platform === 'electron') {
    useElectronMpvProgress(itemId, onNextEpisode, seasons, currentChapterInfo, {
      intervalMs: 20000,
      enabled: !disableProgressTracking
    });
    return (
      <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center text-white">
        {/* Electron MPV */}
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-red-900 rounded-lg flex items-center justify-center text-white">
      <p>Error: Plataforma no reconocida.</p>
    </div>
  );
}

VideoPlayer.propTypes = {
  url: PropTypes.string.isRequired,
  itemId: PropTypes.string,
  startTime: PropTypes.number,
  initialAutoplay: PropTypes.bool,
  title: PropTypes.string,
  metaLine: PropTypes.string,
  seasons: PropTypes.array,
  currentChapterInfo: PropTypes.object,
  onNextEpisode: PropTypes.func,
  isUnmountingRef: PropTypes.object,
  isNavigatingAwayRef: PropTypes.object,
  disableProgressTracking: PropTypes.bool,
  channels: PropTypes.array,
  isLiveTV: PropTypes.bool,
  contentType: PropTypes.string,
  nativePlayerType: PropTypes.string,
  onReturnToChannelList: PropTypes.func,
  onNativePlayerClosed: PropTypes.func,
  webPlaybackMessage: PropTypes.string
};
