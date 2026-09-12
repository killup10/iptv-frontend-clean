// src/pages/RecienAgregados.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { normalizeSearchText } from '../utils/searchUtils.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import MobileVodDetailModal from '../components/MobileVodDetailModal.jsx';
import axiosInstance from '@/utils/axiosInstance';
import Card from '../components/Card.jsx';
import { Squares2X2Icon, SparklesIcon } from '@heroicons/react/24/solid';
import Toast from '../components/Toast.jsx';
import { getCollections, addItemsToCollection } from '../utils/api.js';
import CollectionsModal from '../components/CollectionsModal.jsx';
import { addItemToMyList } from '../utils/myListUtils.js';
import useVodDetailOverlay from '../hooks/useVodDetailOverlay.js';
import MobileArcadeDeck from '../components/MobileArcadeDeck.jsx';

const TYPE_FILTER_LABELS = [
  { key: 'todos', label: 'Todos los tipos' },
  { key: 'pelicula', label: '🎬 Películas' },
  { key: 'serie', label: '📺 Series' },
  { key: 'anime', label: '⚔️ Animes' },
  { key: 'dorama', label: '🌸 Series Asiáticas' },
  { key: 'novela', label: '🎭 Novelas' },
  { key: 'documental', label: '🌍 Documentales' },
  { key: 'zona kids', label: '🐻 Zona Kids' },
];

