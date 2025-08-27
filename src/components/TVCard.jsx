import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TVCard({ 
  items = [], 
  title = "Contenido", 
  onItemSelect,
  focusable = true,
  startFocused = false 
}) {
  const [focusedIndex, setFocusedIndex] = useState(startFocused ? 0 : -1);
  const [isActive, setIsActive] = useState(startFocused);
  const navigate = useNavigate();

  useEffect(() => {
    if (!focusable || !isActive) return;

    const handleKeyDown = (e) => {
      switch (e.keyCode) {
        case 37: // Left arrow
          e.preventDefault();
          setFocusedIndex(prev => prev > 0 ? prev - 1 : items.length - 1);
          break;
        case 39: // Right arrow
          e.preventDefault();
          setFocusedIndex(prev => prev < items.length - 1 ? prev + 1 : 0);
          break;
        case 38: // Up arrow
          e.preventDefault();
          // Move to previous row (assuming 4 items per row)
          setFocusedIndex(prev => {
            const newIndex = prev - 4;
            return newIndex >= 0 ? newIndex : prev;
          });
          break;
        case 40: // Down arrow
          e.preventDefault();
          // Move to next row (assuming 4 items per row)
          setFocusedIndex(prev => {
            const newIndex = prev + 4;
            return newIndex < items.length ? newIndex : prev;
          });
          break;
        case 13: // Enter/OK
          e.preventDefault();
          if (focusedIndex >= 0 && items[focusedIndex]) {
            if (onItemSelect) {
              onItemSelect(items[focusedIndex]);
            } else {
              // Default navigation
              const item = items[focusedIndex];
              if (item.videoUrl) {
                navigate(`/watch?url=${encodeURIComponent(item.videoUrl)}&title=${encodeURIComponent(item.title)}`);
              }
            }
          }
          break;
        case 8: // Back
          e.preventDefault();
          setIsActive(false);
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, isActive, items, onItemSelect, navigate, focusable]);

  // Auto-focus when component becomes active
  useEffect(() => {
    if (startFocused && items.length > 0) {
      setIsActive(true);
      setFocusedIndex(0);
    }
  }, [startFocused, items.length]);

  return (
    <>
      <style>{`
        .tv-card {
          transition: all 0.3s ease;
          border: 4px solid transparent;
          background: rgba(0, 0, 0, 0.7);
        }
        
        .tv-card.focused {
          border-color: hsl(190, 100%, 50%);
          background: linear-gradient(135deg, hsl(190, 100%, 50%, 0.2), hsl(315, 100%, 60%, 0.2));
          box-shadow: 
            0 0 30px hsl(190, 100%, 50%, 0.6),
            0 0 60px hsl(315, 100%, 60%, 0.4),
            inset 0 0 20px hsl(190, 100%, 50%, 0.1);
          transform: scale(1.05);
        }
        
        .tv-card-image {
          transition: all 0.3s ease;
        }
        
        .tv-card.focused .tv-card-image {
          filter: brightness(1.2) saturate(1.3);
        }
        
        .tv-section-title {
          text-shadow: 0 0 10px hsl(190, 100%, 50%, 0.8);
          background: linear-gradient(135deg, hsl(190, 100%, 50%), hsl(315, 100%, 60%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="mb-12">
        {/* Section Title */}
        <h2 className="tv-section-title text-4xl font-bold mb-8 px-8">
          {title}
        </h2>

        {/* Cards Grid */}
        <div className="px-8">
          <div className="grid grid-cols-4 gap-8">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                className={`tv-card rounded-xl overflow-hidden ${
                  index === focusedIndex && isActive ? 'focused' : ''
                }`}
                style={{ aspectRatio: '16/9' }}
              >
                {/* Thumbnail */}
                <div className="relative h-full">
                  <img
                    src={item.customThumbnail || item.thumbnail || item.image || '/placeholder-video.jpg'}
                    alt={item.title}
                    className="tv-card-image w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/placeholder-video.jpg';
                    }}
                  />
                  
                  {/* Overlay with title */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <h3 className="text-white font-bold text-xl mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    {item.year && (
                      <p className="text-gray-300 text-lg">
                        {item.year}
                      </p>
                    )}
                    {item.genre && (
                      <p className="text-cyan-400 text-sm">
                        {item.genre}
                      </p>
                    )}
                  </div>

                  {/* Premium badge */}
                  {item.isPremium && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                      PREMIUM
                    </div>
                  )}

                  {/* Focus indicator */}
                  {index === focusedIndex && isActive && (
                    <div className="absolute inset-0 border-4 border-cyan-400 rounded-xl pointer-events-none">
                      <div className="absolute top-2 left-2 w-4 h-4 bg-cyan-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation hint */}
        {isActive && (
          <div className="text-center mt-6 text-gray-400 text-lg">
            <span className="inline-flex items-center space-x-2">
              <span>🎮</span>
              <span>Use las flechas para navegar • OK para seleccionar • BACK para salir</span>
            </span>
          </div>
        )}
      </div>
    </>
  );
}
