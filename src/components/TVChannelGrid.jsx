import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './TVChannelGrid.css';
import {
  focusTVNav,
  getTVFocusZone,
  TV_FOCUS_ZONE_CONTENT,
} from '../utils/tvFocusZone.js';
import { useTVGrid } from '../hooks/useTVNavigation.js';
import { getAccessLockState } from '../utils/planAccess.js';

function getChannelColumns(width) {
  if (width <= 1280) return 4;
  if (width <= 1920) return 5;
  return 6;
}

function resolveGridAction(event) {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Enter':
      return event.key;
    case ' ':
    case 'Spacebar':
    case 'Select':
    case 'MediaPlayPause':
      return 'Enter';
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
    case 62:
    case 66:
      return 'Enter';
    default:
      return null;
  }
}

export default function TVChannelGrid({
  categories = [],
  currentCategoryIndex = 0,
  onCategoryChange,
  channels = [],
  onChannelSelect,
  onSearch,
  initialChannelIndex = 0,
  onActiveChannelIndexChange,
}) {
  const { user } = useAuth();
  const [focusMode, setFocusMode] = useState('channel');
  const [columnCount, setColumnCount] = useState(() => getChannelColumns(window.innerWidth || 1920));
  const {
    currentIndex: selectedChannelIndex,
    setCurrentIndex: setSelectedChannelIndex,
    navigate,
  } = useTVGrid(channels, columnCount, initialChannelIndex);

  const currentCategory = categories[currentCategoryIndex];
  const selectedChannel = channels[selectedChannelIndex];
  const currentRow = useMemo(
    () => Math.floor(selectedChannelIndex / columnCount),
    [columnCount, selectedChannelIndex],
  );

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getChannelColumns(window.innerWidth || 1920));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    onActiveChannelIndexChange?.(selectedChannelIndex);
  }, [onActiveChannelIndexChange, selectedChannelIndex]);

  useEffect(() => {
    setFocusMode('channel');
  }, [currentCategoryIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
        return;
      }

      const action = resolveGridAction(event);
      if (!action) {
        return;
      }

      if (focusMode === 'search') {
        if (action === 'ArrowUp') {
          event.preventDefault();
          focusTVNav();
        } else if (action === 'ArrowDown') {
          event.preventDefault();
          setFocusMode('category');
        } else if (action === 'Enter') {
          event.preventDefault();
          onSearch?.();
        }

        return;
      }

      if (focusMode === 'category') {
        if (action === 'ArrowUp') {
          event.preventDefault();
          if (onSearch) {
            setFocusMode('search');
            return;
          }
          focusTVNav();
          return;
        }

        if (action === 'ArrowDown') {
          event.preventDefault();
          setFocusMode('channel');
          setSelectedChannelIndex(0);
          return;
        }

        if (action === 'ArrowLeft') {
          event.preventDefault();
          onCategoryChange?.('prev');
          return;
        }

        if (action === 'ArrowRight') {
          event.preventDefault();
          onCategoryChange?.('next');
          return;
        }

        if (action === 'Enter') {
          event.preventDefault();
          setFocusMode('channel');
          setSelectedChannelIndex(0);
        }

        return;
      }

      switch (action) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentRow === 0) {
            setFocusMode('category');
            return;
          }
          navigate('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          navigate('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigate('right');
          break;
        case 'Enter':
          event.preventDefault();
          if (channels[selectedChannelIndex]) {
            onChannelSelect?.(channels[selectedChannelIndex]);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    categories.length,
    channels,
    currentCategoryIndex,
    currentRow,
    focusMode,
    navigate,
    onCategoryChange,
    onChannelSelect,
    onSearch,
    selectedChannelIndex,
    setSelectedChannelIndex,
  ]);

  useEffect(() => {
    if (focusMode !== 'channel') {
      return;
    }

    const selectedElement = document.querySelector(`[data-channel-index="${selectedChannelIndex}"]`);
      selectedElement?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
  }, [focusMode, selectedChannelIndex]);

  return (
    <div className="tv-channel-grid-container">
      <div className="tv-channel-header">
        <div className="tv-channel-title-row">
          <div>
            <h1>TV en Vivo</h1>
            <p className="breadcrumb">
              <span className="category-name">{currentCategory}</span>
              {selectedChannel ? (
                <>
                  <span> / </span>
                  <span className="channel-name">{selectedChannel.name}</span>
                </>
              ) : null}
            </p>
          </div>

          <button
            type="button"
            className={`tv-channel-search-btn ${focusMode === 'search' ? 'focused' : ''}`}
            onClick={() => onSearch?.()}
            onFocus={() => setFocusMode('search')}
            tabIndex={0}
            aria-label="Buscar canales en TV en Vivo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span>Buscar canal</span>
          </button>
        </div>
      </div>

      <div className="tv-categories-bar">
        {categories.map((category, index) => (
          <button
            key={category || index}
            type="button"
            className={`category-btn ${index === currentCategoryIndex ? 'active' : ''} ${focusMode === 'category' && index === currentCategoryIndex ? 'focused' : ''}`}
            onClick={() => {
              if (index === currentCategoryIndex) {
                setFocusMode('channel');
                setSelectedChannelIndex(0);
                return;
              }

              onCategoryChange?.(index > currentCategoryIndex ? 'next' : 'prev');
            }}
            tabIndex={-1}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="tv-channels-grid-wrapper">
        <div
          className="tv-channels-grid"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {channels.length > 0 ? (
            channels.map((channel, index) => {
              const isSelected = focusMode === 'channel' && index === selectedChannelIndex;
              const lockState = getAccessLockState(channel, user?.plan);

              return (
                <button
                  key={channel._id || channel.id || `${channel.name}-${index}`}
                  type="button"
                  data-channel-index={index}
                  className={`channel-card ${isSelected ? 'focused' : ''}`}
                  onClick={() => {
                    setSelectedChannelIndex(index);
                    setFocusMode('channel');
                    onChannelSelect?.(channel);
                  }}
                  tabIndex={-1}
                >
                  <div className={`channel-thumbnail ${lockState.locked ? 'locked' : ''}`}>
                    <img
                      src={channel.customThumbnail || channel.thumbnail || channel.logo || '/placeholder.png'}
                      alt={channel.name}
                      loading="lazy"
                    />
                    {lockState.locked ? (
                      <>
                        <div className="channel-lock-badge">Bloqueado</div>
                        <div className="channel-lock-footer">
                          <p>{lockState.lockMessage}</p>
                        </div>
                      </>
                    ) : null}
                    {isSelected ? (
                      <div className="focus-indicator">
                        <div className="glow" />
                      </div>
                    ) : null}
                  </div>
                  <p className="channel-title">{channel.name}</p>
                </button>
              );
            })
          ) : (
            <div className="tv-channel-empty">No hay canales disponibles en esta categoria.</div>
          )}
        </div>
      </div>

      {selectedChannel ? (
        <div className="tv-channel-info">
          <h3>{selectedChannel.name}</h3>
          <p>Presiona OK para ver o sigue navegando para cambiar de canal.</p>
        </div>
      ) : null}

      <div className="tv-instructions-bar">
        <span>Arriba en categorias va a lupa local</span>
        <span>Arriba en la primera fila vuelve a categorias</span>
        <span>Flechas mueven entre canales</span>
        <span>OK reproduce</span>
      </div>
    </div>
  );
}
