import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAndroidTV } from '../utils/platformUtils.js';
import { fetchUserChannels, fetchChannelFilterSections } from '../utils/api.js';
import { normalizeSearchText } from '../utils/searchUtils.js';
import TVChannelGrid from '../components/TVChannelGrid.jsx';

/**
 * TVLiveTV - Versión optimizada de LiveTV para Android TV
 * - Carga categorías y canales en paralelo
 * - Navegación 2D optimizada
 * - Renderizado eficiente
 */
export default function TVLiveTV() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryChannels, setCategoryChannels] = useState({}); // { 'category': [channels] }
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar categorías y canales en paralelo
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar categorías
        const cats = await fetchChannelFilterSections();
        const filteredCats = cats || ['Todos'];
        setCategories(filteredCats);

        // Cargar canales para TODAS las categorías en paralelo
        const channelPromises = filteredCats.map(cat => 
          fetchUserChannels(cat)
            .then(channels => ({ category: cat, channels: channels || [] }))
            .catch(err => ({ category: cat, channels: [] }))
        );

        const results = await Promise.all(channelPromises);
        const channelsMap = {};
        
        results.forEach(({ category, channels }) => {
          channelsMap[category] = channels;
        });

        setCategoryChannels(channelsMap);
        setError(null);
      } catch (err) {
        console.error('TVLiveTV: Error loading data:', err);
        setError(err.message || 'Error cargando canales');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const currentCategory = categories[selectedCategoryIndex];
  const currentChannels = categoryChannels[currentCategory] || [];

  const handleChannelSelect = useCallback((channel) => {
    const channelId = channel.id || channel._id;
    navigate(`/watch/${channelId}`, { 
      state: { 
        isChannel: true,
        channelName: channel.name 
      } 
    });
  }, [navigate]);

  const handleCategoryChange = useCallback((direction) => {
    if (direction === 'prev') {
      setSelectedCategoryIndex(prev => Math.max(0, prev - 1));
    } else {
      setSelectedCategoryIndex(prev => Math.min(categories.length - 1, prev + 1));
    }
  }, [categories.length]);

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
        fontSize: '32px'
      }}>
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
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>Error</h1>
        <p style={{ fontSize: '20px', color: '#ff8e72' }}>{error}</p>
      </div>
    );
  }

  return (
    <TVChannelGrid 
      categories={categories}
      currentCategoryIndex={selectedCategoryIndex}
      onCategoryChange={handleCategoryChange}
      channels={currentChannels}
      onChannelSelect={handleChannelSelect}
    />
  );
}
