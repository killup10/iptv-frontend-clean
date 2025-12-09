import React from 'react';
import { rewriteImageUrl } from '../utils/imageUrl.js';
import { isAndroidTV } from '../utils/platformUtils.js';

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
    onAddToCollectionClick,
    onAddToMyList,
    showItemTypeBadge = false, // Nueva prop para controlar la visibilidad
  }) {
    console.log('Card item:', item);
    const handlePlayClick = (e) => {
      e.stopPropagation();
      
      // En Android TV, reproducir directamente SIN trailer primero
      if (isAndroidTV()) {
        if (onClick) {
          onClick(item, itemType);
        }
        return;
      }
      
      // En web, mostrar trailer primero (behavior antiguo)
      if (item?.trailerUrl && typeof onPlayTrailer === 'function') {
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
      e.preventDefault();
      e.stopPropagation();
      
      if (!item?.trailerUrl || !onPlayTrailer) {
        return;
      }

      try {
        onPlayTrailer(item.trailerUrl);
      } catch (error) {
        console.error('Card.jsx: Error playing trailer:', error);
      }
    };

      const handleCardClick = (e) => {
        const closestButton = e.target.closest('button');
        if (closestButton) {
          return;
        }

        e.stopPropagation();
        e.preventDefault();

        if (onClick) onClick(item, itemType);
      };

  const displayThumbnail = rewriteImageUrl(item?.thumbnail) || '/img/placeholder-thumbnail.png';

  const rawRating = (
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
  let ratingDisplay = null;
  if (rating !== null) {
    if (typeof rating === 'number' && !Number.isNaN(rating)) {
      ratingDisplay = Number(rating).toFixed(1);
    } else if (typeof rating === 'string' && rating.trim() !== '' && rating.toLowerCase() !== 'null') {
      ratingDisplay = rating;
    } else if (!isNaN(Number(rating))) {
      ratingDisplay = Number(rating).toFixed(1);
    }
  }

    const is4K = () => {
      if (!item) return false;
      
      // Check for explicit 4K flag in series
      if (item.is4K) return true;
      
      if (item.mainSection === 'CINE_4K') return true;
      
      const title = (item.title || item.name || '').toLowerCase();
      if (title.includes('4k') || title.includes('2160p')) return true;
      
      if (item.genres && item.genres.some(genre => 
        genre.toLowerCase().includes('4k') || genre.toLowerCase().includes('2160p')
      )) return true;
      
      return false;
    };

    const is60FPS = () => {
      if (!item) return false;
      
      // Check for explicit 60FPS flag in series
      if (item.is60FPS) return true;
      
      if (item.mainSection === 'CINE_60FPS') return true;
      
      const title = (item.title || item.name || '').toLowerCase();
      if (title.includes('60fps') || title.includes('60 fps')) return true;
      
      if (item.genres && item.genres.some(genre => 
        genre.toLowerCase().includes('60fps') || genre.toLowerCase().includes('60 fps')
      )) return true;
      
      return false;
    };

  return (
    <div
      className="group/card w-full"
      style={{
        display: 'block',
        maxWidth: '100%',
        position: 'relative',
      }}
      data-card
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden transition-transform duration-300 group-hover/card:scale-105 relative shadow-lg">
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/80">
              <div
                className="h-full bg-red-600"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
        )}

        {ratingDisplay && (
          <div className="absolute top-2 left-2 bg-black/80 text-yellow-400 text-xs px-2 py-1 rounded-md font-semibold z-50 flex items-center gap-1 pointer-events-none">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {ratingDisplay}
          </div>
        )}

        {item.hasNewEpisodes && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg z-10 animate-pulse">
            NUEVOS EPISODIOS
          </div>
        )}

        {showItemTypeBadge && itemType && itemType !== 'item' && (
          <div className="absolute top-10 left-2 z-10">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-md blur-sm opacity-75"></div>
              <div className="relative bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg border border-pink-400">
                <span className="drop-shadow-sm">{itemType.charAt(0).toUpperCase() + itemType.slice(1)}</span>
              </div>
            </div>
          </div>
        )}

        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end"
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
                className="flex-1 bg-[#00e5ff] hover:bg-[#00c4d9] text-black text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 pointer-events-auto hover:scale-110 hover:shadow-[0_0_20px_rgba(0,229,255,0.8)] relative z-50 active:scale-95"
                aria-label={`Ver ${item.name || item.title}`}
              >
                <PlaySolidIcon className="w-4 h-4" />
                <span>Ver</span>
              </button>
              {/* En Android TV, no mostrar botón de trailer - solo reproducir contenido */}
              {!isAndroidTV() && item.trailerUrl && onPlayTrailer && (
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
              {!isAndroidTV() && onAddToCollectionClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAddToCollectionClick(item);
                  }}
                  className="w-[44px] bg-gray-500 hover:bg-gray-400 text-white text-sm font-semibold py-2 rounded-md transition-colors flex items-center justify-center pointer-events-auto relative z-50"
                  aria-label={`Agregar ${item.name || item.title} a una colección`}
                  title="Agregar a colección"
                >
                  <PlusCircleOutlineIcon className="w-5 h-5" />
                </button>
              )}
              {!isAndroidTV() && onAddToMyList && (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onAddToMyList(item);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-2 sm:py-2 sm:px-2.5 rounded-md transition-all duration-200 flex items-center justify-center pointer-events-auto relative z-50 hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.8)] w-10 sm:w-11 h-10 sm:h-11"
                    aria-label={`Agregar ${item.name || item.title} a Mi Lista`}
                  >
                    <span className="text-lg sm:text-xl">❤️</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                    Agregar a Mi Lista
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div 
          className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent group-hover/card:opacity-0 transition-opacity duration-300"
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
            {is60FPS() && (
              <div className="mb-1 pointer-events-none">
                <div className="inline-block relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-600 to-blue-700 rounded-md blur-sm opacity-75"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 via-cyan-600 to-blue-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg border border-cyan-400">
                    <span className="drop-shadow-sm">60 FPS</span>
                  </div>
                </div>
              </div>
            )}
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
