import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Info, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HeroBanner({ 
  items = [], 
  onPlayClick, 
  onPlayTrailerClick,
  onAddToMyListClick 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [randomItems, setRandomItems] = useState([]);
  const videoRef = useRef(null);

  // Seleccionar 3 items al azar
  useEffect(() => {
    if (items && items.length > 0) {
      const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, 3);
      setRandomItems(shuffled);
      setCurrentIndex(0);
    }
  }, [items]);

  // Definir valores por defecto para evitar errores cuando no hay items
  const item = randomItems && randomItems.length > 0 ? randomItems[currentIndex] : null;
  const trailerUrl = item ? (item.trailer_url || item.trailerUrl || item.urlTrailer || '') : '';

  // Reiniciar el video cuando cambia el índice
  useEffect(() => {
    if (videoRef.current && trailerUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Silenciar errores de autoplay
      });
    }
  }, [currentIndex, trailerUrl]);

  const handleNextItem = useCallback(() => {
    if (randomItems && randomItems.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % randomItems.length);
    }
  }, [randomItems]);

  const handlePrevItem = useCallback(() => {
    if (randomItems && randomItems.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + randomItems.length) % randomItems.length);
    }
  }, [randomItems]);

  const ratingDisplay = useMemo(() => {
    if (!item) return null;

    const rawRating = (
      item.ratingDisplay ??
      item.tmdbRating ??
      item.rating ??
      item.vote_average ??
      item.ranking ??
      item.rankingLabel ??
      item.ratingText ??
      item.displayRating ??
      item.rating_tmdb ??
      item.calificacion ??
      item.puntuacion ??
      null
    );

    if (rawRating === null || rawRating === undefined) return null;

    if (typeof rawRating === 'number' && !Number.isNaN(rawRating)) {
      return Number(rawRating).toFixed(1);
    }

    if (typeof rawRating === 'string') {
      const trimmed = rawRating.trim();
      if (!trimmed) return null;
      const lowered = trimmed.toLowerCase();
      if (lowered === 'null' || lowered === 'n/a' || lowered === 'na') return null;
      if (!Number.isNaN(Number(trimmed))) return Number(trimmed).toFixed(1);
      return trimmed;
    }

    if (!Number.isNaN(Number(rawRating))) {
      return Number(rawRating).toFixed(1);
    }

    return null;
  }, [item]);

  // Validar si hay items para evitar errores de renderizado
  if (!item) {
    return null; // O un componente de carga/placeholder
  }

  // Determinar el tipo de contenido
  const contentType = item.tipo || item.itemType || 'movie';
  const isMovie = contentType === 'movie';
  const isSerie = contentType === 'serie' || contentType === 'serie';
  
  // Obtener imagen de fondo
  const backgroundImage = item.poster || item.portada || item.image || item.imagen || '';
  
  // Obtener información
  const title = item.nombre || item.title || item.nombre || 'Sin título';
  const synopsis = item.sinopsis || item.descripcion || item.description || '';
  const year = item.año || item.year || '';

  const handlePlayClick = (e) => {
    e.preventDefault();
    if (onPlayClick) {
      onPlayClick(item, contentType);
    }
  };

  const handleTrailerClick = (e) => {
    e.preventDefault();
    if (trailerUrl && onPlayTrailerClick) {
      onPlayTrailerClick(trailerUrl);
    }
  };

  const handleAddToList = (e) => {
    e.preventDefault();
    if (onAddToMyListClick) {
      onAddToMyListClick(item);
    }
  };

  const toggleMute = (e) => {
    e.preventDefault();
    setIsMuted(!isMuted);
  };

  return (
    <div 
      className="relative w-full h-screen md:h-[500px] lg:h-[600px] overflow-hidden rounded-lg group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Background o Imagen */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {trailerUrl ? (
          <video
            key={`${currentIndex}-${trailerUrl}`}
            ref={videoRef}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            className="w-full h-full object-cover"
            poster={backgroundImage}
            onError={() => console.warn('Error cargando video')}
          >
            <source src={trailerUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            key={`img-${currentIndex}`}
            src={backgroundImage}
            alt={title}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Gradiente oscuro para mejor legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

      {/* Contenido */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8 lg:p-12 z-10">
        <div className="max-w-2xl">
          {/* Badge de tipo de contenido */}
          <div className="mb-4 flex gap-2 items-center flex-wrap">
            <span className="inline-block px-3 py-1 bg-primary/80 text-primary-foreground text-xs sm:text-sm font-bold rounded-full">
              {contentType === 'movie' ? '🎬 PELÍCULA' : contentType === 'serie' ? '📺 SERIE' : contentType === 'anime' ? '🎨 ANIME' : contentType === 'dorama' ? '🌸 DORAMA' : contentType === 'novela' ? '💔 NOVELA' : '📚 DOCUMENTAL'}
            </span>
            {ratingDisplay && (
              <span className="text-yellow-400 text-xs sm:text-sm font-bold">
                ⭐ {ratingDisplay}
              </span>
            )}
            {year && (
              <span className="text-muted-foreground text-xs sm:text-sm">
                {year}
              </span>
            )}
          </div>

          {/* Título */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-white mb-2 md:mb-4 drop-shadow-lg line-clamp-2 leading-tight">
            {title}
          </h1>

          {/* Sinopsis */}
          {synopsis && (
            <p className="text-xs sm:text-sm md:text-lg text-gray-200 mb-4 md:mb-8 max-w-2xl line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-md">
              {synopsis}
            </p>
          )}

          {/* Botones */}
          <div className={`flex flex-col sm:flex-row gap-2 md:gap-4 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-90'} flex-wrap`}>
            {/* Botón Reproducir */}
            <button
              onClick={handlePlayClick}
              className="flex items-center justify-center gap-2 px-4 md:px-8 py-2 md:py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all duration-300 hover:scale-105 active:scale-95 text-xs md:text-base group/btn shadow-lg"
            >
              <Play className="w-4 md:w-5 h-4 md:h-5 fill-current group-hover/btn:translate-x-1 transition-transform" />
              <span>Reproducir</span>
            </button>

            {/* Botón Trailer */}
            {trailerUrl && (
              <button
                onClick={handleTrailerClick}
                className="flex items-center justify-center gap-2 px-4 md:px-8 py-2 md:py-3 bg-gray-500/70 hover:bg-gray-600 text-white font-bold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 text-xs md:text-base backdrop-blur-sm shadow-lg"
              >
                <Info className="w-4 md:w-5 h-4 md:h-5" />
                <span>Trailer</span>
              </button>
            )}

            {/* Botón Mi Lista */}
            {onAddToMyListClick && (
              <button
                onClick={handleAddToList}
                className="flex items-center justify-center gap-2 px-4 md:px-8 py-2 md:py-3 bg-secondary/70 hover:bg-secondary text-secondary-foreground font-bold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 text-xs md:text-base backdrop-blur-sm shadow-lg"
              >
                <svg className="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Mi Lista</span>
              </button>
            )}

            {/* Botón Volumen */}
            {trailerUrl && (
              <button
                onClick={toggleMute}
                className="flex items-center justify-center gap-2 px-4 py-2 md:py-3 bg-gray-500/70 hover:bg-gray-600 text-white font-bold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 text-xs md:text-base backdrop-blur-sm shadow-lg"
                title={isMuted ? 'Activar sonido' : 'Desactivar sonido'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 md:w-5 h-4 md:h-5" />
                ) : (
                  <Volume2 className="w-4 md:w-5 h-4 md:h-5" />
                )}
              </button>
            )}
          </div>

          {/* Información adicional */}
          {(ratingDisplay || year) && (
            <div className="mt-4 md:mt-8 text-xs md:text-sm text-gray-300 flex gap-4">
              {ratingDisplay && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 md:w-4 h-3 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {ratingDisplay}
                </span>
              )}
              {year && (
                <span>{year}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flechas de navegación */}
      <div className="absolute bottom-20 md:bottom-32 right-4 md:right-8 flex gap-2 z-20">
        <button
          onClick={handlePrevItem}
          className="p-2 md:p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm"
          title="Anterior"
        >
          <ChevronLeft className="w-4 md:w-6 h-4 md:h-6" />
        </button>
        <button
          onClick={handleNextItem}
          className="p-2 md:p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm"
          title="Siguiente"
        >
          <ChevronRight className="w-4 md:w-6 h-4 md:h-6" />
        </button>
      </div>

      {/* Overlay de gradiente inferior para mobile */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none md:hidden" />

      {/* Indicadores de posición (puntos) - Mobile */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 md:hidden z-20">
        {randomItems.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'bg-white w-8' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
