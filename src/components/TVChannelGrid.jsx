import React, { useState, useEffect, useCallback } from 'react';
import './TVChannelGrid.css';

/**
 * TVChannelGrid - Componente de grilla de canales optimizado para TV
 * Soporta:
 * - Navegación 2D (arriba/abajo entre categorías, izq/der entre canales)
 * - Precarga de imágenes
 * - Scroll suave
 */
export default function TVChannelGrid({
  categories = [],
  currentCategoryIndex = 0,
  onCategoryChange,
  channels = [],
  onChannelSelect
}) {
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [focusMode, setFocusMode] = useState('channel'); // 'category' o 'channel'

  const currentCategory = categories[currentCategoryIndex];

  // Manejo de navegación
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;

      // Cambiar entre categorías (ARRIBA/ABAJO cuando estamos en categorías)
      if (focusMode === 'category') {
        if (key === 'ArrowUp') {
          e.preventDefault();
          if (currentCategoryIndex > 0) {
            onCategoryChange?.('prev');
            setSelectedChannelIndex(0);
          }
        } else if (key === 'ArrowDown') {
          e.preventDefault();
          if (currentCategoryIndex < categories.length - 1) {
            onCategoryChange?.('next');
            setSelectedChannelIndex(0);
          }
        } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
          e.preventDefault();
          setFocusMode('channel');
          setSelectedChannelIndex(0);
        } else if (key === 'Enter') {
          e.preventDefault();
          setFocusMode('channel');
          setSelectedChannelIndex(0);
        }
      }
      // Navegar canales (IZQUIERDA/DERECHA)
      else if (focusMode === 'channel') {
        if (key === 'ArrowUp') {
          e.preventDefault();
          setFocusMode('category');
        } else if (key === 'ArrowLeft') {
          e.preventDefault();
          setSelectedChannelIndex(prev => Math.max(0, prev - 1));
        } else if (key === 'ArrowRight') {
          e.preventDefault();
          setSelectedChannelIndex(prev => Math.min(channels.length - 1, prev + 1));
        } else if (key === 'ArrowDown') {
          e.preventDefault();
          // Scroll down al final de la grilla
        } else if (key === 'Enter') {
          e.preventDefault();
          if (channels[selectedChannelIndex]) {
            onChannelSelect?.(channels[selectedChannelIndex]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, selectedChannelIndex, currentCategoryIndex, categories.length, channels.length, onCategoryChange, onChannelSelect]);

  // Auto-scroll al canal seleccionado
  useEffect(() => {
    if (focusMode === 'channel') {
      const elem = document.querySelector(`[data-channel-index="${selectedChannelIndex}"]`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, [selectedChannelIndex, focusMode, channels.length]);

  const selectedChannel = channels[selectedChannelIndex];

  return (
    <div className="tv-channel-grid-container">
      {/* Header */}
      <div className="tv-channel-header">
        <h1>TV en Vivo</h1>
        <p className="breadcrumb">
          <span className="category-name">{currentCategory}</span>
          {selectedChannel && (
            <>
              <span> / </span>
              <span className="channel-name">{selectedChannel.name}</span>
            </>
          )}
        </p>
      </div>

      {/* Categorías */}
      <div className="tv-categories-bar">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            className={`category-btn ${
              idx === currentCategoryIndex ? 'active' : ''
            } ${focusMode === 'category' && idx === currentCategoryIndex ? 'focused' : ''}`}
            onClick={() => {
              onCategoryChange?.(idx > currentCategoryIndex ? 'next' : 'prev');
              setSelectedChannelIndex(0);
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grilla de canales */}
      <div className="tv-channels-grid-wrapper">
        <div className="tv-channels-grid">
          {channels.length > 0 ? (
            channels.map((channel, idx) => {
              const isSelected = idx === selectedChannelIndex && focusMode === 'channel';
              return (
                <div
                  key={idx}
                  data-channel-index={idx}
                  className={`channel-card ${isSelected ? 'focused' : ''}`}
                  onClick={() => {
                    setSelectedChannelIndex(idx);
                    setFocusMode('channel');
                  }}
                >
                  <div className="channel-thumbnail">
                    <img
                      src={channel.customThumbnail || channel.thumbnail || channel.logo || '/placeholder.png'}
                      alt={channel.name}
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="focus-indicator">
                        <div className="glow"></div>
                      </div>
                    )}
                  </div>
                  <p className="channel-title">{channel.name}</p>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '40px' }}>
              No hay canales disponibles en esta categoría
            </div>
          )}
        </div>
      </div>

      {/* Información */}
      {selectedChannel && (
        <div className="tv-channel-info">
          <h3>{selectedChannel.name}</h3>
          <p>Presiona OK para ver</p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="tv-instructions-bar">
        <span>↑↓ Categorías</span>
        <span>←→ Canales</span>
        <span>OK Reproducir</span>
      </div>
    </div>
  );
}
