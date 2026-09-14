import React, { useState, useEffect, useCallback } from 'react';
import { focusTVNav, getTVFocusZone, TV_FOCUS_ZONE_CONTENT } from '../utils/tvFocusZone';
import { getTVKeyName } from '../utils/tvRemote';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getTVItemTitle,
  getTVItemDescription,
  getTVItemYear,
  getTVItemRating,
  getTVItemQualityBadges,
  resolveTVItemType,
  getTVItemImage,
  getTVItemDuration,
  getTVItemDirector,
  getTVItemCertification,
  getTVItemUserScore,
} from '../utils/tvContentUtils.js';
import { getAccessLockState } from '../utils/planAccess.js';

/**
 * TVGrid: Un componente genérico y altamente optimizado para mostrar grillas de contenido.
 * Maneja la navegación espacial (D-Pad) internamente con un solo listener.
 */
const TVGrid = ({ 
  items = [], 
  title = "", 
  subtitle = "",
  columns = 4, 
  onItemSelect, 
  onSelectItem,
  autoFocus = false,
  gridId = "default-grid",
  initialIndex = 0,
  onActiveIndexChange,
  onSearch,
  variant = 'default',
  statusMessage = '',
  showPlanLock = true,
  showItemTypeBadge = false
}) => {
  const { user } = useAuth();
  const handleSelect = onItemSelect || onSelectItem;
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const [focusMode, setFocusMode] = useState('grid'); // 'grid' | 'search'
  
  useEffect(() => {
    if (autoFocus && items.length > 0) {
      setFocusedIndex((prev) => (prev < 0 || prev >= items.length ? 0 : prev));
    }
  }, [autoFocus, items.length]);

  const handleKeyDown = useCallback((e) => {
    if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;
    if (items.length === 0) return;

    // Nombre canonico: funciona con `key` y con keyCode 19-23 de mandos reales.
    const action = getTVKeyName(e);

    if (focusMode === 'search') {
      switch (action) {
        case 'ArrowUp': // Up
        case 'ArrowLeft': // Left
          e.preventDefault();
          focusTVNav();
          break;
        case 'ArrowDown': // Down
          e.preventDefault();
          setFocusMode('grid');
          break;
        case 'Enter': // Enter / Space / OK
          e.preventDefault();
          onSearch?.();
          break;
        default:
          break;
      }
      return;
    }

    if (!action || action === 'Escape' || action === 'Backspace') {
      // BACK lo gestiona AppTV (no hacer preventDefault: lo necesita ver).
      return;
    }

    const row = Math.floor(focusedIndex / columns);
    const col = focusedIndex % columns;
    const totalRows = Math.ceil(items.length / columns);

    let nextIndex = focusedIndex;

    switch (action) {
      case 'ArrowLeft': // Left
        // Borde izquierdo de la fila: ir al sidebar.
        e.preventDefault();
        if (col > 0) {
          nextIndex = focusedIndex - 1;
        } else {
          focusTVNav();
          return;
        }
        break;
      case 'ArrowRight': // Right
        e.preventDefault();
        if (col < columns - 1 && focusedIndex < items.length - 1) {
          nextIndex = focusedIndex + 1;
        }
        break;
      case 'ArrowUp': // Up
        e.preventDefault();
        if (row > 0) {
          nextIndex = focusedIndex - columns;
        } else {
          // Borde superior
          if (onSearch) {
            setFocusMode('search');
          }
          return;
        }
        break;
      case 'ArrowDown': // Down
        e.preventDefault();
        if (row < totalRows - 1) {
          nextIndex = Math.min(focusedIndex + columns, items.length - 1);
        }
        break;
      case 'Enter': // Enter
        if (focusedIndex >= 0 && items[focusedIndex]) {
          e.preventDefault();
          handleSelect?.(items[focusedIndex], focusedIndex);
        }
        break;
      default:
        break;
    }

    if (nextIndex !== focusedIndex) {
      setFocusedIndex(nextIndex);
      onActiveIndexChange?.(nextIndex);
      // Auto-scroll
      const el = document.querySelector(`[data-grid-id="${gridId}"] [data-index="${nextIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      }
    }
  }, [focusedIndex, items, columns, handleSelect, gridId, onActiveIndexChange, focusMode, onSearch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (items.length === 0) return null;

  const isKidsVariant = variant === 'kids';

  return (
    <div className={`tv-grid-container ${isKidsVariant ? 'tv-grid-variant-kids' : ''}`} data-grid-id={gridId}>
      <div className="tv-grid-header">
        <div>
          {title && (
            <h1 className="text-white">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="tv-grid-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        
        {onSearch && (
          <div className="tv-grid-header-actions">
            <button
              type="button"
              className={`tv-grid-search-btn ${focusMode === 'search' ? 'focused' : ''}`}
              onClick={onSearch}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span>Buscar aqui</span>
            </button>
          </div>
        )}
      </div>

      <div className="tv-grid-wrapper">
        <div className="tv-grid" style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
        }}>
          {items.map((item, index) => {
            const isSelected = focusMode === 'grid' && index === focusedIndex;
            const itemTitle = getTVItemTitle(item);
            const itemDescription = getTVItemDescription(item);
            const itemYear = getTVItemYear(item);
            const itemRating = getTVItemRating(item);
            const itemQualityBadges = getTVItemQualityBadges(item);
            const resolvedItemType = resolveTVItemType(item, 'movie');
            const itemType = resolvedItemType.replace('-', ' ');
            const itemDuration = getTVItemDuration(item);
            const itemDirector = getTVItemDirector(item);
            const itemCert = getTVItemCertification(item);
            const itemUserScore = getTVItemUserScore(item);
            const lockState = showPlanLock
              ? getAccessLockState(item, user?.plan)
              : { locked: false, lockMessage: '' };

            return (
              <div 
                key={item._id || item.id || index} 
                data-index={index}
                className={`tv-grid-item ${isSelected ? 'focused' : ''}`}
              >
                <div
                  className="item-image-wrapper cursor-pointer"
                  onClick={() => handleSelect?.(item, index)}
                >
                  <img
                    src={getTVItemImage(item)}
                    alt={itemTitle}
                    className={`item-image ${lockState.locked ? 'is-locked' : ''}`}
                    onError={(e) => {
                      e.target.src = '/placeholder-video.jpg';
                    }}
                    loading="lazy"
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
                             if (t === 'dorama' || t === 'doramas' || t === 'k-dramas' || t === 'k-drama') return 'Series Asiáticas';
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
                        <div className="item-overlay-meta flex items-center gap-1.5 flex-wrap">
                          {itemCert ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-white/20 text-white border border-white/30">
                              {itemCert}
                            </span>
                          ) : null}
                          {itemYear ? <span>{itemYear}</span> : null}
                          {itemDuration ? <span>• {itemDuration}</span> : null}
                          {itemUserScore ? (
                            <span className="text-emerald-400 font-bold">• {itemUserScore}% TMDB</span>
                          ) : null}
                        </div>
                        {itemDirector ? (
                          <p className="text-[11px] text-cyan-300 font-semibold mt-1">Dir: {itemDirector}</p>
                        ) : null}
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
    </div>
  );
};

export default React.memo(TVGrid);
