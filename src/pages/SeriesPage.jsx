import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchUserSeries, fetchVideosByType, getCollections, addItemsToCollection } from '../utils/api.js';
import { normalizeSearchText } from '../utils/searchUtils.js'; // Para búsqueda sin tildes
import useDataCache from '../hooks/useDataCache.js';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import MobileVodDetailModal from '../components/MobileVodDetailModal.jsx';
import Card from '../components/Card.jsx';
import { Squares2X2Icon } from '@heroicons/react/24/solid';
import CollectionsModal from '../components/CollectionsModal.jsx';
import axiosInstance from '../utils/axiosInstance.js';
import Toast from '../components/Toast.jsx';
import { addItemToMyList } from '../utils/myListUtils.js';
import { SERIES_SUBCATEGORIES, buildSeriesSubcategoryCounts } from '../utils/seriesSubcategoryUtils.js';
import useVodDetailOverlay from '../hooks/useVodDetailOverlay.js';

const SUBCATEGORIAS = SERIES_SUBCATEGORIES;

export default function SeriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dataCache = useDataCache();
  
  const [series, setSeries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const setAllSearchItems = null; // SearchBar global solo vive en Home
  const [selectedSubcategoria, setSelectedSubcategoria] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[0]);

  const [collections, setCollections] = useState([]);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [subcategoryCounts, setSubcategoryCounts] = useState(() => (
    dataCache.get('seriesSubcategoryCounts') || buildSeriesSubcategoryCounts([])
  ));

  const { checkContentAccess, showAccessModal, accessModalData, closeAccessModal, proceedWithTrial } = useContentAccess();
  const {
    vodDetail,
    openVodDetail,
    closeVodDetail,
    showTrailerModal,
    currentTrailerUrl,
    openTrailer,
    closeTrailer,
    detailProgressPercent,
    detailCanContinue,
    detailTrailerUrl,
    handleContinueFromDetail,
    handlePlayFromDetail,
  } = useVodDetailOverlay({
    checkContentAccess,
    getNavigationState: () => ({
      fromSection: 'series',
      selectedSubcategoria,
    }),
  });

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

  useEffect(() => {
    if (!user?.token) {
      return undefined;
    }

    const cachedCounts = dataCache.get('seriesSubcategoryCounts');
    if (cachedCounts) {
      setSubcategoryCounts(cachedCounts);
    }

    let cancelled = false;

    const loadSeriesCounts = async () => {
      try {
        const data = await fetchVideosByType('serie', 1, 1000);
        const items = Array.isArray(data?.videos) ? data.videos : Array.isArray(data) ? data : [];
        const counts = buildSeriesSubcategoryCounts(items);

        if (!cancelled) {
          setSubcategoryCounts(counts);
          dataCache.set('seriesSubcategoryCounts', counts);
        }
      } catch (error) {
        console.error('SeriesPage: Error cargando contadores de subcategorias:', error);
      }
    };

    loadSeriesCounts();

    return () => {
      cancelled = true;
    };
  }, [dataCache, user?.token]);

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
                    // OPTIMIZADO: Reducido de 3000 a 20 items por página
          const data = await fetchUserSeries(currentPage, 20, subcategoria);
          setSeries(prevSeries => currentPage === 1 ? data.videos : [...prevSeries, ...data.videos]);
          setTotalPages(data.totalPages);
          setPage(data.page);
          setHasMore(data.page < data.totalPages);

          // 🔴 CAMBIO IMPORTANTE: NO actualizar SearchBar aquí
          // Cada página tiene su propio buscador local

      } catch (err) {
          console.error("Error cargando series en SeriesPage:", err);
          setError(err.message);
      } finally {
          setIsLoading(false);
          setLoadingMore(false);
      }
  };

  // 🆕 useEffect SEPARADO: Solo carga SearchBar cuando cambias de SUBCATEGORÍA
  // No cuando haces búsquedas locales (evita recargar 3000+ títulos)
  useEffect(() => {
    const loadSearchItemsForSubcategory = async () => {
      if (!user?.token || !setAllSearchItems) return;

      try {
        console.log('[SeriesPage] 🔄 Cargando series para SearchBar global...', selectedSubcategoria);
        
        // Cargar datos de esta subcategoría (SIN búsqueda, para el SearchBar)
        const data = await fetchUserSeries(1, 100, selectedSubcategoria);
        
        if (data.videos && data.videos.length > 0) {
          const seriesForSearch = data.videos.map(serie => ({
            ...serie,
            type: 'serie',
            itemType: 'serie'
          }));
          setAllSearchItems(seriesForSearch);
          console.log('[SeriesPage] ✅ SearchBar actualizado con', seriesForSearch.length, 'series');
        }
      } catch (err) {
        console.error('[SeriesPage] Error cargando datos para SearchBar:', err);
      }
    };

    loadSearchItemsForSubcategory();
  }, [selectedSubcategoria, user?.token, setAllSearchItems]); // 🔴 SIN searchTerm

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
    openVodDetail(serie, 'serie');
    return;
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
    openTrailer(trailerUrl);
    return;
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

