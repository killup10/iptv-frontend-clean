// src/components/TrailerModal.jsx
import React, { useEffect } from 'react';
import VideoPlayer from './VideoPlayer.jsx'; // Ajusta la ruta si es diferente
import { XMarkIcon } from '@heroicons/react/24/solid';

// Helper para extraer el ID de YouTube de varias URL de video (no playlists)
const getYouTubeId = (url) => {
    if (!url) return null;
    // Expresión regular para varios formatos de URL de video de YouTube
    // Coincide con: youtu.be/, /watch?v=, /embed/, /v/, /u/N/
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2] && match[2].length === 11) ? match[2] : null;
    // console.log(`TrailerModal: getYouTubeId para '${url}' -> ID: '${videoId}'`);
    return videoId;
};

const TrailerModal = ({ trailerUrl, onClose }) => {
  useEffect(() => {
    // Cierra el modal si se presiona la tecla Escape
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    // Limpieza del event listener al desmontar
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Evita que el clic dentro del contenido del modal cierre el modal
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  if (!trailerUrl) {
    console.warn("TrailerModal: No se proporcionó trailerUrl.");
    return null; // No renderizar nada si no hay URL
  }

  const youtubeId = getYouTubeId(trailerUrl);
  // Construir URL de embed de YouTube con autoplay, sin videos relacionados y permitiendo fullscreen
   const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&fs=1`
    : null;

  // console.log("TrailerModal: trailerUrl original:", trailerUrl);
  // console.log("TrailerModal: youtubeId extraído:", youtubeId);
  // console.log("TrailerModal: youtubeEmbedUrl generado:", youtubeEmbedUrl);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-[100] p-4"
      onClick={onClose} // Cierra el modal al hacer clic en el fondo
    >
      <div 
        className="bg-black p-3 sm:p-4 rounded-xl shadow-2xl w-full max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl relative border border-gray-700"
        onClick={handleContentClick} // Evita que el clic aquí cierre el modal
      >
        <button 
          onClick={onClose}
          className="absolute -top-3 -right-3 sm:top-2 sm:right-2 text-gray-300 bg-gray-800 hover:bg-red-600 hover:text-white transition-colors z-20 rounded-full p-1.5 shadow-lg"
          aria-label="Cerrar tráiler"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          {youtubeEmbedUrl ? (
            <iframe
              width="100%"
              height="100%"
              src={youtubeEmbedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen // Habilita el botón de pantalla completa en el reproductor de YouTube
              className="block" // Asegura que el iframe ocupe el espacio
            ></iframe>
          ) : (
            // Si no es una URL de YouTube, usar reproductor HTML5 nativo
            <video 
              className="w-full h-full"
              controls
              autoPlay
              src={trailerUrl}
            >
              Tu navegador no soporta el elemento de video.
            </video>
          )}
        </div>
         <p className="text-xs text-gray-600 mt-3 text-center">
            Presiona ESC o haz clic fuera para cerrar.
        </p>
      </div>
    </div>
  );
};

export default TrailerModal;
