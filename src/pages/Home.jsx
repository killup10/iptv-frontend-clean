// src/pages/Home.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Carousel from '../components/Carousel.jsx';
import TVHome from '../components/TVHome.jsx';
import { isAndroidMobile, isAndroidTV } from '../utils/platformUtils.js';
import axiosInstance from '../utils/axiosInstance.js';
import useDataCache from '../hooks/useDataCache.js';
import Toast from '../components/Toast.jsx';
import {
  fetchFeaturedChannels,
  fetchFeaturedMovies,
  fetchFeaturedSeries,
  fetchFeaturedAnimes,
  fetchFeaturedDoramas,
  fetchFeaturedNovelas,
  fetchFeaturedDocumentales,
  fetchRecentlyAdded,
  fetchContinueWatching,
  fetchUserMovies,
  fetchUserSeries,
  fetchVideosByType,
} from '../utils/api.js';
import TrailerModal from '../components/TrailerModal.jsx';
import { useContentAccess } from '../hooks/useContentAccess.js';
import { Bolt, Download, Headphones, Heart, Laptop, ShieldCheck, Smartphone } from 'lucide-react';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import CoverCarousel from '../components/CoverCarousel.jsx';
import MobileVodDetailModal from '../components/MobileVodDetailModal.jsx';
import { getTVItemTrailerUrl, resolveTVItemType } from '../utils/tvContentUtils.js';
import { addItemToMyList } from '../utils/myListUtils.js';

// Helper to process settled promises
const processResult = (result, setter, name, slice = 0) => {
  if (result.status === 'fulfilled' && result.value) {
    let data = result.value;
    // Handle API responses that might be { videos: [...] }
    if (data.videos && Array.isArray(data.videos)) {
      data = data.videos;
    }
    if (Array.isArray(data)) {
      if (setter) setter(slice > 0 ? data.slice(0, slice) : data);
      return data;
    }
  }
  console.error(`[Home.jsx] Error loading ${name}:`, result.reason || 'Invalid data format');
  if (setter) setter([]);
  return [];
};

const TV_LOGIN_FOCUSABLE_COUNT = 6;

const resolveTVLoginAction = (event) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Enter':
      return event.key;
    default:
      break;
  }

  switch (event.keyCode) {
    case 19:
      return 'ArrowUp';
    case 20:
      return 'ArrowDown';
    case 21:
      return 'ArrowLeft';
    case 22:
      return 'ArrowRight';
    case 23:
    case 66:
      return 'Enter';
    default:
      return null;
  }
};

const focusElementWithoutScroll = (element) => {
  if (!element) return;

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
};

const activateTextInput = (input) => {
  if (!input) return;

  focusElementWithoutScroll(input);

  try {
    const valueLength = input.value?.length || 0;
    input.setSelectionRange(valueLength, valueLength);
  } catch {
  }

  try {
    input.click();
  } catch {
  }
};

