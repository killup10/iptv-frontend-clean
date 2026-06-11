import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchUserChannels, fetchChannelFilterSections, sortLiveTVCategories } from '../utils/api.js';
import TVChannelGrid from '../components/TVChannelGrid.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { focusTVContent } from '../utils/tvFocusZone.js';

let liveTvCache = null;



export default function TVLiveTV() {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState(() => liveTvCache?.categories || []);
  const [categoryChannels, setCategoryChannels] = useState(() => liveTvCache?.categoryChannels || {});
  const [allChannels, setAllChannels] = useState(() => liveTvCache?.allChannels || []);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [loading, setLoading] = useState(() => !liveTvCache);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (liveTvCache?.categories?.length) {
      setCategories(liveTvCache.categories);
      setCategoryChannels(liveTvCache.categoryChannels);
      setAllChannels(liveTvCache.allChannels || []);
      setError(null);
      setLoading(false);
      
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        // Don't auto-focus content here, let TVChannelGrid handle initial focus
      }
      return undefined;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const cats = await fetchChannelFilterSections();
        const sortedCats = sortLiveTVCategories(Array.isArray(cats) && cats.length ? cats : ['Todos']);
        setCategories(sortedCats);

        const channelPromises = sortedCats.map((cat) => (
          fetchUserChannels(cat)
            .then((channels) => ({ category: cat, channels: channels || [] }))
            .catch(() => ({ category: cat, channels: [] }))
        ));

        const results = await Promise.all(channelPromises);
        const channelsMap = {};
        const flattened = [];
        const seenIds = new Set();

        results.forEach(({ category, channels }) => {
          channelsMap[category] = channels;
          channels.forEach(ch => {
            const id = ch._id || ch.id;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              flattened.push(ch);
            }
          });
        });

        liveTvCache = {
          categories: sortedCats,
          categoryChannels: channelsMap,
          allChannels: flattened
        };
        setCategoryChannels(channelsMap);
        setAllChannels(flattened);
        setError(null);
      } catch (err) {
        console.error('TVLiveTV: Error loading data:', err);
        setError(err.message || 'Error cargando canales');
      } finally {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const restoredCategory = location.state?.selectedCategory;
    if (!restoredCategory || !categories.length) {
      return;
    }

    const restoredIndex = categories.findIndex((category) => category === restoredCategory);
    if (restoredIndex >= 0) {
      setSelectedCategoryIndex(restoredIndex);
    }
  }, [categories, location.state?.selectedCategory]);

  useEffect(() => {
    const nextIndex = Number.isInteger(location.state?.selectedChannelIndex)
      ? Math.max(0, location.state.selectedChannelIndex)
      : 0;
    setSelectedChannelIndex(nextIndex);
  }, [location.state?.selectedChannelIndex]);

  useEffect(() => {
    const handleOpenSearch = (event) => {
      if (event.detail?.scope === 'global') {
        return;
      }
      setShowSearch(true);
    };

    window.addEventListener(TV_OPEN_SEARCH_EVENT, handleOpenSearch);
    return () => window.removeEventListener(TV_OPEN_SEARCH_EVENT, handleOpenSearch);
  }, []);

  const currentCategory = categories[selectedCategoryIndex];
  const currentChannels = categoryChannels[currentCategory] || [];
  
  const handleChannelSelect = useCallback((channel, index) => {
    const channelId = channel.id || channel._id;
    const finalIndex = index !== undefined ? index : selectedChannelIndex;
    navigate(`/watch/channel/${channelId}`, {
      state: {
        from: '/live-tv',
        returnState: {
          selectedCategory: currentCategory,
          selectedChannelIndex: finalIndex,
        },
        isChannel: true,
        channelName: channel.name,
        fromSection: 'tv',
      },
    });
  }, [currentCategory, navigate, selectedChannelIndex]);

  const handleCategoryChange = useCallback((direction) => {
    if (direction === 'prev') {
      setSelectedCategoryIndex((prev) => Math.max(0, prev - 1));
    } else {
      setSelectedCategoryIndex((prev) => Math.min(categories.length - 1, prev + 1));
    }
    setSelectedChannelIndex(0);
  }, [categories.length]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050816',
        color: '#fff',
        fontSize: '32px',
      }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(0, 255, 255, 0.2)',
            borderTop: '4px solid #00ffff',
            borderRadius: '50%',
            animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
            margin: '0 auto 24px',
          }}
          />
          <p style={{ fontWeight: '800', letterSpacing: '0.05em' }}>Cargando Canales...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050816',
        color: '#fff',
        padding: '40px',
        textAlign: 'center',
      }}
      >
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>⚠️</div>
        <h1 style={{ fontSize: '42px', fontWeight: '900', marginBottom: '16px' }}>Error de Conexión</h1>
        <p style={{ fontSize: '22px', color: '#cbd5e1', maxWidth: '600px' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '40px',
            padding: '14px 32px',
            borderRadius: '999px',
            background: '#00ffff',
            color: '#000',
            border: 'none',
            fontSize: '20px',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={allChannels.map((channel) => ({
            ...channel,
            type: 'channel',
          }))}
          title="Buscar en todos los canales"
          placeholder="Escribe el nombre del canal..."
          onSelectItem={(channel) => {
            setShowSearch(false);
            handleChannelSelect(channel);
          }}
          onClose={() => {
            setShowSearch(false);
          }}
        />
      ) : null}

      <TVChannelGrid
        categories={categories}
        currentCategoryIndex={selectedCategoryIndex}
        onCategoryChange={handleCategoryChange}
        channels={currentChannels}
        onChannelSelect={handleChannelSelect}
        onSearch={() => setShowSearch(true)}
        initialChannelIndex={selectedChannelIndex}
        onActiveChannelIndexChange={setSelectedChannelIndex}
      />
    </>
  );
}
