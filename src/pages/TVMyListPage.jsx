import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance.js';
import TVGrid from '../components/TVGrid.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { focusTVContent } from '../utils/tvFocusZone.js';
import { getTVItemId, resolveTVItemType } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { MY_LIST_UPDATED_EVENT } from '../utils/myListUtils.js';

export default function TVMyListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);

  const loadMyList = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setError('');

    try {
      const response = await axiosInstance.get('/api/users/my-list');
      setItems(response.data?.items || []);
      focusTVContent();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'No se pudo cargar Mi Lista.');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const nextIndex = Number.isInteger(location.state?.selectedIndex)
      ? Math.max(0, location.state.selectedIndex)
      : 0;
    setSelectedIndex(nextIndex);
  }, [location.state?.selectedIndex]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await loadMyList(true);
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [loadMyList]);

  useEffect(() => {
    const handleMyListUpdated = () => {
      loadMyList(false);
    };

    window.addEventListener(MY_LIST_UPDATED_EVENT, handleMyListUpdated);
    return () => window.removeEventListener(MY_LIST_UPDATED_EVENT, handleMyListUpdated);
  }, [loadMyList]);

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
    if (loading) return 'Cargando Mi Lista...';
    if (error) return error;
    return `${items.length} elementos guardados`;
  }, [error, items.length, loading]);

  const handleSelectItem = (item) => {
    const itemId = getTVItemId(item);
    if (!itemId) return;

    const itemType = resolveTVItemType(item, item?.tipo || item?.itemType || 'movie');
    navigate(`/watch/${itemType}/${itemId}`, {
      state: {
        from: '/mi-lista',
        returnState: {
          selectedIndex,
        },
      },
    });
  };

  if (loading && !items.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <p className="text-2xl font-semibold">Mi Lista</p>
          <p className="mt-3 text-base text-slate-400">Preparando tus guardados...</p>
        </div>
      </div>
    );
  }

  if (!loading && !error && items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-8 text-center text-white">
        <div className="max-w-3xl rounded-3xl border border-cyan-500/20 bg-slate-900/70 px-10 py-12 shadow-[0_0_50px_rgba(34,211,238,0.12)]">
          <h1 className="text-4xl font-black">Mi Lista</h1>
          <p className="mt-5 text-xl text-slate-300">
            Todavia no tienes elementos guardados.
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
          title="Buscar en Mi Lista"
          placeholder="Buscar dentro de Mi Lista..."
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      <TVGrid
        items={items}
        title="Mi Lista"
        subtitle={subtitle}
        onSelectItem={handleSelectItem}
        columns={5}
        initialIndex={selectedIndex}
        onActiveIndexChange={setSelectedIndex}
        onSearch={() => setShowSearch(true)}
      />
    </>
  );
}
