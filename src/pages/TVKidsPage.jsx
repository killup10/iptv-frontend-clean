import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TVGrid from '../components/TVGrid.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { fetchVideosByType } from '../utils/api.js';
import { focusTVContent } from '../utils/tvFocusZone.js';
import { getTVItemId, resolveTVItemType, unwrapTVItems } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { addItemToMyList } from '../utils/myListUtils.js';

let kidsItemsCache = null;

export default function TVKidsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState(() => kidsItemsCache || []);
  const [loading, setLoading] = useState(() => !kidsItemsCache);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const nextIndex = Number.isInteger(location.state?.selectedIndex)
      ? Math.max(0, location.state.selectedIndex)
      : 0;
    setSelectedIndex(nextIndex);
  }, [location.state?.selectedIndex]);

  useEffect(() => {
    if (kidsItemsCache?.length) {
      setItems(kidsItemsCache);
      setLoading(false);
      setError('');
      focusTVContent();
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetchVideosByType('zona kids', 1, 400);
        if (!cancelled) {
          const nextItems = unwrapTVItems(response);
          kidsItemsCache = nextItems;
          setItems(nextItems);
          focusTVContent();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudo cargar Zona Kids.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const subtitle = useMemo(() => {
    if (loading) return 'Preparando aventura infantil...';
    if (error) return error;
    return `${items.length} titulos listos para los peques`;
  }, [error, items.length, loading]);

  const handleSelectItem = (item) => {
    const itemId = getTVItemId(item);
    if (!itemId) return;

    const itemType = resolveTVItemType(item, item?.tipo || item?.itemType || 'movie');
    navigate(`/watch/${itemType}/${itemId}`, {
      state: {
        from: '/kids',
        returnState: {
          selectedIndex,
        },
      },
    });
  };

  const handleAddToMyList = async (item) => {
    try {
      const result = await addItemToMyList(item);
      setStatusMessage(
        result.status === 'duplicate'
          ? `"${item.name || item.title || item.titulo}" ya estaba en Mi Lista.`
          : `"${item.name || item.title || item.titulo}" agregado a Mi Lista.`,
      );
    } catch (err) {
      setStatusMessage(err?.message || 'No se pudo agregar a Mi Lista.');
    }
  };

  if (loading && !items.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#27124b] text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-yellow-300/30 border-t-pink-300" />
          <p className="text-2xl font-semibold">Zona Kids</p>
          <p className="mt-3 text-base text-slate-200">Preparando colores y aventuras...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={items}
          title="Buscar en Zona Kids"
          placeholder="Buscar contenido infantil..."
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      <TVGrid
        items={items}
        title="Zona Kids"
        subtitle={subtitle}
        onSelectItem={handleSelectItem}
        onAddToMyList={handleAddToMyList}
        columns={5}
        initialIndex={selectedIndex}
        onActiveIndexChange={setSelectedIndex}
        onSearch={() => setShowSearch(true)}
        variant="kids"
        statusMessage={statusMessage}
      />
    </>
  );
}
