import React, { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import TVNavigation from "./components/TVNavigation.jsx";
import TVSearch from "./components/TVSearch.jsx";
import { fetchUserChannels, fetchUserMovies, fetchVideosByType } from "./utils/api.js";
import { TV_OPEN_SEARCH_EVENT } from "./utils/tvSearchEvents.js";
import { getTVItemId, resolveTVItemType, unwrapTVItems } from "./utils/tvContentUtils.js";
import { focusTVContent, getTVFocusZone, TV_FOCUS_ZONE_MODAL } from "./utils/tvFocusZone.js";
import { getCachedTVSeriesItems, setCachedTVSeriesItems } from "./utils/tvBrowseCache.js";

const HOME_BACK_ROUTES = new Set([
  '/live-tv',
  '/peliculas',
  '/series',
  '/animes',
  '/doramas',
  '/novelas',
  '/documentales',
  '/kids',
  '/colecciones',
  '/mi-lista',
]);

function normalizeGlobalSearchItems(items, fallbackType) {
  return unwrapTVItems(items)
    .filter(Boolean)
    .map((item) => ({
      ...item,
      type: item?.type || item?.itemType || item?.tipo || fallbackType,
      itemType: item?.itemType || item?.tipo || item?.type || fallbackType,
    }));
}

function AppTV() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isWatchPage = location.pathname.startsWith('/watch');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchItems, setGlobalSearchItems] = useState([]);
  const globalSearchLoadedRef = useRef(false);
  const globalSearchLoadingRef = useRef(false);
  const seriesPrefetchLoadingRef = useRef(false);

  const warmSeriesBrowseCache = useCallback(async () => {
    if (seriesPrefetchLoadingRef.current || getCachedTVSeriesItems()?.length) {
      return;
    }

    seriesPrefetchLoadingRef.current = true;
    try {
      const response = await fetchVideosByType('serie', 1, 500);
      setCachedTVSeriesItems(normalizeGlobalSearchItems(response, 'serie'));
    } catch (error) {
      console.warn('[AppTV] No se pudo precargar cache de series TV:', error?.message || error);
    } finally {
      seriesPrefetchLoadingRef.current = false;
    }
  }, []);

  const loadGlobalSearchIndex = useCallback(async () => {
    if (globalSearchLoadedRef.current || globalSearchLoadingRef.current) {
      return;
    }

    globalSearchLoadingRef.current = true;
    try {
      const results = await Promise.allSettled([
        fetchUserChannels('Todos'),
        fetchVideosByType('pelicula', 1, 500),
        fetchVideosByType('serie', 1, 500),
        fetchVideosByType('anime', 1, 500),
        fetchVideosByType('dorama', 1, 500),
        fetchVideosByType('novela', 1, 500),
        fetchVideosByType('documental', 1, 500),
        fetchUserMovies(1, 500, 'CINE_2025'),
        fetchUserMovies(1, 500, 'CINE_2026'),
      ]);

      const [
        channelsResult,
        moviesResult,
        seriesResult,
        animesResult,
        doramasResult,
        novelasResult,
        documentalesResult,
        cine2025Result,
        cine2026Result,
      ] = results;

      const nextItems = [
        ...(channelsResult.status === 'fulfilled' ? normalizeGlobalSearchItems(channelsResult.value, 'channel') : []),
        ...(moviesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(moviesResult.value, 'movie') : []),
        ...(seriesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(seriesResult.value, 'serie') : []),
        ...(animesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(animesResult.value, 'anime') : []),
        ...(doramasResult.status === 'fulfilled' ? normalizeGlobalSearchItems(doramasResult.value, 'dorama') : []),
        ...(novelasResult.status === 'fulfilled' ? normalizeGlobalSearchItems(novelasResult.value, 'novela') : []),
        ...(documentalesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(documentalesResult.value, 'documental') : []),
        ...(cine2025Result.status === 'fulfilled' ? normalizeGlobalSearchItems(cine2025Result.value, 'movie') : []),
        ...(cine2026Result.status === 'fulfilled' ? normalizeGlobalSearchItems(cine2026Result.value, 'movie') : []),
      ];

      const uniqueItems = Array.from(new Map(
        nextItems.map((item) => [getTVItemId(item) || `${item.itemType}-${item.name || item.title}`, item])
      ).values());

      setGlobalSearchItems(uniqueItems);
      if (seriesResult.status === 'fulfilled') {
        setCachedTVSeriesItems(normalizeGlobalSearchItems(seriesResult.value, 'serie'));
      }
      globalSearchLoadedRef.current = true;
    } catch (error) {
      console.warn('[AppTV] No se pudo cargar el indice global de busqueda:', error?.message || error);
    } finally {
      globalSearchLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user?.token || isWatchPage) {
      return;
    }

    warmSeriesBrowseCache();
    loadGlobalSearchIndex();
  }, [isWatchPage, loadGlobalSearchIndex, user?.token, warmSeriesBrowseCache]);

  useEffect(() => {
    const handleOpenGlobalSearch = (event) => {
      if (event.detail?.scope !== 'global') {
        return;
      }

      setShowGlobalSearch(true);
      loadGlobalSearchIndex();
    };

    window.addEventListener(TV_OPEN_SEARCH_EVENT, handleOpenGlobalSearch);
    return () => window.removeEventListener(TV_OPEN_SEARCH_EVENT, handleOpenGlobalSearch);
  }, [loadGlobalSearchIndex]);

  const handleGlobalSearchSelect = useCallback((item) => {
    const itemId = getTVItemId(item);
    if (!itemId) {
      return;
    }

    const itemType = resolveTVItemType(item, item?.itemType || item?.tipo || 'movie');
    const returnPath = location.pathname && location.pathname !== '/login'
      ? location.pathname
      : '/';
    const returnState = location.state ? { ...location.state } : undefined;
    setShowGlobalSearch(false);

    if (itemType === 'channel') {
      navigate(`/watch/channel/${itemId}`, {
        state: {
          from: returnPath,
          returnState,
          fromSection: 'tv',
          selectedCategory: item?.section || 'Todos',
          channelName: item?.name || item?.title || 'Canal',
        },
      });
      return;
    }

    navigate(`/watch/${itemType}/${itemId}`, {
      state: {
        from: returnPath,
        returnState,
      },
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || getTVFocusZone() === TV_FOCUS_ZONE_MODAL) {
        return;
      }

      if (isWatchPage) {
        return;
      }

      const activeElement = document.activeElement;
      const isEditable =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      const isBackNavigationKey =
        e.key === 'Escape' ||
        e.key === 'GoBack' ||
        e.key === 'BrowserBack' ||
        e.keyCode === 4 ||
        e.keyCode === 27 ||
        (!isEditable && e.keyCode === 8);

      if (!isBackNavigationKey) {
        return;
      }

      e.preventDefault();

      if (showGlobalSearch) {
        setShowGlobalSearch(false);
        focusTVContent();
        return;
      }

      if (location.pathname === '/') {
        focusTVContent();
        return;
      }

      if (HOME_BACK_ROUTES.has(location.pathname)) {
        navigate('/');
        return;
      }

      if (location.pathname.startsWith('/peliculas/')) {
        navigate('/peliculas');
        return;
      }

      if (window.history.length > 1 && location.pathname !== '/login') {
        navigate(-1);
        return;
      }

      navigate('/');
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWatchPage, location.pathname, navigate, showGlobalSearch]);

  useEffect(() => {
    if (isWatchPage) return undefined;

    const timer = window.setTimeout(() => {
      focusTVContent();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isWatchPage, location.pathname]);

  return (
    <>
      <style>{`
        :root {
          --primary: 190 100% 50%;
          --secondary: 315 100% 60%;
        }
        
        .tv-app-container {
          background:
            radial-gradient(circle at top left, rgba(34, 211, 238, 0.08), transparent 28%),
            radial-gradient(circle at top right, rgba(244, 63, 94, 0.08), transparent 24%),
            linear-gradient(180deg, #050816 0%, #0a1023 45%, #03060f 100%);
          min-height: 100vh;
          color: #fff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .tv-main-content {
          min-height: 100vh;
          padding-top: ${isWatchPage ? '0' : '84px'};
        }
        
        .tv-interface {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>

      <div className="tv-app-container">
        {!isWatchPage && <TVNavigation />}
        <main className="tv-main-content">
          <Outlet />
        </main>

        {showGlobalSearch && (
          <TVSearch
            allContent={globalSearchItems}
            title="Buscar en todo TeamG Play"
            placeholder="Busca canales, peliculas, series..."
            onSelectItem={handleGlobalSearchSelect}
            onClose={() => {
              setShowGlobalSearch(false);
              focusTVContent();
            }}
          />
        )}

        {!isWatchPage && (
          <footer className="border-t border-cyan-500/10 px-10 py-5 text-sm text-slate-400">
            <div className="mx-auto flex max-w-[1800px] items-center justify-between">
              <p>TeamG Play TV</p>
              <p>{user?.username ? `Perfil: ${user.username}` : 'Control remoto listo'}</p>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}

export default AppTV;