const handleAddToMyList = async (item) => {
    try {
      console.log('[SeriesPage.jsx] Agregando a Mi Lista:', item);
      const response = await axiosInstance.post('/api/users/my-list/add', {
        itemId: item._id || item.id,
        tipo: item.tipo || item.itemType || 'serie',
        title: item.name || item.title,
        thumbnail: item.thumbnail,
        description: item.description
      });

      console.log('[SeriesPage.jsx] Agregado a Mi Lista exitosamente:', response.data);
      // Mostrar notificación de éxito
      setToastMessage(`✨ "${item.name || item.title}" agregado a Mi Lista`);
      setToastType('success');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('[SeriesPage.jsx] Item ya está en Mi Lista');
        setToastMessage(`ℹ️ "${item.name || item.title}" ya estaba en Mi Lista`);
        setToastType('info');
      } else {
        console.error('[SeriesPage.jsx] Error al agregar a Mi Lista:', error);
        setToastMessage('❌ Error al agregar a Mi Lista');
        setToastType('error');
      }
    }
  };

  const handleAddToMyListSafe = async (item) => {
    try {
      const result = await addItemToMyList(item);
      setToastMessage(
        result.status === 'duplicate'
          ? `"${item.name || item.title}" ya estaba en Mi Lista`
          : `"${item.name || item.title}" agregado a Mi Lista`,
      );
      setToastType(result.status === 'duplicate' ? 'info' : 'success');
    } catch (error) {
      console.error('[SeriesPage.jsx] Error al agregar a Mi Lista:', error);
      setToastMessage('Error al agregar a Mi Lista');
      setToastType('error');
    }
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
        const normalizedTerm = normalizeSearchText(searchTerm);
        filtered = filtered.filter(serie => {
            const inName = serie.name && normalizeSearchText(serie.name).includes(normalizedTerm);
            const inDesc = serie.description && normalizeSearchText(serie.description).includes(normalizedTerm);
            const inGenres = Array.isArray(serie.genres)
              ? serie.genres.some(g => g && normalizeSearchText(g).includes(normalizedTerm))
              : (typeof serie.genres === 'string' && normalizeSearchText(serie.genres).includes(normalizedTerm));
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
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-4 py-2 text-left transition-colors ${
                      selectedSubcategoria === subcategoria
                        ? 'bg-red-600 text-white'
                        : 'text-gray-300 hover:bg-zinc-700'
                    } ${subcategoria === 'ZONA KIDS' && selectedSubcategoria !== 'ZONA KIDS' ? 'rainbow-text font-bold' : ''}`}
                  >
                    <span>{subcategoria}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      selectedSubcategoria === subcategoria
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-slate-300'
                    }`}>
                      {subcategoryCounts[subcategoria] ?? 0}
                    </span>
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
                                  onAddToMyList={handleAddToMyListSafe}
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
                              onAddToMyList={handleAddToMyListSafe}
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
            onClose={closeTrailer}
          />
        )}

        {vodDetail?.item && (
          <MobileVodDetailModal
            isOpen={Boolean(vodDetail?.item)}
            item={vodDetail.item}
            itemType={vodDetail.itemType}
            canContinue={detailCanContinue}
            progressPercent={detailProgressPercent}
            onClose={closeVodDetail}
            onContinue={handleContinueFromDetail}
            onPlay={handlePlayFromDetail}
            onAddToMyList={handleAddToMyListSafe}
            onTrailer={detailTrailerUrl ? () => openTrailer(detailTrailerUrl) : null}
          />
        )}

        <CollectionsModal
            isOpen={isCollectionsModalOpen}
            onClose={handleCloseCollectionsModal}
            item={selectedItemForCollection}
            collections={collections.filter(c => c.itemsModel === 'Video')}
            onAddToCollection={handleAddToCollection}
        />

        {toastMessage && (
            <Toast
            message={toastMessage}
            type={toastType}
            duration={3000}
            onClose={() => setToastMessage('')}
            />
        )}
      </div>
    </>
  );
}
