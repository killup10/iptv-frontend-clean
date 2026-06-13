import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Search, Star, Play, Plus, Info, ChevronLeft, ChevronRight, X, Film, Check, Dices } from 'lucide-react';
import {
  getTVItemTitle,
  getTVItemDescription,
  getTVItemYear,
  getTVItemRating,
  getTVItemSeasons,
  getTVItemImage,
  getTVItemBackdrop,
  getTVItemGenre
} from '../utils/tvContentUtils.js';

export function MobileArcadeDeck({
  items = [],
  onItemClick,
  onPlayTrailer,
  onAddToMyList,
  onAddToCollectionClick,
  searchTerm = '',
  setSearchTerm,
  title = 'Catálogo',
  itemType = 'movie',
  variant = 'arcade', // 'arcade' (Option 1) or 'cinematic' (Option 2)
  categories = [],
  selectedCategory = 'TODOS',
  onCategoryChange,
  loading = false
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const currentCategory = onCategoryChange ? selectedCategory : selectedGenre;
  const setCurrentCategory = onCategoryChange ? onCategoryChange : setSelectedGenre;

  const [isSpinning, setIsSpinning] = useState(false);

  const handleRandomPick = () => {
    if (isSpinning || filteredItems.length <= 1) return;
    setIsSpinning(true);

    const finalTarget = Math.floor(Math.random() * filteredItems.length);
    let currentIdx = activeIndex;
    
    let steps = 15; // Jumps
    let delay = 60; // Initial delay in ms

    const runStep = (stepCount) => {
      if (stepCount >= steps) {
        setActiveIndex(finalTarget);
        setIsSpinning(false);
        return;
      }

      currentIdx = (currentIdx + 1) % filteredItems.length;
      setActiveIndex(currentIdx);

      const nextDelay = delay + (stepCount * 22);

      setTimeout(() => {
        runStep(stepCount + 1);
      }, nextDelay);
    };

    runStep(0);
  };

  // Touch Swipe State
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartTime = useRef(0);

  // 1. Dynamic Genres Extraction
  const genres = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    const allGenres = new Set();
    items.forEach(item => {
      const genreStr = getTVItemGenre(item);
      if (genreStr) {
        genreStr.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed && trimmed.toLowerCase() !== '4k' && trimmed.toLowerCase() !== '60fps') {
            allGenres.add(trimmed);
          }
        });
      }
    });
    return ['Todos', ...Array.from(allGenres).slice(0, 8)];
  }, [items, categories]);

  // 2. Filter items by Genre and Search Term
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by Genre locally ONLY if we are using dynamic genres (onCategoryChange is NOT provided)
    if (!onCategoryChange && currentCategory !== 'Todos' && currentCategory !== 'TODOS') {
      result = result.filter(item => {
        const genreStr = getTVItemGenre(item) || '';
        return genreStr.toLowerCase().includes(currentCategory.toLowerCase());
      });
    }

    // Filter by Search Term (normalized)
    if (searchTerm) {
      const normalize = (text) => 
        text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
      
      const normalizedTerm = normalize(searchTerm);
      result = result.filter(item => {
        const name = getTVItemTitle(item);
        const desc = getTVItemDescription(item);
        const genreStr = getTVItemGenre(item);
        return (
          normalize(name).includes(normalizedTerm) ||
          normalize(desc).includes(normalizedTerm) ||
          normalize(genreStr).includes(normalizedTerm)
        );
      });
    }

    return result;
  }, [items, currentCategory, searchTerm, onCategoryChange]);

  // Reset active index when filtered items change
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredItems.length, currentCategory]);

  // 3. Preload adjacent items' images (2 ahead and 2 behind) for instant loading
  useEffect(() => {
    if (filteredItems.length === 0) return;
    
    // We preload indices -2, -1, +1, +2 relative to the active index
    const indicesToPreload = [activeIndex - 1, activeIndex + 1, activeIndex - 2, activeIndex + 2];
    
    indicesToPreload.forEach(idx => {
      if (idx >= 0 && idx < filteredItems.length) {
        const item = filteredItems[idx];
        
        // Preload poster image
        const imgUrl = getTVItemImage(item);
        if (imgUrl && imgUrl !== '/img/placeholder-thumbnail.png') {
          const img = new Image();
          img.src = imgUrl;
        }
        
        // Preload backdrop background image
        const backdropUrl = getTVItemBackdrop(item);
        if (backdropUrl && backdropUrl !== '/img/placeholder-thumbnail.png') {
          const bgImg = new Image();
          bgImg.src = backdropUrl;
        }
      }
    });
  }, [activeIndex, filteredItems]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Navigation handlers
  const handlePrev = () => {
    if (isSpinning) return;
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (isSpinning) return;
    if (activeIndex < filteredItems.length - 1) {
      setActiveIndex(prev => prev + 1);
    }
  };

  // Touch Swipe handlers with Velocity/Inertia multiplier
  const handleTouchStart = (e) => {
    if (isSpinning) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e) => {
    if (isSpinning) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (isSpinning) return;
    const diff = touchStartX.current - touchEndX.current;
    const duration = Date.now() - touchStartTime.current;
    const distance = Math.abs(diff);
    
    // Calculate swipe velocity (pixels per millisecond)
    const velocity = distance / (duration || 1);

    const threshold = 40; // minimum swipe distance
    if (distance > threshold) {
      // Calculate how many cards to skip based on swipe speed/momentum
      let skipCount = 1;
      if (velocity > 0.8) {
        // High speed swipe -> skip multiple cards proportionally
        skipCount = Math.min(5, Math.max(1, Math.round(velocity * 1.5)));
      }

      if (diff > 0) {
        // Swipe left -> Next
        const targetIdx = Math.min(filteredItems.length - 1, activeIndex + skipCount);
        setActiveIndex(targetIdx);
      } else {
        // Swipe right -> Prev
        const targetIdx = Math.max(0, activeIndex - skipCount);
        setActiveIndex(targetIdx);
      }
    }
  };

  // Active Item Metadata Resolvers
  const activeItem = filteredItems[activeIndex] || null;
  const activeTitle = activeItem ? getTVItemTitle(activeItem) : '';
  const activeDescription = activeItem ? getTVItemDescription(activeItem) : '';
  const activeYear = activeItem ? getTVItemYear(activeItem) : '';
  const activeRating = activeItem ? getTVItemRating(activeItem) : '';
  const activeBackdrop = activeItem ? getTVItemBackdrop(activeItem) : '';
  const activeGenres = activeItem ? getTVItemGenre(activeItem) : '';
  const activeTrailer = activeItem ? activeItem.trailerUrl || activeItem.trailer_url || '' : '';

  const activeSeasons = useMemo(() => {
    if (!activeItem) return '';
    const seasonsList = getTVItemSeasons(activeItem);
    if (seasonsList && seasonsList.length > 0) {
      if (seasonsList.length === 1 && seasonsList[0].chapters?.length > 0) {
        return `${seasonsList[0].chapters.length} Episodio${seasonsList[0].chapters.length === 1 ? '' : 's'}`;
      }
      return `${seasonsList.length} Temporada${seasonsList.length === 1 ? '' : 's'}`;
    }
    return '';
  }, [activeItem]);

  // CSS transform formulas for 3D Arcade Deck
  const getArcadeStyle = (index) => {
    const diff = index - activeIndex;

    if (diff === 0) {
      return {
        transform: 'scale(1.1) translate3d(0, 0, 0)',
        zIndex: 10,
        opacity: 1,
      };
    } else if (diff === -1) {
      return {
        transform: 'scale(0.85) translate3d(-34vw, 0, 0) rotate(-7deg)',
        zIndex: 5,
        opacity: 0.75,
      };
    } else if (diff === 1) {
      return {
        transform: 'scale(0.85) translate3d(34vw, 0, 0) rotate(7deg)',
        zIndex: 5,
        opacity: 0.75,
      };
    } else if (diff === -2) {
      return {
        transform: 'scale(0.68) translate3d(-56vw, 0, 0) rotate(-14deg)',
        zIndex: 3,
        opacity: 0.4,
      };
    } else if (diff === 2) {
      return {
        transform: 'scale(0.68) translate3d(56vw, 0, 0) rotate(14deg)',
        zIndex: 3,
        opacity: 0.4,
      };
    } else {
      return {
        transform: diff < 0 ? 'scale(0.4) translate3d(-100vw, 0, 0)' : 'scale(0.4) translate3d(100vw, 0, 0)',
        zIndex: 1,
        opacity: 0,
        pointerEvents: 'none'
      };
    }
  };

  // CSS transform formulas for Cinematic Cover-Flow
  const getCinematicStyle = (index) => {
    const diff = index - activeIndex;

    if (diff === 0) {
      return {
        transform: 'scale(1.08) translate3d(0, 0, 0)',
        zIndex: 10,
        opacity: 1,
        filter: 'brightness(1) contrast(1)',
      };
    } else if (diff === -1) {
      return {
        transform: 'scale(0.92) translate3d(-28vw, 0, 0)',
        zIndex: 5,
        opacity: 0.65,
        filter: 'brightness(0.65) contrast(0.9)',
      };
    } else if (diff === 1) {
      return {
        transform: 'scale(0.92) translate3d(28vw, 0, 0)',
        zIndex: 5,
        opacity: 0.65,
        filter: 'brightness(0.65) contrast(0.9)',
      };
    } else if (diff === -2) {
      return {
        transform: 'scale(0.78) translate3d(-48vw, 0, 0)',
        zIndex: 3,
        opacity: 0.35,
        filter: 'brightness(0.45) contrast(0.8)',
      };
    } else if (diff === 2) {
      return {
        transform: 'scale(0.78) translate3d(48vw, 0, 0)',
        zIndex: 3,
        opacity: 0.35,
        filter: 'brightness(0.45) contrast(0.8)',
      };
    } else {
      return {
        transform: diff < 0 ? 'scale(0.5) translate3d(-80vw, 0, 0)' : 'scale(0.5) translate3d(80vw, 0, 0)',
        zIndex: 1,
        opacity: 0,
        pointerEvents: 'none'
      };
    }
  };

  const getCardStyle = (index) => {
    return variant === 'arcade' ? getArcadeStyle(index) : getCinematicStyle(index);
  };

  return (
    <div 
      className="mobile-arcade-deck select-none relative min-h-screen bg-black text-white flex flex-col justify-between overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Dynamic Blur Background Poster (No backdrop-filter for ultra performance) */}
      {activeBackdrop && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500 ease-out scale-105 opacity-[0.25]"
          style={{ 
            backgroundImage: `url(${activeBackdrop})`,
            filter: 'blur(25px) brightness(0.4)',
            willChange: 'background-image'
          }}
        />
      )}

      {/* Radial overlay to direct focus to the card */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-black/60"
        style={{
          background: variant === 'arcade' 
            ? 'radial-gradient(circle at center, rgba(16,2,30,0.12) 0%, rgba(0,0,0,0.85) 90%)'
            : 'radial-gradient(circle at center, rgba(10,10,12,0.08) 0%, rgba(0,0,0,0.9) 90%)'
        }}
      />

      {/* Header bar and search toggler */}
      <header className="relative z-10 pt-14 px-4 flex flex-col gap-3">
        <div className="flex items-center justify-between min-h-[44px]">
          {/* Back button */}
          <button 
            onClick={() => window.history.back()}
            className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Title or Search Input */}
          {!isSearchOpen ? (
            <h1 className={`text-xl font-bold uppercase tracking-wider ${
              variant === 'arcade' 
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-[#f472b6] drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-zinc-100'
            }`}>
              {title}
            </h1>
          ) : (
            <div className="flex-1 mx-3 flex items-center bg-zinc-900/90 border border-zinc-800 rounded-full px-3 py-1.5 shadow-inner">
              <Search className="w-4 h-4 text-zinc-400 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar en ${title}...`}
                className="bg-transparent text-sm text-white placeholder-zinc-500 w-full focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400">
                  <X className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          )}

          {/* Right Header Buttons: Dice (Randomizer) & Search Glass */}
          <div className="flex items-center gap-1">
            {!isSearchOpen && filteredItems.length > 1 && (
              <button 
                onClick={handleRandomPick}
                disabled={isSpinning}
                className={`p-2 rounded-full active:scale-95 transition-all ${
                  isSpinning ? 'opacity-40 pointer-events-none' : 'text-amber-400 active:bg-white/10'
                }`}
                title="Al Azar (Dado)"
                aria-label="Al Azar"
              >
                <Dices className="w-6 h-6 animate-pulse" />
              </button>
            )}
            
            <button 
              onClick={() => {
                if (isSpinning) return;
                if (isSearchOpen) {
                  setSearchTerm('');
                  setIsSearchOpen(false);
                } else {
                  setIsSearchOpen(true);
                }
              }}
              disabled={isSpinning}
              className={`p-2 -mr-2 rounded-full active:bg-white/10 transition-colors ${
                isSpinning ? 'opacity-40 pointer-events-none' : ''
              }`}
              aria-label="Buscar"
            >
              {isSearchOpen ? <X className="w-6 h-6 text-zinc-400" /> : <Search className="w-6 h-6 text-zinc-100" />}
            </button>
          </div>
        </div>

        {/* Dynamic Category Badges (EASY/NORMAL game badge style on Arcade, minimalist layout on Cinematic) */}
        {!isSearchOpen && genres.length > 1 && (
          <div className="flex overflow-x-auto scrollbar-none gap-2 py-1.5 px-0.5 -mx-4 px-4 mask-edges-scroll">
            {genres.map((genre) => {
              const isActive = String(currentCategory).toLowerCase() === String(genre).toLowerCase();
              return (
                <button
                  key={genre}
                  disabled={isSpinning}
                  onClick={() => !isSpinning && setCurrentCategory(genre)}
                  className={`flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full font-bold uppercase transition-all duration-300 ${
                    isSpinning ? 'opacity-50 pointer-events-none' : ''
                  } ${
                    isActive
                      ? variant === 'arcade'
                        ? 'bg-gradient-to-r from-[#00e5ff] to-[#008ba3] text-black shadow-[0_0_12px_rgba(0,229,255,0.7)] border border-cyan-300/60 scale-105'
                        : 'bg-white text-black font-extrabold shadow-md scale-105'
                      : variant === 'arcade'
                        ? 'bg-zinc-900/70 text-cyan-200/70 border border-zinc-800/80 hover:text-white'
                        : 'bg-zinc-800/40 text-zinc-400 border border-zinc-900/50'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* 2. Main 3D Card Selection Deck */}
      <main className="relative flex-1 flex items-center justify-center min-h-[46vh] max-h-[52vh] w-full overflow-hidden">
        {/* Loading / Empty states */}
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center p-6 mt-10 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-zinc-400 text-sm">Cargando...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 mt-10 z-10">
            <Film className="w-16 h-16 text-zinc-600 mb-4 animate-pulse" />
            <p className="text-zinc-400 text-sm mb-2">
              {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay contenidos disponibles.'}
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="mt-2 text-xs text-[#00e5ff] underline decoration-[#00e5ff]/30 font-semibold active:opacity-75"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Arrows navigation (Left/Right overlay buttons) */}
            {activeIndex > 0 && !isSpinning && (
              <button 
                onClick={handlePrev}
                className={`absolute left-3 z-30 p-2.5 rounded-full backdrop-blur-md active:scale-90 transition-transform ${
                  variant === 'arcade' 
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/40 text-pink-300 shadow-[0_0_15px_rgba(244,114,182,0.3)]'
                    : 'bg-zinc-900/60 border border-zinc-800 text-zinc-300'
                }`}
                aria-label="Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {activeIndex < filteredItems.length - 1 && !isSpinning && (
              <button 
                onClick={handleNext}
                className={`absolute right-3 z-30 p-2.5 rounded-full backdrop-blur-md active:scale-90 transition-transform ${
                  variant === 'arcade' 
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/40 text-pink-300 shadow-[0_0_15px_rgba(244,114,182,0.3)]'
                    : 'bg-zinc-900/60 border border-zinc-800 text-zinc-300'
                }`}
                aria-label="Siguiente"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Deck of overlapping cards */}
            <div className="relative w-[54vw] aspect-[2/3] max-w-[240px] flex items-center justify-center">
              {filteredItems.map((item, idx) => {
                const isCurrent = idx === activeIndex;
                const isVisible = Math.abs(idx - activeIndex) <= 2;
                if (!isVisible) return null;

                const thumbnail = getTVItemImage(item);
                const isHot = item.hasNewEpisodes || item.isHot || item.mainSection === 'POPULARES' || idx % 7 === 1;

                return (
                  <div
                    key={item._id || item.id || idx}
                    onClick={() => {
                      if (isSpinning) return;
                      if (isCurrent && onItemClick) {
                        onItemClick(item);
                      } else {
                        setActiveIndex(idx);
                      }
                    }}
                    style={{
                      ...getCardStyle(idx),
                      willChange: 'transform, opacity',
                    }}
                    className={`absolute inset-0 w-full h-full rounded-[22px] overflow-hidden select-none cursor-pointer transition-all duration-300 ease-out ${
                      isCurrent ? 'ring-2' : ''
                    } ${
                      variant === 'arcade'
                        ? isCurrent
                          ? 'ring-[#f472b6] shadow-[0_0_25px_rgba(244,114,182,0.7),0_0_50px_rgba(0,229,255,0.3)]'
                          : 'ring-zinc-800/80 shadow-[0_12px_24px_rgba(0,0,0,0.6)]'
                        : isCurrent
                          ? 'ring-white shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(255,255,255,0.15)]'
                          : 'ring-zinc-900/50 shadow-[0_10px_20px_rgba(0,0,0,0.7)]'
                    }`}
                  >
                    {/* Poster thumbnail */}
                    <img
                      src={thumbnail}
                      alt={getTVItemTitle(item)}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/img/placeholder-thumbnail.png';
                      }}
                      loading="lazy"
                    />

                    {/* NEW / HOT Badge */}
                    {isHot && (
                      <span className={`absolute top-2.5 left-2.5 z-20 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow-md ${
                        variant === 'arcade'
                          ? 'bg-gradient-to-r from-pink-500 to-rose-600 border border-pink-400 text-white animate-pulse'
                          : 'bg-white text-black font-extrabold'
                      }`}>
                        NEW
                      </span>
                    )}

                    {/* Active poster glowing filter */}
                    {isCurrent && variant === 'arcade' && (
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.1),_transparent_45%)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* 3. Bottom Dynamic Metadata and Actions Card */}
      <footer className="relative z-10 px-4 pb-8 pt-2">
        {activeItem ? (
          <div className={`backdrop-blur-md bg-zinc-950/70 border rounded-2xl p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out transform translate-y-0 ${
            variant === 'arcade' 
              ? 'border-pink-500/20 shadow-[0_0_30px_rgba(244,114,182,0.1)]' 
              : 'border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.6)]'
          }`}>
            {/* Metadata Line: Year • Rating • Seasons • Genres */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400 font-medium mb-1.5">
              {activeRating && (
                <span className="flex items-center gap-0.5 text-yellow-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {activeRating}
                </span>
              )}
              {activeRating && <span className="text-zinc-600">•</span>}
              {activeYear && <span className="text-zinc-300 font-semibold">{activeYear}</span>}
              {activeSeasons && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    variant === 'arcade' ? 'bg-zinc-800 text-pink-300 border border-zinc-700/60' : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {activeSeasons}
                  </span>
                </>
              )}
              {activeGenres && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400 truncate max-w-[120px]">{activeGenres}</span>
                </>
              )}
            </div>

            {/* Title with Neon Glow text if Arcade */}
            <h2 className={`text-xl font-black mb-1 line-clamp-1 truncate ${
              variant === 'arcade' 
                ? 'text-white drop-shadow-[0_0_10px_rgba(244,114,182,0.4)]'
                : 'text-zinc-100'
            }`}>
              {activeTitle}
            </h2>

            {/* Truncated Description */}
            <p className="text-xs text-zinc-300/85 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
              {activeDescription || 'No hay descripción disponible para este contenido en este momento.'}
            </p>

            {/* Buttons Row */}
            <div className="flex items-center gap-2">
              {/* Primary Watch Button */}
              <button
                disabled={isSpinning}
                onClick={() => onItemClick && onItemClick(activeItem)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs uppercase active:scale-95 transition-all duration-200 ${
                  isSpinning ? 'opacity-50 pointer-events-none' : ''
                } ${
                  variant === 'arcade'
                    ? 'bg-gradient-to-r from-[#00e5ff] to-[#f472b6] text-black shadow-[0_4px_16px_rgba(0,229,255,0.45)]'
                    : 'bg-white text-black font-extrabold hover:bg-zinc-100 shadow-lg'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                Ver Ahora
              </button>

              {/* Add to list */}
              {onAddToMyList && (
                <button
                  disabled={isSpinning}
                  onClick={() => onAddToMyList(activeItem)}
                  className={`p-2.5 rounded-xl border active:scale-95 transition-all ${
                    isSpinning ? 'opacity-50 pointer-events-none' : ''
                  } ${
                    variant === 'arcade'
                      ? 'bg-zinc-900/65 border-pink-500/30 text-pink-200 active:bg-pink-900/30'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 active:bg-zinc-800'
                  }`}
                  title="Agregar a mi lista"
                  aria-label="Agregar a mi lista"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Play Trailer */}
              {activeTrailer && onPlayTrailer && (
                <button
                  disabled={isSpinning}
                  onClick={() => onPlayTrailer(activeTrailer)}
                  className={`p-2.5 rounded-xl border active:scale-95 transition-all ${
                    isSpinning ? 'opacity-50 pointer-events-none' : ''
                  } ${
                    variant === 'arcade'
                      ? 'bg-zinc-900/65 border-cyan-500/30 text-cyan-200 active:bg-cyan-900/30'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 active:bg-zinc-800'
                  }`}
                  title="Ver Trailer"
                  aria-label="Ver Trailer"
                >
                  <Film className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Advanced info / Collections */}
              <button
                disabled={isSpinning}
                onClick={() => onItemClick && onItemClick(activeItem)}
                className={`p-2.5 rounded-xl border active:scale-95 transition-all ${
                  isSpinning ? 'opacity-50 pointer-events-none' : ''
                } ${
                  variant === 'arcade'
                    ? 'bg-zinc-900/65 border-zinc-700/65 text-zinc-300'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                }`}
                title="Detalles"
                aria-label="Detalles"
              >
                <Info className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[148px] flex items-center justify-center bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4">
            <span className="text-zinc-600 text-xs">Selecciona un elemento</span>
          </div>
        )}
      </footer>

      {/* Tailwind Hide Scrollbar Utility Inject */}
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .mask-edges-scroll {
          mask-image: linear-gradient(to right, transparent, white 8%, white 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, white 8%, white 92%, transparent);
        }
      `}</style>
    </div>
  );
}

export default MobileArcadeDeck;
