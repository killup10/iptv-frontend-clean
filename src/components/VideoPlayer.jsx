import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getPlayerType } from '../utils/platformUtils';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { backgroundPlaybackService } from '../services/backgroundPlayback';
import useProgressReporter from '../hooks/useProgressReporter';
import useElectronMpvProgress from '../hooks/useElectronMpvProgress';
import { videoProgressService } from '../services/videoProgress';

// Este componente es un "despachador" que decide qué hacer según la plataforma.
export default function VideoPlayer({ url, itemId, startTime, initialAutoplay, title, chapters }) {
  const platform = getPlayerType(); // Ahora es síncrono
  const videoRef = useRef(null);
  const isPlayingRef = useRef(false);
  
  // Estados para Android VLC progress tracking
  const [currentTime, setCurrentTime] = useState(0);
  const lastSavedTimeRef = useRef(0);
  const progressIntervalRef = useRef(null);

  // Hook para manejar progreso en Android VLC (fuera del condicional de renderizado)
  useEffect(() => {
    if (platform !== 'android-vlc' || !itemId) return;

    // Inicializar progreso con startTime si está disponible
    if (startTime > 0) {
      setCurrentTime(startTime);
      lastSavedTimeRef.current = startTime;
    }

    // Función para guardar progreso
    const saveProgress = async (currentTimeValue, completed = false) => {
      if (currentTimeValue > 0 && itemId) {
        try {
          console.log(`[VideoPlayer] Guardando progreso VLC: ${currentTimeValue}s para video ${itemId}, completed: ${completed}`);
          await videoProgressService.saveProgress(itemId, { 
            lastTime: currentTimeValue,
            completed 
          });
          lastSavedTimeRef.current = currentTimeValue;
        } catch (error) {
          console.error('[VideoPlayer] Error guardando progreso VLC:', error);
        }
      }
    };

    // Manejar eventos de progreso del plugin nativo
    const handleTimeUpdate = (data) => {
      const currentTimeValue = data.currentTime || 0;
      const completed = data.completed || false;
      
      console.log(`[VideoPlayer] Evento de progreso recibido: ${currentTimeValue}s, completed: ${completed}`);
      
      setCurrentTime(currentTimeValue);
      lastSavedTimeRef.current = currentTimeValue;
      
      // Si el video se completó, guardar inmediatamente
      if (completed) {
        saveProgress(currentTimeValue, true);
      }
    };

    // Registrar listener para eventos de progreso del plugin nativo
    let progressListener = null;
    if (VideoPlayerPlugin && VideoPlayerPlugin.addListener) {
      progressListener = VideoPlayerPlugin.addListener('timeupdate', handleTimeUpdate);
      console.log('[VideoPlayer] Listener de progreso VLC registrado');
    }

    // Configurar intervalo para guardar progreso cada 20 segundos
    const progressSaveInterval = setInterval(async () => {
      const currentTimeValue = lastSavedTimeRef.current;
      if (currentTimeValue > 0) {
        await saveProgress(currentTimeValue, false);
      }
    }, 20000);

    // Cleanup
    return () => {
      clearInterval(progressSaveInterval);
      if (progressListener && progressListener.remove) {
        progressListener.remove();
        console.log('[VideoPlayer] Listener de progreso VLC removido');
      }
    };
  }, [platform, itemId, startTime]);

  useEffect(() => {
    // La lógica de reproducción para Android se maneja aquí
    const handleAndroidPlayback = async () => {
      // El nuevo tipo es 'android-vlc'
      if (platform === 'android-vlc' && url && initialAutoplay) {
        try {
          // Inicializar servicio de segundo plano
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
            chapters: chapters || [],
          });

          isPlayingRef.current = true;
        } catch (err) {
          console.error("Error starting Android player:", err);
          await backgroundPlaybackService.stopPlayback();
        }
      }
    };

    handleAndroidPlayback();

    // Cleanup al desmontar
    return () => {
      if (isPlayingRef.current) {
        backgroundPlaybackService.stopPlayback();
        isPlayingRef.current = false;
      }
    };
  }, [platform, url, initialAutoplay, title, startTime, chapters]);

  // Manejar eventos de segundo plano para Android
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

    // Agregar listeners para eventos de segundo plano
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

  // Para plataformas web, crear un reproductor HTML5 con soporte de segundo plano
  useEffect(() => {
    if (platform === 'web' && url && videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedMetadata = async () => {
        if (startTime > 0) {
          video.currentTime = startTime;
        }
        
        if (initialAutoplay) {
          try {
            await video.play();
            isPlayingRef.current = true;
            
            // Inicializar servicio de segundo plano
            await backgroundPlaybackService.startPlayback({
              title: title || "TeamG Play",
              artist: "Reproduciendo contenido",
              album: "TeamG Play",
              artwork: [
                { src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }
              ]
            });
          } catch (error) {
            // Mejor diagnóstico: mostrar mensaje y tratar autoplay silencioso (muted) como fallback
            console.warn('Error al reproducir automáticamente (intentar muted fallback):', error && error.name ? error.name : error);
            try {
              video.muted = true;
              await video.play();
              isPlayingRef.current = true;
              // intentar reanudar segundo plano incluso si estaba muteado
              await backgroundPlaybackService.startPlayback({
                title: title || "TeamG Play",
                artist: "Reproduciendo contenido",
                album: "TeamG Play",
                artwork: [
                  { src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }
                ]
              });
              // intentar desmutear después de un pequeño retraso (opcional)
              setTimeout(() => { try { video.muted = false; } catch (e) {} }, 1500);
            } catch (mutedErr) {
              console.error('Fallback muted autoplay también falló:', mutedErr);
            }
          }
        }
      };

      const handlePlay = () => {
        isPlayingRef.current = true;
        backgroundPlaybackService.resumePlayback();
      };

      const handlePause = () => {
        isPlayingRef.current = false;
        backgroundPlaybackService.pausePlayback();
      };

      const handleTimeUpdate = () => {
        if (video.duration && video.currentTime) {
          backgroundPlaybackService.updatePlaybackPosition(video.currentTime, video.duration);
        }
      };

      const handleEnded = () => {
        isPlayingRef.current = false;
        backgroundPlaybackService.stopPlayback();
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
        
        if (isPlayingRef.current) {
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }
      };
    }
  }, [platform, url, startTime, initialAutoplay, title]);

  // Manejar eventos de segundo plano para web
  useEffect(() => {
    if (platform !== 'web' || !videoRef.current) return;

    const video = videoRef.current;

    const handleBackgroundPlay = () => {
      video.play().catch(console.error);
    };

    const handleBackgroundPause = () => {
      video.pause();
    };

    const handleBackgroundStop = () => {
      video.pause();
      video.currentTime = 0;
    };

    const handleSeekBackward = (event) => {
      const seconds = event.detail?.seconds || 10;
      video.currentTime = Math.max(0, video.currentTime - seconds);
    };

    const handleSeekForward = (event) => {
      const seconds = event.detail?.seconds || 10;
      video.currentTime = Math.min(video.duration || 0, video.currentTime + seconds);
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

  // --- Renderizado basado en la plataforma ---

  // Para Android, la reproducción es nativa - mostrar interfaz con colores del Home
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
        {/* Efecto de brillo de fondo */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at center, hsl(190 100% 50% / 0.3) 0%, transparent 70%)'
          }}
        />
      </div>
    );
  }

  // Para Web, renderizar reproductor HTML5 con soporte de segundo plano
  if (platform === 'web') {
    // Hook que reporta progreso periódicamente al backend
    useProgressReporter(videoRef, itemId, { intervalMs: 20000 });

    return (
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          preload="metadata"
          playsInline
          src={url}
        >
          Tu navegador no soporta el elemento video.
        </video>
      </div>
    );
  }

  // Para Electron, mantener el comportamiento original
  if (platform === 'electron') {
  // Si estamos en Electron, suscribirse al forwarder que escucha eventos mpv del preload
  useElectronMpvProgress(itemId, { intervalMs: 20000 });
    return (
      <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center text-white">
        {/* Este espacio está reservado para MPV en Electron */}
      </div>
    );
  }

  // Fallback por si algo sale mal
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
  chapters: PropTypes.array,
};
