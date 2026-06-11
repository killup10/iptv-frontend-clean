import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTVGrid } from '../hooks/useTVNavigation';
import { useAuth } from '../context/AuthContext.jsx';
import {
  focusTVNav,
  getTVFocusZone,
  TV_FOCUS_ZONE_CONTENT,
} from '../utils/tvFocusZone.js';
import {
  getTVItemDescription,
  getTVItemImage,
  getTVItemQualityBadges,
  getTVItemRating,
  getTVItemTitle,
  getTVItemYear,
  resolveTVItemType,
} from '../utils/tvContentUtils.js';
import { getAccessLockState } from '../utils/planAccess.js';
import './TVGrid.css';
import './TVFilteredGridPage.css';

function resolveGridAction(event) {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Enter':
    case 'Escape':
      return event.key;
    case ' ':
    case 'Spacebar':
    case 'Select':
    case 'MediaPlayPause':
      return 'Enter';
    case 'Backspace':
    case 'GoBack':
    case 'BrowserBack':
      return 'Escape';
    default:
      break;
  }

  switch (event.keyCode) {
    case 19:
      return 'ArrowUp';
    case 20:
      return 'ArrowDown';
    case 21:
      return 'ArrowLeft';
    case 22:
      return 'ArrowRight';
    case 23:
    case 66:
    case 62:
      return 'Enter';
    case 4:
    case 8:
    case 27:
    case 111:
      return 'Escape';
    default:
      return null;
  }
}

