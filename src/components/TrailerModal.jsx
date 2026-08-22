// src/components/TrailerModal.jsx
import React, { useEffect, useMemo, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const getYouTubeId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // If it's directly an 11-char YouTube ID (e.g. "dQw4w9WgXcQ")
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard URL patterns (watch?v=, youtu.be/, embed/, v/, shorts/, etc.)
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  return null;
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

  const youtubeId = useMemo(() => getYouTubeId(trailerUrl), [trailerUrl]);

  const youtubeEmbedUrl = useMemo(() => {
    return youtubeId
      ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&fs=1`
      : null;
  }, [youtubeId]);

  const externalUrl = useMemo(() => {
    if (youtubeId) {
      return `https://www.youtube.com/watch?v=${youtubeId}`;
    }
    return String(trailerUrl || '').startsWith('http') ? trailerUrl : null;
  }, [youtubeId, trailerUrl]);

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
      className="fixed inset-0 flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-sm"
      style={{ zIndex: 100100 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl sm:p-4"
        onClick={handleContentClick}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-30 rounded-full bg-zinc-800 border border-white/20 p-2 text-gray-200 shadow-xl transition-all hover:bg-red-600 hover:text-white active:scale-90"
          aria-label="Cerrar trailer"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="aspect-video overflow-hidden rounded-xl bg-black border border-white/5 relative shadow-inner">
          {youtubeEmbedUrl ? (
            <iframe
              width="100%"
              height="100%"
              src={youtubeEmbedUrl}
              title="Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              className="block w-full h-full"
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

        <div className="mt-3 flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-zinc-400">
            Retroceso o tocar fuera para cerrar
          </p>

          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/20"
            >
              <span>Abrir en YouTube ↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;
