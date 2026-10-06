import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TVGrid from '../components/TVGrid.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { fetchHalloweenVideos, getCollections } from '../utils/api.js';
import { focusTVContent } from '../utils/tvFocusZone.js';
import { getTVItemId, resolveTVItemType, unwrapTVItems } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { addItemToMyList } from '../utils/myListUtils.js';

let halloweenItemsCache = null;

const getId = (item) => getTVItemId(item) || item?._id || item?.id;

function dedupe(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    if (!item) return false;
    const key = getId(item) || `${item?.tipo}-${item?.title || item?.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function TVHalloweenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState(() => halloweenItemsCache || []);
  const [loading, setLoading] = useState(() => !halloweenItemsCache);
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
    if (halloweenItemsCache?.length) {
      setItems(halloweenItemsCache);
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
        const [exclusiveRes, collectionsRes] = await Promise.allSettled([
          fetchHalloweenVideos(1, 400),
          getCollections(),
        ]);

        const exclusiveItems = exclusiveRes.status === 'fulfilled'
          ? unwrapTVItems(exclusiveRes.value)
          : [];

        let curatedItems = [];
        let kidsItems = [];
        if (collectionsRes.status === 'fulfilled') {
          const all = Array.isArray(collectionsRes.value)
            ? collectionsRes.value
            : [];
          const wheel = all.find((c) => /halloween/i.test(c?.name || '') && !/kids/i.test(c?.name || ''));
          curatedItems = dedupe(unwrapTVItems(wheel?.items || []));
          const kidsWheel = all.find((c) => /halloween/i.test(c?.name || '') && /kids/i.test(c?.name || ''));
          kidsItems = dedupe(unwrapTVItems(kidsWheel?.items || []));
        }

        const nextItems = dedupe([
          ...exclusiveItems,
          ...curatedItems,
          ...kidsItems,
        ]);

        if (!cancelled) {
          halloweenItemsCache = nextItems;
          setItems(nextItems);
          focusTVContent();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudo cargar Especial Halloween.');
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
    if (loading) return 'Invocando espíritus...';
    if (error) return error;
    return `${items.length} títulos embrujados listos para maratonear`;
  }, [error, items.length, loading]);

  const handleSelectItem = (item) => {
    const itemId = getTVItemId(item);
    if (!itemId) return;

    const itemType = resolveTVItemType(item, item?.tipo || item?.itemType || 'movie');
    navigate(`/watch/${itemType}/${itemId}`, {
      state: {
        from: '/halloween',
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
      <div className="flex min-h-screen items-center justify-center text-white" style={{ background: 'radial-gradient(circle at 50% 20%, #2a0a3b 0%, #0b0614 60%, #000 100%)' }}>
        <div className="text-center">
          <div className="mb-6 text-7xl">🎃</div>
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-400" />
          <p className="text-2xl font-extrabold text-orange-300">Especial Halloween</p>
          <p className="mt-3 text-base text-purple-200">Invocando espíritus...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={items}
          title="Buscar en Halloween"
          placeholder="Buscar pelis y series de terror..."
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      <TVGrid
        items={items}
        title="🎃 Especial Halloween"
        subtitle={subtitle}
        onSelectItem={handleSelectItem}
        onAddToMyList={handleAddToMyList}
        columns={5}
        initialIndex={selectedIndex}
        onActiveIndexChange={setSelectedIndex}
        onSearch={() => setShowSearch(true)}
        variant="halloween"
        statusMessage={statusMessage}
      />
    </>
  );
}
