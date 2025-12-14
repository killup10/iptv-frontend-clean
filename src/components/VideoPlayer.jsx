import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getPlayerType, isAndroidTV } from '../utils/platformUtils';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { backgroundPlaybackService } from '../services/backgroundPlayback';
import useProgressReporter from '../hooks/useProgressReporter';
import useElectronMpvProgress from '../hooks/useElectronMpvProgress';
import TVVideoPlayer from './TVVideoPlayer';
import { videoProgressService } from '../services/videoProgress';
import { App as CapacitorApp } from '@capacitor/app';

export default function VideoPlayer({ url, itemId, startTime, initialAutoplay, title, seasons, currentChapterInfo, onNextEpisode, isUnmountingRef, isNavigatingAwayRef, onReturnToChannelList }) {
  const platform = getPlayerType();
  const videoRef = useRef(null);
  const isPlayingRef = useRef(false);
  const hasInitializedRef = useRef(false); // 🔥 CLAVE: Detecta si ya inicializó
  
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const lastSavedTimeRef = useRef(0);
  
  const seasonNumber = seasons?.[currentChapterInfo?.seasonIndex]?.seasonNumber;
  const chapterNumber = seasons?.[currentChapterInfo?.seasonIndex]?.chapters?.[currentChapterInfo?.chapterIndex]?.episodeNumber;
  const allChapters = seasons?.flatMap((season, seasonIndex) => 
    season.chapters?.map(chapter => ({
      ...chapter,
      seasonNumber: season.seasonNumber || (seasonIndex + 1),
      chapterNumber: chapter.episodeNumber
    })) || []
  ) || [];

  console.log('[VideoPlayer] Reproductor simplificado - sin proxy');

  // Android VLC playback - ROBUST VERSION
  useEffect(() => {
    if (!url || platform !== 'android-vlc') {
      return;
    }

    let isCancelled = false;

    const handleAndroidPlayback = async () => {
      // Guard: Si el efecto fue limpiado o el componente se está desmontando, no hacer nada.
      if (isCancelled || isUnmountingRef?.current) {
        console.log('[VideoPlayer] Android: Reproducción cancelada (cleanup o desmontaje).');
        return;
      }

      try {
        // 1. Detener cualquier instancia anterior de VLC.
        // Es seguro llamar a stopVideo() incluso si no hay nada reproduciendo.
        console.log('[VideoPlayer] Android: Deteniendo reproductor anterior antes de iniciar nuevo...');
        await VideoPlayerPlugin.stopVideo();

        // 2. Pequeña pausa para que el sistema libere recursos.
        await new Promise(resolve => setTimeout(resolve, 250));
        if (isCancelled) return;

        // 3. Iniciar el servicio de notificaciones en segundo plano.
        console.log('[VideoPlayer] Android: Iniciando servicio en segundo plano...');
        await backgroundPlaybackService.startPlayback({
          title: title || "TeamG Play",
          artist: "Reproduciendo contenido",
          album: "TeamG Play",
          artwork: [{ src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }]
        });
        if (isCancelled) return;

        // 4. Iniciar la reproducción del nuevo video.
        console.log(`[VideoPlayer] Android: Iniciando reproducción de: ${url}`);
        await VideoPlayerPlugin.playVideo({
          url: url,
          title: title || "Video",
          startTime: startTime || 0,
          chapters: allChapters,
        });

        isPlayingRef.current = true;
        console.log('[VideoPlayer] Android: VLC iniciado correctamente.');

        // 5. Guardar el progreso inicial.
        const initialTime = startTime || 0;
        await videoProgressService.saveProgress(itemId, {
          lastTime: initialTime,
          lastSeason: currentChapterInfo?.seasonIndex,
          lastChapter: currentChapterInfo?.chapterIndex,
          completed: false
        });
        lastSavedTimeRef.current = initialTime;

      } catch (err) {
        console.error("Error iniciando Android player:", err);
        isPlayingRef.current = false;
        // Intentar detener el servicio de fondo si la reproducción falla.
        try {
          await backgroundPlaybackService.stopPlayback();
        } catch (bgErr) {
          console.warn('[VideoPlayer] Error deteniendo background playback tras un fallo:', bgErr);
        }
      }
    };

    handleAndroidPlayback();

    return () => {
      // La función de limpieza marca que el efecto ha sido cancelado.
      // Esto previene que las operaciones asíncronas (como playVideo) se ejecuten
      // si el usuario cambia de capítulo rápidamente.
      isCancelled = true;
      console.log('[VideoPlayer] Android: Cleanup del efecto de reproducción.');
      // La detención global del video se maneja en el `useEffect` de desmontaje global.
    };
  }, [platform, url, initialAutoplay, title, startTime, allChapters, itemId, currentChapterInfo]);

  // Android background events - SIMPLIFICADO
  useEffect(() => {
    if (platform !== 'android-vlc') return;

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
  }, [platform]);

  // 🔥 NUEVO: Listener para eventos del VLC (cambiar canal, etc)
  useEffect(() => {
    if (platform !== 'android-vlc' || !onReturnToChannelList) return;

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
  }, [platform, onReturnToChannelList]);

  // Global cleanup - SIMPLE Y EFECTIVO
  useEffect(() => {
    return async () => {
      console.log('[VideoPlayer] Global cleanup starting...');
      isUnmountingRef.current = true;
      hasInitializedRef.current = false; // Reset para permitir re-inicialización si es necesario
      
      // Pequeña espera para que otros effects vean la bandera
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        console.log('[VideoPlayer] Stopping VLC...');
        if (window.VideoPlayerPlugin?.stopVideo) {
          await window.VideoPlayerPlugin.stopVideo();
        }
      } catch (err) {
        console.warn('[VideoPlayer] Error stopping VLC:', err);
      }

      try {
        console.log('[VideoPlayer] Stopping background playback...');
        if (backgroundPlaybackService?.stopPlayback) {
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
  }, []);

  // App state listener - SIMPLE
  useEffect(() => {
    if (platform !== 'android-vlc') return;

    const forceStop = () => {
      console.log('[VideoPlayer] Force stop triggered (app inactive)');
      try {
        if (window.VideoPlayerPlugin?.stopVideo) {
          window.VideoPlayerPlugin.stopVideo();
        }
        if (backgroundPlaybackService?.stopPlayback) {
          backgroundPlaybackService.stopPlayback();
        }
        isPlayingRef.current = false;
      } catch (err) {
        console.warn('[VideoPlayer] Error in force stop:', err);
      }
    };

    const appStateListener = CapacitorApp.addListener('appStateChange', (state) => {
      console.log('[VideoPlayer] App state changed:', state.isActive);
      if (!state.isActive) forceStop();
    });

    const pauseListener = CapacitorApp.addListener('pause', () => {
      console.log('[VideoPlayer] Pause event received');
      forceStop();
    });

    return () => {
      appStateListener.remove();
      pauseListener.remove();
    };
  }, [platform]);

  // Web player
  useEffect(() => {
    let cleanupDone = false;

    if (platform === 'web' && url && videoRef.current) {
      const video = videoRef.current;

      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (isPlayingRef.current) {
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }
      } catch (e) {
        console.warn('[VideoPlayer] Error cleanup:', e);
      }

      const initBackgroundPlayback = async () => {
        try {
          if (!cleanupDone) {
            await backgroundPlaybackService.startPlayback({
              title: title || "TeamG Play",
              artist: "Reproduciendo contenido",
              album: "TeamG Play",
              artwork: [{ src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }]
            });
          }
        } catch (err) {
          console.warn('[VideoPlayer] Error background playback:', err);
        }
      };
      
      const handleLoadedMetadata = async () => {
        if (startTime > 0) video.currentTime = startTime;

        if (initialAutoplay) {
          try {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              await playPromise;
              isPlayingRef.current = true;
              await initBackgroundPlayback();
            }
          } catch (error) {
            try {
              video.muted = true;
              const mutedPlayPromise = video.play();
              if (mutedPlayPromise !== undefined) {
                await mutedPlayPromise;
                isPlayingRef.current = true;
                await initBackgroundPlayback();
                
                setTimeout(() => {
                  try {
                    video.muted = false;
                    video.play().catch(e => console.warn('[VideoPlayer] Error desmutear:', e));
                  } catch (e) {
                    console.warn('[VideoPlayer] Error:', e);
                  }
                }, 1500);
              }
            } catch (mutedErr) {
              console.error('[VideoPlayer] Muted autoplay fallido:', mutedErr.message);
              setAutoplayFailed(true);
            }
          }
        }
      };

      const handleVideoError = (ev) => {
        try {
          const err = ev.target.error;
          console.error('[VideoPlayer] Error de video:', err?.message);
          setAutoplayFailed(true);
        } catch (e) {
          console.error('[VideoPlayer] Error:', e);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleVideoError);
      
      video.src = url;

      return () => {
        cleanupDone = true;
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleVideoError);
        
        if (isPlayingRef.current) {
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }

        try { 
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {
          console.warn('[VideoPlayer] Error cleanup:', e);
        }
      };
    }
  }, [platform, url, startTime, initialAutoplay, title]);

  // Render
  
  // Android TV - usa reproductor nativo
  if (isAndroidTV()) {
    return (
      <TVVideoPlayer
        videoUrl={url}
        title={title}
        chapters={allChapters}
        onBack={onReturnToChannelList}
        onNextEpisode={onNextEpisode}
        autoPlay={initialAutoplay}
      />
    );
  }

  if (platform === 'android-vlc') {
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
    useProgressReporter(videoRef, itemId, { 
      intervalMs: 20000,
      seasonIndex: currentChapterInfo?.seasonIndex,
      chapterIndex: currentChapterInfo?.chapterIndex
    });

    return (
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          controlsList="nodownload"
          preload="auto"
          playsInline
          autoPlay={false}
          muted={initialAutoplay}
          crossOrigin="anonymous"
          style={{ backgroundColor: '#000' }}
        >
          Tu navegador no soporta el elemento video.
        </video>
      </div>
    );
  }

  if (platform === 'electron') {
    useElectronMpvProgress(itemId, onNextEpisode, seasons, currentChapterInfo, { intervalMs: 20000 });
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
  seasons: PropTypes.array,
  currentChapterInfo: PropTypes.object,
  onNextEpisode: PropTypes.func,
  isUnmountingRef: PropTypes.object
};
