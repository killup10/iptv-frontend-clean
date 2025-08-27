// src/hooks/useBackgroundPlayback.js
import { useEffect, useRef } from 'react';
import { backgroundPlaybackService } from '../services/backgroundPlayback';

export function useBackgroundPlayback(mediaInfo, isActive = false) {
  const isInitializedRef = useRef(false);
  const currentMediaRef = useRef(null);

  useEffect(() => {
    if (!isActive || !mediaInfo) return;

    const initializeBackgroundPlayback = async () => {
      if (isInitializedRef.current && 
          currentMediaRef.current?.title === mediaInfo.title) {
        return; // Ya está inicializado con el mismo contenido
      }

      try {
        await backgroundPlaybackService.startPlayback({
          title: mediaInfo.title || "TeamG Play",
          artist: mediaInfo.artist || "Reproduciendo contenido",
          album: mediaInfo.album || "TeamG Play",
          artwork: mediaInfo.artwork || [
            { src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        isInitializedRef.current = true;
        currentMediaRef.current = mediaInfo;
        console.log('[useBackgroundPlayback] Servicio inicializado para:', mediaInfo.title);
      } catch (error) {
        console.error('[useBackgroundPlayback] Error inicializando:', error);
      }
    };

    initializeBackgroundPlayback();

    // Cleanup al desmontar o cambiar de contenido
    return () => {
      if (isInitializedRef.current) {
        backgroundPlaybackService.stopPlayback();
        isInitializedRef.current = false;
        currentMediaRef.current = null;
        console.log('[useBackgroundPlayback] Servicio detenido');
      }
    };
  }, [isActive, mediaInfo?.title, mediaInfo?.artist]);

  // Funciones de control
  const play = async () => {
    if (isInitializedRef.current) {
      await backgroundPlaybackService.resumePlayback();
    }
  };

  const pause = async () => {
    if (isInitializedRef.current) {
      await backgroundPlaybackService.pausePlayback();
    }
  };

  const stop = async () => {
    if (isInitializedRef.current) {
      await backgroundPlaybackService.stopPlayback();
      isInitializedRef.current = false;
      currentMediaRef.current = null;
    }
  };

  const updatePosition = (currentTime, duration) => {
    if (isInitializedRef.current) {
      backgroundPlaybackService.updatePlaybackPosition(currentTime, duration);
    }
  };

  return {
    play,
    pause,
    stop,
    updatePosition,
    isInitialized: isInitializedRef.current
  };
}

export default useBackgroundPlayback;
