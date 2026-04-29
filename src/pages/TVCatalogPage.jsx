import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TVGrid from '../components/TVGrid.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { fetchUserMovies, fetchVideosByType } from '../utils/api.js';
import { focusTVContent } from '../utils/tvFocusZone.js';
import { getTVItemId, resolveTVItemType, unwrapTVItems } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { addItemToMyList } from '../utils/myListUtils.js';

const catalogItemsCache = new Map();

async function loadCatalogItems(contentType, limit) {
  if (contentType === 'movie') {
    return unwrapTVItems(await fetchUserMovies(1, limit));
  }

  return unwrapTVItems(await fetchVideosByType(contentType, 1, limit));
}

export default function TVCatalogPage({
  title,
  contentType,
  fallbackWatchType,
  emptyMessage,
  columns = 5,
  limit = 400,
  variant = 'default',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const cacheKey = `${contentType}:${limit}`;
  const [items, setItems] = useState(() => catalogItemsCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(() => !catalogItemsCache.has(cacheKey));
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (catalogItemsCache.has(cacheKey)) {
      setItems(catalogItemsCache.get(cacheKey));
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
        const data = await loadCatalogItems(contentType, limit);
        if (!cancelled) {
          catalogItemsCache.set(cacheKey, data);
          setItems(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || `No se pudo cargar ${title.toLowerCase()}.`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          focusTVContent();
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, contentType, limit, title]);

  const selectedSubtitle = useMemo(() => {
    if (loading) return 'Cargando catalogo...';
    if (error) return error;
    return `${items.length} elementos disponibles`;
  }, [error, items.length, loading]);

  const handleSelectItem = (item) => {
    const itemId = getTVItemId(item);
    if (!itemId) return;

    const itemType = resolveTVItemType(item, fallbackWatchType || contentType);
    navigate(`/watch/${itemType}/${itemId}`, {
      state: {
        from: location.pathname,
        returnState: {
          selectedIndex,
        },
      },
    });
  };

  useEffect(() => {
    const nextIndex = Number.isInteger(location.state?.selectedIndex)
      ? Math.max(0, location.state.selectedIndex)
      : 0;
    setSelectedIndex(nextIndex);
  }, [location.state?.selectedIndex]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <p className="text-2xl font-semibold">{title}</p>
          <p className="mt-3 text-base text-slate-400">Preparando el catalogo para TV...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-8 text-center text-white">
        <div className="max-w-3xl rounded-3xl border border-red-500/30 bg-red-950/20 px-10 py-12 shadow-[0_0_50px_rgba(248,113,113,0.15)]">
          <h1 className="text-4xl font-black">Error de catalogo</h1>
          <p className="mt-5 text-xl text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-8 text-center text-white">
        <div className="max-w-3xl rounded-3xl border border-cyan-500/20 bg-slate-900/70 px-10 py-12 shadow-[0_0_50px_rgba(34,211,238,0.12)]">
          <h1 className="text-4xl font-black">{title}</h1>
          <p className="mt-5 text-xl text-slate-300">
            {emptyMessage || 'No hay contenido disponible en esta categoria por ahora.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={items}
          title={`Buscar en ${title}`}
          placeholder={`Buscar en ${title}...`}
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      <TVGrid
        items={items}
        title={title}
        subtitle={selectedSubtitle}
        onSelectItem={handleSelectItem}
        onAddToMyList={handleAddToMyList}
        columns={columns}
        initialIndex={selectedIndex}
        onActiveIndexChange={setSelectedIndex}
        onSearch={() => setShowSearch(true)}
        variant={variant}
        statusMessage={statusMessage}
      />
    </>
  );
}
