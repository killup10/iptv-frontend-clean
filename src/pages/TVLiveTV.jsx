import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchUserChannels, fetchChannelFilterSections } from '../utils/api.js';
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
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [loading, setLoading] = useState(() => !liveTvCache);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (liveTvCache?.categories?.length) {
      setCategories(liveTvCache.categories);
      setCategoryChannels(liveTvCache.categoryChannels);
      setError(null);
      setLoading(false);
      focusTVContent();
      return undefined;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const cats = await fetchChannelFilterSections();
        const filteredCats = Array.isArray(cats) && cats.length ? cats : ['Todos'];
        setCategories(filteredCats);

        const channelPromises = filteredCats.map((cat) => (
          fetchUserChannels(cat)
            .then((channels) => ({ category: cat, channels: channels || [] }))
            .catch(() => ({ category: cat, channels: [] }))
        ));

        const results = await Promise.all(channelPromises);
        const channelsMap = {};

        results.forEach(({ category, channels }) => {
          channelsMap[category] = channels;
        });

        liveTvCache = {
          categories: filteredCats,
          categoryChannels: channelsMap,
        };
        setCategoryChannels(channelsMap);
        setError(null);
        focusTVContent();
      } catch (err) {
        console.error('TVLiveTV: Error loading data:', err);
        setError(err.message || 'Error cargando canales');
      } finally {
        setLoading(false);
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
    if (!loading && !showSearch) {
      focusTVContent();
    }
  }, [loading, showSearch, selectedCategoryIndex]);

  const currentCategory = categories[selectedCategoryIndex];
  const currentChannels = categoryChannels[currentCategory] || [];
  const handleChannelSelect = useCallback((channel) => {
    const channelId = channel.id || channel._id;
    navigate(`/watch/channel/${channelId}`, {
      replace: true,
      state: {
        from: '/live-tv',
        returnState: {
          selectedCategory: currentCategory,
          selectedChannelIndex,
        },
        isChannel: true,
        channelName: channel.name,
        fromSection: 'tv',
        selectedCategory: currentCategory,
      },
    });
  }, [currentCategory, navigate, selectedChannelIndex]);

  const handleCategoryChange = useCallback((direction) => {
    if (direction === 'prev') {
      setSelectedCategoryIndex((prev) => Math.max(0, prev - 1));
    } else {
      setSelectedCategoryIndex((prev) => Math.min(categories.length - 1, prev + 1));
    }
  }, [categories.length]);

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

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a2e',
        color: '#fff',
        fontSize: '32px',
      }}
      >
        Cargando TV en Vivo...
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
        backgroundColor: '#1a1a2e',
        color: '#fff',
        padding: '20px',
        textAlign: 'center',
      }}
      >
        <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>Error</h1>
        <p style={{ fontSize: '20px', color: '#ff8e72' }}>{error}</p>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={currentChannels.map((channel) => ({
            ...channel,
            type: 'channel',
          }))}
          title={`Buscar canales en ${currentCategory || 'TV en Vivo'}`}
          placeholder="Buscar dentro de esta categoria..."
          onSelectItem={(channel) => {
            setShowSearch(false);
            handleChannelSelect(channel);
          }}
          onClose={() => {
            setShowSearch(false);
            focusTVContent();
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
