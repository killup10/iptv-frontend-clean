import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { addItemToMyList } from '../utils/api.js';
import Toast from './Toast.jsx';

export default function AddToMyListButton({ item, className = "" }) {
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToMyList = async (e) => {
    e.stopPropagation();
    
    if (!item || !item._id) {
      setToast({
        message: '❌ No se pudo agregar a Mi Lista',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      await addItemToMyList(item._id);
      setToast({
        message: `✅ "${item.name || item.title}" agregado a Mi Lista`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding to my list:', error);
      setToast({
        message: '❌ Error al agregar a Mi Lista',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleAddToMyList}
        disabled={isLoading}
        className={`transition-all duration-200 hover:scale-110 ${isLoading ? 'opacity-50' : ''} ${className}`}
        title="Agregar a Mi Lista"
        aria-label="Agregar a Mi Lista"
      >
        <Heart
          size={24}
          className="text-red-500 hover:text-red-400 transition-colors"
          fill="currentColor"
        />
      </button>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
