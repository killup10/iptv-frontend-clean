import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchUserSeries, getCollections, addItemsToCollection } from '../utils/api.js';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import Card from '../components/Card.jsx';
import { Squares2X2Icon } from '@heroicons/react/24/solid';
import CollectionsModal from '../components/CollectionsModal.jsx';

const SUBCATEGORIAS = [
  "TODOS",
  "Netflix",
  "Prime Video",
  "Disney",
  "Apple TV",
  "HBO Max",
  "Hulu y Otros",
  "Retro",
  "Animadas",
];

export default function SeriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [series, setSeries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[0]);

  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  const [collections, setCollections] = useState([]);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);

  const { checkContentAccess, showAccessModal, accessModalData, closeAccessModal, proceedWithTrial } = useContentAccess();

  useEffect(() => {
    const loadCollections = async () => {
        try {
            const fetchedCollections = await getCollections();
            setCollections(fetchedCollections);
        } catch (error) {
            console.error("Failed to load collections", error);
        }
    };
    loadCollections();
}, []);

  const observer = useRef();
  const lastSerieElementRef = useCallback(node => {
      if (isLoading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore) {
              loadMoreSeries();
          }
      });
      if (node) observer.current.observe(node);
  }, [isLoading, loadingMore, hasMore]);

  const loadSeries = async (currentPage, subcategoria) => {
      if (!user?.token) {
          setIsLoading(false);
          return;
      }
      
      setLoadingMore(true);
      setError(null);

      try {
                    const data = await fetchUserSeries(currentPage, 3000, subcategoria);
          setSeries(prevSeries => currentPage === 1 ? data.videos : [...prevSeries, ...data.videos]);
          setTotalPages(data.totalPages);
          setPage(data.page);
          setHasMore(data.page < data.totalPages);
      } catch (err) {
          console.error("Error cargando series en SeriesPage:", err);
          setError(err.message);
      } finally {
          setIsLoading(false);
          setLoadingMore(false);
      }
  };

  const loadMoreSeries = () => {
      if (page < totalPages) {
          loadSeries(page + 1, selectedSubcategoria);
      }
  };

  useEffect(() => {
      setSeries([]);
      setPage(1);
      setTotalPages(0);
      setHasMore(true);
      loadSeries(1, selectedSubcategoria);
  }, [selectedSubcategoria, user?.token]);

  const handleSerieClick = (serie) => {
    const serieId = serie.id || serie._id;
    if (!serieId) {
      console.error("SeriesPage: Clic en serie sin ID válido.", serie);
      return;
    }
    const navigateToSerie = () => navigate(`/watch/serie/${serieId}`);
    checkContentAccess(serie, navigateToSerie);
  };

  const handleProceedWithTrial = () => {
    proceedWithTrial();
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const toggleGridView = () => {
    const currentIndex = gridOptions.indexOf(gridCols);
    const nextIndex = (currentIndex + 1) % gridOptions.length;
    setGridCols(gridOptions[nextIndex]);
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

  const getGridClass = () => {
    switch (gridCols) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';
      case 5: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
      default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
  };

  const filteredSeries = useMemo(() => {
      let filtered = [...series];
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(serie => {
            const inName = serie.name && serie.name.toLowerCase().includes(term);
            const inDesc = serie.description && serie.description.toLowerCase().includes(term);
            const inGenres = Array.isArray(serie.genres)
              ? serie.genres.some(g => g && g.toLowerCase().includes(term))
              : (typeof serie.genres === 'string' && serie.genres.toLowerCase().includes(term));
            return inName || inDesc || inGenres;
        });
      }
      return filtered;
  }, [series, searchTerm]);

  if (isLoading && page === 1) return (
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
    <>
      <style>{`
        .rainbow-text {
          background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: rainbow-animation 5s linear infinite;
        }
        @keyframes rainbow-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-zinc-800 rounded-lg p-4 sticky top-24">
              <h2 className="text-xl font-bold mb-4 text-white">Categorías</h2>
              <div className="space-y-2">
                {SUBCATEGORIAS.map(subcategoria => (
                  <button
                    key={subcategoria}
                    onClick={() => setSelectedSubcategoria(subcategoria)}
                    className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                      selectedSubcategoria === subcategoria
                        ? 'bg-red-600 text-white'
                        : 'text-gray-300 hover:bg-zinc-700'
                    } ${subcategoria === 'ZONA KIDS' && selectedSubcategoria !== 'ZONA KIDS' ? 'rainbow-text font-bold' : ''}`}
                  >
                    {subcategoria}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h1 className={`text-3xl font-bold text-white ${selectedSubcategoria === 'ZONA KIDS' ? 'rainbow-text' : ''}`}>
                Series: {selectedSubcategoria}
              </h1>
              <div className="flex items-center gap-4">
                  <button
                    onClick={toggleGridView}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                    aria-label="Cambiar vista de cuadrícula"
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Buscar series..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
              </div>
            </div>

            {filteredSeries.length > 0 ? (
              <div className={`grid ${getGridClass()} gap-6`}>
                {filteredSeries.map((serie, index) => {
                  if (filteredSeries.length === index + 1) {
                      return (
                          <div ref={lastSerieElementRef} key={serie.id || serie._id}>
                              <Card
                                  item={serie}
                                  onClick={() => handleSerieClick(serie)}
                                  itemType="serie"
                                  onPlayTrailer={handlePlayTrailerClick}
                                  onAddToCollectionClick={handleOpenCollectionsModal}
                              />
                          </div>
                      );
                  } else {
                      return (
                          <Card
                              key={serie.id || serie._id}
                              item={serie}
                              onClick={() => handleSerieClick(serie)}
                              itemType="serie"
                              onPlayTrailer={handlePlayTrailerClick}
                              onAddToCollectionClick={handleOpenCollectionsModal}
                          />
                      );
                  }
                })}
              </div>
            ) : (
              <p className="text-center text-gray-400 mt-8">
                No hay series disponibles en la categoría {selectedSubcategoria}.
              </p>
            )}

            {loadingMore && (
                <div className="flex justify-center items-center mt-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
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
            collections={collections.filter(c => c.itemsModel === 'Serie')}
            onAddToCollection={handleAddToCollection}
        />
      </div>
    </>
  );
}
