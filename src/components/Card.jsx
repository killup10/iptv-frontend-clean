import React from 'react';
import { FilmIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon, PlayIcon as PlaySolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext.jsx';
import { rewriteImageUrl } from '../utils/imageUrl.js';
import { isAndroidTV } from '../utils/platformUtils.js';
import { getAccessLockState } from '../utils/planAccess.js';
import { getTVItemTrailerUrl } from '../utils/tvContentUtils.js';

function Card({
  item,
  onClick,
  itemType = 'item',
  onPlayTrailer,
  progressPercent,
  onAddToCollectionClick,
  onAddToMyList,
  onRemoveFromCollection,
  showItemTypeBadge = false,
  showRemoveButton = false,
  variant = 'brand',
  isLocked: isLockedProp,
  lockedLabel = 'Bloqueado',
  lockedHint,
  showPlanLock = true,
  fallbackRequiredPlans = [],
  isSelected = false,
}) {
  const { user } = useAuth();
  const isClassicVariant = variant === 'classic';
  const autoLockState = showPlanLock
    ? getAccessLockState(item, user?.plan, { fallbackPlans: fallbackRequiredPlans })
    : { locked: false, lockMessage: '' };
  const isLocked = typeof isLockedProp === 'boolean' ? isLockedProp : autoLockState.locked;
  const resolvedLockedHint = lockedHint || autoLockState.lockMessage || 'Actualiza tu plan para verlo';
  const trailerUrl = getTVItemTrailerUrl(item);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(item, itemType);
    }
  };

  const handleTriggerPlayTrailer = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!trailerUrl || !onPlayTrailer) {
      return;
    }

    try {
      onPlayTrailer(trailerUrl);
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

  const customThumb = (item?.customThumbnail && item.customThumbnail.trim())
    ? item.customThumbnail
    : (item?.tmdbThumbnail && item.tmdbThumbnail.trim())
      ? item.tmdbThumbnail
      : (item?.thumbnail && item.thumbnail.trim())
        ? item.thumbnail
        : null;
  const displayThumbnail = rewriteImageUrl(customThumb) || '/img/placeholder-thumbnail.png';

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
    } else if (!Number.isNaN(Number(rating))) {
      ratingDisplay = Number(rating).toFixed(1);
    }
  }

  const is4K = () => {
    if (!item) return false;
    if (item.is4K) return true;
    if (item.mainSection === 'CINE_4K') return true;

    const title = (item.title || item.name || '').toLowerCase();
    if (title.includes('4k') || title.includes('2160p')) return true;

    if (item.genres && item.genres.some((genre) =>
      genre.toLowerCase().includes('4k') || genre.toLowerCase().includes('2160p')
    )) return true;

    return false;
  };

  const is60FPS = () => {
    if (!item) return false;
    if (item.is60FPS) return true;
    if (item.mainSection === 'CINE_60FPS') return true;

    const title = (item.title || item.name || '').toLowerCase();
    if (title.includes('60fps') || title.includes('60 fps')) return true;

    if (item.genres && item.genres.some((genre) =>
      genre.toLowerCase().includes('60fps') || genre.toLowerCase().includes('60 fps')
    )) return true;

    return false;
  };

  const primaryActionClasses = isClassicVariant
    ? 'relative z-50 flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#00e5ff] px-3 py-2 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:bg-[#00c4d9] hover:shadow-[0_0_20px_rgba(0,229,255,0.8)] active:scale-95'
    : 'relative z-50 flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200/45 bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 px-3 py-2.5 text-sm font-black text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:from-yellow-300 hover:via-amber-200 hover:to-orange-300 hover:shadow-[0_14px_28px_rgba(251,191,36,0.35)] active:translate-y-0';
  const secondaryActionClasses = isClassicVariant
    ? 'relative z-50 flex w-[44px] items-center justify-center rounded-md bg-[#00e5ff] py-2 text-black transition-colors hover:bg-[#00c4d9]'
    : 'relative z-50 flex w-[46px] items-center justify-center rounded-xl border border-fuchsia-300/25 bg-gradient-to-br from-violet-950/92 via-fuchsia-950/78 to-slate-950/88 py-2.5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:from-violet-900/95 hover:via-fuchsia-900/80 hover:to-slate-900 hover:shadow-[0_14px_28px_rgba(168,85,247,0.28)] backdrop-blur-sm';
  const collectionActionClasses = isClassicVariant
    ? 'relative z-50 flex w-[44px] items-center justify-center rounded-md bg-gray-500 py-2 text-white transition-colors hover:bg-gray-400'
    : secondaryActionClasses;
  const destructiveActionClasses = isClassicVariant
    ? 'relative z-50 flex w-[44px] items-center justify-center rounded-md bg-red-600 py-2 text-white transition-colors hover:bg-red-500'
    : 'relative z-50 flex w-[46px] items-center justify-center rounded-xl border border-red-400/30 bg-red-950/70 py-2.5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300/55 hover:bg-red-800/80 hover:shadow-[0_12px_24px_rgba(127,29,29,0.45)]';

  const heartButtonClasses = isClassicVariant
    ? 'absolute right-1.5 top-1.5 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-red-500 bg-black/30 text-red-500 backdrop-blur-sm transition-all duration-150 hover:bg-red-500 hover:text-white hover:shadow-[0_0_8px_rgba(239,68,68,0.5)] sm:h-7 sm:w-7'
    : 'absolute right-2 top-2 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-fuchsia-300/35 bg-gradient-to-br from-violet-950/92 via-fuchsia-900/72 to-slate-950/88 text-pink-200 shadow-[0_12px_24px_rgba(88,28,135,0.34)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200/55 hover:text-white hover:shadow-[0_16px_30px_rgba(217,70,239,0.35)] sm:h-8 sm:w-8';
  const posterShellClasses = isClassicVariant
    ? 'relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 shadow-lg transition-transform duration-300 group-hover/card:scale-105'
    : 'relative aspect-[2/3] overflow-hidden rounded-[22px] border border-fuchsia-300/12 bg-[#090214] shadow-[0_18px_44px_rgba(46,16,101,0.38)] transition-all duration-300 group-hover/card:scale-[1.025] group-hover/card:border-cyan-300/40 group-hover/card:shadow-[0_0_0_1px_rgba(217,70,239,0.3),0_0_22px_rgba(217,70,239,0.36),0_0_46px_rgba(34,211,238,0.18),0_28px_60px_rgba(15,23,42,0.42)]';
  const selectedCardClasses = isSelected
    ? (isClassicVariant
        ? 'ring-2 ring-cyan-300/90 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_18px_36px_rgba(34,211,238,0.2)] scale-[1.01]'
        : 'ring-2 ring-cyan-300/80 border-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.3),0_26px_54px_rgba(34,211,238,0.24),0_12px_28px_rgba(217,70,239,0.2)] scale-[1.02]')
    : '';
  const imageScrimClasses = isClassicVariant
    ? ''
    : 'pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_35%),radial-gradient(circle_at_18%_0%,rgba(217,70,239,0.24),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(250,204,21,0.18),transparent_24%),linear-gradient(180deg,rgba(22,6,47,0.02),rgba(2,6,23,0.46))]';
  const hoverOverlayClasses = isClassicVariant
    ? 'pointer-events-none absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:pointer-events-auto group-hover/card:opacity-100'
    : 'pointer-events-none absolute inset-0 z-20 flex flex-col justify-end bg-[linear-gradient(180deg,rgba(8,2,20,0.08)_0%,rgba(19,8,45,0.24)_24%,rgba(28,10,59,0.7)_58%,rgba(7,2,20,0.96)_100%)] opacity-0 transition-all duration-300 group-hover/card:pointer-events-auto group-hover/card:opacity-100';
  const hoverPanelClasses = isClassicVariant
    ? 'p-3'
    : 'relative overflow-hidden rounded-[24px] border border-fuchsia-300/26 bg-[linear-gradient(135deg,rgba(94,24,129,0.58),rgba(41,10,78,0.84)_38%,rgba(12,18,48,0.92)_100%)] p-3 shadow-[0_0_0_1px_rgba(217,70,239,0.18),0_18px_36px_rgba(88,28,135,0.34),0_0_28px_rgba(34,211,238,0.12)] backdrop-blur-xl';
  const baseOverlayClasses = isClassicVariant
    ? 'absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-3 transition-opacity duration-300 group-hover/card:pointer-events-none group-hover/card:opacity-0'
    : 'absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#090214]/96 via-[#1a0938]/76 to-transparent p-3 transition-all duration-300 group-hover/card:pointer-events-none group-hover/card:opacity-0';
  const basePanelClasses = isClassicVariant
    ? ''
    : 'rounded-2xl border border-fuchsia-300/16 bg-[linear-gradient(135deg,rgba(33,8,62,0.8),rgba(15,6,33,0.76)_60%,rgba(10,14,34,0.78))] p-3 shadow-[0_16px_32px_rgba(88,28,135,0.24)] backdrop-blur-md';
  const rootClasses = isClassicVariant
    ? 'group/card relative w-full'
    : 'group/card relative w-full transition-transform duration-300 hover:-translate-y-1.5';
  const hoverTitleClasses = isClassicVariant
    ? 'mb-2 line-clamp-2 text-base font-extrabold text-white drop-shadow-lg'
    : 'relative z-10 mb-2 line-clamp-2 text-base font-black text-white drop-shadow-[0_0_18px_rgba(217,70,239,0.2)]';
  const hoverDescriptionClasses = isClassicVariant
    ? 'mb-3 line-clamp-3 text-xs leading-5 text-slate-300/90'
    : 'relative z-10 mb-3 line-clamp-3 text-xs leading-5 text-slate-200/90';
  const hoverAccentLayers = isClassicVariant
    ? null
    : (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-6 top-2 h-20 w-20 rounded-full bg-fuchsia-500/34 blur-2xl transition-transform duration-500 group-hover/card:scale-125" />
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-400/24 blur-3xl transition-transform duration-500 group-hover/card:scale-110" />
        <div className="absolute bottom-0 left-1/3 h-16 w-28 rounded-full bg-amber-300/12 blur-3xl transition-transform duration-500 group-hover/card:scale-110" />
        <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-200/55 to-transparent shadow-[0_0_16px_rgba(217,70,239,0.4)]" />
      </div>
    );
  const ratingClasses = isClassicVariant
    ? 'pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1 rounded-md bg-black/80 px-2 py-1 text-xs font-semibold text-yellow-400'
    : 'pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1 rounded-full border border-amber-200/35 bg-gradient-to-r from-[#2f0a4f]/90 to-[#13051f]/88 px-2.5 py-1 text-xs font-semibold text-amber-200 shadow-[0_10px_24px_rgba(88,28,135,0.28)] backdrop-blur-md';
  const newEpisodesClasses = isClassicVariant
    ? 'animate-elegant-pulse absolute right-2 top-2 z-20 whitespace-nowrap rounded-full border border-red-400/30 bg-gradient-to-r from-red-600 to-red-700 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg shadow-red-500/40 backdrop-blur-md'
    : 'animate-elegant-pulse absolute right-2 top-2 z-20 whitespace-nowrap rounded-full border border-fuchsia-200/25 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg shadow-fuchsia-500/35 backdrop-blur-md';
  const lockScrimClasses = isClassicVariant
    ? 'pointer-events-none absolute inset-0 z-[2] bg-black/38'
    : 'pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(8,4,20,0.22),rgba(2,6,23,0.58))]';
  const lockBadgeClasses = isClassicVariant
    ? 'pointer-events-none absolute left-2 top-2 z-30 inline-flex items-center gap-1 rounded-full border border-yellow-300/35 bg-black/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-yellow-200'
    : 'pointer-events-none absolute left-2 top-2 z-30 inline-flex items-center gap-1 rounded-full border border-amber-200/35 bg-[linear-gradient(135deg,rgba(91,33,5,0.82),rgba(88,28,135,0.72))] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-100 shadow-[0_12px_24px_rgba(120,53,15,0.24)]';
  const lockFooterClasses = isClassicVariant
    ? 'pointer-events-none absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-black/90 via-black/65 to-transparent px-3 pb-3 pt-8'
    : 'pointer-events-none absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-[#090214]/96 via-[#1a0938]/82 to-transparent px-3 pb-3 pt-10';

  return (
    <div
      className={rootClasses}
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
      {!isAndroidTV() && onAddToMyList && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAddToMyList(item);
          }}
          className={heartButtonClasses}
          aria-label={`Agregar ${item.name || item.title} a Mi Lista`}
          title="Agregar a Mi Lista"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
          </svg>
        </button>
      )}

      <div className={`${posterShellClasses} ${selectedCardClasses}`.trim()}>
        <img
          src={displayThumbnail}
          alt={item.name || item.title || 'Poster'}
          className={`h-full w-full object-cover ${isLocked ? 'brightness-[0.72] saturate-[0.72]' : ''}`}
          style={{
            aspectRatio: '2/3',
            objectFit: 'cover',
            maxHeight: '100%',
            width: '100%',
          }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/img/placeholder-thumbnail.png';
          }}
          loading="lazy"
        />

        {imageScrimClasses ? <div className={imageScrimClasses} /> : null}

        {typeof progressPercent === 'number' && progressPercent > 0 && progressPercent < 100 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-slate-900/80">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}

        {ratingDisplay && (
          <div className={ratingClasses}>
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {ratingDisplay}
          </div>
        )}

        {item.hasNewEpisodes && (
          <style>{`
            @keyframes elegantPulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.05); }
            }
            .animate-elegant-pulse {
              animation: elegantPulse 3s ease-in-out infinite;
            }
          `}</style>
        )}

        {item.hasNewEpisodes && (
          <div className={newEpisodesClasses}>
            NUEVOS EPISODIOS
          </div>
        )}

        {showItemTypeBadge && itemType && itemType !== 'item' && (
          <div className="absolute left-2 top-10 z-10">
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 blur-sm opacity-75"></div>
              <div className="relative rounded-md border border-pink-400 bg-gradient-to-r from-pink-500 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                <span className="drop-shadow-sm">{itemType.charAt(0).toUpperCase() + itemType.slice(1)}</span>
              </div>
            </div>
          </div>
        )}

        {isLocked ? (
          <>
            <div className={lockScrimClasses} />
            <div className={lockBadgeClasses}>
              <LockClosedIcon className="h-3.5 w-3.5" />
              <span>{lockedLabel}</span>
            </div>
            <div className={lockFooterClasses}>
              <div className={`${isClassicVariant ? '' : 'rounded-2xl border border-white/10 bg-black/18 p-2 backdrop-blur-sm'}`}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">
                  Upgrade requerido
                </p>
                <p className="mt-1 text-[11px] leading-4 text-white/75">
                  {resolvedLockedHint}
                </p>
              </div>
            </div>
          </>
        ) : null}

        <div
          className={hoverOverlayClasses}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full p-3">
            <div className={hoverPanelClasses}>
              {hoverAccentLayers}

              <h3 className={hoverTitleClasses}>
                {item.name || item.title}
              </h3>
              {item.description && (
                <p className={hoverDescriptionClasses}>
                  {item.description}
                </p>
              )}
              <div className="relative z-10 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handlePlayClick(e);
                  }}
                  className={primaryActionClasses}
                  aria-label={`Ver ${item.name || item.title}`}
                >
                  <PlaySolidIcon className="h-4 w-4" />
                  <span>Ver</span>
                </button>

                {!isAndroidTV() && trailerUrl && onPlayTrailer && (
                  <button
                    type="button"
                    onClick={handleTriggerPlayTrailer}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    className={secondaryActionClasses}
                    aria-label={`Ver trailer de ${item.name || item.title}`}
                    title="Ver trailer"
                    role="button"
                  >
                    <FilmIcon className="h-4 w-4" />
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
                    className={collectionActionClasses}
                    aria-label={`Agregar ${item.name || item.title} a una coleccion`}
                    title="Agregar a coleccion"
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                  </button>
                )}

                {!isAndroidTV() && showRemoveButton && onRemoveFromCollection && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRemoveFromCollection();
                    }}
                    className={destructiveActionClasses}
                    aria-label={`Eliminar ${item.name || item.title} de la coleccion`}
                    title="Eliminar de coleccion"
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className={baseOverlayClasses}
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick(e);
          }}
        >
          <div className={basePanelClasses}>
            {is4K() && (
              <div className="mb-1 pointer-events-none">
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 blur-sm opacity-75"></div>
                  <div className="relative rounded-md border border-amber-400 bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 px-1.5 py-0.5 text-[9px] font-black text-black shadow-lg">
                    <span className="drop-shadow-sm">4K ULTRAHD</span>
                  </div>
                </div>
              </div>
            )}

            {is60FPS() && (
              <div className="mb-1 pointer-events-none">
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500 via-cyan-600 to-blue-700 blur-sm opacity-75"></div>
                  <div className="relative rounded-md border border-cyan-400 bg-gradient-to-r from-blue-500 via-cyan-600 to-blue-700 px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg">
                    <span className="drop-shadow-sm">60 FPS</span>
                  </div>
                </div>
              </div>
            )}

            <p className="pointer-events-none truncate text-sm font-semibold text-white">
              {item.name || item.title || 'Titulo no disponible'}
            </p>
            {item.releaseYear && (
              <p className={`pointer-events-none mt-0.5 text-[11px] ${isClassicVariant ? 'text-gray-300' : 'text-fuchsia-100/72'}`}>
                {item.releaseYear}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Card);
