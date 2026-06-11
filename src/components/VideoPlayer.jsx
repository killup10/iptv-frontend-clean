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
  
  const [playbackStarting, setPlaybackStarting] = useState(true);
  const [playbackError, setPlaybackError] = useState(null);
  const [playerActive, setPlayerActive] = useState(false);

  const isPlayingRef = useRef(false);
  const playbackKeyRef = useRef('');
  const isStartingRef = useRef(false);
  const suppressNextAutoplayRef = useRef(false);
  const nativePlaybackSessionIdRef = useRef(
    `teamg-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  
  const lastSavedTimeRef = useRef(0);
  const lastProgressSentAtRef = useRef(0);
  const nativeChapterInfoRef = useRef({
    seasonIndex: currentChapterInfo?.seasonIndex,
    chapterIndex: currentChapterInfo?.chapterIndex
  });

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

  const persistProgressCache = useCallback(async (payload) => {
    if (!itemId || !payload) return;
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
      if (!Number.isFinite(snapshotTime) || snapshotTime < 0) return;

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
      await videoProgressService.saveProgress(itemId, progressPayload);
      await persistProgressCache(progressPayload);
    } catch (error) {
      console.warn('[VideoPlayer] No se pudo sincronizar snapshot nativo:', error);
    }
  }, [disableProgressTracking, itemId, persistProgressCache, supportsNativeProgress]);

  // Android TV: Manejo del botón BACK / ESC cuando la pantalla de carga o error nativa del reproductor está visible
  useEffect(() => {
    if (!isAndroidVlc && !isAndroidExoplayer) return;

    const handleBackKey = async (e) => {
      // Keycode 4: Android Back, 27: Escape, 8: Backspace
      const isBackKey =
        e.key === 'Escape' ||
        e.key === 'GoBack' ||
        e.key === 'BrowserBack' ||
        e.keyCode === 4 ||
        e.keyCode === 27 ||
        e.keyCode === 8;

      if (isBackKey) {
        console.log('[VideoPlayer] BACK/ESC key pressed during loading/error. Stopping native video...');
        e.preventDefault();
        e.stopPropagation();

        try {
          if (VideoPlayerPlugin && typeof VideoPlayerPlugin.stopVideo === 'function') {
            await VideoPlayerPlugin.stopVideo();
          }
        } catch (err) {
          console.warn('[VideoPlayer] Error calling stopVideo on plugin:', err);
        }

        if (onNativePlayerClosed) {
          onNativePlayerClosed();
        }
      }
    };

    window.addEventListener('keydown', handleBackKey, true);
    return () => {
      window.removeEventListener('keydown', handleBackKey, true);
    };
  }, [isAndroidVlc, isAndroidExoplayer, onNativePlayerClosed]);

  // Separate useEffect to handle playerClosed and timeupdate events globally and reliably
  useEffect(() => {
    if (!supportsNativeProgress || !VideoPlayerPlugin?.addListener) return;

    console.log('[VideoPlayer] Registering global native player listeners (closed & progress)');
    
    const handlePlayerClosed = async (closeData) => {
      console.log('[VideoPlayer] Native player stopped/closed event received globally. Saving final progress...');
      
      let finalTime = lastSavedTimeRef.current;
      let completed = Boolean(closeData?.completed);
      let seasonIndex = nativeChapterInfoRef.current.seasonIndex;
      let chapterIndex = nativeChapterInfoRef.current.chapterIndex;

      try {
        const snapshot = await VideoPlayerPlugin.getCurrentTime();
        if (snapshot && Number.isFinite(Number(snapshot.currentTime))) {
          finalTime = Math.max(finalTime, Math.floor(Number(snapshot.currentTime)));
          if (snapshot.completed) completed = true;
          if (Number.isInteger(snapshot.seasonIndex) && snapshot.seasonIndex >= 0) {
            seasonIndex = snapshot.seasonIndex;
          }
          if (Number.isInteger(snapshot.chapterIndex) && snapshot.chapterIndex >= 0) {
            chapterIndex = snapshot.chapterIndex;
          }
        }
      } catch (err) {
        console.warn('[VideoPlayer] Error getting final time snapshot on close:', err);
      }

      if (itemId && !disableProgressTracking && finalTime > 0) {
        const progressPayload = {
          lastTime: finalTime,
          progress: finalTime,
          completed: completed,
        };
        if (Number.isInteger(seasonIndex) && seasonIndex >= 0) progressPayload.lastSeason = seasonIndex;
        if (Number.isInteger(chapterIndex) && chapterIndex >= 0) progressPayload.lastChapter = chapterIndex;

        console.log('[VideoPlayer] Saving final close progress:', progressPayload);
        await videoProgressService.saveProgress(itemId, progressPayload);
        await persistProgressCache(progressPayload);
      }

      isPlayingRef.current = false;
      setPlayerActive(false);
      if (onNativePlayerClosed) {
        onNativePlayerClosed();
      }
    };

    const handleTimeUpdate = async (data) => {
      const time = Math.max(0, Math.floor(Number(data?.currentTime || 0)));
      if (Number.isFinite(time)) {
        lastSavedTimeRef.current = time;
      }
      if (Number.isInteger(data?.seasonIndex) && data.seasonIndex >= 0) {
        nativeChapterInfoRef.current.seasonIndex = data.seasonIndex;
      }
      if (Number.isInteger(data?.chapterIndex) && data.chapterIndex >= 0) {
        nativeChapterInfoRef.current.chapterIndex = data.chapterIndex;
      }

      // Evitar llamadas innecesarias al backend o si está deshabilitado
      if (disableProgressTracking || !itemId || time <= 0) return;

      const now = Date.now();
      // Throttled a 20 segundos
      if (now - lastProgressSentAtRef.current >= 20000) {
        lastProgressSentAtRef.current = now;
        const progressPayload = {
          lastTime: time,
          progress: time,
          completed: Boolean(data?.completed),
        };
        if (Number.isInteger(data?.seasonIndex) && data.seasonIndex >= 0) {
          progressPayload.lastSeason = data.seasonIndex;
        }
        if (Number.isInteger(data?.chapterIndex) && data.chapterIndex >= 0) {
          progressPayload.lastChapter = data.chapterIndex;
        }

        console.log('[VideoPlayer] Throttled save progress:', progressPayload);
        await videoProgressService.saveProgress(itemId, progressPayload);
        await persistProgressCache(progressPayload);
      }
    };

    const stopListener = VideoPlayerPlugin.addListener('stopped', handlePlayerClosed);
    const playerClosedListener = VideoPlayerPlugin.addListener('playerClosed', handlePlayerClosed);
    const timeupdateListener = VideoPlayerPlugin.addListener('timeupdate', handleTimeUpdate);

    return () => {
      console.log('[VideoPlayer] Removing global native player listeners');
      if (stopListener?.remove) stopListener.remove();
      if (playerClosedListener?.remove) playerClosedListener.remove();
      if (timeupdateListener?.remove) timeupdateListener.remove();
    };
  }, [supportsNativeProgress, itemId, disableProgressTracking, onNativePlayerClosed, syncNativeProgressSnapshot, persistProgressCache]);

  // Periodic progress sync interval when native player is active
  useEffect(() => {
    if (!supportsNativeProgress || disableProgressTracking || !playerActive) return;

    console.log('[VideoPlayer] Starting periodic progress sync interval (every 20s)');
    const progressSyncInterval = setInterval(async () => {
      console.log('[VideoPlayer] Executing periodic progress sync...');
      await syncNativeProgressSnapshot();
    }, 20000);

    return () => {
      console.log('[VideoPlayer] Clearing periodic progress sync interval');
      clearInterval(progressSyncInterval);
    };
  }, [supportsNativeProgress, disableProgressTracking, playerActive, syncNativeProgressSnapshot]);

  // Main playback logic for Android
  useEffect(() => {
    if (!url || (!isAndroidVlc && !isAndroidExoplayer)) return;
    if (!initialAutoplay) return;
    if (isUnmountingRef?.current || isNavigatingAwayRef?.current) return;
    
    if (suppressNextAutoplayRef.current) {
      suppressNextAutoplayRef.current = false;
      setPlaybackStarting(false);
      return;
    }

    const playbackKey = `${itemId || ''}|${url}|${currentChapterInfo?.seasonIndex ?? ''}|${currentChapterInfo?.chapterIndex ?? ''}`;
    if (playbackKeyRef.current === playbackKey && (isPlayingRef.current || isStartingRef.current)) return;
    
    playbackKeyRef.current = playbackKey;
    isStartingRef.current = true;
    setPlaybackStarting(true);
    setPlaybackError(null);

    const startPlayback = async () => {
      try {
        if (isLiveTV) {
          await VideoPlayerPlugin.stopVideo();
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const [sessionToken, deviceId] = await Promise.all([
          storage.getItem('token'),
          storage.getItem('deviceId'),
        ]);

        console.log(`[VideoPlayer] Iniciando reproduccion nativa (${effectivePlayerType}): ${url}`);
        
        await VideoPlayerPlugin.playVideo({
          url: url,
          title: title || "TeamG Play",
          metaLine: metaLine || "Cargando contenido...",
          sessionId: nativePlaybackSessionIdRef.current,
          startTime: Math.floor(startTime || 0),
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

        isPlayingRef.current = true;
        isStartingRef.current = false;
        setPlayerActive(true);
        
        // Mantener el estado de "Starting" unos segundos extra para evitar parpadeos si la actividad nativa tarda en cubrir la pantalla
        setTimeout(() => setPlaybackStarting(false), 3000);

      } catch (err) {
        console.error("Error iniciando reproductor nativo:", err);
        setPlaybackError(err.message || "Error al iniciar el reproductor.");
        setPlaybackStarting(false);
        isStartingRef.current = false;
      }
    };

    startPlayback();

    return () => {
      isStartingRef.current = false;
    };
  }, [url, isAndroidVlc, isAndroidExoplayer, initialAutoplay, itemId, currentChapterInfo, title, metaLine, startTime, allChapters, channels, isLiveTV, contentType, effectivePlayerType, isUnmountingRef, isNavigatingAwayRef, onNativePlayerClosed]);

  // Sincronizar canales en vivo dinámicamente si cambian durante la reproducción
  useEffect(() => {
    if (!isLiveTV || !channels || channels.length <= 1 || !playerActive) return;

    console.log('[VideoPlayer] Canales actualizados en vivo, sincronizando con reproductor nativo. Total:', channels.length);
    if (VideoPlayerPlugin && typeof VideoPlayerPlugin.updateLiveChannels === 'function') {
      VideoPlayerPlugin.updateLiveChannels({ channels })
        .then(res => {
          console.log('[VideoPlayer] Sincronizacion de canales en vivo exitosa:', res);
        })
        .catch(err => {
          console.warn('[VideoPlayer] Error al sincronizar canales en vivo:', err);
        });
    }
  }, [channels, isLiveTV, playerActive]);

  // UI Components
  const LoadingOverlay = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl z-50">
       <style>{`
          .tv-loader {
            width: 80px;
            height: 80px;
            border: 8px solid rgba(0,255,255,0.1);
            border-top: 8px solid #00ffff;
            border-radius: 50%;
            animation: spin 1s linear infinite, pulse 2s ease-in-out infinite;
            box-shadow: 0 0 40px rgba(0,255,255,0.2);
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.1) rotate(180deg); } }
          .loading-text {
            background: linear-gradient(90deg, #fff, #00ffff, #fff);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 2s linear infinite;
          }
          @keyframes shine { to { background-position: 200% center; } }
       `}</style>
       <div className="tv-loader mb-10" />
       <h2 className="loading-text text-4xl font-black uppercase tracking-tighter italic mb-4">
          Iniciando Reproducción
       </h2>
       <p className="text-white/40 font-bold uppercase text-xs tracking-[0.5em]">
          {title || "TeamG Play"}
       </p>
    </div>
  );

  const ErrorOverlay = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-2xl z-50 p-10 text-center">
       <div className="text-6xl mb-6">⚠️</div>
       <h2 className="text-white text-3xl font-black mb-4 uppercase tracking-widest">Error de Reproducción</h2>
       <p className="text-red-200 text-lg max-w-2xl font-medium mb-8">{playbackError}</p>
       <button 
         onClick={() => window.location.reload()}
         className="bg-white text-black px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:scale-110 transition-transform"
       >
         Reintentar
       </button>
    </div>
  );

  if (isAndroidVlc || isAndroidExoplayer) {
    return (
      <div className="w-full aspect-video rounded-3xl relative overflow-hidden bg-black shadow-2xl border-4 border-white/5">
        {playbackStarting && <LoadingOverlay />}
        {playbackError && <ErrorOverlay />}
        <img 
          src="/background.png" 
          className="w-full h-full object-cover opacity-20" 
          alt="Loading" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      </div>
    );
  }

  if (platform === 'web') {
    return (
      <div className="w-full aspect-video rounded-3xl overflow-hidden text-white relative bg-[#050510] border-4 border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-black" />
        <div className="relative z-10 h-full flex items-center justify-center p-12 text-center">
          <div className="max-w-3xl">
             <span className="bg-cyan-500/20 text-cyan-400 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block">App Requerida</span>
             <h3 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter italic">Este contenido solo esta disponible en la APP</h3>
             <p className="text-white/60 text-xl mb-10 leading-relaxed font-medium">Instala nuestra aplicación oficial para disfrutar de la máxima calidad sin restricciones.</p>
             <div className="flex gap-6 justify-center">
                <a href={WINDOWS_APP_URL} className="bg-white text-black px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:scale-105 transition-all">Windows</a>
                <a href={ANDROID_APP_URL} className="bg-cyan-500 text-black px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:scale-105 transition-all">Android</a>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'electron') {
    useElectronMpvProgress(itemId, onNextEpisode, seasons, currentChapterInfo, {
      intervalMs: 20000,
      enabled: !disableProgressTracking
    });
    return <div className="w-full aspect-video bg-black rounded-3xl" />;
  }

  return (
    <div className="w-full aspect-video bg-red-900/20 rounded-3xl flex items-center justify-center text-white border-4 border-red-500/20">
      <p className="font-black uppercase tracking-widest text-red-500">Error: Plataforma no soportada</p>
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
