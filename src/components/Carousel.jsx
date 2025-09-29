// src/components/Carousel.jsx
import React, { useRef, useState } from 'react';
import Card from './Card';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// Asegúrate de que el componente Carousel acepte y use onPlayTrailerClick
export default function Carousel({ title, items = [], onItemClick, itemType = 'item', onPlayTrailerClick, onAddToCollectionClick, showItemTypeBadge, showProgressBar }) {
  const scrollContainerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      // Desplazar aproximadamente el 80% del ancho visible del carrusel
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
      className="relative mb-6 md:mb-8 lg:mb-12"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-white px-2 sm:px-4 md:px-1">
        {title}
      </h2>
      <div className="relative">
        {/* Botón de scroll Izquierda */}
        <button
          onClick={() => scroll('left')}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 -ml-4 rounded-full bg-black/60 hover:bg-black/90 transition-all duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'} hidden md:flex items-center justify-center cursor-pointer transform hover:scale-110`}
          aria-label="Desplazar a la izquierda"
        >
          <ChevronLeftIcon className="h-8 w-8 text-white" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex space-x-2 sm:space-x-3 md:space-x-4 overflow-x-auto pb-4 pl-2 pr-2 sm:pl-4 sm:pr-4 md:pl-1 md:pr-1 hide-scrollbar [&>*]:w-[110px] sm:[&>*]:w-[140px] md:[&>*]:w-[160px] lg:[&>*]:w-[180px] [&>*]:flex-shrink-0"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
          aria-label={`Carrusel de ${title}`}
        >
          {items.map((item) => {
            // Calcular progreso para "Continuar viendo"
            let progressPercent = undefined;
            
            if (item.watchProgress?.lastTime && item.watchProgress?.duration) {
              progressPercent = (item.watchProgress.lastTime / item.watchProgress.duration) * 100;
            } else if (typeof item.progressTime === 'number' && item.duration) {
              progressPercent = (item.progressTime / item.duration) * 100;
            }
            
            // Asegurar que el progreso esté entre 0 y 100
            if (progressPercent !== undefined) {
              progressPercent = Math.max(0, Math.min(100, progressPercent));
            }

            return (
              <Card
                key={item.id || item._id}
                item={item}
                onClick={onItemClick}
                itemType={typeof itemType === 'function' ? itemType(item) : itemType}
                onPlayTrailer={onPlayTrailerClick} // Pasa la prop onPlayTrailerClick a Card (Card la espera como onPlayTrailer)
                progressPercent={progressPercent}
                onAddToCollectionClick={onAddToCollectionClick}
                showItemTypeBadge={showItemTypeBadge} // Pasar la prop aquí
              />
            );
          })}
        </div>

        {/* Botón de scroll Derecha */}
        <button
          onClick={() => scroll('right')}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 -mr-4 rounded-full bg-black/60 hover:bg-black/90 transition-all duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'} hidden md:flex items-center justify-center cursor-pointer transform hover:scale-110`}
          aria-label="Desplazar a la derecha"
        >
          <ChevronRightIcon className="h-8 w-8 text-white" />
        </button>
      </div>
    </section>
  );
}
