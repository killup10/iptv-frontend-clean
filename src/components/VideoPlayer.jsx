import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getPlayerType } from '../utils/platformUtils';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { backgroundPlaybackService } from '../services/backgroundPlayback';
import useProgressReporter from '../hooks/useProgressReporter';
import useElectronMpvProgress from '../hooks/useElectronMpvProgress';

// Este componente es un "despachador" que decide qué hacer según la plataforma.
export default function VideoPlayer({ url, itemId, startTime, initialAutoplay, title, chapters }) {
  const platform = getPlayerType(); // Ahora es síncrono
  const videoRef = useRef(null);
  const isPlayingRef = useRef(false);

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

  // Para Android, la reproducción es nativa y en pantalla completa.
  // Mostramos una UI que indica que la reproducción está activa en VLC.
  if (platform === 'android-vlc') {
    return (
      <div className="w-full aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white p-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-300">
          ▶️ Reproducción iniciada en VLC Player.
        </p>
        <p className="text-xs text-green-400 mt-1">
          Soporte completo para MKV y Dolby Audio.
        </p>
        <p className="text-xs text-blue-400 mt-1">
          🎵 Reproducción en segundo plano activada
        </p>
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