export function RecienAgregados() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedType, setSelectedType] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[0]);

  const [collections, setCollections] = useState([]);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);

  const {
    checkContentAccess,
    showAccessModal,
    accessModalData,
    closeAccessModal,
    handleProceedWithTrial
  } = useContentAccess();

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
    getNavigationState: () => ({
      fromSection: 'recien-agregados',
    }),
  });

  useEffect(() => {
    const fetchLatestItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get('/api/videos/public/recently-added', {
          params: { limit: 100 }
        });
        const data = Array.isArray(response.data) ? response.data : (response.data.videos || []);
        setItems(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching recently added items:', err);
        setError('Error al cargar los últimos contenidos agregados.');
        setLoading(false);
      }
    };

    fetchLatestItems();
  }, []);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const fetchedCollections = await getCollections();
        setCollections(fetchedCollections);
      } catch (error) {
        console.error("Error al cargar las colecciones:", error);
      }
    };
    loadCollections();
  }, []);

  const filteredItems = useMemo(() => {
    let list = [...items];

    if (selectedType !== 'todos') {
      list = list.filter((item) => {
        const tipo = String(item?.tipo || item?.type || '').toLowerCase();
        const subtipo = String(item?.subtipo || '').toLowerCase();
        if (selectedType === 'anime') {
          return tipo === 'anime' || subtipo === 'anime';
        }
        if (selectedType === 'pelicula') {
          return tipo === 'pelicula' || tipo === 'movie';
        }
        return tipo === selectedType || subtipo === selectedType;
      });
    }

    if (searchTerm) {
      const normalizedTerm = normalizeSearchText(searchTerm);
      list = list.filter((item) => {
        const inName = item.name && normalizeSearchText(item.name).includes(normalizedTerm);
        const inTitle = item.title && normalizeSearchText(item.title).includes(normalizedTerm);
        const inDesc = item.description && normalizeSearchText(item.description).includes(normalizedTerm);
        const inGenres = Array.isArray(item.genres)
          ? item.genres.some((g) => g && normalizeSearchText(g).includes(normalizedTerm))
          : (typeof item.genres === 'string' && normalizeSearchText(item.genres).includes(normalizedTerm));
        return inName || inTitle || inDesc || inGenres;
      });
    }

    return list;
  }, [items, selectedType, searchTerm]);

  const handleCardClick = (item) => {
    const itemType = item.tipo || item.type || 'movie';
    if (isMobile) {
      openVodDetail(item, itemType);
      return;
    }

    const { hasAccess, modalData } = checkContentAccess(item);
    if (!hasAccess) {
      return;
    }

    navigate(`/watch/${itemType}/${item._id || item.id}`);
  };

  const handleAddToCollection = (item) => {
    setSelectedItemForCollection(item);
    setIsCollectionsModalOpen(true);
  };

  const handleSelectCollection = async (collectionId) => {
    if (!selectedItemForCollection) return;
    try {
      await addItemsToCollection(collectionId, [selectedItemForCollection._id || selectedItemForCollection.id]);
      setToastMessage('Contenido agregado a la colección con éxito');
      setToastType('success');
    } catch (error) {
      console.error("Error al agregar a la colección:", error);
      setToastMessage('Error al agregar a la colección');
      setToastType('error');
    } finally {
      setIsCollectionsModalOpen(false);
      setSelectedItemForCollection(null);
    }
  };

  const handleAddToMyListSafe = async (item) => {
    const result = await addItemToMyList(item, {
      profileId: user?.profileId,
      fallbackType: item?.tipo || 'movie',
    });

    setToastMessage(result.message);
    setToastType(result.type);
  };

  const getGridClass = () => {
    switch (gridCols) {
      case 1:
        return 'grid-cols-1';
      case 3:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3';
      case 4:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case 5:
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-fuchsia-500/20 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-cyan-500 shadow-lg shadow-fuchsia-500/30">
                <SparklesIcon className="h-6 w-6 text-white" />
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Recién Agregados
              </h1>
            </div>
            <p className="text-gray-400 text-sm sm:text-base">
              Los últimos <span className="font-bold text-cyan-400">100 títulos</span> agregados a TeamG Play (Películas, Series, Animes y más).
            </p>
          </div>

          {/* Controls: Search & Grid selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Buscar en recientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Grid Toggle (Desktop) */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-900/80 border border-white/10 rounded-xl p-1">
              {gridOptions.map((cols) => (
                <button
                  key={cols}
                  onClick={() => setGridCols(cols)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    gridCols === cols
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={`${cols} columnas`}
                >
                  {cols === 1 ? '1 col' : `${cols} cols`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Type Pills */}
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none">
          {TYPE_FILTER_LABELS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedType(filter.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                selectedType === filter.key
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-black shadow-lg shadow-cyan-500/20 scale-105'
                  : 'bg-zinc-900/80 border-white/10 text-gray-300 hover:border-white/30 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4" />
            <p className="text-gray-400 text-sm">Cargando los 100 títulos más recientes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
            >
              Reintentar
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-zinc-950/40 p-8">
            <p className="text-gray-400 text-lg">No se encontraron contenidos con los filtros seleccionados.</p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('todos');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4 text-xs text-gray-400 px-1">
              <span>Mostrando <span className="text-white font-bold">{filteredItems.length}</span> de <span className="text-cyan-400 font-bold">{items.length}</span> títulos recientes</span>
              {selectedType !== 'todos' && (
                <span className="uppercase tracking-wider font-semibold text-cyan-400">
                  Filtro: {TYPE_FILTER_LABELS.find(f => f.key === selectedType)?.label}
                </span>
              )}
            </div>

            <div className={`grid gap-4 sm:gap-6 ${getGridClass()}`}>
              {filteredItems.map((item) => (
                <Card
                  key={item._id || item.id}
                  item={item}
                  onClick={() => handleCardClick(item)}
                  onPlayTrailerClick={(trailerUrl) => openTrailer(trailerUrl || item?.trailerUrl)}
                  onAddToCollectionClick={() => handleAddToCollection(item)}
                  onAddToMyListClick={() => handleAddToMyListSafe(item)}
                  variant="brand"
                  showPlanLock={false}
                  showItemTypeBadge={true}
                  itemType={item.tipo || item.type || 'movie'}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile VOD Detail Modal */}
      {isMobile && vodDetail?.item && (
        <MobileVodDetailModal
          item={vodDetail.item}
          isOpen={vodDetail.isOpen}
          onClose={closeVodDetail}
          onPlay={handlePlayFromDetail}
          onContinue={handleContinueFromDetail}
          onTrailer={openTrailer}
          progressPercent={detailProgressPercent}
          canContinue={detailCanContinue}
          onAddToMyList={handleAddToMyListSafe}
        />
      )}

      {/* Mobile Arcade Deck Navigation */}
      {isMobile && <MobileArcadeDeck />}

      {/* Collections Modal */}
      <CollectionsModal
        isOpen={isCollectionsModalOpen}
        onClose={() => {
          setIsCollectionsModalOpen(false);
          setSelectedItemForCollection(null);
        }}
        collections={collections}
        onSelectCollection={handleSelectCollection}
        itemToAdd={selectedItemForCollection}
      />

      {/* Content Access Modal */}
      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={handleProceedWithTrial}
      />

      {/* Trailer Modal */}
      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal
          trailerUrl={currentTrailerUrl}
          onClose={closeTrailer}
        />
      )}
    </div>
  );
}

export default RecienAgregados;
