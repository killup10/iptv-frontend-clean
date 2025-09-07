// src/components/CollectionsModal.jsx
import React, { useState, useEffect } from 'react';

export default function CollectionsModal({
  isOpen,
  onClose,
  item,
  collections,
  onAddToCollection,
}) {
  const [selectedCollection, setSelectedCollection] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setSelectedCollection('');
      setNewCollectionName('');
    }
  }, [isOpen]);

  if (!isOpen || !item) {
    return null;
  }

  const handleAddClick = () => {
    const collectionName = newCollectionName.trim() || selectedCollection;
    if (!collectionName) {
      alert('Por favor, selecciona una colección o crea una nueva.');
      return;
    }
    onAddToCollection({ item, collectionName });
  };

  const collectionNames = collections.map(c => c.name);

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
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
