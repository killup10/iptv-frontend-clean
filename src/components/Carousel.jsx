import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Card from './Card';
import { isAndroid } from '../utils/platformUtils.js';

function Carousel({
  title,
  subtitle = '',
  items = [],
  onItemClick,
  itemType = 'item',
  onPlayTrailerClick,
  onAddToCollectionClick,
  onAddToMyListClick,
  showItemTypeBadge,
  showProgressBar,
  variant = 'brand',
  cardVariant,
  showPlanLock = true,
  selectedItemId = null,
  eyebrow = 'TeamG Play',
  actionLabel = '',
  onActionClick,
}) {
  const scrollContainerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const itemRefs = useRef([]);
  const isClassicVariant = variant === 'classic';
  const resolvedCardVariant = cardVariant || (isClassicVariant ? 'classic' : 'brand');

  const dpadEnabled = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    if (!isAndroid()) return false;
    const touchPoints = navigator.maxTouchPoints || 0;
    return touchPoints === 0;
  }, []);

  const resolveDpadAction = (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        return 'left';
      case 'ArrowRight':
        return 'right';
      case 'ArrowUp':
        return 'up';
      case 'ArrowDown':
        return 'down';
      case 'Enter':
        return 'enter';
      case 'Escape':
        return 'back';
      default:
        break;
    }

    const keyCode = e.keyCode || e.which;
    switch (keyCode) {
      case 21:
        return 'left';
      case 22:
        return 'right';
      case 19:
        return 'up';
      case 20:
        return 'down';
      case 23:
      case 66:
        return 'enter';
      case 4:
        return 'back';
      default:
        return null;
    }
  };

  const focusIndex = (index) => {
    const el = itemRefs.current[index];
    if (!el) return;

    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }

    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } catch {
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.offsetWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section
      className={isClassicVariant ? 'mb-6 md:mb-8 lg:mb-12' : 'relative mb-7 md:mb-10 lg:mb-12'}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isClassicVariant ? (
        <h2 className="mb-3 px-2 text-lg font-semibold text-white sm:px-4 sm:text-xl md:mb-4 md:px-1 md:text-2xl">
          {title}
        </h2>
      ) : (
        <div className="mb-4 flex flex-col gap-3 px-2 sm:px-4 md:px-1 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200/88 sm:text-xs">
                {eyebrow}
              </p>
            ) : null}
            <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:gap-4">
              <h2 className="truncate text-lg font-black text-white drop-shadow-[0_0_16px_rgba(217,70,239,0.18)] sm:text-xl md:text-2xl">
                {title}
              </h2>
              {subtitle ? (
                <p className="max-w-2xl text-sm text-slate-300/74">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-px w-24 flex-1 bg-gradient-to-r from-fuchsia-400/45 via-cyan-300/28 via-70% to-amber-300/18 lg:block xl:w-40" />
            {actionLabel ? (
              <button
                type="button"
                onClick={onActionClick}
                className="inline-flex items-center gap-2 self-start rounded-full border border-fuchsia-300/22 bg-gradient-to-r from-violet-950/92 via-fuchsia-950/76 to-slate-950/90 px-4 py-2 text-sm font-semibold text-fuchsia-50 shadow-[0_14px_28px_rgba(88,28,135,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200/35 hover:text-white"
              >
                <span>{actionLabel}</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className={isClassicVariant ? '' : 'relative rounded-[28px] border border-fuchsia-300/10 bg-[linear-gradient(135deg,rgba(35,8,67,0.18),rgba(8,8,25,0.22)_58%,rgba(2,17,35,0.18))] px-0 py-3 shadow-[0_18px_44px_rgba(46,16,101,0.18)] backdrop-blur-[2px] sm:px-1'}>
        {!isClassicVariant ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-20 bg-gradient-to-r from-[#12041f]/95 via-[#12041f]/70 to-transparent md:block" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-20 bg-gradient-to-l from-[#12041f]/95 via-[#12041f]/70 to-transparent md:block" />

            <button
              onClick={() => scroll('left')}
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseLeave={(e) => e.stopPropagation()}
              tabIndex={dpadEnabled ? -1 : 0}
              aria-hidden={dpadEnabled ? 'true' : undefined}
              className={`absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-fuchsia-300/20 bg-gradient-to-br from-violet-950/90 via-fuchsia-950/68 to-slate-950/82 p-2 text-white shadow-[0_14px_28px_rgba(88,28,135,0.28)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-amber-200/35 hover:shadow-[0_16px_30px_rgba(250,204,21,0.18)] md:flex ${isHovering ? 'opacity-100' : 'opacity-0'}`}
              aria-label="Desplazar a la izquierda"
            >
              <ChevronLeftIcon className="h-7 w-7" />
            </button>
          </>
        ) : null}

        <div
          ref={scrollContainerRef}
          className={isClassicVariant
            ? 'flex overflow-x-auto pb-4 pl-2 pr-2 hide-scrollbar sm:space-x-3 sm:pl-4 sm:pr-4 md:space-x-4 md:pl-1 md:pr-1 [&>*]:w-[110px] [&>*]:flex-shrink-0 sm:[&>*]:w-[140px] md:[&>*]:w-[160px] lg:[&>*]:w-[220px] xl:[&>*]:w-[240px]'
            : 'hide-scrollbar flex overflow-x-auto pb-4 pl-2 pr-2 sm:space-x-3 sm:pl-4 sm:pr-4 md:space-x-4 md:pl-4 md:pr-4 xl:space-x-5 2xl:space-x-6 [&>*]:w-[110px] [&>*]:flex-shrink-0 sm:[&>*]:w-[140px] md:[&>*]:w-[160px] lg:[&>*]:w-[230px] xl:[&>*]:w-[260px] 2xl:[&>*]:w-[280px]'}
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            gap: '0.75rem',
          }}
          aria-label={`Carrusel de ${title}`}
        >
          {items.map((item, index) => {
            let progressPercent = undefined;
            const itemId = item.id || item._id;

            if (showProgressBar && item.watchProgress?.lastTime && item.watchProgress?.duration) {
              progressPercent = (item.watchProgress.lastTime / item.watchProgress.duration) * 100;
            } else if (showProgressBar && typeof item.progressTime === 'number' && item.duration) {
              progressPercent = (item.progressTime / item.duration) * 100;
            }

            if (progressPercent !== undefined) {
              progressPercent = Math.max(0, Math.min(100, progressPercent));
            }

            const resolvedItemType = typeof itemType === 'function' ? itemType(item) : itemType;

            return (
              <div
                key={itemId}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                tabIndex={dpadEnabled ? 0 : undefined}
                data-carousel-item
                data-carousel-index={index}
                onFocusCapture={(e) => {
                  if (!dpadEnabled) return;

                  if (e.target !== e.currentTarget) {
                    requestAnimationFrame(() => {
                      try {
                        e.currentTarget.focus({ preventScroll: true });
                      } catch {
                        e.currentTarget.focus();
                      }
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (!dpadEnabled) return;

                  const action = resolveDpadAction(e);
                  if (!action) return;

                  if (action === 'left') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (index > 0) focusIndex(index - 1);
                    return;
                  }

                  if (action === 'right') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (index < items.length - 1) focusIndex(index + 1);
                    return;
                  }

                  if (action === 'enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    onItemClick?.(item, resolvedItemType);
                  }
                }}
              >
                <Card
                  item={item}
                  onClick={onItemClick}
                  itemType={resolvedItemType}
                  onPlayTrailer={onPlayTrailerClick}
                  progressPercent={progressPercent}
                  onAddToCollectionClick={onAddToCollectionClick}
                  onAddToMyList={onAddToMyListClick}
                  showItemTypeBadge={showItemTypeBadge}
                  variant={resolvedCardVariant}
                  showPlanLock={showPlanLock}
                  isSelected={selectedItemId !== null && selectedItemId !== undefined && String(selectedItemId) === String(itemId)}
                />
              </div>
            );
          })}
        </div>

        {!isClassicVariant ? (
          <button
            onClick={() => scroll('right')}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            tabIndex={dpadEnabled ? -1 : 0}
            aria-hidden={dpadEnabled ? 'true' : undefined}
            className={`absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-fuchsia-300/20 bg-gradient-to-br from-violet-950/90 via-fuchsia-950/68 to-slate-950/82 p-2 text-white shadow-[0_14px_28px_rgba(88,28,135,0.28)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-amber-200/35 hover:shadow-[0_16px_30px_rgba(250,204,21,0.18)] md:flex ${isHovering ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Desplazar a la derecha"
          >
            <ChevronRightIcon className="h-7 w-7" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default React.memo(Carousel);
