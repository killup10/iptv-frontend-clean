import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import HLS from 'hls.js';
import { getPlayerType } from '../utils/platformUtils';
import { isHLSStream } from '../utils/playerUtils';
import { maskUrl } from '../utils/debugUtils';
import { getProxiedStreamUrl } from '../utils/streamProxy';
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
  
  // 🔧 FIX: Prevenir que onEnded se dispare múltiples veces
  const hasNavigatedToNextEpisodeRef = useRef(false);

  const seasonNumber = seasons?.[currentChapterInfo?.seasonIndex]?.seasonNumber;
  const chapterNumber = seasons?.[currentChapterInfo?.seasonIndex]?.chapters?.[currentChapterInfo?.chapterIndex]?.episodeNumber;
  const allChapters = seasons?.flatMap(season => season.chapters) || [];

  // 🔥 VERIFICACIÓN DE BUILD: Este log aparecerá SOLO si el build se compiló correctamente
  console.log('[VideoPlayer] 🔥 VERIFICACIÓN: Build contiene los últimos cambios - SIN CANDADO (17 Dic 2024)');

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

  // Efecto para plataforma Android
  useEffect(() => {
    const handleAndroidPlayback = async () => {
      // Prevenir re-inicios si estamos saliendo de la página
      if (isUnmountingRef?.current) {
        console.log('[VideoPlayer] Android playback cancelado: página en proceso de unmount');
        return;
      }
      
      if (platform === 'android-vlc' && url && initialAutoplay) {
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
          
          // Guardar al menos el capítulo actual (índices) cuando el reproductor nativo arranca,
          // así "Continuar viendo" puede apuntar al episodio correcto aunque no haya eventos de progreso.
          try {
            const initialTime = startTime || 0;
            await videoProgressService.saveProgress(itemId, {
              lastTime: initialTime,
              lastSeason: currentChapterInfo?.seasonIndex,
              lastChapter: currentChapterInfo?.chapterIndex,
              completed: false
            });
            lastSavedTimeRef.current = initialTime;
            console.log('[VideoPlayer] Progreso inicial VLC guardado:', { initialTime, lastSeason: currentChapterInfo?.seasonIndex, lastChapter: currentChapterInfo?.chapterIndex });
          } catch (err) {
            console.warn('[VideoPlayer] No se pudo guardar el progreso inicial para VLC:', err);
          }
        } catch (err) {
          console.error("Error starting Android player:", err);
          await backgroundPlaybackService.stopPlayback();
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

  // Reproductor HTML5 con soporte HLS (M3U8) y segundo plano para Web
  const hlsInstanceRef = useRef(null);

  // 🔧 FIX: Resetear flag cuando cambia el video (nuevo episodio)
  useEffect(() => {
    hasNavigatedToNextEpisodeRef.current = false;
    console.log('[VideoPlayer] 🔄 Reseteando flag de navegación al siguiente episodio');
  }, [url, itemId, currentChapterInfo?.chapterIndex]);

  useEffect(() => {
    let cleanupDone = false;

    if (platform === 'web' && url && videoRef.current) {
      const video = videoRef.current;
      
      // 🔒 Aplicar proxy para URLs sensibles (HTTPS, Dropbox, etc.)
      const streamUrl = getProxiedStreamUrl(url);
      const isUsingProxy = streamUrl !== url;
      
      console.log('[VideoPlayer] Inicializando reproductor web con URL:', maskUrl(url));
      if (isUsingProxy) {
        console.log('[VideoPlayer] 🔒 Usando proxy seguro para stream');
      }
      console.log('[VideoPlayer] ¿Es stream HLS (M3U8)?', isHLSStream(url));

      // Limpiar reproductor anterior si existe
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.destroy();
          hlsInstanceRef.current = null;
        }
        if (isPlayingRef.current) {
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }
      } catch (e) {
        console.warn('[VideoPlayer] Error en cleanup inicial:', e);
      }

      // Inicializar HLS.js si es un stream M3U8
      if (isHLSStream(url)) {
        console.log('[VideoPlayer] 📡 Inicializando HLS.js para stream M3U8:', maskUrl(url));
        
        if (HLS.isSupported()) {
          const hls = new HLS({
            // Configuración optimizada para streams en vivo/estables
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 120,
            maxMaxBufferLength: 150,
            maxBufferLength: 90,
            maxBufferSize: 80 * 1000 * 1000, // 80MB
            maxLoadingDelay: 8,
            minAutoBitrate: 0,
            fragLoadPolicy: {
              default: {
                maxTimeToFirstByteMs: 20000,  // Más tiempo para cargar
                maxLoadTimeMs: 60000,          // Más tolerancia
              }
            },
            levelLoadingRetryDelay: 2000,
            manifestLoadingRetryDelay: 2000,
            testSegments: false,
            debug: false,
            nudgeOffset: 0.3,
            maxFontCache: 20
          });

          hlsInstanceRef.current = hls;

          // 🔒 Usar streamUrl proxificada
          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(HLS.Events.MANIFEST_PARSED, () => {
            console.log('[VideoPlayer] ✅ Manifest HLS parseado correctamente');
            console.log('[VideoPlayer] Niveles disponibles:', hls.levels.map(l => `${l.height}p @ ${(l.bitrate/1000).toFixed(0)}kbps`).join(', '));
            
            // Seleccionar mejor calidad automáticamente
            if (hls.levels.length > 0) {
              hls.currentLevel = hls.levels.length - 1;
            }
            
            video.currentTime = startTime || 0;
            if (initialAutoplay) {
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.catch((err) => {
                  console.warn('[VideoPlayer] Autoplay fallido (HLS):', err);
                  setAutoplayFailed(true);
                });
              }
            }
          });

          hls.on(HLS.Events.FRAG_LOADED, (event, data) => {
            console.log(`[VideoPlayer] 📦 Fragment ${data.frag.sn} cargado (${(data.stats.total / 1024).toFixed(2)}KB)`);
          });

          hls.on(HLS.Events.ERROR, (event, data) => {
            console.error('[VideoPlayer] ❌ Error HLS:', {
              type: data.type,
              details: data.details,
              fatal: data.fatal
            });
            
            if (data.fatal) {
              switch (data.type) {
                case HLS.ErrorTypes.NETWORK_ERROR:
                  console.error('[VideoPlayer] Error de red HLS, intentando recuperar...');
                  // Reintentar después de 3 segundos
                  setTimeout(() => {
                    console.log('[VideoPlayer] 🔄 Reintentando carga de HLS...');
                    hls.startLoad();
                  }, 3000);
                  break;
                case HLS.ErrorTypes.MEDIA_ERROR:
                  console.error('[VideoPlayer] Error de media HLS, intentando recuperar...');
                  try {
                    hls.recoverMediaError();
                  } catch (e) {
                    console.error('[VideoPlayer] No se pudo recuperar error de media:', e);
                    // Último recurso: intentar cargar nuevamente
                    setTimeout(() => {
                      hls.startLoad();
                    }, 2000);
                  }
                  break;
                default:
                  console.error('[VideoPlayer] ❌ Error fatal HLS, no se puede recuperar');
                  // Último intento: mostrar fallback HTML5
                  if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    console.log('[VideoPlayer] 🔄 Intentando fallback a Safari nativo...');
                    video.src = streamUrl;
                  }
                  break;
              }
            }
          });

          hls.on(HLS.Events.LEVEL_SWITCHED, (event, data) => {
            const level = hls.levels[data.level];
            console.log(`[VideoPlayer] 📊 Calidad: ${level.height}p @ ${(level.bitrate/1000).toFixed(0)}kbps`);
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Fallback para Safari que tiene soporte nativo HLS
          console.log('[VideoPlayer] 🍎 Usando soporte nativo HLS en Safari');
          // 🔒 Usar streamUrl proxificada
          video.src = streamUrl;
          video.currentTime = startTime || 0;
          if (initialAutoplay) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                console.warn('[VideoPlayer] Autoplay fallido (Safari):', err);
                setAutoplayFailed(true);
              });
            }
          }
        } else {
          console.error('[VideoPlayer] ❌ Navegador no soporta HLS');
          setAutoplayFailed(true);
        }
      } else {
        // Para streams MP4/WebM normales
        console.log('[VideoPlayer] 📹 Inicializando reproducción HTML5 nativa para:', maskUrl(url));
        // 🔒 Usar streamUrl proxificada
        video.src = streamUrl;
        video.currentTime = startTime || 0;
        if (initialAutoplay) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('[VideoPlayer] Autoplay fallido (HTML5):', err);
              setAutoplayFailed(true);
            });
          }
        }
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
          console.log('[VideoPlayer] handleLoadedMetadata - intentando autoplay, initialAutoplay=', initialAutoplay, 'video.readyState=', video.readyState, 'videoUrl:', maskUrl(url));

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
            console.warn('[VideoPlayer] Error en primer intento de autoplay:', {
              error: error && error.name ? error.name : error,
              message: error.message,
              readyState: video.readyState,
              networkState: video.networkState,
              currentSrc: video.currentSrc,
              url
            });

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
              console.error('[VideoPlayer] Fallback muted autoplay falló:', {
                error: mutedErr && mutedErr.name ? mutedErr.name : mutedErr,
                message: mutedErr.message,
                readyState: video.readyState,
                networkState: video.networkState,
                url: url
              });
              setAutoplayFailed(true);
            }
          }
        }
      };

      const handleVideoError = (ev) => {
        try {
          const err = ev.target.error;
          console.error('[VideoPlayer] Error detallado:', {
            error: err,
            code: err?.code,
            message: err?.message,
            videoUrl: url,
            readyState: ev.target?.readyState,
            networkState: ev.target?.networkState,
            currentTime: ev.target?.currentTime,
            paused: ev.target?.paused,
            currentSrc: ev.target?.currentSrc,
            mediaError: err ? {
              MEDIA_ERR_ABORTED: err.MEDIA_ERR_ABORTED,
              MEDIA_ERR_NETWORK: err.MEDIA_ERR_NETWORK,
              MEDIA_ERR_DECODE: err.MEDIA_ERR_DECODE,
              MEDIA_ERR_SRC_NOT_SUPPORTED: err.MEDIA_ERR_SRC_NOT_SUPPORTED
            } : null
          });
          setAutoplayFailed(true);
        } catch (e) {
          console.error('[VideoPlayer] Error en manejador de errores:', e);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleVideoError);
      
      // Establecer la fuente del video SOLO para streams no-HLS (HLS.js lo maneja automáticamente)
      if (!isHLSStream(url)) {
        video.src = url;
      }

      return () => {
        cleanupDone = true;
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleVideoError);
        
        // Cleanup de HLS.js si existe
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.destroy();
          hlsInstanceRef.current = null;
        }
        
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

  // Limpieza global cuando VideoPlayer se desmonta completamente
  useEffect(() => {
    return () => {
      console.log('[VideoPlayer] VideoPlayer se está desmontando - limpieza global...');
      
      // Detener VLC plugin si existe - MÚLTIPLES INTENTOS
      try {
        if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.stopVideo === 'function') {
          window.VideoPlayerPlugin.stopVideo();
          console.log('[VideoPlayer] Global cleanup: VLC plugin detenido al desmontar');
        }
      } catch (err) {
        console.warn('[VideoPlayer] Global cleanup: Error deteniendo VLC plugin:', err);
      }

      // Detener background playback
      try {
        if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
          backgroundPlaybackService.stopPlayback();
          console.log('[VideoPlayer] Global cleanup: Background playback detenido al desmontar');
        }
      } catch (err) {
        console.warn('[VideoPlayer] Global cleanup: Error deteniendo background playback:', err);
      }

      // Pausar y limpiar video HTML5
      try {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
          console.log('[VideoPlayer] Global cleanup: Video HTML5 pausado al desmontar');
        }
      } catch (err) {
        console.warn('[VideoPlayer] Global cleanup: Error limpiando video HTML5:', err);
      }

      isPlayingRef.current = false;
    };
  }, []);

  // Manejar el estado de la app (minimizar, cerrar) para detener la reproducción - MEJORADO
  useEffect(() => {
    if (platform !== 'android-vlc') return;

    const listener = CapacitorApp.addListener('appStateChange', (state) => {
      console.log('[VideoPlayer] App state changed:', state.isActive);
      
      // Si la app ya no está activa (se minimizó o se está cerrando)
      if (!state.isActive) {
        console.log('[VideoPlayer] App inactiva. Forzando detención COMPLETA de VLC...');
        
        // Intentar múltiples métodos para asegurar que VLC se detenga
        try {
          // Método 1: stopVideo
          if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.stopVideo === 'function') {
            window.VideoPlayerPlugin.stopVideo();
            console.log('[VideoPlayer] Método 1: stopVideo() ejecutado');
          }
          
          // Método 2: forceStopVideo (si existe)
          if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.forceStopVideo === 'function') {
            window.VideoPlayerPlugin.forceStopVideo();
            console.log('[VideoPlayer] Método 2: forceStopVideo() ejecutado');
          }
          
          // Detener background playback
          if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
            backgroundPlaybackService.stopPlayback();
            console.log('[VideoPlayer] Background playback detenido');
          }
          
          isPlayingRef.current = false;
        } catch (err) {
          console.error('[VideoPlayer] Error al forzar detención de VLC en app inactiva:', err);
        }
      }
    });

    // También escuchar el evento de pausa de la app
    const pauseListener = CapacitorApp.addListener('pause', () => {
      console.log('[VideoPlayer] App pausada - deteniendo VLC');
      try {
        if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.stopVideo === 'function') {
          window.VideoPlayerPlugin.stopVideo();
        }
        backgroundPlaybackService.stopPlayback();
        isPlayingRef.current = false;
      } catch (err) {
        console.error('[VideoPlayer] Error al detener VLC en pausa:', err);
      }
    });

    return () => {
      listener.remove();
      pauseListener.remove();
    };
  }, [platform]);

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
        {/* CANDADO ELIMINADO - No funciona con reproductor nativo */}
      </div>
    );
  }

  if (platform === 'web') {
    useProgressReporter(videoRef, itemId, { 
      intervalMs: 20000,
      seasonIndex: currentChapterInfo?.seasonIndex,
      chapterIndex: currentChapterInfo?.chapterIndex
    });

    // 🎬 Efecto para forzar autoplay sin click manual
    useEffect(() => {
      if (!initialAutoplay || !videoRef.current) return;
      
      const video = videoRef.current;
      
      const attemptAutoplay = async () => {
        try {
          console.log('[VideoPlayer] 🎬 Intentando autoplay automático sin click...');
          const playPromise = video.play();
          
          if (playPromise !== undefined) {
            await playPromise;
            isPlayingRef.current = true;
            console.log('[VideoPlayer] ✅ Autoplay EXITOSO sin click manual');
            
            // Iniciar background playback
            try {
              await backgroundPlaybackService.startPlayback({
                title: title || 'TeamG Play',
                artist: 'Reproduciendo contenido',
                album: 'TeamG Play',
                artwork: [{ src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }]
              });
            } catch (bgErr) {
              console.warn('[VideoPlayer] Error iniciando background playback:', bgErr);
            }
          }
        } catch (err) {
          console.warn('[VideoPlayer] ⚠️ Autoplay falló, intentando con muted...', err);
          try {
            video.muted = true;
            await video.play();
            isPlayingRef.current = true;
            console.log('[VideoPlayer] ✅ Autoplay EXITOSO con muted=true');
            
            // Desmutear después de 1.5s
            setTimeout(() => {
              try {
                video.muted = false;
                console.log('[VideoPlayer] Desmuteo completado');
              } catch (e) {
                console.warn('[VideoPlayer] Error desmutando:', e);
              }
            }, 1500);
          } catch (err2) {
            console.error('[VideoPlayer] ❌ Autoplay falló incluso con muted:', err2);
            setAutoplayFailed(true);
          }
        }
      };
      
      // Intentar autoplay después de que el video esté listo (con delay)
      if (video.readyState >= 3) {
        // Ya está listo, intentar ahora
        attemptAutoplay();
      } else {
        // Esperar a que esté listo
        const handleCanPlay = () => {
          console.log('[VideoPlayer] canplay event, intentando autoplay...');
          attemptAutoplay();
          video.removeEventListener('canplay', handleCanPlay);
        };
        video.addEventListener('canplay', handleCanPlay);
      }
    }, [initialAutoplay, url, title]);

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
            onLoadStart={() => console.log('[VideoPlayer] onLoadStart', { url: maskUrl(url) })}
            onLoadedMetadata={(e) => console.log('[VideoPlayer] onLoadedMetadata', { 
              readyState: e.target.readyState,
              videoWidth: e.target.videoWidth,
              videoHeight: e.target.videoHeight,
              duration: e.target.duration
            })}
            onCanPlay={() => console.log('[VideoPlayer] onCanPlay - video puede comenzar a reproducirse')}
            onPlay={() => console.log('[VideoPlayer] onPlay - reproducción iniciada')}
            onEnded={() => {
              console.log('[VideoPlayer] Video terminado, intentando reproducir siguiente episodio');
              
              // 🔧 FIX: Prevenir que onEnded se dispare múltiples veces
              if (hasNavigatedToNextEpisodeRef.current) {
                console.log('[VideoPlayer] ⚠️ Ya navegamos al siguiente episodio, ignorando evento onEnded duplicado');
                return;
              }
              
              if (onNextEpisode && seasons && currentChapterInfo) {
                const { seasonIndex, chapterIndex } = currentChapterInfo;
                const currentSeason = seasons[seasonIndex];
                
                if (currentSeason && currentSeason.chapters.length > chapterIndex + 1) {
                  console.log('[VideoPlayer] Reproduciendo siguiente episodio de la misma temporada');
                  hasNavigatedToNextEpisodeRef.current = true; // Marcar como navegado
                  onNextEpisode(seasonIndex, chapterIndex + 1);
                } else if (seasons.length > seasonIndex + 1) {
                  console.log('[VideoPlayer] Reproduciendo primer episodio de la siguiente temporada');
                  hasNavigatedToNextEpisodeRef.current = true; // Marcar como navegado
                  onNextEpisode(seasonIndex + 1, 0);
                } else {
                  console.log('[VideoPlayer] No hay más episodios disponibles');
                }
              }
            }}
            onError={(e) => {
              const err = e.target.error;
              console.error('[VideoPlayer] onError:', {
                code: err?.code,
                message: err?.message,
                networkState: e.target.networkState,
                readyState: e.target.readyState,
                currentSrc: e.target.currentSrc
              });
            }}
          >
            {/* Para streams no-HLS, el src se establece via JavaScript */}
            {/* HLS.js maneja los streams M3U8 automáticamente */}
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
                  console.log('[VideoPlayer] Usuario pulsó Play manual (overlay) - intentando play() y desmutear');
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
