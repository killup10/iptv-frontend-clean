import React from 'react';
import { XMarkIcon, StarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const ContentAccessModal = ({ 
  isOpen, 
  onClose, 
  data, 
  onGoBack,
  onProceedWithTrial
}) => {
  if (!isOpen || !data) return null;

  const hasTrial = onProceedWithTrial && data.trialMessage;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-2">
      <div className="bg-zinc-900 rounded-lg w-full max-w-[280px] mx-auto relative border-2 border-zinc-700 shadow-2xl shadow-red-500/20 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800 sticky top-0 bg-zinc-900/80 backdrop-blur-sm">
          <h2 className="text-base font-bold text-white flex items-center">
            <StarIcon className="w-5 h-5 text-yellow-400 mr-2" />
            Contenido Premium
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Título del contenido */}
          <div className="text-center">
            <h3 className="text-sm font-semibold text-white mb-1">
              {data.title}
            </h3>
            <p className="text-red-400 font-medium text-xs">
              {data.error}
            </p>
          </div>

          {/* Mensaje principal */}
          <div className="bg-zinc-800/50 rounded-md p-2 border border-zinc-700">
            <p className="text-gray-300 text-xs leading-relaxed">
              {data.message}
            </p>
          </div>

          {/* Información de planes */}
          {data.currentPlan && data.requiredPlans && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-gray-400">Tu plan:</span>
                <span className="text-blue-400 font-medium uppercase">
                  {data.currentPlan}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs gap-2 mt-1">
                <span className="text-gray-400">Requerido:</span>
                <span className="text-green-400 font-medium uppercase">
                  {Array.isArray(data.requiredPlans) 
                    ? data.requiredPlans.join(' o ') 
                    : data.requiredPlans}
                </span>
              </div>
            </div>
          )}

          {/* Mensaje de upgrade */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <p className="text-green-300 text-xs font-medium mb-2 text-center">
              Actualiza tu plan para disfrutar de todo el contenido.
            </p>
            <a
              href="https://wa.me/912194777?text=Hola,%20me%20gustaría%20actualizar%20mi%20plan%20de%20TeamG%20Play"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-xs"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex gap-2 p-3 border-t border-zinc-800 sticky bottom-0 bg-zinc-900/80 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentAccessModal;
