// src/components/CollectionsModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { createCollection } from '../utils/api.js';

export default function CollectionsModal({
  isOpen,
  onClose,
  item,
  collections,
  onAddToCollection,
}) {
  const [selectedCollection, setSelectedCollection] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setSelectedCollection('');
      setNewCollectionName('');
      setIsCreatingCollection(false);
    }
  }, [isOpen]);

  const collectionNames = useMemo(() => {
    const names = Array.isArray(collections) ? collections.map(c => c.name).filter(Boolean) : [];
    const unique = Array.from(new Set(names));
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return unique;
  }, [collections]);

  if (!isOpen || !item) {
    return null;
  }

  const handleAddClick = async () => {
    try {
      let collectionName = selectedCollection;
      
      // Si hay un nombre de nueva colección, crear la colección primero
      if (newCollectionName.trim()) {
        setIsCreatingCollection(true);
        
        // Determinar el tipo de contenido basado en el item
        const itemsModel = item.tipo === 'serie' ? 'Serie' : 'Video';
        
        console.log(`Creando nueva colección: ${newCollectionName.trim()} con tipo: ${itemsModel}`);
        
        // Crear la nueva colección
        const newCollection = await createCollection(newCollectionName.trim(), itemsModel);
        console.log('Nueva colección creada:', newCollection);
        
        collectionName = newCollectionName.trim();
        setIsCreatingCollection(false);
      }
      
      if (!collectionName) {
        alert('Por favor, selecciona una colección o crea una nueva.');
        return;
      }
      
      // Agregar el item a la colección
      onAddToCollection({ item, collectionName });
      
    } catch (error) {
      console.error('Error al crear colección:', error);
      alert(`Error al crear la colección: ${error.message}`);
      setIsCreatingCollection(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-800 rounded-lg p-6 w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">
          Agregar a Colección
        </h2>
        <div className="mb-4">
          <p className="text-white truncate">
            <strong>Película/Serie:</strong> {item.title || item.name}
          </p>
        </div>

        {collectionNames.length > 0 && (
          <div className="mb-4">
            <label
              htmlFor="collection-select"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Seleccionar colección existente
            </label>
            <select
              id="collection-select"
              value={selectedCollection}
              onChange={(e) => {
                setSelectedCollection(e.target.value);
                setNewCollectionName(''); // Clear new collection input
              }}
              className="w-full px-3 py-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isCreatingCollection}
            >
              <option value="">-- Elige una colección --</option>
              {collectionNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-6">
          <label
            htmlFor="new-collection-input"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            O crear una nueva colección
          </label>
          <input
            id="new-collection-input"
            type="text"
            placeholder="Ej: Películas de Acción"
            value={newCollectionName}
            onChange={(e) => {
              setNewCollectionName(e.target.value);
              setSelectedCollection(''); // Clear selection
            }}
            className="w-full px-3 py-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isCreatingCollection}
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white font-semibold transition-colors"
            disabled={isCreatingCollection}
          >
            Cancelar
          </button>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreatingCollection}
          >
            {isCreatingCollection ? 'Creando...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
