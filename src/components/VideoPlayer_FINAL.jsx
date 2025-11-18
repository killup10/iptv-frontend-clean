import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getPlayerType } from '../utils/platformUtils';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { backgroundPlaybackService } from '../services/backgroundPlayback';
import useProgressReporter from '../hooks/useProgressReporter';
import useElectronMpvProgress from '../hooks/useElectronMpvProgress';
import { videoProgressService } from '../services/videoProgress';
import { App as CapacitorApp } from '@capacitor/app';

// Este componente es un "despachador" que decide qué hacer según la plataforma.
export default function VideoPlayer({ url, itemId, startTime, initialAutoplay, title, seasons, currentChapterInfo, onNextEpisode, isUnmountingRef }) {
  const platform = getPlayerType(); // Ahora es síncrono
  const videoRef = useRef(null);
  const isPlayingRef = useRef(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  
  // Estados para Android VLC progress tracking
  const [currentTime, setCurrentTime] = useState(0);
  const lastSavedTimeRef = useRef(0);
  const progressIntervalRef = useRef(null);

  const seasonNumber = seasons?.[currentChapterInfo?.seasonIndex]?.seasonNumber;
  const chapterNumber = seasons?.[currentChapterInfo?.seasonIndex]?.chapters?.[currentChapterInfo?.chapterIndex]?.episodeNumber;
  const allChapters = seasons?.flatMap(season => season.chapters) || [];

  // 🔥 VERIFICACIÓN DE BUILD: Este log aparecerá SOLO si el build se compiló correctamente
  console.log('[VideoPlayer] 🔥 VERIFICACIÓN: Build FINAL con fixes agresivos (18 Dic 2024)');

  // Hook para manejar progreso en Android VLC
  useEffect(() => {
    if (platform !== 'android-vlc' || !itemId) return;

    if (startTime > 0) {
      setCurrentTime(startTime);
      lastSavedTimeRef.current = startTime;
    }

    const saveProgress = async (currentTimeValue, completed = false) => {
      if (currentTimeValue > 0 && itemId) {
        try {
          console.log(`[VideoPlayer] Guardando progreso VLC: ${currentTimeValue}s para video ${itemId}, completed: ${completed}`);
          await videoProgressService.saveProgress(itemId, { 
            lastTime: currentTimeValue,
            completed,
            // Guardar índices (seasonIndex/chapterIndex) para mantener compatibilidad con la UI
            lastSeason: currentChapterInfo?.seasonIndex,
            lastChapter: currentChapterInfo?.chapterIndex
          });
          lastSavedTimeRef.current = currentTimeValue;
        } catch (error) {
          console.error('[VideoPlayer] Error guardando progreso VLC:', error);
        }
      }
    };

    const handleTimeUpdate = (data) => {
      const currentTimeValue = data.currentTime || 0;
      const completed = data.completed || false;

      // LOG 1: See all events
      console.log(`[VideoPlayer] >>> EVENTO DE PROGRESO RECIBIDO: ${JSON.stringify(data)}`);

      setCurrentTime(currentTimeValue);
      lastSavedTimeRef.current = currentTimeValue;

      if (completed) {
        // LOG 2: See when a video completes
        console.log(`[VideoPlayer] >>> VIDEO COMPLETADO. Llamando onNextEpisode...`);
        saveProgress(currentTimeValue, true);
        if (onNextEpisode && seasons && currentChapterInfo) {
          const { seasonIndex, chapterIndex } = currentChapterInfo;
          const currentSeason = seasons[seasonIndex];

          if (currentSeason && currentSeason.chapters.length > chapterIndex + 1) {
            // LOG 3: See what the next episode is
            console.log(`[VideoPlayer] >>> Próximo episodio: Temporada ${seasonIndex}, Capítulo ${chapterIndex + 1}`);
            onNextEpisode(seasonIndex, chapterIndex + 1);
          } else if (seasons.length > seasonIndex + 1) {
            // LOG 3: See what the next episode is
            console.log(`[VideoPlayer] >>> Próximo episodio: Temporada ${seasonIndex + 1}, Capítulo 0`);
            onNextEpisode(seasonIndex + 1, 0);
          } else {
            console.log(`[VideoPlayer] >>> No hay más episodios.`);
          }
        }
      }
    };

    let progressListener = null;
    let stopListener = null;
    if (VideoPlayerPlugin?.addListener) {
      progressListener = VideoPlayerPlugin.addListener('timeupdate', handleTimeUpdate);
      console.log('[VideoPlayer] Listener de progreso VLC registrado');
      
      // Listener para cuando se detiene VLC
      stopListener = VideoPlayerPlugin.addListener('stopped', () => {
        console.log('[VideoPlayer] VLC detuvo');
        isPlayingRef.current = false;
      });
    }

    // Fallback: si el plugin expone getCurrentTime, poll para asegurar que guardamos progreso
    let pluginPollInterval = null;
    if (VideoPlayerPlugin?.getCurrentTime) {
      pluginPollInterval = setInterval(async () => {
        try {
          const res = await VideoPlayerPlugin.getCurrentTime();
          const t = res?.currentTime ?? res?.time ?? null;
          if (typeof t === 'number' && t >= 0) {
            // Actualizar memoria local y guardar
            lastSavedTimeRef.current = t;
            await saveProgress(t, false);
            console.log('[VideoPlayer] Polling VLC currentTime:', t);
          }
        } catch (err) {
          // ignore polling errors
        }
      }, 15000);
    }

    const progressSaveInterval = setInterval(async () => {
      const currentTimeValue = lastSavedTimeRef.current;
      if (currentTimeValue > 0) {
        await saveProgress(currentTimeValue, false);
      }
    }, 20000);

    return () => {
      clearInterval(progressSaveInterval);
      if (pluginPollInterval) clearInterval(pluginPollInterval);
      
      const finalTime = lastSavedTimeRef.current;
      if (finalTime > 0) {
        console.log(`[VideoPlayer] Guardando progreso final al desmontar: ${finalTime}s`);
        saveProgress(finalTime, false);
      }

      if (progressListener?.remove) {
        progressListener.remove();
        console.log('[VideoPlayer] Listener de progreso VLC removido');
      }
      if (stopListener?.remove) {
        stopListener.remove();
        console.log('[VideoPlayer] Stop listener VLC removido');
      }
    };
  }, [platform, itemId, startTime, seasonNumber, chapterNumber, onNextEpisode, seasons, currentChapterInfo]);

  // Efecto para plataforma Android - MEJORADO PARA PREVENIR RE-INICIOS
  useEffect(() => {
    // VERIFICACIÓN DOBLE para prevenir re-inicios
    if (!url || !platform || platform !== 'android-vlc') {
      console.log('[VideoPlayer] Condiciones no cumplidas para Android playback');
      return;
    }

    const handleAndroidPlayback = async () => {
      // VERIFICACIÓN TRIPLE - Prevenir re-inicios si estamos saliendo
      if (isUnmountingRef?.current === true) {
        console.log('[VideoPlayer] ⛔ Android playback BLOQUEADO: página en proceso de unmount');
        return;
      }

      // Verificar si ya está reproduciendo
      if (isPlayingRef.current) {
        console.log('[VideoPlayer] ⚠️ Ya hay una reproducción activa, evitando duplicado');
        return;
      }
      
      if (initialAutoplay) {
        try {
          await backgroundPlaybackService.startPlayback({
            title: title || "TeamG Play",
            artist: "Reproduciendo contenido",
            album: "TeamG Play",
            artwork: [
              { src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }
            ]
          });

          await VideoPlayerPlugin.playVideo({
            url: url,
            title: title || "Video",
            startTime: startTime || 0,
            chapters: allChapters,
          });

          isPlayingRef.current = true;
          console.log('[VideoPlayer] ✓ VLC iniciado correctamente');
          
          // Guardar progreso inicial
          try {
            const initialTime = startTime || 0;
            await videoProgressService.saveProgress(itemId, {
              lastTime: initialTime,
              lastSeason: currentChapterInfo?.seasonIndex,
              lastChapter: currentChapterInfo?.chapterIndex,
              completed: false
            });
            lastSavedTimeRef.current = initialTime;
            console.log('[VideoPlayer] Progreso inicial VLC guardado');
          } catch (err) {
            console.warn('[VideoPlayer] No se pudo guardar el progreso inicial para VLC:', err);
          }
        } catch (err) {
          console.error("Error starting Android player:", err);
          await backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }
      }
    };

    // Añadir un pequeño retardo para dar tiempo al plugin a inicializarse
    const timer = setTimeout(() => {
      handleAndroidPlayback();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (isPlayingRef.current) {
        try {
          console.log('[VideoPlayer] Cleanup Android: Deteniendo reproducción...');
          // Primero detener el plugin VLC
          if (VideoPlayerPlugin && typeof VideoPlayerPlugin.stopVideo === 'function') {
            try {
              VideoPlayerPlugin.stopVideo();
              isPlayingRef.current = false;
              console.log('[VideoPlayer] Cleanup Android: VLC plugin detenido');
            } catch (err) {
              console.warn('[VideoPlayer] Cleanup Android: Error deteniendo VLC plugin:', err);
            }
          }
          // Después detener background playback
          backgroundPlaybackService.stopPlayback();
          console.log('[VideoPlayer] Cleanup Android: Background playback detenido');
        } catch (err) {
          console.warn('[VideoPlayer] Cleanup Android: Error en cleanup:', err);
        }
        isPlayingRef.current = false;
      }
    };
  }, [platform, url, initialAutoplay, title, startTime, allChapters, itemId, currentChapterInfo]);

  // Eventos de segundo plano para Android
  useEffect(() => {
    if (platform !== 'android-vlc') return;

    const handleBackgroundPlay = () => {
      if (VideoPlayerPlugin.resumeVideo) {
        VideoPlayerPlugin.resumeVideo();
        backgroundPlaybackService.resumePlayback();
      }
    };

    const handleBackgroundPause = () => {
      if (VideoPlayerPlugin.pauseVideo) {
        VideoPlayerPlugin.pauseVideo();
        backgroundPlaybackService.pausePlayback();
      }
    };

    const handleBackgroundStop = () => {
      if (VideoPlayerPlugin.stopVideo) {
        VideoPlayerPlugin.stopVideo();
        backgroundPlaybackService.stopPlayback();
        isPlayingRef.current = false;
      }
    };

    const handleSeekBackward = (event) => {
      const seconds = event.detail?.seconds || 10;
      if (VideoPlayerPlugin.seekBackward) {
        VideoPlayerPlugin.seekBackward(seconds);
      }
    };

    const handleSeekForward = (event) => {
      const seconds = event.detail?.seconds || 10;
      if (VideoPlayerPlugin.seekForward) {
        VideoPlayerPlugin.seekForward(seconds);
      }
    };

    window.addEventListener('backgroundPlayback:play', handleBackgroundPlay);
    window.addEventListener('backgroundPlayback:pause', handleBackgroundPause);
    window.addEventListener('backgroundPlayback:stop', handleBackgroundStop);
    window.addEventListener('backgroundPlayback:seekBackward', handleSeekBackward);
    window.addEventListener('backgroundPlayback:seekForward', handleSeekForward);

    return () => {
      window.removeEventListener('backgroundPlayback:play', handleBackgroundPlay);
      window.removeEventListener('backgroundPlayback:pause', handleBackgroundPause);
      window.removeEventListener('backgroundPlayback:stop', handleBackgroundStop);
      window.removeEventListener('backgroundPlayback:seekBackward', handleSeekBackward);
      window.removeEventListener('backgroundPlayback:seekForward', handleSeekForward);
    };
  }, [platform]);

  // Limpieza global cuando VideoPlayer se desmonta completamente
  useEffect(() => {
    return () => {
      console.log('[VideoPlayer] VideoPlayer se está desmontando - limpieza global AGRESIVA...');
      
      // FORZAR detención múltiple de VLC
      for (let i = 0; i < 3; i++) {
        try {
          if (window.VideoPlayerPlugin) {
            if (typeof window.VideoPlayerPlugin.stopVideo === 'function') {
              window.VideoPlayerPlugin.stopVideo();
            }
            if (typeof window.VideoPlayerPlugin.forceStopVideo === 'function') {
              window.VideoPlayerPlugin.forceStopVideo();
            }
          }
        } catch (err) {
          // Ignorar errores, intentar de todos modos
        }
      }
      
      // Detener background playback
      try {
        if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
          backgroundPlaybackService.stopPlayback();
        }
      } catch (err) {
        // Ignorar
      }

      // Pausar y limpiar video HTML5
      try {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
      } catch (err) {
        // Ignorar
      }

      isPlayingRef.current = false;
      console.log('[VideoPlayer] Limpieza global completada');
    };
  }, []);

  // 🔥 NUEVO: Listener MÁS AGRESIVO para el estado de la app
  useEffect(() => {
    if (platform !== 'android-vlc') return;

    // Función helper para detener TODO
    const forceStopEverything = () => {
      console.log('[VideoPlayer] 🛑 FORZANDO DETENCIÓN TOTAL DE VLC');
      
      // Intentar TODOS los métodos posibles
      for (let i = 0; i < 5; i++) {
        try {
          // Método 1: stopVideo normal
          if (window.VideoPlayerPlugin?.stopVideo) {
            window.VideoPlayerPlugin.stopVideo();
          }
          
          // Método 2: forceStopVideo
          if (window.VideoPlayerPlugin?.forceStopVideo) {
            window.VideoPlayerPlugin.forceStopVideo();
          }
          
          // Método 3: Enviar comando directo al plugin (si existe)
          if (window.VideoPlayerPlugin?.sendCommand) {
            window.VideoPlayerPlugin.sendCommand('KILL_VLC');
          }
        } catch (err) {
          // Ignorar errores, seguir intentando
        }
      }
      
      // Detener background playback
      try {
        backgroundPlaybackService?.stopPlayback?.();
      } catch (err) {
        // Ignorar
      }
      
      isPlayingRef.current = false;
    };

    // Listener para cambio de estado de app
    const appStateListener = CapacitorApp.addListener('appStateChange', (state) => {
      console.log('[VideoPlayer] 📱 App state changed:', state.isActive);
      
      if (!state.isActive) {
        forceStopEverything();
      }
    });

    // Listener para pausa
    const pauseListener = CapacitorApp.addListener('pause', () => {
      console.log('[VideoPlayer] ⏸️ App pausada');
      forceStopEverything();
    });

    // Listener para cuando la app va a background
    const backgroundListener = CapacitorApp.addListener('backButton', () => {
      console.log('[VideoPlayer] 🔙 Botón atrás presionado');
      forceStopEverything();
    });

    // 🔥 NUEVO: Detectar cuando el documento pierde visibilidad
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[VideoPlayer] 👁️ Documento oculto - deteniendo VLC');
        forceStopEverything();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 🔥 NUEVO: Detectar cuando la ventana pierde foco
    const handleWindowBlur = () => {
      console.log('[VideoPlayer] 🪟 Ventana perdió foco - deteniendo VLC');
      forceStopEverything();
    };
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      appStateListener.remove();
      pauseListener.remove();
      backgroundListener.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [platform]);

  // Reproductor HTML5 con soporte de segundo plano para Web
  useEffect(() => {
    let cleanupDone = false;

    if (platform === 'web' && url && videoRef.current) {
      const video = videoRef.current;
      console.log('[VideoPlayer] Inicializando reproductor web con URL:', url);

      // Limpiar reproductor anterior si existe
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (isPlayingRef.current) {
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }
      } catch (e) {
        console.warn('[VideoPlayer] Error en cleanup inicial:', e);
      }

      const initBackgroundPlayback = async () => {
        try {
          if (!cleanupDone) {
            await backgroundPlaybackService.startPlayback({
              title: title || "TeamG Play",
              artist: "Reproduciendo contenido",
              album: "TeamG Play",
              artwork: [
                { src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }
              ]
            });
          }
        } catch (err) {
          console.warn('[VideoPlayer] Error al iniciar background playback:', err);
        }
      };
      
      const handleLoadedMetadata = async () => {
        console.log('[VideoPlayer] handleLoadedMetadata called');
        if (startTime > 0) {
          video.currentTime = startTime;
        }

        if (initialAutoplay) {
          console.log('[VideoPlayer] handleLoadedMetadata - intentando autoplay');

          try {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              await playPromise;
              isPlayingRef.current = true;
              console.log('[VideoPlayer] autoplay succeed sin mutear');
              await initBackgroundPlayback();
            } else {
              console.warn('[VideoPlayer] play() devolvió undefined');
            }
          } catch (error) {
            console.warn('[VideoPlayer] Error en primer intento de autoplay:', error.message);

            try {
              video.muted = true;
              console.log('[VideoPlayer] fallback: intentando play() con muted=true');
              const mutedPlayPromise = video.play();
              if (mutedPlayPromise !== undefined) {
                await mutedPlayPromise;
                isPlayingRef.current = true;
                console.log('[VideoPlayer] fallback muted autoplay succeed');
                await initBackgroundPlayback();
                
                setTimeout(() => {
                  try {
                    video.muted = false;
                    video.play().catch(e => console.warn('[VideoPlayer] Error al desmutear:', e));
                  } catch (e) {
                    console.warn('[VideoPlayer] Error en timeout de desmuteo:', e);
                  }
                }, 1500);
              }
            } catch (mutedErr) {
              console.error('[VideoPlayer] Fallback muted autoplay falló:', mutedErr.message);
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
          console.error('[VideoPlayer] Error en manejador de errores:', e);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleVideoError);
      
      // Establecer la fuente del video
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
          console.warn('[VideoPlayer] Error en cleanup de video:', e);
        }
      };
    }
  }, [platform, url, startTime, initialAutoplay, title]);

  // Renderizado según plataforma
  if (platform === 'android-vlc') {
    return (
      <div 
        className="w-full aspect-video rounded-lg flex items-center justify-center text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(254 50% 8%) 0%, hsl(315 100% 25% / 0.3) 50%, hsl(190 100% 50% / 0.2) 100%)',
          border: '1px solid hsl(315 100% 25% / 0.5)'
        }}
      >
        <div className="text-center z-10">
          <h3 
            className="text-lg font-semibold mb-2"
            style={{
              color: 'hsl(190 100% 50%)',
              textShadow: '0 0 5px hsl(190 100% 50% / 0.8), 0 0 10px hsl(190 100% 50% / 0.6)'
            }}
          >
            {title}
          </h3>
          <p 
            className="text-sm"
            style={{
              color: 'hsl(315 100% 60%)',
              textShadow: '0 0 5px hsl(315 100% 60% / 0.8), 0 0 10px hsl(315 100% 60% / 0.6)'
            }}
          >
            Reproduciendo en VLC
          </p>
        </div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at center, hsl(190 100% 50% / 0.3) 0%, transparent 70%)'
          }}
        />
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
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            preload="auto"
            playsInline
            autoPlay={false}
            muted={initialAutoplay}
            crossOrigin="anonymous"
            style={{ backgroundColor: '#000' }}
          >
            <source src={url} type="video/mp4" />
            <source src={url} type="video/webm" />
            Tu navegador no soporta el elemento video.
          </video>
        </div>
        {autoplayFailed && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const v = videoRef.current;
                if (!v) return;
                try {
                  v.muted = false;
                  await v.play();
                  setAutoplayFailed(false);
                  isPlayingRef.current = true;
                  try { 
                    await backgroundPlaybackService.startPlayback({ title: title || 'TeamG Play' }); 
                  } catch (err) { 
                    console.warn('[VideoPlayer] startPlayback tras gesto manual falló:', err); 
                  }
                } catch (err) {
                  console.error('[VideoPlayer] Error al forzar play tras gesto manual:', err);
                }
              }}
              className="px-6 py-3 bg-black bg-opacity-75 text-white rounded-lg shadow-lg hover:bg-opacity-90"
            >
              ▶️ Reproducir
            </button>
          </div>
        )}
      </div>
    );
  }

  if (platform === 'electron') {
    useElectronMpvProgress(itemId, onNextEpisode, seasons, currentChapterInfo, { intervalMs: 20000 });
    return (
      <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center text-white">
        {/* Este espacio está reservado para MPV en Electron */}
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
