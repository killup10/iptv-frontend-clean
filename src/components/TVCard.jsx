import React from 'react';
import { rewriteImageUrl } from '../utils/imageUrl.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getAccessLockState } from '../utils/planAccess.js';

/**
 * TVCard optimizado:
 * - Sin listeners globales (el padre maneja el foco).
 * - Renderizado ligero.
 * - Soporta estados de carga y premium.
 */
const TVCard = ({ 
  item, 
  index, 
  isFocused, 
  onClick,
  variant = 'default' 
}) => {
  const { user } = useAuth();
  if (!item) return null;

  const lockState = getAccessLockState(item, user?.plan);

  return (
    <div
      className={`tv-card-item ${isFocused ? 'focused' : ''}`}
      onClick={() => onClick?.(item, index)}
    >

      {/* Thumbnail */}
      <div className="relative h-full w-full">
        <img
          src={rewriteImageUrl(item.customThumbnail || item.thumbnail || item.image) || '/placeholder-video.jpg'}
          alt={item.title}
          className="tv-card-img"
          onError={(e) => {
            e.target.src = '/placeholder-video.jpg';
          }}
          loading="lazy"
        />
        
        {/* Overlay with title */}
        <div className="tv-card-overlay absolute bottom-0 left-0 right-0">
          <h3 className="text-white font-bold text-lg mb-0.5 truncate">
            {item.title}
          </h3>
          <div className="flex items-center space-x-2">
            {item.year && (
              <span className="text-gray-300 text-sm">
                {item.year}
              </span>
            )}
            {item.genre && (
              <span className="text-cyan-400 text-xs truncate">
                {item.genre}
              </span>
            )}
          </div>
        </div>


        {/* Premium badge */}
        {item.isPremium && !lockState.locked && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-lg">
            PREMIUM
          </div>
        )}

        {/* Focus indicator ring (extra visibility) */}
        {isFocused && (
          <div className="absolute inset-0 border-4 border-cyan-400 rounded-xl pointer-events-none animate-pulse opacity-50" />
        )}
      </div>
    </div>
  );
};

export default React.memo(TVCard);
