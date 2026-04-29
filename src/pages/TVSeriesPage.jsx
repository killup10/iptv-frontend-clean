import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TVFilteredGridPage from '../components/TVFilteredGridPage.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { fetchUserSeries, fetchVideosByType } from '../utils/api.js';
import { focusTVContent } from '../utils/tvFocusZone.js';
import { getTVItemId, resolveTVItemType, unwrapTVItems } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { addItemToMyList } from '../utils/myListUtils.js';
import { getCachedTVSeriesItems, setCachedTVSeriesItems } from '../utils/tvBrowseCache.js';

const SUBCATEGORIES = [
  'TODOS',
  'Netflix',
  'Prime Video',
  'Disney',
  'Apple TV',
  'HBO Max',
  'Hulu y Otros',
  'Retro',
  'Animadas',
];

const seriesItemsCache = new Map();
let allSeriesItemsCache = getCachedTVSeriesItems();
let allSeriesLoadPromise = null;

const SUBCATEGORY_ALIASES = {
  netflix: ['netflix', 'netflix series', 'series netflix', 'netflix originals'],
  'prime video': ['prime video', 'primevideo', 'amazon prime', 'amazon prime video'],
  disney: ['disney', 'disney plus', 'disney+', 'disney series'],
  'apple tv': ['apple tv', 'apple tv+', 'apple tv plus', 'appletv'],
  'hbo max': ['hbo max', 'hbomax', 'max originals'],
  'hulu y otros': ['hulu', 'paramount', 'paramount+', 'peacock', 'starz', 'showtime', 'amc', 'fx', 'syfy'],
  retro: ['retro', 'clasico', 'clasicos', 'classic', 'vintage'],
  animadas: ['animada', 'animadas', 'animated', 'animation', 'cartoon'],
};

function normalizeSeriesValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[+]/g, ' plus ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandSeriesTokens(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => expandSeriesTokens(entry));
  }

  const normalized = normalizeSeriesValue(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[,/|;-]/g)
    .map((token) => normalizeSeriesValue(token))
    .filter(Boolean);
}

function collectSeriesCategoryTokens(item) {
  const rawValues = [
    item?.subcategoria,
    item?.subCategory,
    item?.platform,
    item?.provider,
    item?.network,
    item?.studio,
    item?.collection,
  ];

  return Array.from(new Set(rawValues.flatMap((value) => expandSeriesTokens(value))));
}

function tokenMatchesAlias(token, alias) {
  if (!token || !alias) {
    return false;
  }

  if (token === alias) {
    return true;
  }

  const aliasParts = alias.split(' ').filter(Boolean);
  if (aliasParts.length > 1 && aliasParts.every((part) => token.includes(part))) {
    return true;
  }

  if (alias.length >= 5 && token.includes(alias)) {
    return true;
  }

  return false;
}

function isRealSeriesItem(item) {
  return resolveTVItemType(item, 'serie') === 'serie';
}

function sanitizeSeriesItems(items) {
  return Array.isArray(items) ? items.filter(isRealSeriesItem) : [];
}

function matchesSeriesSubcategory(item, subcategory) {
  if (!isRealSeriesItem(item)) {
    return false;
  }

  const normalizedSubcategory = normalizeSeriesValue(subcategory);
  if (!normalizedSubcategory || normalizedSubcategory === 'todos') {
    return true;
  }

  const aliases = Array.from(new Set([
    normalizedSubcategory,
    ...(SUBCATEGORY_ALIASES[normalizedSubcategory] || []),
  ]));
  const tokens = collectSeriesCategoryTokens(item);

  return aliases.some((alias) => tokens.some((token) => tokenMatchesAlias(token, alias)));
}

async function loadSeriesItemsForSubcategory(subcategory) {
  if (!subcategory || subcategory === 'TODOS') {
    return loadAllSeriesItems();
  }

  try {
    const response = await fetchUserSeries(1, 500, subcategory);
    const exactItems = sanitizeSeriesItems(unwrapTVItems(response));
    if (exactItems.length > 0) {
      return exactItems;
    }
  } catch (error) {
    console.warn(`[TVSeriesPage] Fallback local para subcategoria "${subcategory}":`, error?.message || error);
  }

  const allItems = await loadAllSeriesItems();
  return allItems.filter((item) => matchesSeriesSubcategory(item, subcategory));
}

