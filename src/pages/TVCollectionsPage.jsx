import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TVFilteredGridPage from '../components/TVFilteredGridPage.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { getCollections } from '../utils/api.js';
import { focusTVContent } from '../utils/tvFocusZone.js';
import { getTVItemId, resolveTVItemType } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { addItemToMyList } from '../utils/myListUtils.js';

export default function TVCollectionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getCollections();
        if (!cancelled) {
          setCollections(Array.isArray(response) ? response : []);
          focusTVContent();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudieron cargar las colecciones.');
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

  const filters = useMemo(() => {
    const names = collections
      .map((collection) => collection?.name)
      .filter(Boolean);
    return ['TODAS', ...Array.from(new Set(names))];
  }, [collections]);

  const selectedCollection = filters[selectedFilterIndex] || 'TODAS';

  useEffect(() => {
    const restoredCollection = location.state?.selectedCollection;
    const restoredFilterIndex = filters.findIndex((item) => item === restoredCollection);
    if (restoredFilterIndex >= 0) {
      setSelectedFilterIndex(restoredFilterIndex);
      return;
    }
    setSelectedFilterIndex(0);
  }, [filters, location.state?.selectedCollection]);

  useEffect(() => {
    const nextIndex = Number.isInteger(location.state?.selectedIndex)
      ? Math.max(0, location.state.selectedIndex)
      : 0;
    setSelectedIndex(nextIndex);
  }, [location.state?.selectedIndex]);

  const items = useMemo(() => {
    const seen = new Set();

    const selectedItems = selectedCollection === 'TODAS'
      ? collections.flatMap((collection) => collection?.items || [])
      : (collections.find((collection) => collection?.name === selectedCollection)?.items || []);

    return selectedItems.filter((item) => {
      const itemId = getTVItemId(item);
      if (!itemId || seen.has(itemId)) {
        return false;
      }
      seen.add(itemId);
      return true;
    });
  }, [collections, selectedCollection]);

  const subtitle = useMemo(() => {
    if (loading) return 'Cargando colecciones...';
    if (error) return error;
    return `${items.length} elementos disponibles`;
  }, [error, items.length, loading]);

  const handleFilterIndexChange = (nextIndex) => {
    if (nextIndex === selectedFilterIndex) return;
    setSelectedFilterIndex(nextIndex);
    setSelectedIndex(0);
  };

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

  const handleSelectItem = (item) => {
    const itemId = getTVItemId(item);
    if (!itemId) return;

    const itemType = resolveTVItemType(item, item?.tipo || item?.itemType || 'movie');
    navigate(`/watch/${itemType}/${itemId}`, {
      state: {
        from: '/colecciones',
        returnState: {
          selectedCollection,
          selectedIndex,
        },
      },
    });
  };

  if (loading && !collections.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <p className="text-2xl font-semibold">Colecciones</p>
          <p className="mt-3 text-base text-slate-400">Preparando tus colecciones...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={items}
          title={`Buscar en ${selectedCollection === 'TODAS' ? 'Colecciones' : selectedCollection}`}
          placeholder="Buscar dentro de esta coleccion..."
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      <TVFilteredGridPage
        title="Colecciones"
        subtitle={subtitle}
        filters={filters}
        selectedFilterIndex={selectedFilterIndex}
        onFilterIndexChange={handleFilterIndexChange}
        items={items}
        onSelectItem={handleSelectItem}
        onAddToMyList={handleAddToMyList}
        columns={5}
        initialIndex={selectedIndex}
        onActiveIndexChange={setSelectedIndex}
        onSearch={() => setShowSearch(true)}
        emptyMessage={`No hay contenido disponible en ${selectedCollection}.`}
        statusMessage={statusMessage}
      />
    </>
  );
}
