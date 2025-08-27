import React from 'react';
import { XMarkIcon, StarIcon, ClockIcon } from '@heroicons/react/24/outline';

const ContentAccessModal = ({ 
  isOpen, 
  onClose, 
  data, 
  onProceedWithTrial 
}) => {
  if (!isOpen || !data) return null;

  const hasTrialTime = data.trialMinutesRemaining > 0;

  // Helpers: quitar decimales en cantidades de minutos
  const fmt = (n) => Math.max(0, Math.round(Number(n || 0)));
  const sanitizeMinutesInText = (text) =>
    String(text || '').replace(/(\d+(\.\d+)?)/g, (match) => String(Math.round(Number(match))));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg max-w-sm w-full mx-4 relative border border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">

          <h2 className="text-xl font-bold text-white flex items-center">
            <StarIcon className="w-6 h-6 text-yellow-500 mr-2" />
            Contenido Premium
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Título del contenido */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              {data.title}
            </h3>
            <p className="text-red-400 font-medium">
              {data.error}
            </p>
          </div>

          {/* Mensaje principal */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-600">
            <p className="text-gray-300 text-sm leading-relaxed">
              {data.message}
            </p>
          </div>

          {/* Información de planes */}
          {data.currentPlan && data.requiredPlans && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Plan actual:</span>
                <span className="text-blue-400 font-medium uppercase">
                  {data.currentPlan}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-300">Plan requerido:</span>
                <span className="text-green-400 font-medium uppercase">
                  {Array.isArray(data.requiredPlans) 
                    ? data.requiredPlans.join(' o ') 
                    : data.requiredPlans}
                </span>
              </div>
            </div>
          )}

          {/* Información de prueba gratuita */}
          {data.trialMessage && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <ClockIcon className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-green-400 font-medium text-sm">
                  Prueba Gratuita Diaria
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                {sanitizeMinutesInText(data.trialMessage)}
              </p>
              
              {hasTrialTime && (
                <div className="bg-green-800/30 rounded p-3 text-center">
                  <p className="text-green-300 text-sm font-medium">
                    ⏱️ Tiempo disponible hoy: {fmt(data.trialMinutesRemaining)} minutos
                  </p>
                  {data.trialUsedToday > 0 && (
                    <p className="text-gray-400 text-xs mt-1">
                      Ya has usado {fmt(data.trialUsedToday)} minutos hoy
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mensaje de upgrade */}
          {data.upgradeMessage && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-300 text-sm leading-relaxed">
                {data.upgradeMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="flex gap-3 p-6 border-t border-zinc-700">
          {hasTrialTime && (
            <button
              onClick={onProceedWithTrial}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <ClockIcon className="w-4 h-4 mr-2" />
              Usar Prueba Gratuita
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`${hasTrialTime ? 'flex-1' : 'w-full'} bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-lg transition-colors`}
          >
            {hasTrialTime ? 'Cancelar' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentAccessModal;
