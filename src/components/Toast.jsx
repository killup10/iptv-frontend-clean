import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, InfoIcon, X } from 'lucide-react';

export default function Toast({ 
  message, 
  type = 'success', 
  duration = 3000, 
  onClose 
}) {
  useEffect(() => {
    if (!message) return;
    
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }[type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: InfoIcon,
    warning: AlertCircle
  }[type];

  return (
    <div className={`fixed top-20 right-4 z-50 animate-slide-in`}>
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-max`}>
        <Icon size={24} />
        <span className="font-medium">{message}</span>
        <button 
          onClick={onClose}
          className="ml-2 hover:bg-white hover:bg-opacity-20 rounded p-1 transition-all"
        >
          <X size={18} />
        </button>
      </div>
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
