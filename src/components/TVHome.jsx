import React, { useState, useEffect, useRef, useCallback } from 'react';
import TVSearch from './TVSearch';
import './TVHome.css';

/**
 * TVHome - Navegación 2D optimizada para Android TV
 * Permite:
 * - Navegar entre carruseles (ARRIBA/ABAJO)
 * - Navegar dentro de carrusel (IZQ/DER)
 * - Seleccionar items (ENTER)
 * - Búsqueda ultra-rápida con voz
 * - Suave y rápido
 */
export default function TVHome({ 
  sections = [], // Array de { title, items: [] }
  onSelectItem,
  onSectionChange
}) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [direction, setDirection] = useState(null); // 'vertical' o 'horizontal'
  const [showSearch, setShowSearch] = useState(false);
  const sectionRefs = useRef({});
  const longPressTimer = useRef(null);

  // Preparar todos los contenidos para la búsqueda
  const allContent = sections.flatMap(section => 
    section.items.map(item => ({
      ...item,
      type: section.type || section.title
    }))
  );

  const currentSection = sections[currentSectionIndex];
  const currentItem = currentSection?.items[currentItemIndex];

  // Manejo de navegación con D-Pad
  const handleNavigation = useCallback((e) => {
    const key = e.key;
    
    // Búsqueda: "/" o "s" (search)
    if (key === '/' || (key.toLowerCase() === 's' && e.ctrlKey)) {
      e.preventDefault();
      setShowSearch(true);
      return;
    }
    
    // Vertical: ARRIBA/ABAJO entre secciones
    if (key === 'ArrowUp') {
      e.preventDefault();
      setCurrentSectionIndex(prev => Math.max(0, prev - 1));
      setCurrentItemIndex(0); // Reset posición horizontal
      setDirection('vertical');
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      setCurrentSectionIndex(prev => Math.min(sections.length - 1, prev + 1));
      setCurrentItemIndex(0); // Reset posición horizontal
      setDirection('vertical');
    }
    // Horizontal: IZQ/DER dentro del carrusel
    else if (key === 'ArrowLeft') {
      e.preventDefault();
      if (currentSection) {
        setCurrentItemIndex(prev => Math.max(0, prev - 1));
        setDirection('horizontal');
      }
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      if (currentSection) {
        setCurrentItemIndex(prev => Math.min(currentSection.items.length - 1, prev + 1));
        setDirection('horizontal');
      }
    }
    // Select: ENTER
    else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (currentItem && onSelectItem) {
        onSelectItem(currentItem, currentSectionIndex, currentItemIndex);
      }
    }
  }, [sections, currentSection, currentItem, onSelectItem]);

  useEffect(() => {
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [handleNavigation]);

  // Auto-scroll al item seleccionado
  useEffect(() => {
    const itemRef = document.querySelector(`[data-item-key="${currentSectionIndex}-${currentItemIndex}"]`);
    if (itemRef) {
      itemRef.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center', 
        inline: 'center' 
      });
    }
  }, [currentItemIndex, currentSectionIndex]);

  if (!sections || sections.length === 0) {
    return <div className="tv-home-empty">Cargando...</div>;
  }

  const handleSearchSelect = (item) => {
    setShowSearch(false);
    if (onSelectItem) {
      onSelectItem(item, null, null);
    }
  };

  return (
    <div className="tv-home-container">
      {/* Modal de búsqueda */}
      {showSearch && (
        <TVSearch
          allContent={allContent}
          onSelectItem={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      <div className="tv-home-container-inner">
      {/* Header con info actual */}
      <div className="tv-home-header">
        <h1 className="tv-home-title">TeamG Play</h1>
        <div className="tv-home-breadcrumb">
          <span className="breadcrumb-section">{currentSection?.title}</span>
          {currentItem && (
            <>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-item">{currentItem.name || currentItem.title}</span>
            </>
          )}
        </div>
      </div>

      {/* Carruseles */}
      <div className="tv-home-sections">
        {sections.map((section, sectionIndex) => {
          const isCurrentSection = sectionIndex === currentSectionIndex;
          
          return (
            <div
              key={sectionIndex}
              className={`tv-home-section ${isCurrentSection ? 'active' : ''}`}
              ref={el => sectionRefs.current[sectionIndex] = el}
            >
              <h2 className="section-title">{section.title}</h2>
              <div className="section-carousel">
                {section.items.map((item, itemIndex) => {
                  const isSelected = isCurrentSection && itemIndex === currentItemIndex;
                  const key = `${sectionIndex}-${itemIndex}`;
                  
                  return (
                    <div
                      key={key}
                      data-item-key={key}
                      className={`carousel-item ${isSelected ? 'focused' : ''}`}
                    >
                      <div className="item-card">
                        <img
                          src={item.image || item.logo || item.poster || '/placeholder.png'}
                          alt={item.name || item.title}
                          className="item-poster"
                        />
                        {isSelected && (
                          <div className="focus-overlay">
                            <div className="focus-ring"></div>
                          </div>
                        )}
                      </div>
                      <p className="item-name">{item.name || item.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info del item */}
      {currentItem && (
        <div className="tv-home-details">
          <div className="details-content">
            <h3>{currentItem.name || currentItem.title}</h3>
            {currentItem.description && (
              <p className="details-description">{currentItem.description}</p>
            )}
            <div className="details-meta">
              {currentItem.genre && <span className="meta-badge">{currentItem.genre}</span>}
              {currentItem.year && <span className="meta-badge">{currentItem.year}</span>}
              {currentItem.rating && <span className="meta-badge">⭐ {currentItem.rating}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="tv-home-instructions">
        <span className="instruction-arrow">↑↓</span> Navegar secciones
        <span className="instruction-sep">|</span>
        <span className="instruction-arrow">←→</span> Navegar items
        <span className="instruction-sep">|</span>
        <span className="instruction-button">OK</span> Seleccionar
        <span className="instruction-sep">|</span>
        <span className="instruction-arrow">🔍</span> Buscar
      </div>
      </div>
    </div>
  );
}
