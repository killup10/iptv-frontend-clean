// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Carousel from '../components/Carousel.jsx';
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

  // State for trailer modal
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

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
                      href="REEMPLAZAR_CON_TU_LINK_DE_WINDOWS" 
                      className="group flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary-foreground transition-all duration-300 hover:bg-secondary/40 hover:border-secondary/70 hover:scale-105"
                    >
                      <Laptop className="h-5 w-5 text-secondary" />
                      <span className="font-semibold text-sm">Windows</span>
                    </a>
                    <a 
                      href="REEMPLAZAR_CON_TU_LINK_DE_ANDROID" 
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
