// src/pages/Home.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Carousel from '../components/Carousel.jsx';
import TVHome from '../components/TVHome.jsx';
import { isAndroidTV } from '../utils/platformUtils.js';
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
  fetchUserChannels,
  fetchUserMovies,
  fetchUserSeries,
  fetchVideosByType,
} from '../utils/api.js';
import TrailerModal from '../components/TrailerModal.jsx';
import { useContentAccess } from '../hooks/useContentAccess.js';
import { Laptop, Smartphone } from 'lucide-react';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import CoverCarousel from '../components/CoverCarousel.jsx';

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

export function Home() {
  const { user, login } = useAuth();
  const location = useLocation();
  const dataCache = useDataCache();
  const outletContext = useOutletContext();
  const setAllSearchItems = outletContext?.setAllSearchItems;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // State for login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State for content
  const [featuredChannels, setFeaturedChannels] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [featuredSeries, setFeaturedSeries] = useState([]);
  const [featuredAnimes, setFeaturedAnimes] = useState([]);
  const [featuredDoramas, setFeaturedDoramas] = useState([]);
  const [featuredNovelas, setFeaturedNovelas] = useState([]);
  const [featuredDocumentales, setFeaturedDocumentales] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [continueWatchingItems, setContinueWatchingItems] = useState([]);
  const [contentError, setContentError] = useState(null);

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

  const handleSubmit = async (e) => {
  e.preventDefault();
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

  const isLoadingRef = useRef(false);
  const searchDataLoadedRef = useRef(false); // Evita recargar datos de búsqueda en cada render

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
        setFeaturedChannels(cachedData.featuredChannels || []);
        setFeaturedMovies(cachedData.featuredMovies || []);
        setFeaturedSeries(cachedData.featuredSeries || []);
        setFeaturedAnimes(cachedData.featuredAnimes || []);
        setFeaturedDoramas(cachedData.featuredDoramas || []);
        setFeaturedNovelas(cachedData.featuredNovelas || []);
        setFeaturedDocumentales(cachedData.featuredDocumentales || []);
        setRecentlyAdded(cachedData.recentlyAdded || []);
        setContinueWatchingItems(cachedData.continueWatchingItems || []);
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

      setLoading(true);
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
        const processedRecentlyAdded = processResult(recentlyAddedResult, setRecentlyAdded, 'Recently Added', 10);
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
          ...processedContinueWatching.map(item => ({ ...item, type: 'continuar-viendo', itemType: 'continuar' })),
          ...processedRecentlyAdded.map(item => ({ ...item, type: 'recién-agregado', itemType: 'recently-added' })),
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
                fetchUserChannels('Todos'),
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
                allChannelsResult,
                allMoviesResult,
                allSeriesResult,
                allAnimesResult,
                allDoramasResult,
                allNovelasResult,
                allDocumentalesResult,
                cine2025Result,
                cine2026Result,
              ] = fullIndexResults;

              const allChannels = processResult(allChannelsResult, null, 'All Channels');
              const allMovies = processResult(allMoviesResult, null, 'All Movies');
              const allSeries = processResult(allSeriesResult, null, 'All Series');
              const allAnimes = processResult(allAnimesResult, null, 'All Animes');
              const allDoramas = processResult(allDoramasResult, null, 'All Doramas');
              const allNovelas = processResult(allNovelasResult, null, 'All Novelas');
              const allDocumentales = processResult(allDocumentalesResult, null, 'All Documentales');
              const cine2025 = processResult(cine2025Result, null, 'Cine 2025');
              const cine2026 = processResult(cine2026Result, null, 'Cine 2026');

              const fullSearchItems = [
                ...allChannels.map(item => ({ ...item, type: 'canal', itemType: 'channel' })),
                ...allMovies.map(item => ({ ...item, type: 'película', itemType: 'movie' })),
                ...allSeries.map(item => ({ ...item, type: 'serie', itemType: 'serie' })),
                ...allAnimes.map(item => ({ ...item, type: 'anime', itemType: 'anime' })),
                ...allDoramas.map(item => ({ ...item, type: 'dorama', itemType: 'dorama' })),
                ...allNovelas.map(item => ({ ...item, type: 'novela', itemType: 'novela' })),
                ...allDocumentales.map(item => ({ ...item, type: 'documental', itemType: 'documental' })),
                ...cine2025.map(item => ({ ...item, type: 'cine-2025', itemType: 'cine2025' })),
                ...cine2026.map(item => ({ ...item, type: 'cine-2026', itemType: 'cine2026' })),
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

      const handleItemClick = (item, itemType) => {
      const buildContinueWatchingState = (resolvedItem) => {
        const watchProgress = resolvedItem?.watchProgress || {};
        const lastTime = Number(watchProgress.lastTime ?? watchProgress.progress ?? 0);
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

      const navigateToPlayer = (resolvedItem, resolvedType) => {
        const id = resolvedItem._id || resolvedItem.id;
        let path;
        let navigationState;
  
        if (resolvedType === 'continue-watching') {
          const actualType = resolvedItem.tipo || resolvedItem.itemType;
          if (!actualType) {
            console.error("Continue watching item doesn't have a type (tipo or itemType):", resolvedItem);
            return;
          }
          path = `/watch/${actualType}/${id}`;
          navigationState = buildContinueWatchingState(resolvedItem);
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
    handleItemClick(item, item.itemType);
  };

  const handleAddToMyList = async (item) => {
    try {
      console.log('[Home.jsx] Agregando a Mi Lista:', item);
      const response = await axiosInstance.post('/api/users/my-list/add', {
        itemId: item._id || item.id,
        tipo: item.tipo || item.itemType || 'movie',
        title: item.name || item.title,
        thumbnail: item.thumbnail,
        description: item.description
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
          style={{
            backgroundImage: `url(./fondo.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <main className="relative z-10 flex-grow flex flex-col md:flex-row items-center justify-center p-4 min-h-screen">
            {/* Sección de bienvenida - visible en desktop, compacta en móvil */}
            <div className="flex md:hidden flex-col items-center justify-center text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-primary text-glow-primary mb-4">
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
            
            <div className="hidden md:flex flex-col flex-1 p-8 lg:p-16 items-center justify-center text-center">
                <h1 className="text-5xl font-black text-primary text-glow-primary mb-6">
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
                <p className="text-xl text-muted-foreground mt-4 max-w-md">
                  Inicia sesión para descubrir un mundo de entretenimiento.
                </p>
            </div>
            
            <div className="flex-1 w-full max-w-md p-4">
              <div 
                className="w-full p-6 sm:p-8 rounded-2xl" 
                style={{
                  backgroundColor: 'hsl(var(--card-background) / 0.8)',
                  border: '1px solid hsl(var(--input-border) / 0.5)'
                }}
              >
                <h2 className="text-2xl sm:text-3xl font-black text-center text-primary text-glow-primary mb-6 sm:mb-8">
                    Iniciar Sesión
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Usuario</label>
                    <input 
                      type="text" 
                      placeholder="Tu nombre de usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 sm:py-3 rounded-lg text-foreground focus:outline-none focus:ring-2 text-base"
                      style={{
                        backgroundColor: 'hsl(var(--input-background))',
                        border: '1px solid hsl(var(--input-border))',
                        '--tw-ring-color': 'hsl(var(--primary))'
                      }}
                      disabled={isLoggingIn}
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Contraseña</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 sm:py-3 pr-12 rounded-lg text-foreground focus:outline-none focus:ring-2 text-base"
                        style={{
                          backgroundColor: 'hsl(var(--input-background))',
                          border: '1px solid hsl(var(--input-border))',
                          '--tw-ring-color': 'hsl(var(--primary))'
                        }}
                        disabled={isLoggingIn}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
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
                    <Link to="/forgot-password" className="text-xs text-secondary hover:underline mt-2 inline-block">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className={`w-full font-bold py-3 sm:py-3 rounded-lg text-base sm:text-lg transition-all duration-300 transform flex items-center justify-center touch-manipulation ${
                      isLoggingIn 
                        ? 'bg-gray-500 cursor-not-allowed animate-pulse' 
                        : 'bg-primary hover:scale-105 shadow-glow-primary active:scale-95'
                    }`}
                    style={{
                      backgroundColor: isLoggingIn ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))',
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

                <p className="text-center text-sm text-muted-foreground mt-4 sm:mt-6">
                  ¿No tienes cuenta?{' '}
                  <Link to="/register" className="font-medium text-secondary hover:underline text-glow-secondary touch-manipulation">
                    Regístrate aquí
                  </Link>
                </p>

                <div className="mt-6 pt-6 border-t border-input-border/50">
                  <h3 className="text-lg font-bold text-primary mb-3 text-center">Descargar la aplicación</h3>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a 
                      href="https://teamg.store/teamgplay-desktop.exe" 
                      download="teamgplay-desktop.exe"
                      className="group flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary-foreground transition-all duration-300 hover:bg-secondary/40 hover:border-secondary/70 hover:scale-105"
                    >
                      <Laptop className="h-5 w-5 text-secondary" />
                      <span className="font-semibold text-sm">Windows</span>
                    </a>
                    <a 
                      href="https://teamg.store/teamgplay.apk" 
                      download="teamgplay.apk"
                      className="group flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary-foreground transition-all duration-300 hover:bg-secondary/40 hover:border-secondary/70 hover:scale-105"
                    >
                      <Smartphone className="h-5 w-5 text-secondary" />
                      <span className="font-semibold text-sm">Android</span>
                    </a>
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
    { title: 'Continuar Viendo', items: continueWatchingItems },
    { title: 'Canales en Vivo', items: featuredChannels },
    { title: 'Películas Destacadas', items: featuredMovies },
    { title: 'Series Populares', items: featuredSeries },
    { title: 'Animes', items: featuredAnimes },
    { title: 'Doramas', items: featuredDoramas },
    { title: 'Novelas', items: featuredNovelas },
    { title: 'Documentales', items: featuredDocumentales },
    { title: 'Recién Agregados', items: recentlyAdded },
  ].filter(section => section.items && section.items.length > 0);

  const handleTVSelectItem = (item, sectionIndex, itemIndex) => {
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
    
    handleItemClick(item, itemType);
  };

  // Si es Android TV, mostrar interfaz optimizada
  if (isAndroidTV()) {
    if (loading) {
      return <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Cargando...</div>;
    }
    
    return (
      <>
        <TVHome 
          sections={tvSections}
          onSelectItem={handleTVSelectItem}
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
        className="text-white min-h-screen"
        style={{
          backgroundImage: "url('background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Cover Carousel - EDGE-TO-EDGE (fuera del container) - Agarra 4 items al azar */}
        {recentlyAdded.length > 0 && (
          <CoverCarousel
            items={recentlyAdded}
            onItemClick={(item, itemType) => handleItemClick(item, itemType)}
            onTrailerClick={(item) => handlePlayTrailerClick(item.trailerUrl)}
            interval={5500}
          />
        )}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 md:pt-4 pb-8 space-y-8 md:space-y-12">{recentlyAdded.length > 0 && (
          <Carousel
            title="Recien Agregados"
            items={recentlyAdded}
            onItemClick={(item) => handleItemClick(item, item.tipo || 'movie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyList}
            itemType={item => item.tipo || 'movie'}
            showItemTypeBadge={true}
          />
        )}
        {continueWatchingItems.length > 0 && (
          <Carousel
            title="Continuar Viendo"
            items={continueWatchingItems}
            onItemClick={(item) => handleItemClick(item, 'continue-watching')}
            onAddToMyListClick={handleAddToMyList}
            itemType={item => item.tipo || item.itemType || 'movie'}
            showItemTypeBadge={true}
            showProgressBar={true}
          />
        )}
        {featuredChannels.length > 0 && (
          <Carousel
            title="Canales en Vivo Destacados"
            items={featuredChannels}
            onItemClick={(item) => handleItemClick(item, 'channel')}
            itemType="channel"
          />
        )}
        {featuredMovies.length > 0 && (
          <Carousel
            title="Películas Destacadas"
            items={featuredMovies}
            onItemClick={(item) => handleItemClick(item, 'movie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyList}
            itemType="movie"
          />
        )}
        {featuredSeries.length > 0 && (
          <Carousel
            title="Series Populares"
            items={featuredSeries}
            onItemClick={(item) => handleItemClick(item, 'serie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyList}
            itemType="serie"
          />
        )}
        {featuredAnimes.length > 0 && (
          <Carousel
            title="Animes Destacados"
            items={featuredAnimes}
            onItemClick={(item) => handleItemClick(item, 'anime')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyList}
            itemType="anime"
          />
        )}
        {featuredDoramas.length > 0 && (
          <Carousel
            title="Doramas Populares"
            items={featuredDoramas}
            onItemClick={(item) => handleItemClick(item, 'dorama')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyList}
            itemType="dorama"
          />
        )}
        {featuredNovelas.length > 0 && (
          <Carousel
            title="Novelas Destacadas"
            items={featuredNovelas}
            onItemClick={(item) => handleItemClick(item, 'serie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyList}
            itemType="serie"
          />
        )}
        {featuredDocumentales.length > 0 && (
          <Carousel
            title="Documentales Imperdibles"
            items={featuredDocumentales}
            onItemClick={(item) => handleItemClick(item, 'serie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            onAddToMyListClick={handleAddToMyList}
            itemType="serie"
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
          <p className="text-center text-gray-500 py-10 text-lg px-4">
            No hay contenido destacado disponible en este momento. ¡Vuelve pronto!
          </p>
        )}
        </div>
      </div>

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