export default function TVFilteredGridPage({
  title,
  subtitle = '',
  filters = [],
  selectedFilterIndex = 0,
  onFilterIndexChange,
  items = [],
  onSelectItem,
  columns = 4,
  initialIndex = 0,
  onActiveIndexChange,
  onSearch,
  emptyMessage = 'No hay elementos disponibles en esta seccion.',
  statusMessage = '',
  showPlanLock = true,
  loading = false,
  showItemTypeBadge = false,
}) {
  const { user } = useAuth();
  const [focusMode, setFocusMode] = useState('filters');
  const { currentIndex, currentItem, navigate, setCurrentIndex } = useTVGrid(items, columns, initialIndex);
  const currentRow = Math.floor(currentIndex / columns);
  const totalRows = Math.ceil(items.length / columns);

  const runItemAction = useCallback((item = currentItem, index = currentIndex) => {
    if (!item) return;

    onSelectItem?.(item, index);
  }, [currentIndex, currentItem, onSelectItem]);

  useEffect(() => {
    onActiveIndexChange?.(currentIndex);
  }, [currentIndex, onActiveIndexChange]);

  // Si los items cambian (carga nueva), resetear foco si es necesario
  useEffect(() => {
    if (items.length > 0 && currentIndex === -1) {
       setCurrentIndex(0);
    }
  }, [items.length, currentIndex, setCurrentIndex]);

  useEffect(() => {
    if (focusMode !== 'grid') {
      return;
    }

    const selectedElement = document.querySelector(`[data-filtered-grid-index="${currentIndex}"]`);
    if (selectedElement) {
       selectedElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
    }
  }, [currentIndex, focusMode]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
        return;
      }

      const action = resolveGridAction(event);
      if (!action) return;

      // Bloquear scroll nativo
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }

      if (focusMode === 'search') {
        switch (action) {
          case 'ArrowUp':
            focusTVNav();
            break;
          case 'ArrowDown':
            setFocusMode('filters');
            break;
          case 'Enter':
            onSearch?.();
            break;
          case 'ArrowLeft':
            focusTVNav();
            break;
          default:
            break;
        }
        return;
      }

      if (focusMode === 'filters') {
        switch (action) {
          case 'ArrowUp':
            if (onSearch) {
              setFocusMode('search');
              return;
            }
            focusTVNav();
            break;
          case 'ArrowLeft':
            if (selectedFilterIndex === 0) {
              focusTVNav();
            } else {
              onFilterIndexChange?.(selectedFilterIndex - 1);
            }
            break;
          case 'ArrowRight':
            onFilterIndexChange?.(Math.min(filters.length - 1, selectedFilterIndex + 1));
            break;
          case 'ArrowDown':
          case 'Enter':
            if (items.length > 0) {
              setFocusMode('grid');
              if (currentIndex === -1) setCurrentIndex(0);
            }
            break;
          default:
            break;
        }

        return;
      }

      // Grid mode
      switch (action) {
        case 'ArrowUp':
          if (currentRow === 0) {
            setFocusMode('filters');
            return;
          }
          navigate('up');
          break;
        case 'ArrowDown':
          if (currentRow < totalRows - 1) {
            navigate('down');
          }
          break;
        case 'ArrowLeft':
          if (currentIndex % columns === 0) {
            focusTVNav();
            return;
          }
          navigate('left');
          break;
        case 'ArrowRight':
          if (currentIndex % columns < columns - 1 && currentIndex < items.length - 1) {
            navigate('right');
          }
          break;
        case 'Enter':
          if (currentItem && onSelectItem) {
            runItemAction();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    columns,
    currentIndex,
    currentItem,
    currentRow,
    filters.length,
    focusMode,
    items.length,
    navigate,
    onFilterIndexChange,
    onSearch,
    onSelectItem,
    runItemAction,
    selectedFilterIndex,
    totalRows,
    setCurrentIndex
  ]);

  const filterLabel = useMemo(() => filters[selectedFilterIndex] || '', [filters, selectedFilterIndex]);

  return (
    <div className="tv-grid-container tv-filtered-grid-container">
      <div className="tv-grid-header">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="tv-grid-subtitle">{subtitle}</p> : null}
        </div>
        <div className="tv-grid-header-actions">
          {filterLabel ? (
            <div className="tv-grid-info">
              <span className="item-title">{filterLabel}</span>
            </div>
          ) : null}
          {onSearch ? (
            <button
              type="button"
              className={`tv-grid-search-btn ${focusMode === 'search' ? 'focused' : ''}`}
              onClick={onSearch}
              onFocus={() => setFocusMode('search')}
              aria-label={`Buscar en ${title}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span>Buscar aqui</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="tv-filtered-bar" aria-label="Filtros">
        {filters.map((filter, index) => {
          const isSelected = index === selectedFilterIndex;
          const isFocused = focusMode === 'filters' && isSelected;

          return (
            <button
              key={filter}
              type="button"
              className={`tv-filter-chip ${isSelected ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
              onClick={() => onFilterIndexChange?.(index)}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {!items.length ? (
        <div className="tv-filtered-empty">
          <h2>{filterLabel || title}</h2>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="tv-grid-wrapper">
          <div
            className="tv-grid"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {items.map((item, index) => {
              const isSelected = focusMode === 'grid' && index === currentIndex;
              const itemTitle = getTVItemTitle(item);
              const itemDescription = getTVItemDescription(item);
              const itemYear = getTVItemYear(item);
              const itemRating = getTVItemRating(item);
              const itemQualityBadges = getTVItemQualityBadges(item);
              const resolvedItemType = resolveTVItemType(item, 'movie');
              const itemType = resolvedItemType.replace('-', ' ');
              const lockState = showPlanLock
                ? getAccessLockState(item, user?.plan)
                : { locked: false, lockMessage: '' };

              return (
                <div
                  key={item._id || item.id || index}
                  data-filtered-grid-index={index}
                  className={`tv-grid-item ${isSelected ? 'focused' : ''}`}
                >
                  <div
                    className="item-image-wrapper"
                    onClick={() => onSelectItem?.(item, index)}
                  >
                    <img
                      src={getTVItemImage(item)}
                      alt={itemTitle}
                      className={`item-image ${lockState.locked ? 'is-locked' : ''}`}
                    />

                    {lockState.locked && (
                      <div className="item-lock-badge">
                        <svg className="w-3.5 h-3.5 mr-1 inline-block align-middle" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                        <span>CERRADO</span>
                      </div>
                    )}

                    {lockState.locked && (
                      <div className="item-lock-footer">
                        <p className="font-extrabold uppercase text-[10px] tracking-wider text-amber-200">Upgrade requerido</p>
                        <p className="text-[11px] text-white/90 font-semibold mt-0.5">{lockState.minimumPlanLabel || 'Plan Superior'}</p>
                      </div>
                    )}

                    {(itemRating || itemQualityBadges.length > 0 || (itemType && itemType !== 'movie')) ? (
                      <div className="item-corner-badges">
                        {itemRating ? (
                          <div className="item-rating-badge">
                            <span className="item-rating-star">{'\u2605'}</span>
                            <span>{itemRating}</span>
                          </div>
                        ) : null}

                        {itemQualityBadges.map((badge) => (
                          <span
                            key={`${itemTitle}-${badge}`}
                            className={`item-feature-badge ${badge.includes('4K') ? 'is-4k' : 'is-60fps'}`}
                          >
                            {badge}
                          </span>
                        ))}

                        {showItemTypeBadge && resolvedItemType && (
                          <span className="item-type-badge">
                            {(() => {
                             const t = resolvedItemType.toLowerCase();
                             if (t === 'movie' || t === 'movies' || t === 'pelicula' || t === 'peliculas' || t === 'video' || t === 'videos') return 'película';
                             if (t === 'serie' || t === 'series') return 'serie';
                             if (t === 'anime' || t === 'animes') return 'anime';
                             if (t === 'dorama' || t === 'doramas' || t === 'k-dramas' || t === 'k-drama') return 'K-Drama';
                             if (t === 'novela' || t === 'novelas') return 'novela';
                             if (t === 'documental' || t === 'documentales') return 'documental';
                             if (t === 'zona kids' || t === 'kids') return 'kids';
                              return t;
                            })()}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {!lockState.locked && (
                      <div className="item-base-copy">
                        <p className="item-base-title">{itemTitle}</p>
                        {itemYear ? <p className="item-base-meta">{itemYear}</p> : null}
                      </div>
                    )}

                    {isSelected ? (
                      <div className="item-overlay">
                        <div className="item-overlay-copy">
                          <h2>{itemTitle}</h2>
                          {itemYear ? <p className="item-overlay-meta">{itemYear}</p> : null}
                          {lockState.locked ? (
                            <p className="item-overlay-description text-amber-400 font-bold uppercase tracking-wider mt-1 text-xs">
                              {lockState.lockMessage}
                            </p>
                          ) : itemDescription ? (
                            <p className="item-overlay-description">{itemDescription}</p>
                          ) : null}
                          {statusMessage ? (
                            <p className="item-overlay-status">{statusMessage}</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {isSelected ? (
                      <div className="focus-indicator">
                        <div className="focus-ring" />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
