// src/components/EmbeddedVlcPlayer.jsx
import React, { useEffect, useRef, useState } from 'react';

const EmbeddedVlcPlayer = ({ videoUrl, style }) => {
  const videoAreaRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const currentVideoArea = videoAreaRef.current;
    let resizeObserver;
    let removeSyncListener;

    // Solo trabajamos con VLC si estamos en Electron y window.electronVLC existe
    const isElectronEnv = typeof window !== 'undefined' && window.electronVLC;

    // Función para enviar bounds (posición/tamaño) al process principal
    const sendBounds = () => {
      if (!isElectronEnv) return;
      if (currentVideoArea && window.electronVLC) {
        const rect = currentVideoArea.getBoundingClientRect();
        const bounds = {
          x: Math.floor(rect.left),
          y: Math.floor(rect.top),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        };
        if (isPlaying && videoUrl) {
          window.electronVLC.updateBounds(bounds);
        }
      }
    };

    // Handler para petición de sincronización de bounds desde el main
    const handleRequestSync = () => {
      sendBounds();
    };

    if (isElectronEnv && currentVideoArea) {
      // Observar cambios de tamaño en el contenedor
      resizeObserver = new ResizeObserver(sendBounds);
      resizeObserver.observe(currentVideoArea);

      // Escuchar petición de "sync" desde el main
      removeSyncListener = window.electronVLC.onRequestVideoBoundsSync(handleRequestSync);

      // Si tenemos URL de video, enviamos petición inicial de reproducción
      if (videoUrl) {
        const rect = currentVideoArea.getBoundingClientRect();
        const bounds = {
          x: Math.floor(rect.left),
          y: Math.floor(rect.top),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        };
        console.log('EmbeddedVlcPlayer: Reproduciendo URL:', videoUrl, 'Bounds:', bounds);
        window.electronVLC
          .play(videoUrl, bounds)
          .then((result) => {
            if (result.success) {
              setIsPlaying(true);
              console.log('VLC: reproducción iniciada correctamente.');
            } else {
              setIsPlaying(false);
              console.error('VLC: Falló al iniciar reproducción:', result.error);
            }
          })
          .catch((err) => {
            setIsPlaying(false);
            console.error('VLC: Error al invocar play():', err);
          });
      }
    }

    return () => {
      // Cleanup al desmontar el componente
      if (resizeObserver && currentVideoArea) {
        resizeObserver.unobserve(currentVideoArea);
      }
      if (removeSyncListener) {
        removeSyncListener();
      }
      if (isElectronEnv && isPlaying) {
        window.electronVLC.stop();
        setIsPlaying(false);
      }
    };
  }, [videoUrl, isPlaying]);

  // Estilo del contenedor de video (puede recibir estilos adicionales por prop)
  const videoAreaStyle = {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    overflow: 'hidden',
    position: 'relative',
    ...style,
  };

  return (
    <div ref={videoAreaRef} style={videoAreaStyle}>
      {!videoUrl && (
        <div
          style={{
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: '1.2rem',
          }}
        >
          Cargando video...
        </div>
      )}
    </div>
  );
};

export default EmbeddedVlcPlayer;
