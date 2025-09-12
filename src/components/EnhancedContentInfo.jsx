import React, { useState } from 'react';
import { 
  InformationCircleIcon, 
  StarIcon, 
  FilmIcon,
  UserGroupIcon,
  MapPinIcon,
  MusicalNoteIcon,
  TrophyIcon,
  BanknotesIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function EnhancedContentInfo({ contentInfo, loading, error, onRetry }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-cyan-500/30">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-cyan-400 font-medium">Generando información con IA...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/90 to-red-800/90 backdrop-blur-sm p-6 rounded-xl border border-red-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <InformationCircleIcon className="w-6 h-6 text-red-400" />
            <span className="text-red-400">Error cargando información adicional</span>
          </div>
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!contentInfo) return null;

  const tabs = [
    { id: 'overview', label: 'Información', icon: InformationCircleIcon },
    { id: 'trivia', label: 'Curiosidades', icon: SparklesIcon },
    { id: 'production', label: 'Producción', icon: FilmIcon }
  ];

  const InfoItem = ({ icon: Icon, label, value, className = "" }) => {
    if (!value || value === "No disponible" || value === "Información no disponible") return null;
    
    return (
      <div className={`flex items-start space-x-3 p-3 rounded-lg bg-gray-800/50 ${className}`}>
        <Icon className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <dt className="text-sm font-medium text-cyan-300 mb-1">{label}</dt>
          <dd className="text-sm text-gray-300 leading-relaxed">{value}</dd>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-xl border border-cyan-500/30 overflow-hidden shadow-2xl">
      {/* Header con tabs */}
      <div className="border-b border-gray-700/50">
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-lg'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center">
              <InformationCircleIcon className="w-6 h-6 mr-2" />
              Información Detallada
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                icon={UserGroupIcon}
                label="Director"
                value={contentInfo.director}
              />
              
              <InfoItem
                icon={StarIcon}
                label="Reparto Principal"
                value={contentInfo.cast}
              />
              
              <InfoItem
                icon={TrophyIcon}
                label="Premios y Reconocimientos"
                value={contentInfo.awards}
              />
              
              <InfoItem
                icon={BanknotesIcon}
                label="Taquilla"
                value={contentInfo.boxOffice}
              />
              
              <InfoItem
                icon={MapPinIcon}
                label="Locaciones"
                value={contentInfo.locations}
                className="md:col-span-2"
              />
              
              <InfoItem
                icon={MusicalNoteIcon}
                label="Banda Sonora"
                value={contentInfo.soundtrack}
                className="md:col-span-2"
              />
            </div>

            {contentInfo.culturalImpact && contentInfo.culturalImpact !== "No disponible" && (
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-500/30">
                <h4 className="text-lg font-semibold text-purple-300 mb-2 flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Impacto Cultural
                </h4>
                <p className="text-gray-300 leading-relaxed">{contentInfo.culturalImpact}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trivia' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center">
              <SparklesIcon className="w-6 h-6 mr-2" />
              Curiosidades y Datos Interesantes
            </h3>
            
            {contentInfo.trivia && contentInfo.trivia.length > 0 ? (
              <div className="space-y-3">
                {contentInfo.trivia.map((fact, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-lg border border-blue-500/20"
                  >
                    <div className="w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-300 leading-relaxed">{fact}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay curiosidades disponibles para este contenido</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'production' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center">
              <FilmIcon className="w-6 h-6 mr-2" />
              Información de Producción
            </h3>
            
            <div className="space-y-4">
              {contentInfo.production && contentInfo.production !== "No disponible" && (
                <div className="p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg border border-green-500/20">
                  <h4 className="text-lg font-semibold text-green-300 mb-2">Detalles de Producción</h4>
                  <p className="text-gray-300 leading-relaxed">{contentInfo.production}</p>
                </div>
              )}
              
              {contentInfo.budget && contentInfo.budget !== "No disponible" && (
                <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-500/20">
                  <h4 className="text-lg font-semibold text-yellow-300 mb-2 flex items-center">
                    <BanknotesIcon className="w-5 h-5 mr-2" />
                    Presupuesto
                  </h4>
                  <p className="text-gray-300 leading-relaxed">{contentInfo.budget}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={MapPinIcon}
                  label="Locaciones de Filmación"
                  value={contentInfo.locations}
                />
                
                <InfoItem
                  icon={MusicalNoteIcon}
                  label="Información Musical"
                  value={contentInfo.soundtrack}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer con powered by */}
      <div className="border-t border-gray-700/50 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Información generada por IA</span>
          <div className="flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>Powered by Gemini</span>
          </div>
        </div>
      </div>
    </div>
  );
}
