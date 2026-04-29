// src/components/TrailerModal.jsx
import React, { useEffect, useMemo, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const getYouTubeId = (url) => {
  if (!url) return null;

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = String(url).match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
};

const shouldCloseTrailer = (event) => {
  if (!event) {
    return false;
  }

  if (['Escape', 'Backspace', 'BrowserBack', 'GoBack'].includes(event.key)) {
    return true;
  }

  return [4, 8, 27, 111, 461, 10009].includes(event.keyCode || event.which || 0);
};

const TrailerModal = ({ trailerUrl, onClose }) => {
  const closeButtonRef = useRef(null);

  const youtubeEmbedUrl = useMemo(() => {
    const youtubeId = getYouTubeId(trailerUrl);
    return youtubeId
      ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&fs=1`
      : null;
  }, [trailerUrl]);

  useEffect(() => {
    const closeCurrentOverlay = () => onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.__trailerModalOpen = true;
    window.__trailerModalClose = closeCurrentOverlay;

    const handleCloseIntent = (event) => {
      if (!shouldCloseTrailer(event)) {
        return;
      }

      event.preventDefault?.();
      event.stopPropagation?.();
      closeCurrentOverlay();
    };

    const handleBackButton = (event) => {
      event?.preventDefault?.();
      closeCurrentOverlay();
    };

    const focusTimer = window.setTimeout(() => {
      if (!closeButtonRef.current) {
        return;
      }

      try {
        closeButtonRef.current.focus({ preventScroll: true });
      } catch {
        closeButtonRef.current.focus();
      }
    }, 40);

    window.addEventListener('keydown', handleCloseIntent, true);
    document.addEventListener('keydown', handleCloseIntent, true);
    window.addEventListener('backbutton', handleBackButton);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleCloseIntent, true);
      document.removeEventListener('keydown', handleCloseIntent, true);
      window.removeEventListener('backbutton', handleBackButton);
      if (window.__trailerModalClose === closeCurrentOverlay) {
        window.__trailerModalClose = null;
        window.__trailerModalOpen = false;
      }
    };
  }, [onClose]);

  const handleContentClick = (event) => {
    event.stopPropagation();
  };

  if (!trailerUrl) {
    console.warn('TrailerModal: No se proporciono trailerUrl.');
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl rounded-xl border border-gray-700 bg-black p-3 shadow-2xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl sm:p-4"
        onClick={handleContentClick}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 z-20 rounded-full bg-gray-800 p-1.5 text-gray-300 shadow-lg transition-colors hover:bg-red-600 hover:text-white"
          aria-label="Cerrar trailer"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          {youtubeEmbedUrl ? (
            <iframe
              width="100%"
              height="100%"
              src={youtubeEmbedUrl}
              title="Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="block"
              tabIndex={-1}
            />
          ) : (
            <video
              className="h-full w-full"
              controls
              autoPlay
              playsInline
              src={trailerUrl}
              tabIndex={-1}
            >
              Tu navegador no soporta el elemento de video.
            </video>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          Retroceso, ESC o clic fuera cierran el trailer.
        </p>
      </div>
    </div>
  );
};

export default TrailerModal;
