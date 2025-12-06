// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Carousel from '../components/Carousel.jsx';
import TVHome from '../components/TVHome.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { isAndroidTV } from '../utils/platformUtils.js';
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

export function Home() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // State for login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // State for all content (for global search)
  const [allChannels, setAllChannels] = useState([]);
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [allAnimes, setAllAnimes] = useState([]);
  const [allDoramas, setAllDoramas] = useState([]);
  const [allNovelas, setAllNovelas] = useState([]);
  const [allDocumentales, setAllDocumentales] = useState([]);

  // State for trailer modal
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  // Estado para búsqueda global
  const [allSearchItems, setAllSearchItems] = useState([]);

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

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setContentError(null);
      try {
        const results = await Promise.allSettled([
          fetchContinueWatching(),
          fetchFeaturedChannels(),
          fetchFeaturedMovies(),
          fetchFeaturedSeries(),
          fetchFeaturedAnimes(),
          fetchFeaturedDoramas(),
          fetchFeaturedNovelas(),
          fetchFeaturedDocumentales(),
          fetchRecentlyAdded(),
          // Cargas adicionales para búsqueda global (limites altos para obtener todo)
          fetchUserChannels('Todos'),
          fetchVideosByType('pelicula', 1, 1000),
          fetchVideosByType('serie', 1, 1000),
          fetchVideosByType('anime', 1, 500),
          fetchVideosByType('dorama', 1, 500),
          fetchVideosByType('novela', 1, 500),
          fetchVideosByType('documental', 1, 500),
        ]);

        const [
          continueWatchingResult,
          channelsResult,
          moviesResult,
          seriesResult,
          animesResult,
          doramasResult,
          novelasResult,
          documentalesResult,
          recentlyAddedResult,
          allChannelsResult,
          allMoviesResult,
          allSeriesResult,
          allAnimesResult,
          allDoramasResult,
          allNovelasResult,
          allDocumentalesResult,
        ] = results;

        if (continueWatchingResult.status === 'fulfilled' && Array.isArray(continueWatchingResult.value)) {
          const sortedItems = continueWatchingResult.value.sort((a, b) => {
            const dateA = a.watchProgress?.lastWatched ? new Date(a.watchProgress.lastWatched) : new Date(0);
            const dateB = b.watchProgress?.lastWatched ? new Date(b.watchProgress.lastWatched) : new Date(0);
            return dateB - dateA;
          });
          setContinueWatchingItems(sortedItems);
        } else {
          console.error('[Home.jsx] Error loading "Continue Watching":', continueWatchingResult.reason);
          setContinueWatchingItems([]);
        }
        
        if (channelsResult.status === 'fulfilled' && Array.isArray(channelsResult.value)) {
          setFeaturedChannels(channelsResult.value.slice(0, 15));
        } else {
          console.error('[Home.jsx] Error loading featured channels:', channelsResult.reason);
          setFeaturedChannels([]);
        }

        if (moviesResult.status === 'fulfilled' && Array.isArray(moviesResult.value)) {
          setFeaturedMovies(moviesResult.value.slice(0, 15));
        } else {
          console.error('[Home.jsx] Error loading featured movies:', moviesResult.reason);
          setFeaturedMovies([]);
        }
        
        if (seriesResult.status === 'fulfilled' && Array.isArray(seriesResult.value)) {
          setFeaturedSeries(seriesResult.value.slice(0, 15));
        } else {
          console.error('[Home.jsx] Error loading featured series:', seriesResult.reason);
          setFeaturedSeries([]);
        }

        if (animesResult.status === 'fulfilled' && Array.isArray(animesResult.value)) {
          setFeaturedAnimes(animesResult.value.slice(0, 15));
        } else {
          console.error('[Home.jsx] Error loading featured animes:', animesResult.reason);
          setFeaturedAnimes([]);
        }

        if (doramasResult.status === 'fulfilled' && Array.isArray(doramasResult.value)) {
          setFeaturedDoramas(doramasResult.value.slice(0, 15));
        } else {
          console.error('[Home.jsx] Error loading featured doramas:', doramasResult.reason);
          setFeaturedDoramas([]);
        }

        if (novelasResult.status === 'fulfilled' && Array.isArray(novelasResult.value)) {
          setFeaturedNovelas(novelasResult.value.slice(0, 15));
        } else {
          console.error('[Home.jsx] Error loading featured novelas:', novelasResult.reason);
          setFeaturedNovelas([]);
        }

        if (documentalesResult.status === 'fulfilled' && Array.isArray(documentalesResult.value)) {
          setFeaturedDocumentales(documentalesResult.value.slice(0, 15));
      } else {
        console.error('[Home.jsx] Error loading featured documentales:', documentalesResult.reason);
        setFeaturedDocumentales([]);
      }

      if (recentlyAddedResult.status === 'fulfilled' && Array.isArray(recentlyAddedResult.value)) {
        setRecentlyAdded(recentlyAddedResult.value.slice(0, 15));
      } else {
        console.error('[Home.jsx] Error loading recently added:', recentlyAddedResult.reason);
        setRecentlyAdded([]);
      }

      // Cargar TODOS los datos para búsqueda global
      if (allChannelsResult.status === 'fulfilled' && Array.isArray(allChannelsResult.value)) {
        setAllChannels(allChannelsResult.value);
      } else {
        console.error('[Home.jsx] Error loading all channels:', allChannelsResult.reason);
        setAllChannels([]);
      }

      if (allMoviesResult.status === 'fulfilled') {
        const moviesRaw = allMoviesResult.value;
        console.log('[Home.jsx] allMoviesResult.value:', moviesRaw);
        
        let moviesArray = [];
        // Manejo de diferentes formatos de respuesta
        if (moviesRaw?.videos && Array.isArray(moviesRaw.videos)) {
          moviesArray = moviesRaw.videos; // Formato: { videos: [...], total: X }
        } else if (Array.isArray(moviesRaw)) {
          moviesArray = moviesRaw; // Formato: [...]
        }
        
        console.log('[Home.jsx] Loaded movies for search:', moviesArray.length);
        if (moviesArray.length > 0) {
          console.log('[Home.jsx] First 5 movies:', moviesArray.slice(0, 5).map(m => ({ id: m.id || m._id, name: m.name || m.title })));
        }
        setAllMovies(moviesArray);
      } else {
        console.error('[Home.jsx] Error loading all movies:', allMoviesResult.reason);
        setAllMovies([]);
      }

      if (allSeriesResult.status === 'fulfilled') {
        const seriesRaw = allSeriesResult.value;
        let seriesArray = [];
        if (seriesRaw?.videos && Array.isArray(seriesRaw.videos)) {
          seriesArray = seriesRaw.videos;
        } else if (Array.isArray(seriesRaw)) {
          seriesArray = seriesRaw;
        }
        console.log('[Home.jsx] Loaded series for search:', seriesArray.length);
        setAllSeries(seriesArray);
      } else {
        console.error('[Home.jsx] Error loading all series:', allSeriesResult.reason);
        setAllSeries([]);
      }

      // Procesar animes, doramas, novelas, documentales para búsqueda
      if (allAnimesResult.status === 'fulfilled') {
        const animesRaw = allAnimesResult.value;
        let animesArray = [];
        if (animesRaw?.videos && Array.isArray(animesRaw.videos)) {
          animesArray = animesRaw.videos;
        } else if (Array.isArray(animesRaw)) {
          animesArray = animesRaw;
        }
        console.log('[Home.jsx] Loaded animes for search:', animesArray.length);
        setAllAnimes(animesArray);
      } else {
        console.error('[Home.jsx] Error loading all animes:', allAnimesResult.reason);
        setAllAnimes([]);
      }

      if (allDoramasResult.status === 'fulfilled') {
        const doramasRaw = allDoramasResult.value;
        let doramasArray = [];
        if (doramasRaw?.videos && Array.isArray(doramasRaw.videos)) {
          doramasArray = doramasRaw.videos;
        } else if (Array.isArray(doramasRaw)) {
          doramasArray = doramasRaw;
        }
        console.log('[Home.jsx] Loaded doramas for search:', doramasArray.length);
        setAllDoramas(doramasArray);
      } else {
        console.error('[Home.jsx] Error loading all doramas:', allDoramasResult.reason);
        setAllDoramas([]);
      }

      if (allNovelasResult.status === 'fulfilled') {
        const novelasRaw = allNovelasResult.value;
        let novelasArray = [];
        if (novelasRaw?.videos && Array.isArray(novelasRaw.videos)) {
          novelasArray = novelasRaw.videos;
        } else if (Array.isArray(novelasRaw)) {
          novelasArray = novelasRaw;
        }
        console.log('[Home.jsx] Loaded novelas for search:', novelasArray.length);
        setAllNovelas(novelasArray);
      } else {
        console.error('[Home.jsx] Error loading all novelas:', allNovelasResult.reason);
        setAllNovelas([]);
      }

      if (allDocumentalesResult.status === 'fulfilled') {
        const documentalesRaw = allDocumentalesResult.value;
        let documentalesArray = [];
        if (documentalesRaw?.videos && Array.isArray(documentalesRaw.videos)) {
          documentalesArray = documentalesRaw.videos;
        } else if (Array.isArray(documentalesRaw)) {
          documentalesArray = documentalesRaw;
        }
        console.log('[Home.jsx] Loaded documentales for search:', documentalesArray.length);
        setAllDocumentales(documentalesArray);
      } else {
        console.error('[Home.jsx] Error loading all documentales:', allDocumentalesResult.reason);
        setAllDocumentales([]);
      }

    } catch (err) {
      console.error('[Home.jsx] General error in loadInitialData:', err);
      setContentError(err.message || "Error loading content.");
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    loadInitialData();
  } else {
    setLoading(false); 
  }
}, [user]);

  const handleItemClick = (item, itemTypeFromCarousel) => {
    console.log("[Home.jsx] ===== HANDLE ITEM CLICK =====");
    console.log("[Home.jsx] Item clicked:", JSON.stringify(item, null, 2));
    console.log("[Home.jsx] itemTypeFromCarousel:", itemTypeFromCarousel);
    
    let type = item.itemType || item.tipo || itemTypeFromCarousel;
    const id = item.id || item._id;

    console.log("[Home.jsx] Extracted type:", type, "id:", id);

    if (!type || !id) {
      console.error("[Home.jsx] handleItemClick: Item type or ID is undefined.", item);
      alert("Error: Cannot determine the content to play.");
      return;
    }

    // Función para navegar al contenido después de verificar acceso
    const navigateToContent = () => {
      console.log("[Home.jsx] navigateToContent called - access granted, navigating...");
      
      if (type === 'channel') {
        // Para canales, navegar directamente
        console.log("[Home.jsx] Navigating to channel:", `/watch/${type}/${id}`);
        navigate(`/watch/${type}/${id}`);
        return;
      }

      // Para contenido VOD, manejar progreso
  const progress = item.watchProgress || {};
  // Historically we rounded the saved second when navigating from "Continuar Viendo"
  const startTime = (progress && progress.lastTime != null) ? Math.round(progress.lastTime) : 0;
      const lastChapter = progress.lastChapter || 0;
      const lastSeason = progress.lastSeason !== undefined ? progress.lastSeason : 0;
      
      const navigationState = {};
      
      // Para "Continuar viendo", siempre pasar el progreso
      if (itemTypeFromCarousel === 'continue-watching' || startTime > 5) {
        navigationState.continueWatching = true;
        navigationState.startTime = startTime;
        
        // Si es una serie y tiene capítulos, navegar al último capítulo visto
        if ((type === 'serie' || type === 'series') && lastChapter !== undefined) {
          navigationState.seasonIndex = lastSeason;
          navigationState.chapterIndex = lastChapter;
          console.log("[Home.jsx] Passing continue watching state:", {
            seasonIndex: lastSeason,
            chapterIndex: lastChapter,
            startTime: startTime
          });
        }
      }
      
      console.log("[Home.jsx] Navigating to VOD:", `/watch/${type}/${id}`, "with state:", navigationState);
      navigate(`/watch/${type}/${id}`, { state: navigationState });
    };

    console.log("[Home.jsx] About to call checkContentAccess...");
    // TODOS los tipos de contenido necesitan verificación de acceso
    checkContentAccess(item, navigateToContent);
  };

  const handleProceedWithTrial = () => {
    // El hook maneja la navegación internamente
    proceedWithTrial();
  };

  const handlePlayTrailerClick = (trailerUrl) => {
    // Support an optional second argument: onClose callback (called when modal closes)
    const onCloseCallback = typeof arguments[1] === 'function' ? arguments[1] : null;
    if (trailerUrl) {
      setCurrentTrailerUrl(trailerUrl);
      setShowTrailerModal(true);
      // store temporarily on the window so the modal onClose can access it
      // without adding more state complexity. This is a small, explicit
      // shortcut for the debugging/fix flow.
      if (onCloseCallback) {
        window.__lastTrailerOnClose = onCloseCallback;
      }
    }
  };

  // Construir array combinado de búsqueda (GLOBAL - todos los datos disponibles)
  useEffect(() => {
    // Usar ALL data si está disponible, sino usar featured
    const channels = allChannels.length > 0 ? allChannels : featuredChannels;
    const movies = allMovies.length > 0 ? allMovies : featuredMovies;
    const series = allSeries.length > 0 ? allSeries : featuredSeries;
    const animes = allAnimes.length > 0 ? allAnimes : featuredAnimes;
    const doramas = allDoramas.length > 0 ? allDoramas : featuredDoramas;
    const novelas = allNovelas.length > 0 ? allNovelas : featuredNovelas;
    const documentales = allDocumentales.length > 0 ? allDocumentales : featuredDocumentales;

    const searchItems = [
      ...channels.map(item => ({ ...item, type: 'canal', itemType: 'channel' })),
      ...movies.map(item => ({ ...item, type: 'película', itemType: 'movie' })),
      ...series.map(item => ({ ...item, type: 'serie', itemType: 'serie' })),
      ...animes.map(item => ({ ...item, type: 'anime', itemType: 'anime' })),
      ...doramas.map(item => ({ ...item, type: 'dorama', itemType: 'dorama' })),
      ...novelas.map(item => ({ ...item, type: 'novela', itemType: 'novela' })),
      ...documentales.map(item => ({ ...item, type: 'documental', itemType: 'documental' })),
      ...recentlyAdded.map(item => ({ ...item, type: item.tipo || 'contenido', itemType: item.itemType || item.tipo })),
      ...continueWatchingItems.map(item => ({ ...item, type: 'continuar viendo', itemType: item.itemType || item.tipo })),
    ];
    
    // Eliminar duplicados por ID
    const uniqueItems = Array.from(new Map(searchItems.map(item => [item.id || item._id, item])).values());
    console.log('[Home.jsx] Total search items:', uniqueItems.length);
    console.log('[Home.jsx] Search items breakdown:', {
      channels: channels.length,
      movies: movies.length,
      series: series.length,
      animes: animes.length,
      doramas: doramas.length,
      novelas: novelas.length,
      documentales: documentales.length,
    });
    setAllSearchItems(uniqueItems);
  }, [
    allChannels,
    allMovies,
    allSeries,
    allAnimes,
    allDoramas,
    allNovelas,
    allDocumentales,
    featuredChannels,
    featuredMovies,
    featuredSeries,
    featuredAnimes,
    featuredDoramas,
    featuredNovelas,
    featuredDocumentales,
    recentlyAdded,
    continueWatchingItems,
  ]);

  // Manejador de selección en búsqueda
  const handleSearchSelectItem = (item) => {
    handleItemClick(item, item.itemType);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]"><div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
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
                className="w-48 sm:w-56 drop-shadow-glow-logo mb-4" 
              />
            </div>
            
            <div className="hidden md:flex flex-col flex-1 p-8 lg:p-16 items-center justify-center text-center">
                <h1 className="text-5xl font-black text-primary text-glow-primary mb-6">
                    Bienvenido a
                </h1>
                <img 
                  src="./logo-teamg.png" 
                  alt="Logo de TeamG Play" 
                  className="w-full max-w-xs drop-shadow-glow-logo" 
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
                    <input 
                      type="password" 
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 sm:py-3 rounded-lg text-foreground focus:outline-none focus:ring-2 text-base"
                      style={{
                        backgroundColor: 'hsl(var(--input-background))',
                        border: '1px solid hsl(var(--input-border))',
                        '--tw-ring-color': 'hsl(var(--primary))'
                      }}
                      disabled={isLoggingIn}
                      autoComplete="current-password"
                    />
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
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
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
                      href="https://dl.dropboxusercontent.com/scl/fi/byzfo9c143ggozcvool85/TeamG-Play-Desktop-Setup-1.0.0.exe?rlkey=uikis927zvfgj79914jip4gjk&dl=0" 
                      download="TeamG-Play-Desktop-Setup-1.0.0.exe"
                      className="group flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary-foreground transition-all duration-300 hover:bg-secondary/40 hover:border-secondary/70 hover:scale-105"
                    >
                      <Laptop className="h-5 w-5 text-secondary" />
                      <span className="font-semibold text-sm">Windows</span>
                    </a>
                    <a 
                      href="https://dl.dropboxusercontent.com/scl/fi/uz1t1p2sji067yeirw7er/TeamGPlayv.3.apk?rlkey=wf4jxeqwb4nqpr2dlpsghu037&dl=0" 
                      download="TeamGPlayv.3.apk"
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
    else if (sectionTitle.includes('Continuar')) itemType = item.tipo || item.itemType || 'movie';
    
    handleItemClick(item, itemType);
  };

  // Si es Android TV, mostrar interfaz optimizada
  if (isAndroidTV()) {
    if (loading) {
      return <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Cargando...</div>;
    }
    
    return (
      <>
        <div style={{ position: 'fixed', top: 60, right: 120, zIndex: 200 }}>
          <SearchBar 
            items={allSearchItems}
            onSelectItem={handleSearchSelectItem}
            placeholder="Buscar canales, películas, series..."
          />
        </div>
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
          onProceedWithTrial={handleProceedWithTrial}
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
        {/* Barra de búsqueda */}
        <div style={{ position: 'fixed', top: 60, right: 120, zIndex: 200 }}>
          <SearchBar 
            items={allSearchItems}
            onSelectItem={handleSearchSelectItem}
            placeholder="Buscar canales, películas, series..."
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8 space-y-8 md:space-y-12">
        {recentlyAdded.length > 0 && (
          <Carousel
            title="Recien Agregados"
            items={recentlyAdded}
            onItemClick={(item) => handleItemClick(item, item.tipo || 'movie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            itemType={item => item.tipo || 'movie'}
            showItemTypeBadge={true} // Mostrar la insignia aquí
          />
        )}
        {continueWatchingItems.length > 0 && (
          <Carousel
            title="Continuar Viendo"
            items={continueWatchingItems}
            onItemClick={(item) => handleItemClick(item, 'continue-watching')}
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
            itemType="movie"
          />
        )}
        {featuredSeries.length > 0 && (
          <Carousel
            title="Series Populares"
            items={featuredSeries}
            onItemClick={(item) => handleItemClick(item, 'serie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            itemType="serie"
          />
        )}
        {featuredAnimes.length > 0 && (
          <Carousel
            title="Animes Destacados"
            items={featuredAnimes}
            onItemClick={(item) => handleItemClick(item, 'anime')}
            onPlayTrailerClick={handlePlayTrailerClick}
            itemType="anime"
          />
        )}
        {featuredDoramas.length > 0 && (
          <Carousel
            title="Doramas Populares"
            items={featuredDoramas}
            onItemClick={(item) => handleItemClick(item, 'dorama')}
            onPlayTrailerClick={handlePlayTrailerClick}
            itemType="dorama"
          />
        )}
        {featuredNovelas.length > 0 && (
          <Carousel
            title="Novelas Destacadas"
            items={featuredNovelas}
            onItemClick={(item) => handleItemClick(item, 'serie')}
            onPlayTrailerClick={handlePlayTrailerClick}
            itemType="serie"
          />
        )}
        {featuredDocumentales.length > 0 && (
          <Carousel
            title="Documentales Imperdibles"
            items={featuredDocumentales}
            onItemClick={(item) => handleItemClick(item, 'serie')}
            onPlayTrailerClick={handlePlayTrailerClick}
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
        onProceedWithTrial={handleProceedWithTrial}
      />
    </>
  );
}

export default Home;
