import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TVFilteredGridPage from '../components/TVFilteredGridPage.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { fetchUserMovies } from '../utils/api.js';
import { focusTVContent } from '../utils/tvFocusZone.js';
import { getTVItemId, resolveTVItemType, unwrapTVItems } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { addItemToMyList } from '../utils/myListUtils.js';
import { getAccessLockState } from '../utils/planAccess.js';

const SUBCATEGORIES = [
  'TODOS',
  'Cine 2026',
  'Cine 2025',
  'Cine 4K',
  'Cine 60 FPS',
  'Acción',
  'Comedia',
  'Terror',
  'Romance',
  'Drama',
  'Ciencia Ficción',
  'Animación',
  'Aventura',
  'Documental',
  'Otros',
];

const SUBCATEGORY_SECTION_MAP = {
  'cine 2026': 'CINE_2026',
  'cine 2025': 'CINE_2025',
  'cine 4k': 'CINE_4K',
  'cine 60 fps': 'CINE_60FPS',
};

const GENRE_ALIASES = {
  accion: ['accion', 'action', 'accion aventura', 'accion-crimen', 'accion crimen'],
  comedia: ['comedia', 'comedy', 'humor'],
  terror: ['terror', 'horror', 'miedo', 'fear'],
  romance: ['romance', 'romantica', 'romantico', 'romantic'],
  drama: ['drama'],
  cienciaficcion: ['ciencia ficcion', 'ciencia-ficcion', 'sci fi', 'scifi', 'science fiction', 'cienciaficcion'],
  animacion: ['animacion', 'animada', 'animated', 'animation', 'cartoon'],
  aventura: ['aventura', 'adventure'],
  documental: ['documental', 'documentary'],
};

function normalizeSubcategoryLabel(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGenreTokens(value) {
  return normalizeSubcategoryLabel(value)
    .split(/[,/|;-]/g)
    .map((token) => normalizeSubcategoryLabel(token))
    .filter(Boolean);
}

function matchesAlias(token, alias) {
  if (!token || !alias) return false;
  if (token === alias) return true;
  if (alias.length >= 5 && token.includes(alias)) return true;
  const aliasParts = alias.split(' ').filter(Boolean);
  if (aliasParts.length > 1 && aliasParts.every((part) => token.includes(part))) {
    return true;
  }
  return false;
}

function resolveBaseGenresFromTokens(tokens) {
  const resolved = new Set();
  tokens.forEach((token) => {
    const hit = Object.entries(GENRE_ALIASES).find(([, aliasList]) => (
      aliasList.some((alias) => matchesAlias(token, alias))
    ));
    if (hit) {
      resolved.add(hit[0]);
    } else if (token) {
      resolved.add('otros');
    }
  });
  return resolved;
}

function resolveBaseGenresForItem(item) {
  const tokens = [];
  if (Array.isArray(item?.genres)) {
    item.genres.forEach((genre) => tokens.push(...extractGenreTokens(genre)));
  } else if (item?.genre) {
    tokens.push(...extractGenreTokens(item.genre));
  }
  return resolveBaseGenresFromTokens(tokens);
}

let allMoviesCache = null;
let allMoviesLoadPromise = null;
const movieItemsCache = new Map();

async function loadAllMovieItems() {
  if (Array.isArray(allMoviesCache) && allMoviesCache.length > 0) {
    return allMoviesCache;
  }

  if (allMoviesLoadPromise) {
    return allMoviesLoadPromise;
  }

  allMoviesLoadPromise = fetchUserMovies(1, 1000, null, 'Todas')
    .then((response) => {
      const items = (Array.isArray(response?.videos) ? response.videos : [])
        .filter(item => resolveTVItemType(item, 'movie') === 'movie');
      allMoviesCache = items;
      return items;
    })
    .finally(() => {
      allMoviesLoadPromise = null;
    });

  return allMoviesLoadPromise;
}

async function loadMovieItemsForSubcategory(subcategory) {
  const normalized = normalizeSubcategoryLabel(subcategory);
  if (!normalized || normalized === 'todos') {
    return loadAllMovieItems();
  }

  const sectionKey = SUBCATEGORY_SECTION_MAP[normalized];
  if (sectionKey) {
    try {
      const response = await fetchUserMovies(1, 500, sectionKey, 'Todas');
      const exactItems = (Array.isArray(response?.videos) ? response.videos : [])
        .filter(item => resolveTVItemType(item, 'movie') === 'movie');
      if (exactItems.length > 0) {
        return exactItems;
      }
    } catch (error) {
      console.warn(`[TVMoviesPage] Fallback local para seccion "${sectionKey}":`, error?.message || error);
    }
  }

  const allItems = await loadAllMovieItems();

  if (sectionKey) {
    return allItems.filter(item => {
      const itemSection = String(item?.mainSection || item?.section || item?.categoryKey || '')
        .trim().toUpperCase().replace(/-/g, '_');
      return itemSection === sectionKey;
    });
  }

  // Filter by genre
  const genreKey = normalized.replace(/\s/g, '');
  return allItems.filter(item => {
    const baseGenres = resolveBaseGenresForItem(item);
    return baseGenres.has(genreKey);
  });
}

export default function TVMoviesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [items, setItems] = useState(() => {
    const restoredSubcategory = location.state?.selectedSubcategory;
    const initialSubcategory = SUBCATEGORIES.includes(restoredSubcategory) ? restoredSubcategory : 'TODOS';
    if (movieItemsCache.has(initialSubcategory)) {
      return movieItemsCache.get(initialSubcategory);
    }
    if (Array.isArray(allMoviesCache) && allMoviesCache.length > 0) {
      const nextItems = initialSubcategory === 'TODOS'
        ? allMoviesCache
        : allMoviesCache.filter((item) => {
            const normalized = normalizeSubcategoryLabel(initialSubcategory);
            const sectionKey = SUBCATEGORY_SECTION_MAP[normalized];
            if (sectionKey) {
              const itemSection = String(item?.mainSection || item?.section || item?.categoryKey || '')
                .trim().toUpperCase().replace(/-/g, '_');
              return itemSection === sectionKey;
            }
            const genreKey = normalized.replace(/\s/g, '');
            const baseGenres = resolveBaseGenresForItem(item);
            return baseGenres.has(genreKey);
          });
      movieItemsCache.set(initialSubcategory, nextItems);
      return nextItems;
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    return !movieItemsCache.has(location.state?.selectedSubcategory || 'TODOS')
      && !(Array.isArray(allMoviesCache) && allMoviesCache.length > 0);
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
    if (movieItemsCache.has(selectedSubcategory)) {
      setItems(movieItemsCache.get(selectedSubcategory));
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
        const nextItems = await loadMovieItemsForSubcategory(selectedSubcategory);
        if (!cancelled) {
          movieItemsCache.set(selectedSubcategory, nextItems);
          setItems(nextItems);
          focusTVContent();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudieron cargar las películas.');
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
    if (loading) return 'Cargando películas...';
    if (error) return error;
    return `${items.length} películas disponibles`;
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

    navigate(`/watch/movie/${itemId}`, {
      state: {
        from: '/peliculas',
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
          <p className="text-2xl font-semibold">Películas</p>
          <p className="mt-3 text-base text-slate-400">Preparando subcategorías...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={items}
          title={`Buscar películas en ${selectedSubcategory}`}
          placeholder={`Buscar dentro de ${selectedSubcategory}...`}
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      <TVFilteredGridPage
        title="Películas"
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
        emptyMessage={`No hay películas disponibles en ${selectedSubcategory}.`}
        statusMessage={statusMessage}
      />
    </>
  );
}
