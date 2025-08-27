import React, { useState } from 'react';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { Device } from '@capacitor/device';

export default function TestVideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState(null);

  // URLs de prueba
  const testUrls = [
    {
      name: "Big Buck Bunny (MP4)",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    {
      name: "Sintel (MP4)",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    },
    {
      name: "Test Stream (HLS)",
      url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
    }
  ];

  React.useEffect(() => {
    const checkDevice = async () => {
      try {
        const info = await Device.getInfo();
        setIsMobile(info.platform === 'android' || info.platform === 'ios');
      } catch (err) {
        setIsMobile(false);
      }
    };
    checkDevice();
  }, []);

  const handlePlayVideo = async (url, title) => {
    try {
      setError(null);
      
      if (!isMobile) {
        setError('Este test solo funciona en dispositivos móviles');
        return;
      }

      console.log('Intentando reproducir:', url);
      
      const result = await VideoPlayerPlugin.playVideo({
        url: url,
        title: title,
        startTime: 0
      });

      if (result.success) {
        setIsPlaying(true);
        console.log('Video iniciado:', result.message);
      } else {
        throw new Error(result.message || 'Error al iniciar video');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message}`);
    }
  };

  const handleStopVideo = async () => {
    try {
      await VideoPlayerPlugin.stopVideo();
      setIsPlaying(false);
    } catch (err) {
      console.error('Error al detener:', err);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Test ExoPlayer</h1>
      
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <p><strong>Dispositivo:</strong> {isMobile ? 'Móvil (Android/iOS)' : 'Web/Desktop'}</p>
        <p><strong>Estado:</strong> {isPlaying ? 'Reproduciendo' : 'Detenido'}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-800 rounded">
          <p className="text-red-200">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 px-3 py-1 bg-red-600 rounded text-sm"
          >
            Cerrar
          </button>
        </div>
      )}

      {!isMobile && (
        <div className="mb-4 p-3 bg-yellow-800 rounded">
          <p className="text-yellow-200">
            ⚠️ Este test requiere un dispositivo móvil. 
            Instala la APK en tu teléfono Android para probar ExoPlayer.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Videos de Prueba:</h2>
        
        {testUrls.map((video, index) => (
          <div key={index} className="p-3 bg-gray-800 rounded">
            <h3 className="font-medium mb-2">{video.name}</h3>
            <p className="text-sm text-gray-400 mb-3 break-all">{video.url}</p>
            <button
              onClick={() => handlePlayVideo(video.url, video.name)}
              disabled={!isMobile || isPlaying}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded mr-2"
            >
              ▶️ Reproducir
            </button>
          </div>
        ))}

        {isPlaying && (
          <div className="p-3 bg-green-800 rounded">
            <p className="text-green-200 mb-3">
              ✅ Video reproduciéndose en ExoPlayer
            </p>
            <button
              onClick={handleStopVideo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              ⏹️ Detener
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 p-3 bg-blue-800 rounded">
        <h3 className="font-medium mb-2">Instrucciones:</h3>
        <ol className="text-sm text-blue-200 space-y-1">
          <li>1. Instala la APK en tu teléfono Android</li>
          <li>2. Abre la aplicación</li>
          <li>3. Navega a esta página de test</li>
          <li>4. Toca "Reproducir" en cualquier video</li>
          <li>5. ExoPlayer debería abrir en pantalla completa</li>
        </ol>
      </div>
    </div>
  );
}
