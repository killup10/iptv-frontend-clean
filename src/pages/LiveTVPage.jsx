// src/pages/LiveTVPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchUserChannels,
  fetchChannelFilterSections,
} from '../utils/api.js';
import { normalizeSearchText } from '../utils/searchUtils.js';
import Card from '../components/Card.jsx';
import Toast from '../components/Toast.jsx';
import EpgGuide from '../components/EpgGuide.jsx';
import { addItemToMyList } from '../utils/myListUtils.js';


const formatLiveTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' });
  } catch (_) {
    return '';
  }
};

export default function LiveTVPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [allChannels, setAllChannels] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(location.state?.selectedCategory || '');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(location.state?.searchTerm || '');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'guide'
  const [retryTrigger, setRetryTrigger] = useState(0);

  const handleRetry = () => {
    setError(null);
    setRetryTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const loadFilterCategories = async () => {
      setIsLoadingCategories(true);
      setError(null);

      try {
        const categoriesData = await fetchChannelFilterSections();
        const nextCategories = (categoriesData || []).filter((c) => c && String(c).toLowerCase().trim() !== 'todos');
        setFilterCategories(nextCategories);

        if (location.state?.selectedCategory && nextCategories.includes(location.state.selectedCategory)) {
          setSelectedCategory(location.state.selectedCategory);
        } else {
          setSelectedCategory(nextCategories[0] || '');
        }
      } catch (err) {
        console.warn('LiveTVPage: Error al cargar categorías:', err.message);
        setFilterCategories([]);
        setSelectedCategory('');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadFilterCategories();
  }, [location.state?.selectedCategory, retryTrigger]);

  useEffect(() => {
    if (isLoadingCategories || !selectedCategory) {
      return;
    }

    const loadChannelsForCategory = async () => {
      setIsLoadingChannels(true);
      setError(null);

      try {
        const channelsData = await fetchUserChannels(selectedCategory);
        setAllChannels(channelsData || []);
      } catch (err) {
        console.error(`LiveTVPage: Error cargando canales para ${selectedCategory}:`, err.message);
        setError(err.message || `Error al cargar canales de ${selectedCategory}.`);
        setAllChannels([]);
      } finally {
        setIsLoadingChannels(false);
      }
    };

    loadChannelsForCategory();
  }, [isLoadingCategories, selectedCategory]);

  const handleCategoryButtonClick = (category) => {
    if (category === selectedCategory) {
      return;
    }

    setSearchTerm('');
    setSelectedCategory(category);
  };

  const displayedChannels = useMemo(() => {
    if (!allChannels) return [];
    if (!searchTerm) return allChannels;

    const normalizedSearch = normalizeSearchText(searchTerm);
    return allChannels.filter((channel) => {
      if (!channel.name) return false;
      return normalizeSearchText(channel.name).includes(normalizedSearch);
    });
  }, [allChannels, searchTerm]);

  const handleChannelClick = (channel) => {
    const channelId = channel.id || channel._id;
    if (!channelId) {
      console.error('LiveTVPage: channelId no encontrado', channel);
      return;
    }

    navigate(`/watch/channel/${channelId}`, {
      replace: true,
      state: {
        fromSection: 'tv',
        selectedCategory,
        searchTerm,
      },
    });
  };

  const handleAddToMyList = async (channel) => {
    try {
      const result = await addItemToMyList({
        ...channel,
        tipo: channel?.tipo || 'channel',
        itemType: 'channel',
      });

      setToastMessage(
        result.status === 'duplicate'
          ? `"${channel.name}" ya estaba en Mi Lista`
          : `"${channel.name}" agregado a Mi Lista`,
      );
      setToastType(result.status === 'duplicate' ? 'info' : 'success');
    } catch (err) {
      console.error('LiveTVPage: Error al agregar a Mi Lista:', err);
      setToastMessage('Error al agregar a Mi Lista');
      setToastType('error');
    }
  };

  const showInitialLoading = isLoadingCategories && filterCategories.length <= 1;
  const showChannelLoading = isLoadingChannels;
  const showGeneralError = error && !showChannelLoading && displayedChannels.length === 0 && filterCategories.length <= 1;

  if (showInitialLoading) {
    return (
      <div className="flex min-h-[calc(100vh-128px)] items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        <p className="ml-4 text-xl text-white">Cargando Interfaz...</p>
      </div>
    );
  }

  if (showGeneralError) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <div className="rounded-2xl border border-red-500/30 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 text-3xl">
            📺
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">TV en Vivo</h2>
          <p className="mb-6 text-sm text-zinc-400">{error || 'No se pudieron conectar los canales de TV. El servidor puede estar iniciando.'}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full rounded-xl bg-red-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-red-500 active:scale-95"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <h1 className="text-center text-3xl font-bold md:text-left sm:text-4xl">
          TV en Vivo
        </h1>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-2/5 lg:w-1/3">
          <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex-1 px-4 py-2.5 text-sm font-bold transition-colors sm:flex-none ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              ▦ Canales
            </button>
            <button
              type="button"
              onClick={() => setViewMode('guide')}
              className={`flex-1 px-4 py-2.5 text-sm font-bold transition-colors sm:flex-none ${viewMode === 'guide' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              📅 Guía
            </button>
          </div>
          <input
            type="text"
            placeholder="Buscar canal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 placeholder-gray-400 transition-shadow focus:border-red-500 focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {!isLoadingCategories && filterCategories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2 border-b border-gray-700 pb-4 md:justify-start">
          {filterCategories.map((categoryName) => (
            <button
              key={categoryName}
              onClick={() => handleCategoryButtonClick(categoryName)}
              disabled={isLoadingChannels && selectedCategory === categoryName}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ease-in-out ${
                selectedCategory === categoryName
                  ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500'
              } ${(isLoadingChannels && selectedCategory === categoryName) ? 'cursor-wait opacity-50' : ''}`}
            >
              {categoryName}
            </button>
          ))}
        </div>
      )}

      {showChannelLoading && (
        <div className="mt-10 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
          <p className="ml-3 text-lg">Cargando canales para {selectedCategory}...</p>
        </div>
      )}

      {error && !showChannelLoading && (
        <p className="my-6 rounded-md bg-red-900/30 p-4 text-center text-red-400">{error}</p>
      )}

      {!showChannelLoading && !error && displayedChannels.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 xs:grid-cols-3 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {displayedChannels.map((channel) => (
            <Card
              key={channel.id || channel._id}
              item={{
                ...channel,
                id: channel.id || channel._id,
                name: channel.name,
                title: channel.name,
                itemType: 'channel',
                tipo: channel.tipo || 'channel',
                thumbnail: channel.customThumbnail || channel.thumbnail || channel.logo || '/img/placeholder-thumbnail.png',
                epg: channel.epg || channel.currentProgram || '',
                description: channel.epg ? `🔴 Ahora${channel.epgStart ? ` (${formatLiveTime(channel.epgStart)})` : ''}: ${channel.epg}${channel.nextProgram ? ` | Sig: ${channel.nextProgram}` : ''}` : channel.description,
              }}
              onClick={() => handleChannelClick(channel)}
              itemType="channel"
              onAddToMyList={handleAddToMyList}
            />
          ))}
        </div>
      )}

      {!showChannelLoading && !error && displayedChannels.length > 0 && viewMode === 'guide' && (
        <EpgGuide
          channels={displayedChannels}
          onSelectChannel={handleChannelClick}
          showCategories={false}
        />
      )}

      {!showChannelLoading && !error && displayedChannels.length === 0 && (
        <p className="mt-12 text-center text-lg text-gray-400">
          {searchTerm
            ? `No se encontraron canales para "${searchTerm}" en la categoria "${selectedCategory}".`
            : (filterCategories.length > 0
              ? `No hay canales disponibles en la categoria "${selectedCategory}".`
              : 'No hay canales disponibles.')}
        </p>
      )}

      {!isLoadingCategories && filterCategories.length <= 1 && !error && displayedChannels.length === 0 && (
        <p className="mt-10 text-center text-lg text-gray-500">No hay categorias de TV en vivo para mostrar.</p>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
}