async function loadAllSeriesItems() {
  const latestCachedItems = sanitizeSeriesItems(getCachedTVSeriesItems());
  if (Array.isArray(latestCachedItems) && latestCachedItems.length > 0) {
    allSeriesItemsCache = latestCachedItems;
    return latestCachedItems;
  }

  if (Array.isArray(allSeriesItemsCache) && allSeriesItemsCache.length > 0) {
    allSeriesItemsCache = sanitizeSeriesItems(allSeriesItemsCache);
    return allSeriesItemsCache;
  }

  if (allSeriesLoadPromise) {
    return allSeriesLoadPromise;
  }

  allSeriesLoadPromise = fetchVideosByType('serie', 1, 500)
    .then((response) => {
      const items = unwrapTVItems(response).filter(isRealSeriesItem);
      allSeriesItemsCache = items;
      setCachedTVSeriesItems(items);
      return items;
    })
    .finally(() => {
      allSeriesLoadPromise = null;
    });

  return allSeriesLoadPromise;
}

export default function TVSeriesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState(() => {
    const latestCachedItems = sanitizeSeriesItems(getCachedTVSeriesItems());
    if (Array.isArray(latestCachedItems) && latestCachedItems.length > 0) {
      allSeriesItemsCache = latestCachedItems;
    }
    const restoredSubcategory = location.state?.selectedSubcategory;
    const initialSubcategory = SUBCATEGORIES.includes(restoredSubcategory) ? restoredSubcategory : 'TODOS';
    if (seriesItemsCache.has(initialSubcategory)) {
      return seriesItemsCache.get(initialSubcategory);
    }
    if (Array.isArray(allSeriesItemsCache) && allSeriesItemsCache.length > 0) {
      const nextItems = initialSubcategory === 'TODOS'
        ? allSeriesItemsCache
        : allSeriesItemsCache.filter((item) => matchesSeriesSubcategory(item, initialSubcategory));
      seriesItemsCache.set(initialSubcategory, nextItems);
      return nextItems;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    const latestCachedItems = sanitizeSeriesItems(getCachedTVSeriesItems());
    if (Array.isArray(latestCachedItems) && latestCachedItems.length > 0) {
      allSeriesItemsCache = latestCachedItems;
    }

    return !seriesItemsCache.has(location.state?.selectedSubcategory || 'TODOS')
      && !(Array.isArray(allSeriesItemsCache) && allSeriesItemsCache.length > 0);
  });
  const [error, setError] = useState('');
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const selectedSubcategory = SUBCATEGORIES[selectedFilterIndex] || 'TODOS';

  useEffect(() => {
    const restoredSubcategory = location.state?.selectedSubcategory;
    const restoredFilterIndex = SUBCATEGORIES.findIndex((item) => item === restoredSubcategory);
    setSelectedFilterIndex(restoredFilterIndex >= 0 ? restoredFilterIndex : 0);
  }, [location.state?.selectedSubcategory]);

  useEffect(() => {
    const nextIndex = Number.isInteger(location.state?.selectedIndex)
      ? Math.max(0, location.state.selectedIndex)
      : 0;
    setSelectedIndex(nextIndex);
  }, [location.state?.selectedIndex]);

  useEffect(() => {
    if (seriesItemsCache.has(selectedSubcategory)) {
      setItems(seriesItemsCache.get(selectedSubcategory));
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
        const nextItems = await loadSeriesItemsForSubcategory(selectedSubcategory);
        if (!cancelled) {
          seriesItemsCache.set(selectedSubcategory, nextItems);
          setItems(nextItems);
          focusTVContent();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudieron cargar las series.');
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
  }, [selectedSubcategory]);

  const subtitle = useMemo(() => {
    if (loading) return 'Cargando series...';
    if (error) return error;
    return `${items.length} series disponibles`;
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

    navigate(`/watch/serie/${itemId}`, {
      state: {
        from: '/series',
        returnState: {
          selectedSubcategory,
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
          <p className="text-2xl font-semibold">Series</p>
          <p className="mt-3 text-base text-slate-400">Preparando subcategorias...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={items}
          title={`Buscar series en ${selectedSubcategory}`}
          placeholder={`Buscar dentro de ${selectedSubcategory}...`}
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      <TVFilteredGridPage
        title="Series"
        subtitle={subtitle}
        filters={SUBCATEGORIES}
        selectedFilterIndex={selectedFilterIndex}
        onFilterIndexChange={handleFilterIndexChange}
        items={items}
        onSelectItem={handleSelectItem}
        onAddToMyList={handleAddToMyList}
        columns={5}
        initialIndex={selectedIndex}
        onActiveIndexChange={setSelectedIndex}
        onSearch={() => setShowSearch(true)}
        emptyMessage={`No hay series disponibles en ${selectedSubcategory}.`}
        statusMessage={statusMessage}
      />
    </>
  );
}
