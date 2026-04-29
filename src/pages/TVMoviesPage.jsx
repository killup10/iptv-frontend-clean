import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TVGrid from '../components/TVGrid.jsx';
import TVFilteredGridPage from '../components/TVFilteredGridPage.jsx';
import TVSearch from '../components/TVSearch.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTVGrid } from '../hooks/useTVNavigation.js';
import { fetchMainMovieSections, fetchUserMovies } from '../utils/api.js';
import {
  focusTVContent,
  focusTVNav,
  getTVFocusZone,
  TV_FOCUS_ZONE_CONTENT,
} from '../utils/tvFocusZone.js';
import { getTVItemId, getTVItemImage, getTVItemTitle } from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';
import { addItemToMyList } from '../utils/myListUtils.js';
import { getAccessLockState } from '../utils/planAccess.js';
import './TVMoviesPage.css';

const HIDDEN_SECTION_KEYS = new Set(['CINE_2025']);
const SECTION_GRID_COLUMNS = 4;
const DEFAULT_GENRE = 'Todas';
const BASE_GENRES = [
  'Accion',
  'Comedia',
  'Terror',
  'Romance',
  'Drama',
  'Ciencia Ficcion',
  'Animacion',
  'Aventura',
  'Documental',
  'Otros',
];
const GENRE_ALIASES = {
  accion: ['accion', 'action', 'accion aventura', 'accion-crimen', 'accion crimen'],
  comedia: ['comedia', 'comedy', 'humor'],
  terror: ['terror', 'horror', 'miedo', 'fear'],
  romance: ['romance', 'romantica', 'romantico', 'romantic'],
  drama: ['drama'],
  cienciaficcion: ['ciencia ficcion', 'ciencia ficcion', 'sci fi', 'scifi', 'science fiction', 'cienciaficcion'],
  animacion: ['animacion', 'animada', 'animated', 'animation', 'cartoon'],
  aventura: ['aventura', 'adventure'],
  documental: ['documental', 'documentary'],
};

