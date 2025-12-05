import React, { useState, useEffect } from 'react';
import { useTVGrid } from '../hooks/useTVNavigation';
import './TVGrid.css';

export default function TVGrid({ 
  items = [], 
  title = "Canales", 
  onSelectItem,
  columns = 4,
  rows = 3 
}) {
  const { currentIndex, navigate, currentItem } = useTVGrid(items, columns);
  const [showDetails, setShowDetails] = useState(false);

  // Cálculos de posición
  const currentRow = Math.floor(currentIndex / columns);
  const currentCol = currentIndex % columns;

  // Manejador de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate('right');
          break;
        case 'Enter':
          e.preventDefault();
          if (currentItem && onSelectItem) {
            onSelectItem(currentItem, currentIndex);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentItem, navigate, onSelectItem]);

  return (
    <div className="tv-grid-container">
      <div className="tv-grid-header">
        <h1>{title}</h1>
        <div className="tv-grid-info">
          {currentItem && (
            <>
              <span className="item-title">{currentItem.name || currentItem.title}</span>
              <span className="item-position">
                {currentIndex + 1} / {items.length}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="tv-grid-wrapper">
        <div className="tv-grid">
          {items.map((item, index) => {
            const isSelected = index === currentIndex;
            const row = Math.floor(index / columns);
            const col = index % columns;

            return (
              <div
                key={index}
                className={`tv-grid-item ${isSelected ? 'focused' : ''}`}
                style={{
                  gridColumn: col + 1,
                  gridRow: row + 1,
                }}
              >
                <div className="item-image-wrapper">
                  <img
                    src={item.image || item.logo || '/placeholder.png'}
                    alt={item.name || item.title}
                    className="item-image"
                  />
                  {isSelected && (
                    <div className="focus-indicator">
                      <div className="focus-ring"></div>
                    </div>
                  )}
                </div>

                <div className="item-label">
                  <p>{item.name || item.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel de detalles */}
      {currentItem && (
        <div className="tv-grid-details">
          <div className="details-content">
            <div className="details-image">
              <img
                src={currentItem.image || currentItem.logo || '/placeholder.png'}
                alt={currentItem.name || currentItem.title}
              />
            </div>
            <div className="details-info">
              <h2>{currentItem.name || currentItem.title}</h2>
              {currentItem.description && (
                <p className="details-description">{currentItem.description}</p>
              )}
              {currentItem.category && (
                <p className="details-category">
                  <strong>Categoría:</strong> {currentItem.category}
                </p>
              )}
              <div className="details-actions">
                <button className="action-button primary">
                  ▶️ Ver / Reproducir
                </button>
                <button className="action-button secondary">
                  ℹ️ Más Información
                </button>
              </div>
            </div>
          </div>

          <div className="details-controls">
            <p className="control-hint">
              Usa los botones direccionales para navegar • Presiona OK para seleccionar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
