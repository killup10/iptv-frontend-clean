// src/components/SmartRecommendations.jsx
import React, { useState } from 'react';
import { 
  SparklesIcon, 
  FireIcon,
  StarIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { DynamicCard, DynamicText } from './DynamicTheme.jsx';

/**
 * Componente mejorado para mostrar recomendaciones inteligentes basadas en 
 * similitud de géneros, tipo de contenido y año de lanzamiento
 */
export default function SmartRecommendations({ 
  recommendations = [], 
  theme, 
  loading = false, 
  error = null, 
  onRetry = null,
  title = "También te podría gustar",
  onVideoClick = null,
  maxItems = 6
}) {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleVideoClick = (video, index) => {
    setSelectedIndex(index);
    
    if (onVideoClick) {
      onVideoClick(video);
    } else {
      // Navegar al video si no hay callback personalizado
      if (video.tipo === 'pelicula') {
        navigate(`/watch/pelicula/${video.id || video._id}`);
      } else {
        navigate(`/watch/serie/${video.id || video._id}`);
      }
    }
  };

  if (loading) {
    return (
      <DynamicCard theme={theme} className="p-6 rounded-xl" glow={true}>
        <div className="flex items-center justify-center space-x-3">
          <div 
            className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
            style={{ borderColor: theme?.primaryColor || '#00e5ff' }}
          />
          <DynamicText theme={theme} glow={true}>
            Buscando recomendaciones...
          </DynamicText>
        </div>
      </DynamicCard>
    );
  }

  if (error) {
    return (
      <DynamicCard theme={theme} className="p-6 rounded-xl border-l-4 border-red-500/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Sin recomendaciones disponibles</p>
              <p className="text-red-300/70 text-sm mt-1">{error}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
            >
              Reintentar
            </button>
          )}
        </div>
      </DynamicCard>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    // En lugar de retornar null, mostrar mensaje
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay recomendaciones disponibles en este momento</p>
      </div>
    );
  }

  // Limitar a maxItems
  const displayedRecommendations = recommendations.slice(0, maxItems);

  // Calcular color dinámico para cada recomendación
  const getGenreColor = (genres, index) => {
    if (!genres || genres.length === 0) {
      return {
        bg: 'from-gray-900/30 to-gray-800/30',
        border: 'border-gray-600/30',
        text: 'text-gray-300'
      };
    }

    const colorMap = {
      'Acción': { bg: 'from-red-900/30 to-orange-900/30', border: 'border-red-600/30', text: 'text-red-300' },
      'Comedia': { bg: 'from-yellow-900/30 to-amber-900/30', border: 'border-yellow-600/30', text: 'text-yellow-300' },
      'Drama': { bg: 'from-purple-900/30 to-pink-900/30', border: 'border-purple-600/30', text: 'text-purple-300' },
      'Terror': { bg: 'from-slate-900/30 to-gray-900/30', border: 'border-slate-600/30', text: 'text-slate-300' },
      'Ciencia Ficción': { bg: 'from-blue-900/30 to-cyan-900/30', border: 'border-blue-600/30', text: 'text-blue-300' },
      'Animación': { bg: 'from-fuchsia-900/30 to-pink-900/30', border: 'border-fuchsia-600/30', text: 'text-fuchsia-300' },
      'Aventura': { bg: 'from-emerald-900/30 to-teal-900/30', border: 'border-emerald-600/30', text: 'text-emerald-300' },
      'Romance': { bg: 'from-rose-900/30 to-pink-900/30', border: 'border-rose-600/30', text: 'text-rose-300' },
      'Misterio': { bg: 'from-indigo-900/30 to-purple-900/30', border: 'border-indigo-600/30', text: 'text-indigo-300' },
      'Thriller': { bg: 'from-orange-900/30 to-red-900/30', border: 'border-orange-600/30', text: 'text-orange-300' },
    };

    // Buscar primer género que coincida
    for (const genre of genres) {
      if (colorMap[genre]) {
        return colorMap[genre];
      }
    }

    // Color por defecto alternado
    const colors = Object.values(colorMap);
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center">
          <SparklesIcon 
            className="w-6 h-6 mr-2" 
            style={{ color: theme?.primaryColor || '#00e5ff' }} 
          />
          <span style={{ color: theme?.textColor }}>
            {title}
          </span>
        </h3>
        <span 
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{
            backgroundColor: `${theme?.primaryColor}20`,
            color: theme?.primaryColor
          }}
        >
          {displayedRecommendations.length} similares
        </span>
      </div>

      {/* Grid de recomendaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedRecommendations.map((rec, index) => {
          const colorScheme = getGenreColor(rec.genres, index);
          const isSelected = selectedIndex === index;

          return (
            <DynamicCard
              key={rec.id || rec._id}
              theme={theme}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                isSelected ? 'ring-2' : 'hover:scale-105'
              }`}
              style={{
                ringColor: isSelected ? theme?.primaryColor : 'transparent',
                borderImage: `linear-gradient(135deg, #FF006E, #8338EC) 1`
              }}
              glow={isSelected}
              onClick={() => handleVideoClick(rec, index)}
            >
              {/* Thumbnail y overlay */}
              <div className="relative mb-3 overflow-hidden rounded-md group">
                <img
                  src={rec.thumbnail || '/img/placeholder-default.png'}
                  alt={rec.title}
                  className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <div className="flex items-center space-x-1 text-white">
                    <ArrowRightIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Ver ahora</span>
                  </div>
                </div>

                {/* Badge de tipo */}
                <div className="absolute top-2 right-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-black/60 text-white font-medium uppercase">
                    {rec.tipo}
                  </span>
                </div>

                {/* Badge de calificación si existe */}
                {rec.ratingDisplay && (
                  <div className="absolute top-2 left-2 flex items-center space-x-1 bg-yellow-500/90 text-white rounded-full px-2 py-1">
                    <StarIcon className="w-4 h-4" />
                    <span className="text-xs font-bold">{rec.ratingDisplay}</span>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <h4 className="font-semibold text-white mb-1 line-clamp-2 hover:text-blue-300 transition-colors">
                {rec.title}
              </h4>

              {/* Géneros */}
              {rec.genres && rec.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {rec.genres.slice(0, 2).map((genre, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-300 font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                  {rec.genres.length > 2 && (
                    <span className="text-xs px-1.5 py-0.5 text-gray-400">
                      +{rec.genres.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Descripción breve */}
              {rec.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  {rec.description}
                </p>
              )}

              {/* Año de lanzamiento */}
              {rec.releaseYear && (
                <div className="text-xs text-gray-500">
                  📅 {rec.releaseYear}
                </div>
              )}

              {/* Planes requeridos */}
              {rec.requiresPlan && rec.requiresPlan.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center space-x-1 text-xs text-gray-400">
                  <span>Requiere:</span>
                  <span className="text-cyan-400">
                    {rec.requiresPlan.map(p => p === 'gplay' ? 'GamePlay' : p).join(', ')}
                  </span>
                </div>
              )}
            </DynamicCard>
          );
        })}
      </div>

      {/* Información de similitud */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          ✨ Recomendaciones basadas en géneros, tipo de contenido y año de lanzamiento
        </p>
      </div>
    </div>
  );
}
