import React, { useEffect, useRef } from 'react';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline';

const ContentAccessModal = ({ 
  isOpen, 
  onClose, 
  data 
}) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Foco automático en el botón cerrar al abrir el modal para la TV
    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        try {
          closeButtonRef.current.focus({ preventScroll: true });
        } catch {
          closeButtonRef.current.focus();
        }
      }
    }, 50);

    // Captura de botones "Atrás" o "Escape" en el control remoto de la TV
    const handleKeyDown = (e) => {
      const isBackKey = ['Escape', 'Backspace', 'BrowserBack', 'GoBack'].includes(e.key) 
        || [4, 8, 27, 111, 461, 10009].includes(e.keyCode);
      
      if (isBackKey) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[150] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 rounded-3xl w-full max-w-[340px] mx-auto relative border border-zinc-700 shadow-2xl shadow-red-500/20 max-h-[95vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-yellow-400" />
            Contenido Premium
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full focus:bg-zinc-800 focus:outline-none"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-base font-extrabold text-white leading-tight">
              {data.title}
            </h3>
            <p className="text-red-400 font-bold text-xs mt-1 uppercase tracking-wide">
              {data.message || 'Tu plan actual no incluye este contenido'}
            </p>
          </div>

          {/* Información de planes */}
          {data.currentPlan && data.requiredPlans && (
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tu plan actual:</span>
                <span className="text-blue-400 font-black uppercase bg-blue-950/60 px-2 py-0.5 rounded">
                  {data.currentPlan}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Planes con acceso:</span>
                <span className="text-green-400 font-black uppercase bg-green-950/60 px-2 py-0.5 rounded">
                  {Array.isArray(data.requiredPlans) 
                    ? data.requiredPlans.join(' o ') 
                    : data.requiredPlans}
                </span>
              </div>
            </div>
          )}

          {/* Mensaje de WhatsApp */}
          <div className="bg-green-900/10 border border-green-500/20 rounded-2xl p-4 text-center space-y-3">
            <p className="text-green-300 text-xs font-semibold leading-relaxed">
              Solicita la migración a un plan superior escribiéndonos al WhatsApp:
              <span className="block text-lg font-black text-white mt-1">912194777</span>
            </p>
            <a
              href="https://wa.me/51912194777?text=Hola,%20me%20gustaría%20actualizar%20mi%20plan%20de%20TeamG%20Play"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-200 text-xs focus:bg-green-400 focus:text-black focus:scale-105 focus:outline-none focus:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex border-t border-zinc-800 pt-3">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-200 text-xs focus:bg-cyan-500 focus:text-black focus:scale-105 focus:outline-none focus:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentAccessModal;
