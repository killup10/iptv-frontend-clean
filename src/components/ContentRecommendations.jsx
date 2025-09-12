import React from 'react';
import { 
  SparklesIcon, 
  HeartIcon, 
  FireIcon,
  StarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { DynamicCard, DynamicText } from './DynamicTheme.jsx';

export default function ContentRecommendations({ recommendations, theme, loading, error, onRetry }) {
  if (loading) {
    return (
      <DynamicCard theme={theme} className="p-6 rounded-xl" glow={true}>
        <div className="flex items-center justify-center space-x-3">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
               style={{ borderColor: theme?.primaryColor || '#00e5ff' }}></div>
          <DynamicText theme={theme} glow={true}>
            Generando recomendaciones personalizadas...
          </DynamicText>
        </div>
      </DynamicCard>
    );
  }

  if (error) {
    return (
      <DynamicCard theme={theme} className="p-6 rounded-xl border-red-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-6 h-6 text-red-400" />
            <span className="text-red-400">Error cargando recomendaciones</span>
          </div>
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
          >
            Reintentar
          </button>
        </div>
      </DynamicCard>
    );
  }

  if (!recommendations || !recommendations.recommendations) return null;

  const getSimilarityIcon = (similarity) => {
    switch (similarity?.toLowerCase()) {
      case 'alta':
        return <FireIcon className="w-4 h-4 text-red-400" />;
      case 'media':
        return <HeartIcon className="w-4 h-4 text-yellow-400" />;
      default:
        return <StarIcon className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSimilarityColor = (similarity) => {
    switch (similarity?.toLowerCase()) {
      case 'alta':
        return 'from-red-900/30 to-orange-900/30 border-red-500/30';
      case 'media':
        return 'from-yellow-900/30 to-amber-900/30 border-yellow-500/30';
      default:
        return 'from-blue-900/30 to-cyan-900/30 border-blue-500/30';
    }
  };

  return (
    <DynamicCard theme={theme} className="rounded-xl overflow-hidden" glow={true}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: `${theme?.primaryColor}30` }}>
        <h3 className="text-2xl font-bold flex items-center mb-2">
          <SparklesIcon className="w-6 h-6 mr-2" style={{ color: theme?.primaryColor }} />
          <DynamicText theme={theme} glow={true}>
            Recomendaciones para Ti
          </DynamicText>
        </h3>
        
        {recommendations.mood && (
          <p className="text-sm opacity-80" style={{ color: theme?.textColor }}>
            Basado en el mood: <span className="font-medium">{recommendations.mood}</span>
          </p>
        )}
        
        {/* Géneros relacionados */}
        {recommendations.genres && recommendations.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {recommendations.genres.slice(0, 4).map((genre, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${theme?.secondaryColor}20`,
                  color: theme?.secondaryColor,
                  border: `1px solid ${theme?.secondaryColor}40`
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recomendaciones */}
      <div className="p-6">
        <div className="space-y-4">
          {recommendations.recommendations.slice(0, 6).map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg bg-gradient-to-r border transition-all duration-300 hover:scale-[1.02] cursor-pointer ${getSimilarityColor(rec.similarity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    {getSimilarityIcon(rec.similarity)}
                    <h4 className="font-semibold text-white truncate">
                      {rec.title}
                    </h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300 flex-shrink-0">
                      {rec.similarity || 'media'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {rec.reason}
                  </p>
                </div>
                
                <ArrowRightIcon className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Temas relacionados */}
        {recommendations.themes && recommendations.themes.length > 0 && (
          <div className="mt-6 pt-4 border-t" style={{ borderColor: `${theme?.primaryColor}20` }}>
            <h4 className="text-sm font-medium mb-3" style={{ color: theme?.secondaryColor }}>
              Temas Relacionados
            </h4>
            <div className="flex flex-wrap gap-2">
              {recommendations.themes.map((theme_item, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800/50 text-gray-300 border border-gray-600/50"
                >
                  {theme_item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t" style={{ borderColor: `${theme?.primaryColor}20` }}>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Recomendaciones generadas por IA</span>
          <div className="flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>Powered by Gemini</span>
          </div>
        </div>
      </div>
    </DynamicCard>
  );
}
