import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCollections, createCollection, addItemsToCollection, removeItemsFromCollection } from '../utils/api.js';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import Card from '../components/Card.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import CollectionsModal from '../components/CollectionsModal.jsx';

export default function Colecciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColeccion, setSelectedColeccion] = useState("TODAS");
  const [searchTerm, setSearchTerm] = useState("");

  // Trailer functionality
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  // Collections modal functionality
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);

  const { checkContentAccess, showAccessModal, accessModalData, closeAccessModal, proceedWithTrial } = useContentAccess();

  useEffect(() => {
    const loadCollections = async () => {
      if (!user?.token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedCollections = await getCollections();
        setCollections(fetchedCollections);
      } catch (err) {
        console.error("Error cargando colecciones:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCollections();

    window.addEventListener('focus', loadCollections);

    return () => {
      window.removeEventListener('focus', loadCollections);
    };
  }, [user?.token]);

  const handleContentClick = (item) => {
    const itemId = item.id || item._id;
    if (!itemId) {
      console.error("Colecciones: Clic en contenido sin ID válido.", item);
      return;
    }
    const navigateToContent = () => {
      const type = item.tipo === 'serie' ? 'serie' : 'movie';
      navigate(`/watch/${type}/${itemId}`);
    };
    checkContentAccess(item, navigateToContent);
  };

  const handleProceedWithTrial = () => {
    proceedWithTrial();
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handlePlayTrailerClick = (trailerUrl) => {
    if (trailerUrl) {
      setCurrentTrailerUrl(trailerUrl);
      setShowTrailerModal(true);
    }
  };

  const handleOpenCollectionsModal = (item) => {
    setSelectedItemForCollection(item);
    setIsCollectionsModalOpen(true);
  };

  const handleCloseCollectionsModal = () => {
    setIsCollectionsModalOpen(false);
    setSelectedItemForCollection(null);
  };

  const handleAddToCollection = async ({ item, collectionName }) => {
    try {
      let collection = collections.find(c => c.name === collectionName);
      
      // Si no se encuentra la colección, recargar las colecciones (puede ser una nueva)
      if (!collection) {
        console.log('Colección no encontrada, recargando colecciones...');
        const updatedCollections = await getCollections();
        setCollections(updatedCollections);
        collection = updatedCollections.find(c => c.name === collectionName);
      }
      
      if (collection) {
        await addItemsToCollection(collection._id, [item._id || item.id]);
        alert(`${item.name || item.title} fue agregado a la colección ${collectionName}`);
        
        // Recargar colecciones para mantener sincronización
        const refreshedCollections = await getCollections();
        setCollections(refreshedCollections);
      } else {
        throw new Error(`No se pudo encontrar la colección "${collectionName}"`);
      }
    } catch (error) {
      console.error("Failed to add item to collection", error);
      alert(`Error al agregar a la colección: ${error.message}`);
    }
    handleCloseCollectionsModal();
  };

  const handleRemoveFromCollection = async (item, collectionName) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar "${item.name || item.title}" de la colección "${collectionName}"?`
    );
    
    if (!confirmDelete) return;

    try {
      const collection = collections.find(c => c.name === collectionName);
      
      if (collection) {
        await removeItemsFromCollection(collection._id, [item._id || item.id]);
        alert(`${item.name || item.title} fue eliminado de la colección ${collectionName}`);
        
        // Recargar colecciones para mantener sincronización
        const refreshedCollections = await getCollections();
        setCollections(refreshedCollections);
      } else {
        throw new Error(`No se pudo encontrar la colección "${collectionName}"`);
      }
    } catch (error) {
      console.error("Failed to remove item from collection", error);
      alert(`Error al eliminar de la colección: ${error.message}`);
    }
    handleCloseCollectionsModal();
  };

  const handleCreateCollection = async () => {
    const newCollectionName = prompt("Introduce el nombre de la nueva colección:");
    if (!newCollectionName || newCollectionName.trim() === '') {
      return;
    }

    let itemsModel;
    while (true) {
      const modelInput = prompt("Introduce el tipo de contenido: 'Película' o 'Serie'");
      if (modelInput === null) { // User cancelled the prompt
        return;
      }
      const modelInputLower = modelInput.toLowerCase();
      if (modelInputLower === 'pelicula' || modelInputLower === 'película') {
        itemsModel = 'Video';
        break;
      }
      if (modelInputLower === 'serie') {
        itemsModel = 'Serie';
        break;
      }
      alert("Tipo inválido. Por favor, introduce 'Película' o 'Serie'.");
    }

    try {
      console.log(`Creando colección: ${newCollectionName} con tipo: ${itemsModel}`);
      
      // Crear la colección en el backend
      const newCollection = await createCollection(newCollectionName.trim(), itemsModel);
      console.log('Colección creada exitosamente:', newCollection);
      
      // Recargar todas las colecciones desde el backend
      const fetchedCollections = await getCollections();
      console.log('Colecciones recargadas:', fetchedCollections);
      
      setCollections(fetchedCollections);
      
      // Seleccionar la nueva colección creada
      setSelectedColeccion(newCollectionName.trim());
      
      alert(`Colección "${newCollectionName}" creada exitosamente!`);
    } catch (err) {
      console.error("Error creando colección:", err);
      alert(`Error al crear la colección: ${err.message}`);
    }
  };

  const collectionNames = useMemo(() => {
    const names = Array.isArray(collections) ? collections.map(c => c.name).filter(Boolean) : [];
    const unique = Array.from(new Set(names));
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return ["TODAS", ...unique];
  }, [collections]);

  const groupedContent = useMemo(() => {
    const sortByYear = (items) => {
      if (!Array.isArray(items)) return [];
      return [...items]
        .filter(Boolean)
        .sort((a, b) => {
          const ay = Number(a?.releaseYear || a?.year || a?.release_year || 0) || 0;
          const by = Number(b?.releaseYear || b?.year || b?.release_year || 0) || 0;
          return ay - by; // Orden cronológico ascendente (más antiguo -> más nuevo)
        });
    };

    if (selectedColeccion === "TODAS") {
      const groups = {};
      collections.forEach(collection => {
        groups[collection.name] = sortByYear(collection.items);
      });
      return groups;
    }
    const selected = collections.find(c => c.name === selectedColeccion);
    return selected ? { [selected.name]: sortByYear(selected.items) } : {};
  }, [collections, selectedColeccion]);

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[calc(100vh-128px)]">
      <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="text-center text-red-400 p-6 text-lg bg-gray-800 rounded-md mx-auto max-w-md">
      {error}
    </div>
  );
  
  if (!user) return (
    <p className="text-center text-xl text-gray-400 mt-20">
      Debes <a href="/login" className="text-red-500 hover:underline">iniciar sesión</a> para ver este contenido.
    </p>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-gradient-to-br from-indigo-800 to-purple-800 rounded-lg p-4 sticky top-24">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center">
              📚 Colecciones
            </h2>
            <div className="space-y-2">
              {collectionNames.map(coleccion => (
                <button
                  key={coleccion}
                  onClick={() => setSelectedColeccion(coleccion)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    selectedColeccion === coleccion
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold'
                      : 'text-gray-200 hover:bg-indigo-700'
                  }`}
                >
                  {coleccion}
                </button>
              ))}
            </div>
            {user.role === 'admin' && (
              <div className="mt-4">
                <button
                  onClick={handleCreateCollection}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                >
                  Crear Colección
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-white flex items-center">
              🎬 Colecciones: {selectedColeccion}
            </h1>
            <input
              type="text"
              placeholder="Buscar en colecciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {Object.keys(groupedContent).length > 0 ? (
            <div className="space-y-8">
              {(() => {
                const namesToRender = selectedColeccion === "TODAS" ? collectionNames.slice(1) : [selectedColeccion];
                return namesToRender.map(collectionName => {
                  const items = groupedContent[collectionName] || [];
                  // If filtering by searchTerm, skip empty results
                  const filtered = (items || []).filter(item => {
                    if (!item) return false;
                    const itemName = item.name || item.title || '';
                    return itemName.toLowerCase().includes(searchTerm.toLowerCase());
                  });
                  if (filtered.length === 0 && selectedColeccion === "TODAS") return null;
                  return (
                    <div key={collectionName} className="space-y-4">
                      {selectedColeccion === "TODAS" && (
                        <h2 className="text-2xl font-bold text-white border-l-4 border-purple-500 pl-4">
                          {collectionName}
                        </h2>
                      )}
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                        {filtered.map(item => (
                          <Card
                            key={item.id || item._id}
                            item={item}
                            onClick={() => handleContentClick(item)}
                            itemType={item.tipo === 'serie' ? 'serie' : 'movie'}
                            onPlayTrailer={handlePlayTrailerClick}
                            onAddToCollectionClick={handleOpenCollectionsModal}
                            onRemoveFromCollection={() => handleRemoveFromCollection(item, collectionName)}
                            showRemoveButton={true}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-400 text-lg">
                No hay contenido disponible en la colección {selectedColeccion}.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                ¡Pronto agregaremos más colecciones emocionantes!
              </p>
            </div>
          )}
        </div>
      </div>

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={handleProceedWithTrial}
        onGoBack={handleGoBack}
      />

      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal
          trailerUrl={currentTrailerUrl}
          onClose={() => {
            setShowTrailerModal(false);
            setCurrentTrailerUrl('');
          }}
        />
      )}

      <CollectionsModal
        isOpen={isCollectionsModalOpen}
        onClose={handleCloseCollectionsModal}
        item={selectedItemForCollection}
        collections={collections.filter(c => 
          selectedItemForCollection?.tipo === 'serie' 
            ? c.itemsModel === 'Serie' 
            : c.itemsModel === 'Video'
        )}
        onAddToCollection={handleAddToCollection}
      />
    </div>
  );
}
