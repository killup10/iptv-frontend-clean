import React, { useCallback, useEffect, useState } from 'react';
import { useTVGrid } from '../hooks/useTVNavigation';
import { useAuth } from '../context/AuthContext.jsx';
import './TVGrid.css';
import {
  focusTVNav,
  getTVFocusZone,
  TV_FOCUS_CONTENT_EVENT,
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

export default function TVGrid({
  items = [],
  title = 'Canales',
  subtitle = '',
  onSelectItem,
  columns = 4,
  initialIndex = 0,
  onActiveIndexChange,
  onSearch,
  variant = 'default',
  statusMessage = '',
  showPlanLock = true,
}) {
  const { user } = useAuth();
  const { currentIndex, navigate, currentItem } = useTVGrid(items, columns, initialIndex);
  const currentRow = Math.floor(currentIndex / columns);
  const [focusMode, setFocusMode] = useState('grid');

  const runItemAction = useCallback((item = currentItem, index = currentIndex) => {
    if (!item) return;

    onSelectItem?.(item, index);
  }, [currentIndex, currentItem, onSelectItem]);

  useEffect(() => {
    onActiveIndexChange?.(currentIndex);
  }, [currentIndex, onActiveIndexChange]);

  useEffect(() => {
    setFocusMode('grid');
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
        return;
      }

      const action = resolveGridAction(event);

      if (focusMode === 'search') {
        switch (action) {
          case 'ArrowUp':
            event.preventDefault();
            focusTVNav();
            break;
          case 'ArrowDown':
            event.preventDefault();
            setFocusMode('grid');
            break;
          case 'Enter':
          case ' ':
            event.preventDefault();
            onSearch?.();
            break;
          default:
            break;
        }
        return;
      }

      switch (action) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentRow === 0) {
            if (onSearch) {
              setFocusMode('search');
              return;
            }
            focusTVNav();
            return;
          }
          navigate('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusMode('grid');
          navigate('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setFocusMode('grid');
          navigate('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          setFocusMode('grid');
          navigate('right');
          break;
        case 'Enter':
          event.preventDefault();
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
    currentIndex,
    currentItem,
    currentRow,
    focusMode,
    navigate,
    onSearch,
    onSelectItem,
    runItemAction,
  ]);

  useEffect(() => {
    const scrollToCurrentItem = () => {
      const selectedElement = document.querySelector(`[data-grid-index="${currentIndex}"]`);
      selectedElement?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    };

    scrollToCurrentItem();
    window.addEventListener(TV_FOCUS_CONTENT_EVENT, scrollToCurrentItem);
    return () => window.removeEventListener(TV_FOCUS_CONTENT_EVENT, scrollToCurrentItem);
  }, [currentIndex]);

  return (
    <div className={`tv-grid-container tv-grid-variant-${variant}`}>
      <div className="tv-grid-header">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="tv-grid-subtitle">{subtitle}</p> : null}
        </div>
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
                data-grid-index={index}
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

                  {lockState.locked ? (
                    <>
                      <div className="item-lock-badge">Bloqueado</div>
                      <div className="item-lock-footer">
                        <p>{lockState.lockMessage}</p>
                      </div>
                    </>
                  ) : null}

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

                      {null}
                    </div>
                  ) : null}

                  <div className="item-base-copy">
                    <p className="item-base-title">{itemTitle}</p>
                    {itemYear ? <p className="item-base-meta">{itemYear}</p> : null}
                  </div>

                  {isSelected ? (
                    <div className="item-overlay">
                      <div className="item-overlay-copy">
                        <h2>{itemTitle}</h2>
                        {itemYear ? <p className="item-overlay-meta">{itemYear}</p> : null}
                        {itemDescription ? (
                          <p className="item-overlay-description">{itemDescription}</p>
                        ) : null}
                        {lockState.locked ? (
                          <p className="item-overlay-status">{lockState.lockMessage}</p>
                        ) : statusMessage ? (
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
}
