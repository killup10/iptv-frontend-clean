  import React from 'react';

  import {
    PlayIcon as PlayOutlineIcon,
    FilmIcon as FilmOutlineIcon,
    PlusCircleIcon as PlusCircleOutlineIcon,
  } from '@heroicons/react/24/outline';
  import { PlayIcon as PlaySolidIcon } from '@heroicons/react/24/solid';

  export default function Card({
    item,
    onClick,
    itemType = 'item',
    onPlayTrailer,
    progressPercent,
  }) {
    React.useEffect(() => {
      // Debug de la información que llega
      console.log('Card.jsx: Item data:', {
        id: item?.id,
        title: item?.title || item?.name,
        thumbnail: item?.thumbnail,
        tmdbRating: item?.tmdbRating,
        ratingDisplay: item?.ratingDisplay,
        description: item?.description
      });

      if (item?.trailerUrl) {
        console.log('Card.jsx: trailerUrl detected for item:', item?.id || item?.title || item?.name, 'trailerUrl:', item.trailerUrl);
        console.log('Card.jsx: onPlayTrailer type:', typeof onPlayTrailer, 'value:', onPlayTrailer);
      }
    }, [item?.trailerUrl, onPlayTrailer, item]);
    const handlePlayClick = (e) => {
      e.stopPropagation();
      console.log('Card.jsx: handlePlayClick invoked for item:', item?.id || item?.name || item?.title);
      // If there's a trailer, prefer playing the trailer first. Pass a
      // callback so the parent can navigate after the trailer modal closes.
      if (item?.trailerUrl && typeof onPlayTrailer === 'function') {
        console.log('Card.jsx: handlePlayClick -> item has trailer, calling onPlayTrailer before navigation');
        // Parent may accept a second parameter as onClose callback.
        onPlayTrailer(item.trailerUrl, () => {
          if (onClick) onClick(item, itemType);
        });
        return;
      }

      if (onClick) {
        onClick(item, itemType);
      }
    };

    const handleTriggerPlayTrailer = (e) => {
      console.log('Card.jsx: handleTriggerPlayTrailer called');
      e.preventDefault();
      e.stopPropagation();
      
      if (!item?.trailerUrl || !onPlayTrailer) {
        console.warn('Card.jsx: No trailer URL or onPlayTrailer not provided:', {
          hasTrailerUrl: !!item?.trailerUrl,
          hasOnPlayTrailer: !!onPlayTrailer
        });
        return;
      }

      console.log('Card.jsx: Playing trailer for:', item.title || item.name);
      console.log('Card.jsx: Trailer URL:', item.trailerUrl);
      
      try {
        onPlayTrailer(item.trailerUrl);
      } catch (error) {
        console.error('Card.jsx: Error playing trailer:', error);
      }
    };

      // Fallback click handler on the whole card: only trigger when the
      // click originates from the card root (not from child elements).
      const handleCardClick = (e) => {
        // Si el clic viene de un botón o sus hijos, ignorarlo
        const closestButton = e.target.closest('button');
        if (closestButton) {
          console.log('Card.jsx: handleCardClick ignored because click originated from button');
          return;
        }

        // Registrar información del evento para debugging
        console.log('Card.jsx: handleCardClick invoked event target/currentTarget:', e?.target?.tagName, e?.currentTarget?.tagName);
        try {
          const path = e?.nativeEvent?.composedPath ? e.nativeEvent.composedPath() : (e?.nativeEvent?.path || null);
          console.log('Card.jsx: handleCardClick composedPath/native path:', path);
        } catch (err) {}

        // Prevenir la propagación del evento
        e.stopPropagation();
        e.preventDefault();

        console.log('Card.jsx: handleCardClick executing for item:', item?.id || item?.name || item?.title);
        if (onClick) onClick(item, itemType);
      };

  // Priorizar customThumbnail si existe, luego thumbnail directo, luego tmdbThumbnail
  const preferred = item?.customThumbnail || item?.thumbnail || item?.tmdbThumbnail || item?.logo || '/img/placeholder-thumbnail.png';
  const displayThumbnail = (typeof preferred === 'string' && preferred.startsWith('http')) ? preferred : preferred;

  // Unified rating: try several possible fields that may contain rating/label info
  // Accepts numbers or string labels like 'tbdt'
  const rawRating = (
  // Prefer backend-provided unified field when available
  item?.ratingDisplay ??
  item?.tmdbRating ??
    item?.rating ??
    item?.vote_average ??
    item?.ranking ??
    item?.rankingLabel ??
    item?.ratingText ??
    item?.displayRating ??
    item?.rating_tmdb ??
    null
  );
  const rating = rawRating !== undefined && rawRating !== null ? rawRating : null;
  // Prepare display value: format numbers to one decimal, otherwise show string as-is
  let ratingDisplay = null;
  if (rating !== null) {
    if (typeof rating === 'number' && !Number.isNaN(rating)) {
      ratingDisplay = Number(rating).toFixed(1);
    } else if (typeof rating === 'string' && rating.trim() !== '' && rating.toLowerCase() !== 'null') {
      ratingDisplay = rating;
    } else if (!isNaN(Number(rating))) {
      // numeric-like string
      ratingDisplay = Number(rating).toFixed(1);
    }
  }


  // No fallback from releaseYear: ratingDisplay is determined only from
  // rating-related fields (tmdbRating, rating, ranking, etc.).

    // Función para detectar si el contenido es 4K

    const is4K = () => {
      if (!item) return false;
      
      // Verificar si está en la sección CINE_4K
      if (item.mainSection === 'CINE_4K') return true;
      
      // Verificar si el título contiene "4K"
      const title = (item.title || item.name || '').toLowerCase();
      if (title.includes('4k') || title.includes('2160p')) return true;
      
      // Verificar si algún género contiene "4K"
      if (item.genres && item.genres.some(genre => 
        genre.toLowerCase().includes('4k') || genre.toLowerCase().includes('2160p')
      )) return true;
      
      return false;
    };

  return (
    <div
      className="group w-full"
      style={{
        display: 'block',
        maxWidth: '100%',
        position: 'relative',
      }}
      data-card
      // onClick a la tarjeta completa para ver detalles (si se implementa)
      onClick={(e) => {
        e.stopPropagation();
        // Aquí se podría navegar a una página de detalles, no reproducir.
        // Por ahora, lo dejamos sin acción directa para evitar reproducción.
        console.log('Card clicked, but no reproduction action is set here.');
      }}
    >
      <div className="aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105 relative shadow-lg">
        <img
          src={displayThumbnail}
          alt={item.name || item.title || 'Póster'}
          className="w-full h-full object-cover"
          style={{
            aspectRatio: "2/3",
            objectFit: "cover",
            maxHeight: "100%",
            width: "100%"
          }}

          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/img/placeholder-thumbnail.png';
          }}
          loading="lazy"
        />

  {typeof progressPercent === 'number' && progressPercent > 0 && progressPercent < 100 && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/80">
              <div
                className="h-full bg-red-600"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-md font-semibold z-10">
              {Math.round(progressPercent)}%
            </div>
          </>
        )}

        {/* Rating badge: unified source, top-left. Shows numbers or strings (e.g. 'tbdt') */}
        {ratingDisplay && (
          <div className="absolute top-2 left-2 bg-black/80 text-yellow-400 text-xs px-2 py-1 rounded-md font-semibold z-50 flex items-center gap-1 pointer-events-none">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {ratingDisplay}
          </div>
        )}

  {/* Development debug info is logged to console only to avoid overlaying the UI */}

        {/* Overlay con botones, visible on hover */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 w-full">
            <h3 className="text-white text-base font-bold line-clamp-2 mb-2 drop-shadow-lg">
              {item.name || item.title}
            </h3>
            {item.description && (
              <p className="text-gray-300 text-xs line-clamp-3 mb-3">
                {item.description}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handlePlayClick(e);
                }}
                className="flex-1 bg-[#00e5ff] hover:bg-[#00c4d9] text-black text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 pointer-events-auto"
                aria-label={`Ver ${item.name || item.title}`}
              >
                <PlaySolidIcon className="w-4 h-4" />
                <span>Ver</span>
              </button>
              {item.trailerUrl && onPlayTrailer && (
                <button
                  type="button"
                  onClick={handleTriggerPlayTrailer}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className="w-[44px] bg-[#00e5ff] hover:bg-[#00c4d9] text-black text-sm font-semibold py-2 rounded-md transition-colors flex items-center justify-center pointer-events-auto relative z-50"
                  aria-label={`Ver tráiler de ${item.name || item.title}`}
                  title="Ver tráiler"
                  role="button"
                >
                  <FilmOutlineIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Título visible cuando no se hace hover */}
        <div 
          className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent group-hover:opacity-0 transition-opacity duration-300"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick(e);
          }}
        >
            {is4K() && (
              <div className="mb-1 pointer-events-none">
                <div className="inline-block relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 rounded-md blur-sm opacity-75"></div>
                  <div className="relative bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg border border-amber-400">
                    <span className="drop-shadow-sm">4K ULTRAHD</span>
                  </div>
                </div>
              </div>
            )}
      {/* tmdbRating badge removed from bottom overlay to avoid duplicate/incorrect placement.
        Use the unified badge above the poster (top-left) which handles numbers and strings. */}
            <p className="text-white text-sm font-semibold truncate pointer-events-none">
              {item.name || item.title || 'Título no disponible'}
            </p>
            {item.releaseYear && (
              <p className="text-gray-300 text-[11px] mt-0.5 pointer-events-none">
                {item.releaseYear}
              </p>
            )}
        </div>
      </div>
    </div>
  );

  }
