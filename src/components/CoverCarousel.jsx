import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

export default function CoverCarousel({
  items = [],
  onItemClick,
  onTrailerClick,
  interval = 5000 // 5 segundos por defecto
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayItems, setDisplayItems] = useState([]);

  // Seleccionar 3-4 items al azar cuando items cambia
  useEffect(() => {
    if (items && items.length > 0) {
      // Seleccionar 3 o 4 items al azar
      const count = Math.min(4, Math.max(3, Math.floor(items.length / 3)));
      const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, count);
      setDisplayItems(shuffled);
      setCurrentIndex(0);
    }
  }, [items]);

  // Auto-cambiar cada interval
  useEffect(() => {
    if (displayItems.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, interval);

    return () => clearInterval(timer);
  }, [displayItems, interval]);

  if (displayItems.length === 0) {
    return null;
  }

  const currentItem = displayItems[currentIndex];
  const coverUrl = currentItem?.customThumbnail || currentItem?.thumbnail || currentItem?.portada || '';
  const year = currentItem?.releaseYear || '';

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  };

  return (
    <div className="w-full overflow-hidden">
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(1.05);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.8s ease-out forwards;
        }
        .animate-slide-in-up {
          animation: slideInUp 0.8s ease-out forwards;
          animation-delay: 0.2s;
        }
        .animate-scale-in {
          animation: scaleIn 0.9s ease-out forwards;
        }
      `}</style>

      {/* Contenedor de portadas - ANCHO COMPLETO edge-to-edge */}
      <div className="relative w-full" style={{ aspectRatio: '21/9' }}>
        {/* Imagen de fondo cinematográfica */}
        <div
          className="absolute inset-0 bg-cover bg-center animate-scale-in"
          style={{
            backgroundImage: `url('${coverUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'all 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            filter: 'brightness(0.95)',
          }}
        >
          {/* Overlay gradiente sutil - oscuro a la izquierda */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Contenido del carrusel */}
        <div className="relative h-full flex items-center px-6 sm:px-12 lg:px-16">
          {/* Botón anterior */}
          <button
            onClick={handlePrev}
            className="absolute left-4 sm:left-6 z-20 p-3 rounded-full bg-black/40 hover:bg-black/70 transition-all duration-300 hover:scale-110 hover:shadow-lg"
            aria-label="Previous item"
          >
            <ChevronLeft className="w-7 h-7 text-white" />
          </button>

          {/* Información - esquina inferior izquierda */}
          <div className="absolute left-0 bottom-0 w-full max-w-2xl px-6 sm:px-12 lg:px-16 pb-8 sm:pb-12 z-10 space-y-2">
            {/* Título */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white line-clamp-2 animate-slide-in-left">
              {currentItem?.title || currentItem?.name || 'Sin título'}
            </h1>

            {/* Año y Tipo */}
            <div className="flex items-center gap-4 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
              {year && (
                <span className="text-base sm:text-lg font-semibold text-gray-100">{year}</span>
              )}
              {currentItem?.tipo && (
                <span className="px-3 py-1 bg-cyan-600/70 text-white text-xs sm:text-sm font-semibold rounded-full">
                  {currentItem.tipo.charAt(0).toUpperCase() + currentItem.tipo.slice(1)}
                </span>
              )}
            </div>

            {/* Botones de acción - ESQUINA INFERIOR IZQUIERDA */}
            <div className="flex gap-3 flex-wrap pt-4 animate-slide-in-up">
              {/* Botón VER - Celeste (tema TeamG) */}
              <button
                onClick={() => onItemClick?.(currentItem, currentItem.tipo || 'movie')}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-md transition-all duration-300 flex items-center gap-2 text-sm sm:text-base shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'hsl(190 100% 40%)',
                  boxShadow: '0 0 15px hsla(190 100% 50% / 0.4)'
                }}
              >
                <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-white" />
                VER
              </button>
              
              {/* Botón TRÁILER - más sutil */}
              {currentItem?.trailerUrl && (
                <button
                  onClick={() => onTrailerClick?.(currentItem)}
                  className="px-5 sm:px-7 py-2 sm:py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-md transition-all duration-300 backdrop-blur-sm border border-white/30 text-sm sm:text-base hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  ▶ TRÁILER
                </button>
              )}
            </div>
          </div>

          {/* Botón siguiente */}
          <button
            onClick={handleNext}
            className="absolute right-4 sm:right-6 z-20 p-3 rounded-full bg-black/40 hover:bg-black/70 transition-all duration-300 hover:scale-110 hover:shadow-lg"
            aria-label="Next item"
          >
            <ChevronRight className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>

      {/* Indicadores de página */}
      <div className="flex justify-center gap-3 py-4 bg-black/50 backdrop-blur">
        {displayItems.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-cyan-500 w-8'
                : 'bg-gray-500 w-2 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            style={{
              backgroundColor: index === currentIndex ? 'hsl(190 100% 50%)' : undefined
            }}
          />
        ))}
      </div>
    </div>
  );
}