function normalizeGenreLabel(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[+]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGenreTokens(value) {
  return normalizeGenreLabel(value)
    .split(/[,/|;-]/g)
    .map((token) => normalizeGenreLabel(token))
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

let movieSectionsCache = null;
const movieSectionPreviewCache = new Map();
const movieItemsCache = new Map();
let movieGenreSourceCache = null;

function normalizeSectionKey(value) {
  return String(value || '').trim().toUpperCase().replace(/-/g, '_');
}

function isGenreSectionKey(sectionKey) {
  const normalized = normalizeSectionKey(sectionKey);
  return normalized === 'POR_GENERO' || normalized === 'POR_GENEROS';
}

function resolveMoviesSectionQuery(sectionKey) {
  if (isGenreSectionKey(sectionKey)) {
    return null;
  }

  return sectionKey;
}

function getUniqueGenresFromArray(items) {
  if (!Array.isArray(items) || !items.length) {
    return [DEFAULT_GENRE];
  }

  const resolved = resolveBaseGenresFromTokens(
    items.flatMap((item) => {
      if (Array.isArray(item?.genres)) {
        return item.genres.flatMap((genre) => extractGenreTokens(genre));
      }
      if (item?.genre) return extractGenreTokens(item.genre);
      return [];
    }),
  );

  const nextGenres = BASE_GENRES.filter((genre) => (
    resolved.has(normalizeGenreLabel(genre).replace(/\s/g, ''))
  ));

  return [DEFAULT_GENRE, ...nextGenres];
}

function getPlanLabel(section) {
  const normalized = String(section?.requiresPlan || '').toLowerCase();
  if (normalized === 'premium') return 'PREMIUM';
  if (normalized === 'cinefilo') return 'CINEFILO';
  return '';
}

function filterPreviewItems(items) {
  return (Array.isArray(items) ? items : []).filter((item) => getTVItemImage(item));
}

function TVMovieSectionsOverview({
  sections,
  previewsBySection,
  initialIndex,
  onOpenSection,
  onSearch,
}) {
  const { user } = useAuth();
  const { currentIndex, navigate } = useTVGrid(sections, SECTION_GRID_COLUMNS, initialIndex);
  const [rotationTick, setRotationTick] = useState(0);
  const [focusMode, setFocusMode] = useState('sections');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRotationTick((prev) => prev + 1);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    focusTVContent();
  }, []);

  useEffect(() => {
    const selectedElement = document.querySelector(`[data-movie-section-index="${currentIndex}"]`);
    selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
        return;
      }

      if (focusMode === 'search') {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            focusTVNav();
            break;
          case 'ArrowDown':
            event.preventDefault();
            setFocusMode('sections');
            break;
          case 'Enter':
          case ' ':
            event.preventDefault();
            onSearch?.();
            break;
          default:
            break;
        }
        return;
      }

      const currentRow = Math.floor(currentIndex / SECTION_GRID_COLUMNS);

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentRow === 0) {
            if (onSearch) {
              setFocusMode('search');
              return;
            }
            focusTVNav();
            return;
          }
          navigate('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusMode('sections');
          navigate('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setFocusMode('sections');
          navigate('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          setFocusMode('sections');
          navigate('right');
          break;
        case 'Enter':
          event.preventDefault();
          if (sections[currentIndex]) {
            onOpenSection(sections[currentIndex], currentIndex);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, focusMode, navigate, onOpenSection, onSearch, sections]);

  return (
    <div className="tv-movie-sections-page">
      <div className="tv-movie-sections-header">
        <div>
          <h1>Explorar Peliculas</h1>
          <p>Selecciona una subseccion para entrar al catalogo, como en la web.</p>
        </div>
        <div className="tv-movie-sections-actions">
          {onSearch ? (
            <button
              type="button"
              className={`tv-grid-search-btn ${focusMode === 'search' ? 'focused' : ''}`}
              onClick={onSearch}
              onFocus={() => setFocusMode('search')}
              aria-label="Buscar peliculas"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span>Buscar aqui</span>
            </button>
          ) : null}
          <div className="tv-movie-sections-meta">
            <span>{sections.length} subsecciones</span>
          </div>
        </div>
      </div>

      <div className="tv-movie-sections-grid">
        {sections.map((section, index) => {
          const previewItems = previewsBySection[section.key] || [];
          const currentPreview = previewItems.length
            ? previewItems[rotationTick % previewItems.length]
            : null;
          const isFocused = focusMode === 'sections' && index === currentIndex;
          const planLabel = getPlanLabel(section);
          const lockState = getAccessLockState({ ...section, mainSection: section.key }, user?.plan);

          return (
            <button
              key={section.key}
              type="button"
              data-movie-section-index={index}
              className={`tv-movie-section-card ${isFocused ? 'focused' : ''} ${lockState.locked ? 'is-locked' : ''}`}
              onClick={() => onOpenSection(section, index)}
              tabIndex={-1}
            >
              <div className="tv-movie-section-image-shell">
                {currentPreview ? (
                  <img
                    src={getTVItemImage(currentPreview)}
                    alt={getTVItemTitle(currentPreview)}
                    className={`tv-movie-section-image ${lockState.locked ? 'is-locked' : ''}`}
                  />
                ) : (
                  <div className="tv-movie-section-image placeholder" />
                )}
                <div className="tv-movie-section-overlay" />
                {lockState.locked ? (
                  <>
                    <div className="tv-movie-section-lock-badge">Bloqueado</div>
                    <div className="tv-movie-section-lock-copy">
                      <p>{lockState.lockMessage}</p>
                    </div>
                  </>
                ) : planLabel ? (
                  <div className="tv-movie-section-badge">{planLabel}</div>
                ) : null}
              </div>

              <div className="tv-movie-section-copy">
                <h2>{section.displayName || section.name || section.key}</h2>
                {currentPreview ? (
                  <p>{getTVItemTitle(currentPreview)}</p>
                ) : (
                  <p>Entrar a esta subseccion</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TVMoviesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sectionKey: sectionKeyParam } = useParams();
  const [sections, setSections] = useState(() => movieSectionsCache || []);
  const [sectionsLoading, setSectionsLoading] = useState(() => !movieSectionsCache);
  const [items, setItems] = useState([]);
  const [genreSourceItems, setGenreSourceItems] = useState(() => movieGenreSourceCache || []);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState(location.state?.selectedGenre || DEFAULT_GENRE);
  const [showSearch, setShowSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [overviewSearchItems, setOverviewSearchItems] = useState(() => movieGenreSourceCache || []);
  const [overviewSearchLoaded, setOverviewSearchLoaded] = useState(() => Boolean(movieGenreSourceCache?.length));

  const detailSectionKey = sectionKeyParam || location.state?.selectedMainSectionKey || null;
  const overviewInitialIndex = Number.isInteger(location.state?.selectedSectionIndex)
    ? Math.max(0, location.state.selectedSectionIndex)
    : 0;

  const selectedSection = useMemo(() => (
    sections.find((section) => normalizeSectionKey(section.key) === normalizeSectionKey(detailSectionKey))
  ), [detailSectionKey, sections]);

  const isDetailMode = Boolean(detailSectionKey);
  const isGenreSection = isGenreSectionKey(detailSectionKey);

  const previewMap = useMemo(() => {
    const nextMap = {};
    sections.forEach((section) => {
      nextMap[section.key] = movieSectionPreviewCache.get(section.key) || [];
    });
    return nextMap;
  }, [sections, sectionsLoading]);

  const genreOptions = useMemo(() => getUniqueGenresFromArray(genreSourceItems), [genreSourceItems]);

  const filteredGenreItems = useMemo(() => {
    if (!isGenreSection) {
      return items;
    }

    if (selectedGenre === DEFAULT_GENRE) {
      return genreSourceItems;
    }

    const selectedKey = normalizeGenreLabel(selectedGenre).replace(/\s/g, '');
    return genreSourceItems.filter((item) => {
      const baseGenres = resolveBaseGenresForItem(item);
      return baseGenres.has(selectedKey);
    });
  }, [genreSourceItems, isGenreSection, items, selectedGenre]);

  const visibleItems = isGenreSection ? filteredGenreItems : items;
  const localSearchItems = isDetailMode ? visibleItems : overviewSearchItems;

  useEffect(() => {
    if (!sectionKeyParam && location.state?.selectedMainSectionKey) {
      navigate(`/peliculas/${location.state.selectedMainSectionKey}`, {
        replace: true,
        state: location.state,
      });
    }
  }, [location.state, navigate, sectionKeyParam]);

  useEffect(() => {
    if (movieSectionsCache?.length) {
      setSections(movieSectionsCache);
      setSectionsLoading(false);
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      setSectionsLoading(true);
      setError('');

      try {
        const response = await fetchMainMovieSections();
        const visibleSections = (Array.isArray(response) ? response : []).filter(
          (section) => section?.key && !HIDDEN_SECTION_KEYS.has(section.key),
        );

        if (!cancelled) {
          movieSectionsCache = visibleSections;
          setSections(visibleSections);
        }

        await Promise.all(visibleSections.map(async (section) => {
          if (movieSectionPreviewCache.has(section.key)) {
            return;
          }

          try {
            const data = await fetchUserMovies(1, 5, resolveMoviesSectionQuery(section.key), DEFAULT_GENRE);
            movieSectionPreviewCache.set(section.key, filterPreviewItems(data?.videos));
          } catch {
            movieSectionPreviewCache.set(section.key, []);
          }
        }));

        if (!cancelled) {
          setSections([...visibleSections]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudieron cargar las secciones de peliculas.');
        }
      } finally {
        if (!cancelled) {
          setSectionsLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextIndex = Number.isInteger(location.state?.selectedIndex)
      ? Math.max(0, location.state.selectedIndex)
      : 0;
    setSelectedIndex(nextIndex);
  }, [location.state?.selectedIndex, detailSectionKey]);

  useEffect(() => {
    setSelectedGenre(location.state?.selectedGenre || DEFAULT_GENRE);
  }, [location.state?.selectedGenre, detailSectionKey]);

  useEffect(() => {
    if (!isDetailMode || !selectedSection) {
      return undefined;
    }

    if (isGenreSection) {
      if (movieGenreSourceCache?.length) {
        setGenreSourceItems(movieGenreSourceCache);
        setLoadingItems(false);
        setError('');
        focusTVContent();
        return undefined;
      }
    } else if (movieItemsCache.has(selectedSection.key)) {
      setItems(movieItemsCache.get(selectedSection.key));
      setLoadingItems(false);
      setError('');
      focusTVContent();
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      setLoadingItems(true);
      setError('');

      try {
        if (isGenreSection) {
          const response = await fetchUserMovies(1, 400, null, DEFAULT_GENRE);
          const nextItems = Array.isArray(response?.videos) ? response.videos : [];
          if (!cancelled) {
            movieGenreSourceCache = nextItems;
            setGenreSourceItems(nextItems);
            focusTVContent();
          }
          return;
        }

        const response = await fetchUserMovies(1, 400, resolveMoviesSectionQuery(selectedSection.key), DEFAULT_GENRE);
        const nextItems = Array.isArray(response?.videos) ? response.videos : [];

        if (!cancelled) {
          movieItemsCache.set(selectedSection.key, nextItems);
          setItems(nextItems);
          focusTVContent();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudieron cargar las peliculas.');
        }
      } finally {
        if (!cancelled) {
          setLoadingItems(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isDetailMode, isGenreSection, selectedSection]);

  useEffect(() => {
    if (isDetailMode || overviewSearchLoaded) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetchUserMovies(1, 400, null, DEFAULT_GENRE);
        const nextItems = Array.isArray(response?.videos) ? response.videos : [];
        if (!cancelled) {
          movieGenreSourceCache = nextItems;
          setOverviewSearchItems(nextItems);
          setOverviewSearchLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setOverviewSearchItems([]);
          setOverviewSearchLoaded(true);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isDetailMode, overviewSearchLoaded]);

  useEffect(() => {
    const handleOpenSearch = (event) => {
      if (event.detail?.scope === 'global') {
        return;
      }
      if (!isDetailMode) {
        return;
      }
      setShowSearch(true);
    };

    window.addEventListener(TV_OPEN_SEARCH_EVENT, handleOpenSearch);
    return () => window.removeEventListener(TV_OPEN_SEARCH_EVENT, handleOpenSearch);
  }, [isDetailMode]);

  const handleOpenSection = (section, sectionIndex) => {
    navigate(`/peliculas/${section.key}`, {
      state: {
        selectedSectionIndex: sectionIndex,
      },
    });
  };

  const handleSelectItem = (item) => {
    const itemId = getTVItemId(item);
    if (!itemId) return;

    const returnPath = selectedSection ? `/peliculas/${selectedSection.key}` : '/peliculas';

    navigate(`/watch/movie/${itemId}`, {
      state: {
        from: returnPath,
        returnState: selectedSection
          ? {
              selectedIndex,
              selectedGenre,
            }
          : {
              selectedSectionIndex: overviewInitialIndex,
            },
        fromSection: 'movies',
        sectionKey: selectedSection?.key,
        genre: selectedGenre,
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

  if (sectionsLoading && !sections.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <p className="text-2xl font-semibold">Peliculas</p>
          <p className="mt-3 text-base text-slate-400">Preparando secciones...</p>
        </div>
      </div>
    );
  }

  if (!isDetailMode) {
    return (
      <>
        {showSearch ? (
          <TVSearch
            allContent={localSearchItems}
            title="Buscar en Peliculas"
            placeholder="Buscar peliculas..."
            onSelectItem={(item) => {
              setShowSearch(false);
              handleSelectItem(item);
            }}
            onClose={() => setShowSearch(false)}
          />
        ) : null}
        <TVMovieSectionsOverview
          sections={sections}
          previewsBySection={previewMap}
          initialIndex={overviewInitialIndex}
          onOpenSection={handleOpenSection}
          onSearch={() => setShowSearch(true)}
        />
      </>
    );
  }

  if (!selectedSection && !sectionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-8 text-center text-white">
        <div className="max-w-3xl rounded-3xl border border-cyan-500/20 bg-slate-900/70 px-10 py-12 shadow-[0_0_50px_rgba(34,211,238,0.12)]">
          <h1 className="text-4xl font-black">Peliculas</h1>
          <p className="mt-5 text-xl text-slate-300">La subseccion seleccionada no existe.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch ? (
        <TVSearch
          allContent={localSearchItems}
          title={`Buscar en ${selectedSection?.displayName || 'Peliculas'}${isGenreSection ? ` - ${selectedGenre}` : ''}`}
          placeholder="Buscar dentro de esta seccion..."
          onSelectItem={(item) => {
            setShowSearch(false);
            handleSelectItem(item);
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : null}

      {isGenreSection ? (
        <TVFilteredGridPage
          title={selectedSection?.displayName || 'Peliculas'}
          subtitle={loadingItems ? 'Preparando subseccion...' : `${visibleItems.length} peliculas disponibles`}
          filters={genreOptions}
          selectedFilterIndex={Math.max(0, genreOptions.findIndex((genre) => genre === selectedGenre))}
          onFilterIndexChange={(nextIndex) => {
            setSelectedGenre(genreOptions[nextIndex] || DEFAULT_GENRE);
            setSelectedIndex(0);
          }}
          items={visibleItems}
          onSelectItem={handleSelectItem}
          onAddToMyList={handleAddToMyList}
          columns={5}
          initialIndex={selectedIndex}
          onActiveIndexChange={setSelectedIndex}
          onSearch={() => setShowSearch(true)}
          emptyMessage={`No hay peliculas disponibles para ${selectedGenre}.`}
          statusMessage={statusMessage}
        />
      ) : (
        <TVGrid
          items={visibleItems}
          title={selectedSection?.displayName || 'Peliculas'}
          subtitle={loadingItems ? 'Preparando subseccion...' : `${visibleItems.length} peliculas disponibles`}
          onSelectItem={handleSelectItem}
          onAddToMyList={handleAddToMyList}
          columns={5}
          initialIndex={selectedIndex}
          onActiveIndexChange={setSelectedIndex}
          onSearch={() => setShowSearch(true)}
          statusMessage={statusMessage}
        />
      )}
    </>
  );
}