export function Home() {
  const { user, login } = useAuth();
  const location = useLocation();
  const dataCache = useDataCache();
  const initialCachedHomeData = dataCache.getStale('homeData');
  const outletContext = useOutletContext();
  const setAllSearchItems = outletContext?.setAllSearchItems;
  const navigate = useNavigate();
  const isTVMode = isAndroidTV();
  const isAndroidMobileUI = isAndroidMobile();
  const [loading, setLoading] = useState(() => !initialCachedHomeData);

  // State for login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tvLoginFocusIndex, setTVLoginFocusIndex] = useState(0);
  const tvLoginRefs = useRef([]);
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // State for content
  const [featuredChannels, setFeaturedChannels] = useState(() => initialCachedHomeData?.featuredChannels || []);
  const [featuredMovies, setFeaturedMovies] = useState(() => initialCachedHomeData?.featuredMovies || []);
  const [featuredSeries, setFeaturedSeries] = useState(() => initialCachedHomeData?.featuredSeries || []);
  const [featuredAnimes, setFeaturedAnimes] = useState(() => initialCachedHomeData?.featuredAnimes || []);
  const [featuredDoramas, setFeaturedDoramas] = useState(() => initialCachedHomeData?.featuredDoramas || []);
  const [featuredNovelas, setFeaturedNovelas] = useState(() => initialCachedHomeData?.featuredNovelas || []);
  const [featuredDocumentales, setFeaturedDocumentales] = useState(() => initialCachedHomeData?.featuredDocumentales || []);
  const [recentlyAdded, setRecentlyAdded] = useState(() => initialCachedHomeData?.recentlyAdded || []);
  const [continueWatchingItems, setContinueWatchingItems] = useState(() => initialCachedHomeData?.continueWatchingItems || []);
  const [contentError, setContentError] = useState(null);
  const [mobileVodDetail, setMobileVodDetail] = useState(null);

  // State for trailer modal
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  // State for toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Hook para verificación de acceso al contenido
  const {
    checkContentAccess,
    showAccessModal,
    accessModalData,
    closeAccessModal,
    proceedWithTrial
  } = useContentAccess();

  const buildContinueWatchingState = (resolvedItem) => {
    const watchProgress = resolvedItem?.watchProgress || {};
    const lastTime = Number(watchProgress.lastTime ?? watchProgress.progress ?? resolvedItem?.progressTime ?? 0);
    const lastSeason = Number(watchProgress.lastSeason);
    const lastChapter = Number(watchProgress.lastChapter);
    const hasSeasons = Array.isArray(resolvedItem?.seasons) && resolvedItem.seasons.length > 0;
    let seasonIndex = Number.isFinite(lastSeason) ? Math.max(0, Math.floor(lastSeason)) : undefined;
    let chapterIndex = Number.isFinite(lastChapter) ? Math.max(0, Math.floor(lastChapter)) : undefined;

    if (hasSeasons) {
      if (!Number.isFinite(seasonIndex) || seasonIndex < 0 || seasonIndex >= resolvedItem.seasons.length) {
        seasonIndex = 0;
      }

      const chapters = resolvedItem.seasons?.[seasonIndex]?.chapters;
      if (Array.isArray(chapters) && chapters.length > 0) {
        if (!Number.isFinite(chapterIndex) || chapterIndex < 0 || chapterIndex >= chapters.length) {
          chapterIndex = 0;
        }
      }
    }

    const navigationState = { continueWatching: true };

    if (Number.isFinite(lastTime) && lastTime > 0) {
      navigationState.startTime = Math.floor(lastTime);
    }
    if (hasSeasons && Number.isFinite(seasonIndex)) {
      navigationState.seasonIndex = seasonIndex;
    }
    if (hasSeasons && Number.isFinite(chapterIndex)) {
      navigationState.chapterIndex = chapterIndex;
    }

    return navigationState;
  };

  const buildMobileVodSelection = (item, fallbackType = 'movie') => {
    if (!item) {
      return null;
    }

    const itemId = item._id || item.id;
    const matchedContinueWatching = continueWatchingItems.find((entry) => (
      String(entry?._id || entry?.id) === String(itemId)
    ));

    const mergedItem = matchedContinueWatching
      ? {
          ...matchedContinueWatching,
          ...item,
          watchProgress: item.watchProgress || matchedContinueWatching.watchProgress,
          progressTime: item.progressTime ?? matchedContinueWatching.progressTime,
          duration: item.duration ?? matchedContinueWatching.duration,
        }
      : item;

    const normalizedFallbackType = fallbackType === 'continue-watching'
      ? (mergedItem?.itemType || mergedItem?.tipo || 'movie')
      : fallbackType;

    return {
      item: mergedItem,
      itemType: resolveTVItemType(
        mergedItem,
        normalizedFallbackType || mergedItem?.itemType || mergedItem?.tipo || 'movie',
      ),
    };
  };

  const getMobileVodProgressPercent = (item) => {
    const watchProgress = item?.watchProgress || {};
    const lastTime = Number(watchProgress.lastTime ?? watchProgress.progress ?? item?.progressTime ?? 0);
    const duration = Number(watchProgress.duration ?? item?.duration ?? 0);

    if (!Number.isFinite(lastTime) || !Number.isFinite(duration) || lastTime <= 0 || duration <= 0) {
      return null;
    }

    return Math.max(0, Math.min(100, (lastTime / duration) * 100));
  };

  const canContinueWatchingItem = (item) => {
    const watchProgress = item?.watchProgress || {};
    return (
      Number(watchProgress.lastTime ?? watchProgress.progress ?? item?.progressTime ?? 0) > 0 ||
      Number.isFinite(Number(watchProgress.lastSeason)) ||
      Number.isFinite(Number(watchProgress.lastChapter))
    );
  };

  const performLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await login({ username, password });
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setLoginError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await performLogin();
  };

  useEffect(() => {
    if (!setAllSearchItems || !initialCachedHomeData?.allSearchItems?.length) {
      return;
    }

    setAllSearchItems(initialCachedHomeData.allSearchItems);
  }, [initialCachedHomeData, setAllSearchItems]);

  useEffect(() => {
    if (!isAndroidMobileUI || !mobileVodDetail?.item) {
      return;
    }

    setMobileVodDetail((currentDetail) => {
      if (!currentDetail?.item) {
        return currentDetail;
      }

      const refreshedDetail = buildMobileVodSelection(currentDetail.item, currentDetail.itemType);
      const currentProgress = Number(
        currentDetail.item?.watchProgress?.lastTime ??
        currentDetail.item?.watchProgress?.progress ??
        currentDetail.item?.progressTime ??
        0,
      );
      const refreshedProgress = Number(
        refreshedDetail?.item?.watchProgress?.lastTime ??
        refreshedDetail?.item?.watchProgress?.progress ??
        refreshedDetail?.item?.progressTime ??
        0,
      );

      if (
        String(currentDetail.item?._id || currentDetail.item?.id || '') === String(refreshedDetail?.item?._id || refreshedDetail?.item?.id || '') &&
        currentDetail.itemType === refreshedDetail?.itemType &&
        currentProgress === refreshedProgress
      ) {
        return currentDetail;
      }

      return refreshedDetail;
    });
  }, [
    continueWatchingItems,
    isAndroidMobileUI,
    mobileVodDetail?.item?._id,
    mobileVodDetail?.item?.id,
    mobileVodDetail?.itemType,
  ]);

  useEffect(() => {
    if (!isTVMode || loading || user?.token) {
      return undefined;
    }

    window.requestAnimationFrame(() => {
      focusElementWithoutScroll(tvLoginRefs.current[tvLoginFocusIndex]);
    });

    const handleTVLoginKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const action = resolveTVLoginAction(event);
      if (!action) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (action === 'ArrowUp') {
        setTVLoginFocusIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (action === 'ArrowDown') {
        setTVLoginFocusIndex((current) => Math.min(TV_LOGIN_FOCUSABLE_COUNT - 1, current + 1));
        return;
      }

      if (action === 'ArrowLeft') {
        if (tvLoginFocusIndex === 5) {
          setTVLoginFocusIndex(4);
          return;
        }

        if (tvLoginFocusIndex === 1 && showPassword && !isLoggingIn) {
          setShowPassword(false);
        }
        return;
      }

      if (action === 'ArrowRight') {
        if (tvLoginFocusIndex === 4) {
          setTVLoginFocusIndex(5);
          return;
        }

        if (tvLoginFocusIndex === 1 && !showPassword && !isLoggingIn) {
          setShowPassword(true);
        }
        return;
      }

      if (action !== 'Enter' || isLoggingIn) {
        return;
      }

      if (tvLoginFocusIndex === 0) {
        activateTextInput(usernameInputRef.current);
        return;
      }

      if (tvLoginFocusIndex === 1) {
        activateTextInput(passwordInputRef.current);
        return;
      }

      tvLoginRefs.current[tvLoginFocusIndex]?.click?.();
    };

    window.addEventListener('keydown', handleTVLoginKeyDown, true);
    return () => window.removeEventListener('keydown', handleTVLoginKeyDown, true);
  }, [isLoggingIn, isTVMode, loading, showPassword, tvLoginFocusIndex, user?.token]);

  const setTVLoginRef = (index, node) => {
    tvLoginRefs.current[index] = node;
  };

  const getTVLoginFocusClasses = (index, baseClasses = '') => {
    if (!isTVMode || tvLoginFocusIndex !== index) {
      return baseClasses;
    }

    return `${baseClasses} ring-2 ring-cyan-400 ring-offset-2 ring-offset-transparent`;
  };

  const isLoadingRef = useRef(false);
  const searchDataLoadedRef = useRef(false); // Evita recargar datos de búsqueda en cada render

  const applyHomeCacheData = (cachedData) => {
    if (!cachedData) {
      return;
    }

    setFeaturedChannels(cachedData.featuredChannels || []);
    setFeaturedMovies(cachedData.featuredMovies || []);
    setFeaturedSeries(cachedData.featuredSeries || []);
    setFeaturedAnimes(cachedData.featuredAnimes || []);
    setFeaturedDoramas(cachedData.featuredDoramas || []);
    setFeaturedNovelas(cachedData.featuredNovelas || []);
    setFeaturedDocumentales(cachedData.featuredDocumentales || []);
    setRecentlyAdded(cachedData.recentlyAdded || []);
    setContinueWatchingItems(cachedData.continueWatchingItems || []);
  };

  // Refactored useEffect to load all data for Home and Search
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Force refresh "Continuar Viendo" cuando el usuario regresa a Home desde Watch
    const handlePageFocus = async () => {
      console.log('[Home.jsx] Página recuperó el foco - actualizando "Continuar Viendo"...');
      try {
        const updated = await fetchContinueWatching();
        setContinueWatchingItems(updated || []);
        console.log('[Home.jsx] ✅ "Continuar Viendo" actualizado:', updated?.length || 0, 'items');
      } catch (err) {
        console.error('[Home.jsx] Error actualizando "Continuar Viendo":', err);
      }
    };

    // Handler para visibilitychange
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handlePageFocus();
      }
    };

    // Escuchar cuando el usuario vuelve a la página
    window.addEventListener('focus', handlePageFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    async function loadAllData() {
      if (isLoadingRef.current) {
        console.log('[Home.jsx] Data load already in progress. Skipping.');
        return;
      }
      isLoadingRef.current = true;

      // Verificar si hay datos cacheados
      const cachedData = dataCache.get('homeData');
      if (cachedData) {
        console.log('[Home.jsx] Cargando datos desde cache...');
        applyHomeCacheData(cachedData);
        setLoading(false);
        isLoadingRef.current = false; // Release lock

        // Refrescar siempre la sección "Continuar Viendo" incluso si usamos cache,
        // para que refleje el último playback de Electron sin esperar a un change de foco.
        (async () => {
          try {
            const fresh = await fetchContinueWatching();
            setContinueWatchingItems(fresh || []);
            dataCache.set('homeData', {
              ...cachedData,
              continueWatchingItems: fresh || []
            });
            console.log('[Home.jsx] ƒo. Continuar Viendo actualizado tras usar cache');
          } catch (err) {
            console.error('[Home.jsx] Error refrescando Continuar Viendo tras cache:', err);
          }
        })();
        return;
      }

      const staleCachedData = dataCache.getStale('homeData');
      if (staleCachedData) {
        console.log('[Home.jsx] Usando cache persistido mientras se refresca Home...');
        applyHomeCacheData(staleCachedData);
        setLoading(false);
      } else {
        setLoading(true);
      }

      setContentError(null);
      console.log('[Home.jsx] Starting progressive data load...');

      try {
        // PHASE 1: Cargar SOLO datos críticos para mostrar UI rápido (2-3 segundos)
        console.time('[Home.jsx] Phase 1: Critical data load time');
        const criticalResults = await Promise.allSettled([
          fetchContinueWatching(),
          fetchRecentlyAdded(),
          fetchFeaturedChannels(),
          fetchFeaturedMovies(),
          fetchFeaturedSeries(),
          fetchFeaturedAnimes(),
          fetchFeaturedDoramas(),
          fetchFeaturedNovelas(),
          fetchFeaturedDocumentales(),
        ]);
        console.timeEnd('[Home.jsx] Phase 1: Critical data load time');

        const [
          continueWatchingResult,
          recentlyAddedResult,
          featuredChannelsResult,
          featuredMoviesResult,
          featuredSeriesResult,
          featuredAnimesResult,
          featuredDoramasResult,
          featuredNovelasResult,
          featuredDocumentalesResult,
        ] = criticalResults;

        // Procesar datos visuales
        const processedContinueWatching = processResult(continueWatchingResult, setContinueWatchingItems, 'Continue Watching');
        const processedRecentlyAdded = processResult(recentlyAddedResult, setRecentlyAdded, 'Recently Added', 30);
        const processedFeaturedChannels = processResult(featuredChannelsResult, setFeaturedChannels, 'Featured Channels', 10);
        const processedFeaturedMovies = processResult(featuredMoviesResult, setFeaturedMovies, 'Featured Movies', 10);
        const processedFeaturedSeries = processResult(featuredSeriesResult, setFeaturedSeries, 'Featured Series', 10);
        const processedFeaturedAnimes = processResult(featuredAnimesResult, setFeaturedAnimes, 'Featured Animes', 10);
        const processedFeaturedDoramas = processResult(featuredDoramasResult, setFeaturedDoramas, 'Featured Doramas', 10);
        const processedFeaturedNovelas = processResult(featuredNovelasResult, setFeaturedNovelas, 'Featured Novelas', 10);
        const processedFeaturedDocumentales = processResult(featuredDocumentalesResult, setFeaturedDocumentales, 'Featured Documentales', 10);

        // Mostrar UI inmediatamente
        setLoading(false);
        console.log('[Home.jsx] ✅ Phase 1 complete. UI displayed.');
        isLoadingRef.current = false; // Release lock after Phase 1

        // Cache de Phase 1
        const phase1CacheData = {
          continueWatchingItems: processedContinueWatching,
          recentlyAdded: processedRecentlyAdded,
          featuredChannels: processedFeaturedChannels,
          featuredMovies: processedFeaturedMovies,
          featuredSeries: processedFeaturedSeries,
          featuredAnimes: processedFeaturedAnimes,
          featuredDoramas: processedFeaturedDoramas,
          featuredNovelas: processedFeaturedNovelas,
          featuredDocumentales: processedFeaturedDocumentales,
        };
        dataCache.set('homeData', phase1CacheData);

        // ⚡ CONSTRUIR ITEMS PARA BÚSQUEDA INSTANTÁNEA
        // Compilar todos los items locales de Home para que SearchBar busque digito por digito
        // Sin esperar Phase 2, sin debounce - búsqueda instantánea como era ANTES
        const allLocalItems = [
          ...processedContinueWatching.map(item => ({ ...item, type: 'continuar-viendo', itemType: 'continue-watching' })),
          ...processedRecentlyAdded.map(item => ({ ...item, type: 'recién-agregado', itemType: resolveTVItemType(item, item?.tipo || 'movie') })),
          ...processedFeaturedChannels.map(item => ({ ...item, type: 'canal', itemType: 'channel' })),
          ...processedFeaturedMovies.map(item => ({ ...item, type: 'película', itemType: 'movie' })),
          ...processedFeaturedSeries.map(item => ({ ...item, type: 'serie', itemType: 'serie' })),
          ...processedFeaturedAnimes.map(item => ({ ...item, type: 'anime', itemType: 'anime' })),
          ...processedFeaturedDoramas.map(item => ({ ...item, type: 'dorama', itemType: 'dorama' })),
          ...processedFeaturedNovelas.map(item => ({ ...item, type: 'novela', itemType: 'novela' })),
          ...processedFeaturedDocumentales.map(item => ({ ...item, type: 'documental', itemType: 'documental' })),
        ];

        // Remover duplicados por ID
        let uniqueItems = Array.from(new Map(allLocalItems.map(item => [item._id || item.id, item])).values());

        // 🚀 Actualizar SearchBar INMEDIATAMENTE con los items locales (para búsqueda instantánea)
        if (setAllSearchItems) {
          console.log('[Home.jsx] ✅ SearchBar actualizado con', uniqueItems.length, 'items locales - Búsqueda instantánea disponible');
          setAllSearchItems(uniqueItems);
        }

        // 🔥 EN BACKGROUND: Cargar TODO el contenido (sin bloquear UI) para completar el índice de búsqueda
        // Phase 2: Los items locales ya están en SearchBar, ahora cargamos TODO para tener índice completo
        if (!searchDataLoadedRef.current) {
          searchDataLoadedRef.current = true;
          const searchSetter = setAllSearchItems;

          // Iniciar carga en background SIN esperar
          (async () => {
            console.log('[Home.jsx] 🚀 Phase 2: Indexando TODO el contenido en background...');
            console.time('[Home.jsx] Phase 2: Full content index load time');

            try {
              // Cargar TODOS los items de cada categoría (no solo destacados)
              const fullIndexResults = await Promise.allSettled([
                fetchVideosByType('pelicula', 1, 500),
                fetchVideosByType('serie', 1, 500),
                fetchVideosByType('anime', 1, 500),
                fetchVideosByType('dorama', 1, 500),
                fetchVideosByType('novela', 1, 500),
                fetchVideosByType('documental', 1, 500),
                fetchUserMovies(1, 500, 'CINE_2025'), // Cine 2025
                fetchUserMovies(1, 500, 'CINE_2026'), // Cine 2026
              ]);
              console.timeEnd('[Home.jsx] Phase 2: Full content index load time');

              const [
                allMoviesResult,
                allSeriesResult,
                allAnimesResult,
                allDoramasResult,
                allNovelasResult,
                allDocumentalesResult,
                cine2025Result,
                cine2026Result,
              ] = fullIndexResults;

              const allMovies = processResult(allMoviesResult, null, 'All Movies');
              const allSeries = processResult(allSeriesResult, null, 'All Series');
              const allAnimes = processResult(allAnimesResult, null, 'All Animes');
              const allDoramas = processResult(allDoramasResult, null, 'All Doramas');
              const allNovelas = processResult(allNovelasResult, null, 'All Novelas');
              const allDocumentales = processResult(allDocumentalesResult, null, 'All Documentales');
              const cine2025 = processResult(cine2025Result, null, 'Cine 2025');
              const cine2026 = processResult(cine2026Result, null, 'Cine 2026');

              const fullSearchItems = [
                ...processedFeaturedChannels.map(item => ({ ...item, type: 'canal', itemType: 'channel' })),
                ...allMovies.map(item => ({ ...item, type: 'película', itemType: 'movie' })),
                ...allSeries.map(item => ({ ...item, type: 'serie', itemType: 'serie' })),
                ...allAnimes.map(item => ({ ...item, type: 'anime', itemType: 'anime' })),
                ...allDoramas.map(item => ({ ...item, type: 'dorama', itemType: 'dorama' })),
                ...allNovelas.map(item => ({ ...item, type: 'novela', itemType: 'novela' })),
                ...allDocumentales.map(item => ({ ...item, type: 'documental', itemType: 'documental' })),
                ...cine2025.map(item => ({ ...item, type: 'cine-2025', itemType: 'movie' })),
                ...cine2026.map(item => ({ ...item, type: 'cine-2026', itemType: 'movie' })),
              ];

              const fullUniqueItems = Array.from(new Map(fullSearchItems.map(item => [item._id || item.id, item])).values());

              if (searchSetter) {
                console.log('[Home.jsx] ✅ Phase 2 complete. SearchBar indexado con', fullUniqueItems.length, 'items totales');
                searchSetter(fullUniqueItems);
              }

              const fullCacheData = {
                ...phase1CacheData,
                allSearchItems: fullUniqueItems,
              };
              dataCache.set('homeData', fullCacheData);
            } catch (err) {
              console.error('[Home.jsx] ❌ Error en Phase 2:', err);
              // Mantener los items locales ya cargados, no limpiar
            }
          })();
        }
      } catch (err) {
        console.error('[Home.jsx] ❌ General error in loadAllData:', err);
        setContentError(err.message || "Error loading content.");
        setLoading(false);
        isLoadingRef.current = false; // Release lock on error
      }
    }

    loadAllData();

    // Cleanup: remover listeners
    return () => {
      window.removeEventListener('focus', handlePageFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Considerar si resetear el lock aquí. Si el componente se desmonta y remonta rápido,
      // podríamos querer que la carga se reinicie.
      // isLoadingRef.current = false;
    };
    // Sin Phase 2, la carga es más rápida y limpia
  }, [user, dataCache, setAllSearchItems]);

  const navigateToItem = (item, itemType, extraState = null) => {
    const navigateToPlayer = (resolvedItem, resolvedType) => {
      const id = resolvedItem._id || resolvedItem.id;
      let path;
      let navigationState = extraState ? { ...extraState } : undefined;

      if (resolvedType === 'continue-watching') {
        const actualType = resolvedItem.tipo || resolvedItem.itemType;
        if (!actualType) {
          console.error("Continue watching item doesn't have a type (tipo or itemType):", resolvedItem);
          return;
        }
        path = `/watch/${actualType}/${id}`;
        navigationState = {
          ...(navigationState || {}),
          ...buildContinueWatchingState(resolvedItem),
        };
        try {
          const cacheKey = `continueWatching_${id}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            ...navigationState,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.warn('[Home.jsx] No se pudo guardar continueWatching en cache:', err);
        }
      } else {
        path = `/watch/${resolvedType}/${id}`;
      }

      console.log(`Navigating to: ${path}`);
      navigate(path, navigationState ? { state: navigationState } : undefined);
    };

    checkContentAccess(item, () => navigateToPlayer(item, itemType));
  };

  const handleMobileVodSelection = (item, itemType) => {
    const fallbackType = itemType === 'continue-watching'
      ? (item?.itemType || item?.tipo || 'movie')
      : (itemType || item?.itemType || item?.tipo || 'movie');
    const resolvedType = resolveTVItemType(item, fallbackType);

    if (isTVMode || resolvedType === 'channel') {
      navigateToItem(item, itemType);
      return;
    }

    const nextSelection = buildMobileVodSelection(item, fallbackType);
    if (nextSelection) {
      setMobileVodDetail(nextSelection);
      return;
    }

    navigateToItem(item, itemType);
  };

const handlePlayTrailerClick = (trailerUrl, onCloseCallback) => {
    if (trailerUrl) {
      console.log('[Home.jsx] Playing trailer:', trailerUrl);
      setCurrentTrailerUrl(trailerUrl);
      setShowTrailerModal(true);
      if (onCloseCallback && typeof onCloseCallback === 'function') {
        window.__lastTrailerOnClose = onCloseCallback;
      }
    } else {
      console.warn('[Home.jsx] No trailer URL for item:');
    }
  };

  // Manejador de selección en búsqueda
  const handleSearchSelectItem = (item) => {
    handleMobileVodSelection(item, item.itemType);
  };

  useEffect(() => {
    const handleGlobalVodDetailOpen = (event) => {
      const item = event.detail?.item;
      const itemType = event.detail?.itemType || item?.itemType || item?.tipo || 'movie';

      if (!item) {
        return;
      }

      handleMobileVodSelection(item, itemType);
    };

    window.addEventListener('teamg:open-vod-detail', handleGlobalVodDetailOpen);
    return () => {
      window.removeEventListener('teamg:open-vod-detail', handleGlobalVodDetailOpen);
    };
  }, [handleMobileVodSelection]);

  const handleAddToMyList = async (item) => {
    try {
      console.log('[Home.jsx] Agregando a Mi Lista:', item);
      const response = await axiosInstance.post('/api/users/my-list/add', {
        itemId: item._id || item.id,
        tipo: item.tipo || item.itemType || 'movie',
        title: item.name || item.title,
        thumbnail: item.customThumbnail || item.thumbnail || item.poster || item.image || item.logo || '',
        description: item.description || item.descripcion || item.overview || ''
      });

      console.log('[Home.jsx] Agregado a Mi Lista exitosamente:', response.data);
      // Mostrar notificación de éxito
      setToastMessage(`✨ "${item.name || item.title}" agregado a Mi Lista`);
      setToastType('success');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('[Home.jsx] Item ya está en Mi Lista');
        setToastMessage(`ℹ️ "${item.name || item.title}" ya estaba en Mi Lista`);
        setToastType('info');
      } else {
        console.error('[Home.jsx] Error al agregar a Mi Lista:', error);
        setToastMessage('❌ Error al agregar a Mi Lista');
        setToastType('error');
      }
    }
  };

  const handleAddToMyListSafe = async (item) => {
    try {
      const result = await addItemToMyList(item);
      setToastMessage(
        result.status === 'duplicate'
          ? `"${item.name || item.title}" ya estaba en Mi Lista`
          : `"${item.name || item.title}" agregado a Mi Lista`,
      );
      setToastType(result.status === 'duplicate' ? 'info' : 'success');
      return result;
    } catch (error) {
      console.error('[Home.jsx] Error al agregar a Mi Lista:', error);
      setToastMessage('Error al agregar a Mi Lista');
      setToastType('error');
      throw error;
    }
  };

  const mobileVodDetailProgress = mobileVodDetail?.item
    ? getMobileVodProgressPercent(mobileVodDetail.item)
    : null;
  const mobileVodDetailCanContinue = mobileVodDetail?.item
    ? canContinueWatchingItem(mobileVodDetail.item)
    : false;
  const mobileVodDetailTrailerUrl = mobileVodDetail?.item
    ? getTVItemTrailerUrl(mobileVodDetail.item)
    : '';
  const webHomeHighlights = [
    {
      title: 'Rapido y estable',
      description: 'Streaming sin interrupciones',
      icon: Bolt,
    },
    {
      title: 'Contenido premium',
      description: 'Catalogo amplio y actualizado',
      icon: ShieldCheck,
    },
    {
      title: 'Sin limites',
      description: 'Disfruta en todos tus dispositivos',
      icon: Heart,
    },
    {
      title: 'Descargas',
      description: 'Ve sin conexion cuando quieras',
      icon: Download,
    },
    {
      title: 'Soporte 24/7',
      description: 'Estamos siempre para ayudarte',
      icon: Headphones,
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]"><div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (contentError) {
      return <div className="text-center text-red-400 p-10 pt-24">Error loading content: {contentError}</div>;
  }

  if (!user?.token && !loading) {
    return (
      <>
        <style>{`
          :root {
            --background: 254 50% 5%;
            --foreground: 210 40% 98%;
            --primary: 190 100% 50%;
            --primary-foreground: 254 50% 5%;
            --secondary: 315 100% 60%;
            --secondary-foreground: 210 40% 98%;
            --muted-foreground: 190 30% 80%;
            --card-background: 254 50% 8%;
            --input-background: 254 50% 12%;
            --input-border: 315 100% 25%;
            --footer-text: 210 40% 70%;
          }

          body {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          }

          .text-glow-primary {
            text-shadow: 0 0 5px hsl(var(--primary) / 0.8), 0 0 10px hsl(var(--primary) / 0.6);
          }
          .text-glow-secondary {
            text-shadow: 0 0 5px hsl(var(--secondary) / 0.8), 0 0 10px hsl(var(--secondary) / 0.6);
          }
          .shadow-glow-primary {
            box-shadow: 0 0 25px hsl(var(--primary) / 0.8);
          }
          .drop-shadow-glow-logo {
            filter: drop-shadow(0 0 25px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 15px hsl(var(--primary) / 0.5));
          }
          .text-glow-brand {
            text-shadow: 0 0 12px rgba(236, 72, 153, 0.38), 0 0 20px rgba(34, 211, 238, 0.24);
          }
        `}</style>
        <div
          className="relative overflow-hidden"
          style={{
            backgroundImage: `url(./fondo.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            backgroundColor: '#020617'
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(217,70,239,0.18),transparent_26%),radial-gradient(circle_at_76%_16%,rgba(34,211,238,0.14),transparent_24%),radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.11),transparent_18%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#12021d]/38 via-[#090214]/60 to-[#070112]/84" />
          <main className="relative z-10 flex min-h-screen flex-grow flex-col items-center justify-center p-4 md:flex-row">
            {/* Sección de bienvenida - visible en desktop, compacta en móvil */}
            <div className="mb-8 flex flex-col items-center justify-center text-center md:hidden">
              <h1 className="mb-4 text-3xl font-black tracking-tight text-primary text-glow-brand sm:text-4xl">
                Bienvenido a
              </h1>
              <img
                src="./logo-teamg.png"
                alt="Logo de TeamG Play"
                style={{
                  width: 'min(280px, 50vw)',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                className="drop-shadow-glow-logo mb-4"
              />
            </div>

            <div className="hidden flex-1 flex-col items-center justify-center p-8 text-center md:flex lg:p-16">
                <h1 className="mb-4 text-5xl font-black tracking-tight text-primary text-glow-brand">
                    Bienvenido a
                </h1>
                <img
                  src="./logo-teamg.png"
                  alt="Logo de TeamG Play"
                  style={{
                    width: 'min(400px, 70vw)',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  className="drop-shadow-glow-logo"
                />
                <p className="mt-5 max-w-md text-lg leading-8 text-slate-200/82 lg:text-xl">
                  Inicia sesión para descubrir un mundo de entretenimiento.
                </p>
            </div>

            <div className="flex-1 w-full max-w-md p-4">
              <div
                className="relative w-full overflow-hidden rounded-[28px] border border-fuchsia-300/16 p-6 shadow-[0_0_0_1px_rgba(217,70,239,0.14),0_28px_70px_rgba(46,16,101,0.36)] backdrop-blur-xl sm:p-8"
                style={{
                  backgroundColor: 'rgba(17, 5, 31, 0.72)',
                  boxShadow: '0 32px 80px rgba(46, 16, 101, 0.34)'
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_36%),radial-gradient(circle_at_18%_0%,rgba(217,70,239,0.18),transparent_26%),radial-gradient(circle_at_84%_12%,rgba(250,204,21,0.12),transparent_20%),linear-gradient(180deg,rgba(35,8,67,0.2),rgba(15,23,42,0.04))]" />
                <div className="relative">
                <h2 className="mb-2 text-center text-2xl font-black tracking-tight text-primary text-glow-brand sm:text-3xl">
                    Iniciar Sesión
                </h2>
                <p className="mb-6 text-center text-sm text-slate-300/75 sm:mb-8">
                  Accede a tu cuenta para continuar viendo tu contenido.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div
                    ref={(node) => setTVLoginRef(0, node)}
                    className={getTVLoginFocusClasses(0, isTVMode ? 'rounded-xl transition-shadow duration-200' : '')}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(0)}
                    tabIndex={isTVMode ? (tvLoginFocusIndex === 0 ? 0 : -1) : undefined}
                  >
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Usuario</label>
                    <input
                      ref={usernameInputRef}
                      type="text"
                      placeholder="Tu nombre de usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => isTVMode && setTVLoginFocusIndex(0)}
                      className="w-full rounded-xl px-4 py-3 text-base text-foreground transition-all duration-200 placeholder:text-slate-400/70 focus:outline-none focus:ring-2 sm:py-3"
                      style={{
                        backgroundColor: 'hsl(var(--input-background) / 0.88)',
                        border: '1px solid hsl(var(--input-border) / 0.8)',
                        '--tw-ring-color': 'hsl(var(--primary))'
                      }}
                      disabled={isLoggingIn}
                      autoComplete="username"
                    />
                  </div>
                  <div
                    ref={(node) => setTVLoginRef(1, node)}
                    className={getTVLoginFocusClasses(1, isTVMode ? 'rounded-xl transition-shadow duration-200' : '')}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(1)}
                    tabIndex={isTVMode ? (tvLoginFocusIndex === 1 ? 0 : -1) : undefined}
                  >
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Contraseña</label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => isTVMode && setTVLoginFocusIndex(1)}
                        className="w-full rounded-xl px-4 py-3 pr-12 text-base text-foreground transition-all duration-200 placeholder:text-slate-400/70 focus:outline-none focus:ring-2 sm:py-3"
                        style={{
                          backgroundColor: 'hsl(var(--input-background) / 0.88)',
                          border: '1px solid hsl(var(--input-border) / 0.8)',
                          '--tw-ring-color': 'hsl(var(--primary))'
                        }}
                        disabled={isLoggingIn}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                        disabled={isLoggingIn}
                        tabIndex="-1"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 5a3 3 0 00-2.88 4.049l4.929 4.929A3 3 0 1010 5zm7.757 4.171A5.002 5.002 0 0017 10a7 7 0 10-9.757 6.171M10 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <Link
                      to="/forgot-password"
                      className="mt-2 inline-block text-xs text-secondary transition-colors hover:text-pink-200 hover:underline"
                      tabIndex={isTVMode ? -1 : undefined}
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  {loginError && <p className="text-center text-sm text-rose-400">{loginError}</p>}

                  <button
                    ref={(node) => setTVLoginRef(2, node)}
                    type="submit"
                    disabled={isLoggingIn}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(2)}
                    tabIndex={isTVMode ? (tvLoginFocusIndex === 2 ? 0 : -1) : undefined}
                    className={`${getTVLoginFocusClasses(2, '')} flex w-full items-center justify-center rounded-xl border border-amber-200/35 py-3 text-base font-black transition-all duration-300 touch-manipulation sm:py-3 sm:text-lg ${
                      isLoggingIn
                        ? 'bg-gray-500 cursor-not-allowed animate-pulse'
                        : 'hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(250,204,21,0.28)] active:translate-y-0'
                    }`}
                    style={{
                      background: isLoggingIn ? 'hsl(var(--muted-foreground))' : 'linear-gradient(90deg, rgba(250,204,21,0.95), rgba(251,191,36,0.98), rgba(249,115,22,0.94))',
                      color: 'hsl(var(--primary-foreground))'
                    }}
                  >
                    {isLoggingIn ? (
                      <>
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3"></div>
                        Procesando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </form>

                <p className="mt-4 text-center text-sm text-muted-foreground sm:mt-6">
                  ¿No tienes cuenta?{' '}
                  <Link
                    ref={(node) => setTVLoginRef(3, node)}
                    to="/register"
                    className={getTVLoginFocusClasses(3, 'rounded-md font-medium text-secondary touch-manipulation transition-colors duration-200 hover:text-pink-200 hover:underline')}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(3)}
                    tabIndex={isTVMode ? (tvLoginFocusIndex === 3 ? 0 : -1) : undefined}
                  >
                    Regístrate aquí
                  </Link>
                </p>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <h3 className="mb-3 text-center text-lg font-bold text-primary">Descargar la aplicación</h3>
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <a
                      ref={(node) => setTVLoginRef(4, node)}
                      href="https://teamg.store/teamgplay-desktop.exe"
                      download="teamgplay-desktop.exe"
                      className={getTVLoginFocusClasses(4, 'group flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/22 bg-[linear-gradient(135deg,rgba(58,16,95,0.74),rgba(25,8,50,0.72)_58%,rgba(7,10,25,0.8))] px-4 py-2.5 text-secondary-foreground shadow-[0_12px_24px_rgba(88,28,135,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200/35 hover:shadow-[0_16px_30px_rgba(250,204,21,0.14)]')}
                      onFocus={() => isTVMode && setTVLoginFocusIndex(4)}
                      tabIndex={isTVMode ? (tvLoginFocusIndex === 4 ? 0 : -1) : undefined}
                    >
                      <Laptop className="h-5 w-5 text-secondary" />
                      <span className="font-semibold text-sm">Windows</span>
                    </a>
                    <a
                      ref={(node) => setTVLoginRef(5, node)}
                      href="https://teamg.store/teamgplay.apk"
                      download="teamgplay.apk"
                      className={getTVLoginFocusClasses(5, 'group flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/22 bg-[linear-gradient(135deg,rgba(58,16,95,0.74),rgba(25,8,50,0.72)_58%,rgba(7,10,25,0.8))] px-4 py-2.5 text-secondary-foreground shadow-[0_12px_24px_rgba(88,28,135,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:shadow-[0_16px_30px_rgba(34,211,238,0.14)]')}
                      onFocus={() => isTVMode && setTVLoginFocusIndex(5)}
                      tabIndex={isTVMode ? (tvLoginFocusIndex === 5 ? 0 : -1) : undefined}
                    >
                      <Smartphone className="h-5 w-5 text-secondary" />
                      <span className="font-semibold text-sm">Android</span>
                    </a>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  // Preparar secciones para TV
  const tvSections = [
    { title: 'Recién Agregados', items: recentlyAdded },
    { title: 'Películas Destacadas', items: featuredMovies },
    { title: 'Series Populares', items: featuredSeries },
    { title: 'Canales en Vivo', items: featuredChannels },
    { title: 'Continuar Viendo', items: continueWatchingItems },
    { title: 'Animes', items: featuredAnimes },
    { title: 'Doramas', items: featuredDoramas },
    { title: 'Novelas', items: featuredNovelas },
    { title: 'Documentales', items: featuredDocumentales },
  ].filter(section => section.items && section.items.length > 0);

  const normalizedTVSections = tvSections.map((section) => {
    if (section.title.includes('Continuar')) return { ...section, type: 'continue-watching' };
    if (section.title.includes('Canales')) return { ...section, type: 'channel' };
    if (section.title.includes('Series')) return { ...section, type: 'serie' };
    if (section.title.includes('Animes')) return { ...section, type: 'anime' };
    if (section.title.includes('Doramas')) return { ...section, type: 'dorama' };
    if (section.title.includes('Novelas')) return { ...section, type: 'novela' };
    if (section.title.includes('Documentales')) return { ...section, type: 'documental' };
    return { ...section, type: 'movie' };
  });

  const handleTVSelectItem = (item, sectionIndex, itemIndex) => {
    const sectionType = sectionIndex === null || sectionIndex === undefined
      ? null
      : normalizedTVSections[sectionIndex]?.type;
    const fallbackType = item?.__heroType || sectionType || item?.type || item?.itemType || item?.tipo || 'movie';

    if (sectionType || sectionIndex === null || sectionIndex === undefined) {
      navigateToItem(item, resolveTVItemType(item, fallbackType), {
        from: '/',
        returnState: (sectionIndex === null || sectionIndex === undefined)
          ? null
          : {
              focusedSectionIndex: sectionIndex,
              focusedItemIndex: itemIndex ?? 0,
            },
      });
      return;
    }
    // Determinar tipo basado en la sección
    const sectionTitle = tvSections[sectionIndex].title;
    let itemType = 'movie';

    if (sectionTitle.includes('Canales')) itemType = 'channel';
    else if (sectionTitle.includes('Series')) itemType = 'serie';
    else if (sectionTitle.includes('Animes')) itemType = 'anime';
    else if (sectionTitle.includes('Doramas')) itemType = 'dorama';
    else if (sectionTitle.includes('Novelas')) itemType = 'novela';
    else if (sectionTitle.includes('Documentales')) itemType = 'documental';
    else if (sectionTitle.includes('Continuar')) itemType = 'continue-watching';

    navigateToItem(item, itemType, {
      from: '/',
      returnState: {
        focusedSectionIndex: sectionIndex,
        focusedItemIndex: itemIndex ?? 0,
      },
    });
  };

  // Si es Android TV, mostrar interfaz optimizada
  if (isTVMode) {
    if (loading) {
      return <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Cargando...</div>;
    }

    return (
      <>
        <TVHome
          sections={normalizedTVSections}
          onSelectItem={handleTVSelectItem}
          onAddToMyList={handleAddToMyListSafe}
        />
        <TrailerModal
          isOpen={showTrailerModal}
          trailerUrl={currentTrailerUrl}
          onClose={() => setShowTrailerModal(false)}
        />
        <ContentAccessModal
          isOpen={showAccessModal}
          onClose={closeAccessModal}
          data={accessModalData}
onProceedWithTrial={proceedWithTrial}
        />
      </>
    );
  }

  if (isAndroidMobileUI) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

          :root {
            --background: 254 50% 5%;
            --foreground: 210 40% 98%;
            --primary: 190 100% 50%;
            --primary-foreground: 254 50% 5%;
            --secondary: 315 100% 60%;
            --secondary-foreground: 210 40% 98%;
            --muted-foreground: 190 30% 80%;
            --card-background: 254 50% 8%;
            --input-background: 254 50% 12%;
            --input-border: 315 100% 25%;
            --footer-text: 210 40% 70%;
          }

          body {
            font-family: 'Inter', sans-serif;
          }

          .text-glow-primary {
            text-shadow: 0 0 5px hsl(var(--primary) / 0.8), 0 0 10px hsl(var(--primary) / 0.6);
          }
          .text-glow-secondary {
            text-shadow: 0 0 5px hsl(var(--secondary) / 0.8), 0 0 10px hsl(var(--secondary) / 0.6);
          }
          .shadow-glow-primary {
            box-shadow: 0 0 25px hsl(var(--primary) / 0.8);
          }
          .drop-shadow-glow-logo {
            filter: drop-shadow(0 0 25px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 15px hsl(var(--primary) / 0.5));
          }
        `}</style>
        <div
          className="min-h-screen text-white"
          style={{
            backgroundImage: "url('./fondo.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          {recentlyAdded.length > 0 && (
            <div className="px-0 pb-1 pt-2">
              <CoverCarousel
                items={recentlyAdded}
                onItemClick={(item, itemType) => navigateToItem(item, itemType)}
                onTrailerClick={(item, trailerUrl) => handlePlayTrailerClick(trailerUrl || item?.trailerUrl || item?.trailer_url || item?.urlTrailer)}
                interval={5500}
                mobileMode
              />
            </div>
          )}
          <div className="container mx-auto space-y-8 px-4 pb-8 pt-2 sm:px-6 md:space-y-12 lg:px-8">
            {recentlyAdded.length > 0 && (
              <Carousel
                title="Recien Agregados"
                items={recentlyAdded}
                onItemClick={(item) => handleMobileVodSelection(item, item.tipo || 'movie')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType={(item) => item.tipo || 'movie'}
                showItemTypeBadge={true}
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {continueWatchingItems.length > 0 && (
              <Carousel
                title="Continuar Viendo"
                items={continueWatchingItems}
                onItemClick={(item) => handleMobileVodSelection(item, 'continue-watching')}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType={(item) => item.tipo || item.itemType || 'movie'}
                showItemTypeBadge={true}
                showProgressBar={true}
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {featuredChannels.length > 0 && (
              <Carousel
                title="Canales en Vivo Destacados"
                items={featuredChannels}
                onItemClick={(item) => handleMobileVodSelection(item, 'channel')}
                itemType="channel"
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {featuredMovies.length > 0 && (
              <Carousel
                title="Peliculas Destacadas"
                items={featuredMovies}
                onItemClick={(item) => handleMobileVodSelection(item, 'movie')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType="movie"
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {featuredSeries.length > 0 && (
              <Carousel
                title="Series Populares"
                items={featuredSeries}
                onItemClick={(item) => handleMobileVodSelection(item, 'serie')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType="serie"
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {featuredAnimes.length > 0 && (
              <Carousel
                title="Animes Destacados"
                items={featuredAnimes}
                onItemClick={(item) => handleMobileVodSelection(item, 'anime')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType="anime"
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {featuredDoramas.length > 0 && (
              <Carousel
                title="Doramas Populares"
                items={featuredDoramas}
                onItemClick={(item) => handleMobileVodSelection(item, 'dorama')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType="dorama"
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {featuredNovelas.length > 0 && (
              <Carousel
                title="Novelas Destacadas"
                items={featuredNovelas}
                onItemClick={(item) => handleMobileVodSelection(item, 'serie')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType="serie"
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}
            {featuredDocumentales.length > 0 && (
              <Carousel
                title="Documentales Imperdibles"
                items={featuredDocumentales}
                onItemClick={(item) => handleMobileVodSelection(item, 'serie')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType="serie"
                variant="classic"
                cardVariant="classic"
                showPlanLock={false}
              />
            )}

            {user && !loading && !contentError &&
              featuredChannels.length === 0 &&
              featuredMovies.length === 0 &&
              featuredSeries.length === 0 &&
              featuredAnimes.length === 0 &&
              featuredDoramas.length === 0 &&
              featuredNovelas.length === 0 &&
              featuredDocumentales.length === 0 &&
              recentlyAdded.length === 0 &&
              continueWatchingItems.length === 0 && (
              <p className="px-4 py-10 text-center text-lg text-gray-500">
                No hay contenido destacado disponible en este momento. Vuelve pronto.
              </p>
            )}
          </div>
        </div>

        {mobileVodDetail?.item && (
          <MobileVodDetailModal
            isOpen={Boolean(mobileVodDetail?.item)}
            item={mobileVodDetail.item}
            itemType={mobileVodDetail.itemType}
            canContinue={mobileVodDetailCanContinue}
            progressPercent={mobileVodDetailProgress}
            onClose={() => setMobileVodDetail(null)}
            onContinue={() => navigateToItem(mobileVodDetail.item, 'continue-watching')}
            onPlay={(selection) => {
              const hasEpisodeSelection = Number.isInteger(selection?.seasonIndex) && Number.isInteger(selection?.chapterIndex);
              navigateToItem(
                mobileVodDetail.item,
                mobileVodDetail.itemType,
                hasEpisodeSelection
                  ? {
                      seasonIndex: selection.seasonIndex,
                      chapterIndex: selection.chapterIndex,
                      continueWatching: false,
                    }
                  : null,
              );
            }}
            onAddToMyList={() => handleAddToMyListSafe(mobileVodDetail.item)}
            onTrailer={
              mobileVodDetailTrailerUrl
                ? () => handlePlayTrailerClick(mobileVodDetailTrailerUrl)
                : null
            }
          />
        )}

        {showTrailerModal && currentTrailerUrl && (
          <TrailerModal
            trailerUrl={currentTrailerUrl}
            onClose={() => {
              setShowTrailerModal(false);
              setCurrentTrailerUrl('');
              try {
                const cb = window.__lastTrailerOnClose;
                if (typeof cb === 'function') {
                  cb();
                }
              } catch (err) {
                console.warn('[Home.jsx] Error calling trailer onClose callback', err);
              } finally {
                window.__lastTrailerOnClose = null;
              }
            }}
          />
        )}

        <ContentAccessModal
          isOpen={showAccessModal}
          onClose={closeAccessModal}
          data={accessModalData}
          onProceedWithTrial={proceedWithTrial}
        />

        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            duration={3000}
            onClose={() => setToastMessage('')}
          />
        )}
      </>
    );
  }

  // Interfaz web tradicional
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

        :root {
          --background: 254 50% 5%;
          --foreground: 210 40% 98%;
          --primary: 190 100% 50%;
          --primary-foreground: 254 50% 5%;
          --secondary: 315 100% 60%;
          --secondary-foreground: 210 40% 98%;
          --muted-foreground: 190 30% 80%;
          --card-background: 254 50% 8%;
          --input-background: 254 50% 12%;
          --input-border: 315 100% 25%;
          --footer-text: 210 40% 70%;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        .text-glow-primary {
          text-shadow: 0 0 5px hsl(var(--primary) / 0.8), 0 0 10px hsl(var(--primary) / 0.6);
        }
        .text-glow-secondary {
          text-shadow: 0 0 5px hsl(var(--secondary) / 0.8), 0 0 10px hsl(var(--secondary) / 0.6);
        }
        .shadow-glow-primary {
          box-shadow: 0 0 25px hsl(var(--primary) / 0.8);
        }
        .drop-shadow-glow-logo {
          filter: drop-shadow(0 0 25px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 15px hsl(var(--primary) / 0.5));
        }
      `}</style>
      <div
        className="relative min-h-screen overflow-x-hidden text-white"
        style={{
          backgroundImage: "url('background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-[28rem] h-[48rem] bg-[radial-gradient(circle_at_18%_18%,rgba(217,70,239,0.18),transparent_22%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.14),transparent_20%),radial-gradient(circle_at_50%_80%,rgba(76,29,149,0.26),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.22),transparent_46%)]" />
        {/* Cover Carousel - EDGE-TO-EDGE (fuera del container) - Agarra 4 items al azar */}
        {recentlyAdded.length > 0 && (
          <CoverCarousel
            items={recentlyAdded}
            onItemClick={(item, itemType) => navigateToItem(item, itemType)}
            onTrailerClick={(item, trailerUrl) => handlePlayTrailerClick(trailerUrl || item?.trailerUrl || item?.trailer_url || item?.urlTrailer)}
            interval={5500}
          />
        )}

        <div className="relative mx-auto w-full max-w-[calc(100vw-1.5rem)] px-3 pb-10 pt-4 sm:max-w-[calc(100vw-2rem)] sm:px-4 sm:pt-6 lg:max-w-[calc(100vw-3rem)] lg:px-6 2xl:max-w-[1840px]">
          <div className="space-y-6 rounded-[36px] border border-fuchsia-300/10 bg-[linear-gradient(180deg,rgba(8,4,22,0.82),rgba(7,8,27,0.92)_42%,rgba(4,8,20,0.96))] p-4 shadow-[0_28px_70px_rgba(17,24,39,0.35)] backdrop-blur-sm sm:p-5 md:space-y-8 md:p-6 lg:p-7">
            {recentlyAdded.length > 0 && (
              <Carousel
                title="Recien Agregados"
                subtitle="Disfruta lo mas reciente en series, peliculas y mas."
                actionLabel="Ver todos"
                onActionClick={() => navigate('/peliculas')}
                items={recentlyAdded}
                onItemClick={(item) => handleMobileVodSelection(item, item.tipo || 'movie')}
                onPlayTrailerClick={handlePlayTrailerClick}
                onAddToMyListClick={handleAddToMyListSafe}
                itemType={(item) => item.tipo || 'movie'}
                showItemTypeBadge={true}
                variant="brand"
                cardVariant="brand"
                showPlanLock={false}
              />
            )}
        {continueWatchingItems.length > 0 && (
          <Carousel
            title="Continuar Viendo"
            subtitle="Retoma donde lo dejaste."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/mi-lista')}
            items={continueWatchingItems}
            onItemClick={(item) => handleMobileVodSelection(item, 'continue-watching')}
            onAddToMyListClick={handleAddToMyListSafe}
            itemType={(item) => item.tipo || item.itemType || 'movie'}
            showItemTypeBadge={true}
            showProgressBar={true}
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}
        {featuredChannels.length > 0 && (
          <Carousel
            title="Canales en Vivo Destacados"
            subtitle="Lo mas visto ahora mismo."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/live-tv')}
            items={featuredChannels}
            onItemClick={(item) => handleMobileVodSelection(item, 'channel')}
            itemType="channel"
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}
        {featuredMovies.length > 0 && (
          <Carousel
            title="Películas Destacadas"
            subtitle="Estrenos, 4K y favoritos del catalogo."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/peliculas')}
            items={featuredMovies}
            onItemClick={(item) => handleMobileVodSelection(item, 'movie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyListSafe}
            itemType="movie"
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}
        {featuredSeries.length > 0 && (
          <Carousel
            title="Series Populares"
            subtitle="Temporadas, episodios y maratones listos para ver."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/series')}
            items={featuredSeries}
            onItemClick={(item) => handleMobileVodSelection(item, 'serie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyListSafe}
            itemType="serie"
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}
        {featuredAnimes.length > 0 && (
          <Carousel
            title="Animes Destacados"
            subtitle="Shonen, fantasia y joyas recien agregadas."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/animes')}
            items={featuredAnimes}
            onItemClick={(item) => handleMobileVodSelection(item, 'anime')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyListSafe}
            itemType="anime"
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}
        {featuredDoramas.length > 0 && (
          <Carousel
            title="Doramas Populares"
            subtitle="Historias intensas para maratonear esta semana."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/doramas')}
            items={featuredDoramas}
            onItemClick={(item) => handleMobileVodSelection(item, 'dorama')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyListSafe}
            itemType="dorama"
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}
        {featuredNovelas.length > 0 && (
          <Carousel
            title="Novelas Destacadas"
            subtitle="Clasicos y nuevas historias siempre a mano."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/novelas')}
            items={featuredNovelas}
            onItemClick={(item) => handleMobileVodSelection(item, 'novela')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyListSafe}
            itemType={(item) => item.tipo || 'novela'}
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}
        {featuredDocumentales.length > 0 && (
          <Carousel
            title="Documentales Imperdibles"
            subtitle="Historia, crimen, naturaleza y mucho mas."
            actionLabel="Ver todos"
            onActionClick={() => navigate('/documentales')}
            items={featuredDocumentales}
            onItemClick={(item) => handleMobileVodSelection(item, 'documental')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyListSafe}
            itemType={(item) => item.tipo || 'documental'}
            variant="brand"
            cardVariant="brand"
            showPlanLock={false}
          />
        )}

        {user && !loading && !contentError &&
          featuredChannels.length === 0 &&
          featuredMovies.length === 0 &&
          featuredSeries.length === 0 &&
          featuredAnimes.length === 0 &&
          featuredDoramas.length === 0 &&
          featuredNovelas.length === 0 &&
          featuredDocumentales.length === 0 &&
          recentlyAdded.length === 0 &&
          continueWatchingItems.length === 0 && (
          <p className="px-4 py-10 text-center text-lg text-gray-400">
            No hay contenido destacado disponible en este momento. ¡Vuelve pronto!
          </p>
        )}
        </div>

          <div className="mt-6 grid gap-3 rounded-[28px] border border-white/8 bg-[linear-gradient(135deg,rgba(14,9,34,0.92),rgba(15,23,42,0.86)_55%,rgba(10,10,25,0.94))] p-4 shadow-[0_20px_44px_rgba(15,23,42,0.25)] md:grid-cols-5">
            {webHomeHighlights.map((highlight) => {
              const HighlightIcon = highlight.icon;
              return (
                <div
                  key={highlight.title}
                  className="rounded-[22px] border border-fuchsia-300/10 bg-white/[0.03] px-4 py-4"
                >
                  <HighlightIcon className="h-5 w-5 text-fuchsia-200" />
                  <p className="mt-3 text-sm font-semibold text-fuchsia-100">
                    {highlight.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-300/72">
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {mobileVodDetail?.item && (
        <MobileVodDetailModal
          isOpen={Boolean(mobileVodDetail?.item)}
          item={mobileVodDetail.item}
          itemType={mobileVodDetail.itemType}
          canContinue={mobileVodDetailCanContinue}
          progressPercent={mobileVodDetailProgress}
          onClose={() => setMobileVodDetail(null)}
          onContinue={() => navigateToItem(mobileVodDetail.item, 'continue-watching')}
          onPlay={(selection) => {
            const hasEpisodeSelection = Number.isInteger(selection?.seasonIndex) && Number.isInteger(selection?.chapterIndex);
            navigateToItem(
              mobileVodDetail.item,
              mobileVodDetail.itemType,
              hasEpisodeSelection
                ? {
                    seasonIndex: selection.seasonIndex,
                    chapterIndex: selection.chapterIndex,
                    continueWatching: false,
                  }
                : null,
            );
          }}
          onAddToMyList={() => handleAddToMyListSafe(mobileVodDetail.item)}
          onTrailer={
            mobileVodDetailTrailerUrl
              ? () => handlePlayTrailerClick(mobileVodDetailTrailerUrl)
              : null
          }
        />
      )}

      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal
          trailerUrl={currentTrailerUrl}
          onClose={() => {
            setShowTrailerModal(false);
            setCurrentTrailerUrl('');
            try {
              const cb = window.__lastTrailerOnClose;
              if (typeof cb === 'function') {
                // call and then clear it
                cb();
              }
            } catch (err) {
              console.warn('[Home.jsx] Error calling trailer onClose callback', err);
            } finally {
              window.__lastTrailerOnClose = null;
            }
          }}
        />
      )}

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={proceedWithTrial}
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setToastMessage('')}
        />
      )}
    </>
  );
}

export default Home;
