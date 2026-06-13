import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from "./context/AuthContext.jsx";
import SearchBar from "./components/SearchBar.jsx";
import { getUserSubscriptionSummary } from "./utils/userSubscription.js";
import axiosInstance from "./utils/axiosInstance.js";
import { fetchVideoCounts } from "./utils/api.js";

const SEARCH_SELECTION_TYPE_MAP = {
  pelicula: 'movie',
  movie: 'movie',
  serie: 'serie',
  series: 'serie',
  anime: 'anime',
  dorama: 'dorama',
  novela: 'novela',
  documental: 'documental',
  channel: 'channel',
  canal: 'channel',
  continuar: 'continue-watching',
  'continue-watching': 'continue-watching',
};

function getSearchSelectionType(item) {
  const candidates = [item?.itemType, item?.tipo, item?.type, 'movie'];
  for (const candidate of candidates) {
    const key = String(candidate || '').toLowerCase();
    if (SEARCH_SELECTION_TYPE_MAP[key]) {
      return SEARCH_SELECTION_TYPE_MAP[key];
    }
  }

  return 'movie';
}

function App() {
  console.log('[App.jsx] Renderizando App (App.jsx)...'); 
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[App.jsx] Estado del usuario:', user);
    console.log('[App.jsx] Ubicación actual:', location.pathname);
  }, [user, location.pathname]);

  const isAuthPage = location.pathname === "/login" || location.pathname.startsWith("/register");
  const isWatchPage = location.pathname.startsWith('/watch') || location.pathname.startsWith('/player') || location.pathname.startsWith('/test-player');
  const isLiveTVPage = location.pathname === '/live-tv';

  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [desktopContenidoOpen, setDesktopContenidoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileContenidoOpen, setMobileContenidoOpen] = useState(false);
  const [allSearchItems, setAllSearchItems] = useState([]);
  const [counts, setCounts] = useState({
    animes: 0,
    doramas: 0,
    novelas: 0,
    documentales: 0,
    series: 0,
    peliculas: 0,
    kids: 0,
    channels: 0,
    myList: 0
  });

  const loadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchVideoCounts();
      
      // Fetch myList items count
      let myListCount = 0;
      try {
        const myListResponse = await axiosInstance.get('/api/users/my-list');
        myListCount = myListResponse.data?.items?.length || myListResponse.data?.myList?.length || 0;
      } catch (err) {
        console.warn('Error fetching my-list count:', err);
      }

      setCounts({
        animes: data.animes || 0,
        doramas: data.doramas || 0,
        novelas: data.novelas || 0,
        documentales: data.documentales || 0,
        series: data.series || 0,
        peliculas: data.peliculas || 0,
        kids: data.kids || 0,
        channels: data.channels || 0,
        myList: myListCount
      });
    } catch (err) {
      console.error('Error fetching video counts:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCounts();
    }
  }, [location.pathname, user, loadCounts]);

  useEffect(() => {
    const handleRefreshCounts = () => {
      loadCounts();
    };
    window.addEventListener('teamg:refresh-counts', handleRefreshCounts);
    return () => {
      window.removeEventListener('teamg:refresh-counts', handleRefreshCounts);
    };
  }, [loadCounts]);
  const userSubscription = useMemo(
    () => getUserSubscriptionSummary(user),
    [user?.expiresAt, user?.plan, user?.role],
  );
  const userPlanCaption = `Plan ${userSubscription.planLabel}`;
  const userExpirationCaption = userSubscription.remainingLabel;
  const userExpirationDateCaption = userSubscription.expiresDate
    ? `Expira ${userSubscription.expiresDate.toLocaleDateString()}`
    : "";

  const closeAllMenus = useCallback(() => {
    setDropdownOpen(false);
    setDesktopContenidoOpen(false);
    setMobileMenuOpen(false);
    setMobileContenidoOpen(false);
  }, []);

  useEffect(() => {
    if (isAuthPage || isWatchPage) {
      setScrolled(false);
      return;
    }

    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    console.log('[App.jsx] Añadiendo event listener para scroll.');
    window.addEventListener('scroll', handleScroll);
    return () => {
      console.log('[App.jsx] Eliminando event listener para scroll.');
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled, isAuthPage, isWatchPage]);

  useEffect(() => {
    closeAllMenus();
    window.scrollTo(0, 0);
  }, [closeAllMenus, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("#user-menu")) {
        setDropdownOpen(false);
      }
      if (!event.target.closest("#desktop-content-menu")) {
        setDesktopContenidoOpen(false);
      }
      if (!event.target.closest("#mobile-menu") && !event.target.closest("#mobile-menu-button")) {
        setMobileMenuOpen(false);
        setMobileContenidoOpen(false);
      }
    };

    if (dropdownOpen || desktopContenidoOpen || mobileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }

    return () => document.removeEventListener("click", handleClickOutside);
  }, [desktopContenidoOpen, dropdownOpen, mobileMenuOpen, closeAllMenus]);

  useEffect(() => {
    let handleRef = null;
    let unsub = null;

    const init = async () => {
      try {
        const handle = await CapacitorApp.addListener('backButton', () => {
          if (window.__trailerModalOpen && typeof window.__trailerModalClose === 'function') {
            console.log('[App.jsx] Trailer modal abierto - cerrando overlay');
            window.__trailerModalClose();
            return;
          }

          if (window.__mobileVodDetailOpen && typeof window.__mobileVodDetailClose === 'function') {
            console.log('[App.jsx] Detalle VOD movil abierto - cerrando overlay');
            window.__mobileVodDetailClose();
            return;
          }

          // 🔥 NUEVO: Chequear si el SearchBar está abierto
          if (window.searchBarOpen) {
            console.log('[App.jsx] 🔥 SearchBar está abierto, ignorando navegación');
            return;
          }

          // En HashRouter, usar location.pathname para detectar /watch correctamente.
          if (isWatchPage) {
            console.log('[App.jsx] En /watch - ignorando handler global de backButton');
            return;
          }

          if (isLiveTVPage) {
            console.log('[App.jsx] En /live-tv - navegando a Home');
            navigate('/', { replace: true });
            return;
          }

          if (window.history.length > 1) {
            navigate(-1);
          } else {
            CapacitorApp.exitApp();
          }
        });
        handleRef = handle;
        if (handle && typeof handle.remove === 'function') {
          unsub = () => handle.remove();
        } else if (typeof handle === 'function') {
          unsub = handle;
        } else {
          unsub = null;
        }
      } catch (err) {
        console.warn('[App.jsx] Error adding backButton listener:', err);
      }
    };

    if (CapacitorApp.addListener) {
        init();
    }

    return () => {
      try {
        if (typeof unsub === 'function') {
          unsub();
        } else if (handleRef && typeof handleRef.remove === 'function') {
          handleRef.remove();
        }
      } catch (err) {
        console.warn('[App.jsx] Error removing backButton listener:', err);
      }
    };
  }, [navigate, isWatchPage, isLiveTVPage]);

  const handleLogout = () => {
    console.log('[App.jsx] Ejecutando handleLogout...');
    closeAllMenus();
    logout();
    navigate("/login");
  };

  const handleSearchSelectItem = (item) => {
    const type = getSearchSelectionType(item);
    closeAllMenus();
    if (location.pathname === '/' && type !== 'channel') {
      window.dispatchEvent(new CustomEvent('teamg:open-vod-detail', {
        detail: {
          item,
          itemType: type,
        },
      }));
      return;
    }
    navigate(`/watch/${type}/${item._id || item.id}`);
  };
  
  const shouldShowLayout = !isAuthPage && !isWatchPage;

  const mainContainerStyle = {
    backgroundImage: "url('./fondo.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    width: '100%'
  };

  return (
    <>
      <style>{`
        :root {
          --primary: 190 100% 50%;
          --secondary: 315 100% 60%;
        }
        
        .drop-shadow-glow-logo {
          filter: drop-shadow(0 0 15px hsl(var(--secondary) / 0.4)) drop-shadow(0 0 8px hsl(var(--primary) / 0.3));
        }

        .rainbow-text {
          background-image: linear-gradient(to right, #ff7e5f, #feb47b, #86a8e7, #91eae4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: bold;
        }

      `}</style>
      <div style={mainContainerStyle} className="min-h-screen bg-black text-white flex flex-col">
      {shouldShowLayout && (
        <header 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999 }}
          className={`transition-all duration-300 ${
            scrolled 
              ? 'bg-[#090514] border-b border-fuchsia-300/10 shadow-md' 
              : 'bg-transparent'
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-20">
              {/* Logo y Navegación Principal */}
              <div className="flex items-center flex-1">
                <Link to="/" className="flex items-center py-2" onClick={closeAllMenus}>
                  <img 
                    src="./logo-teamg.png" 
                    alt="TeamG Play Logo" 
                    className="h-16 sm:h-18 drop-shadow-glow-logo hover:scale-105 transition-transform duration-300"
                    style={{ objectFit: 'contain' }}
                  />
                </Link>
                
                {/* Navegación Desktop */}
                <nav className="hidden md:flex ml-10 space-x-4 items-center">
                  <Link to="/live-tv" className="text-gray-300 hover:text-white px-3 py-2" onClick={closeAllMenus}>
                    TV en Vivo
                  </Link>
                  <Link to="/peliculas" className="text-gray-300 hover:text-white px-3 py-2" onClick={closeAllMenus}>
                    Películas
                  </Link>
                  <Link to="/mundial-2026" className="relative text-gray-300 hover:text-white px-3 py-2 flex items-center gap-1 font-bold text-lime-400 mr-2" onClick={closeAllMenus}>
                    🏆 Mundial 2026
                    <span className="absolute -top-0.5 right-0 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                    </span>
                  </Link>
                  
                  {/* Dropdown Contenido */}
                  <div id="desktop-content-menu" className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setMobileMenuOpen(false);
                        setMobileContenidoOpen(false);
                        setDesktopContenidoOpen((current) => !current);
                      }}
                      className="text-gray-300 hover:text-white px-3 py-2 flex items-center gap-1"
                      aria-expanded={desktopContenidoOpen}
                      aria-haspopup="menu"
                    >
                      Contenido
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${desktopContenidoOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>
 
                    {desktopContenidoOpen && (
                      <div className="absolute left-0 mt-2 w-48 rounded-md bg-gray-900 py-1 shadow-lg ring-1 ring-white/10 z-[95]">
                        <Link to="/series" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white" onClick={closeAllMenus}>
                          Series
                        </Link>
                        <Link to="/animes" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white" onClick={closeAllMenus}>
                          Animes
                        </Link>
                        <Link to="/doramas" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white" onClick={closeAllMenus}>
                          K-Dramas
                        </Link>
                        <Link to="/novelas" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white" onClick={closeAllMenus}>
                          Novelas
                        </Link>
                        <Link to="/documentales" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white" onClick={closeAllMenus}>
                          Documentales
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  <Link to="/kids" className="text-gray-300 hover:text-white px-3 py-2 flex items-center gap-1.5" onClick={closeAllMenus}>
                    <span>🐻</span>
                    <span>Zona Kids</span>
                  </Link>
                  <Link to="/colecciones" className="text-gray-300 hover:text-white px-3 py-2" onClick={closeAllMenus}>Colecciones</Link>
                  <Link to="/mi-lista" className="text-gray-300 hover:text-white px-3 py-2 flex items-center gap-1.5" onClick={closeAllMenus}>
                    <span>❤️</span>
                    <span>Mi Lista</span>
                  </Link>
                </nav>
              </div>

              {/* Menú de Usuario y Hamburguesa */}
              <div className="flex items-center space-x-4">
                {/* Search Bar - Solo en Home */}
                {location.pathname === '/' && (
                  <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
                    <div className="max-w-lg w-full lg:max-w-xs">
                      <SearchBar 
                        items={allSearchItems}
                        onSelectItem={handleSearchSelectItem}
                        placeholder="Buscar..."
                      />
                    </div>
                  </div>
                )}

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="hidden md:block text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                    onClick={closeAllMenus}
                  >
                    Admin
                  </Link>
                )}

                <div className="hidden md:block relative" id="user-menu">
                  <button
                    onClick={() => {
                      setDesktopContenidoOpen(false);
                      setMobileMenuOpen(false);
                      setMobileContenidoOpen(false);
                      setDropdownOpen((current) => !current);
                    }}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                  >
                    <span className="sr-only">Abrir menú de usuario</span>
                    <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {dropdownOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>

                <button
                  id="mobile-menu-button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setDesktopContenidoOpen(false);
                    setMobileContenidoOpen(false);
                    setMobileMenuOpen((current) => !current);
                  }}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-expanded={mobileMenuOpen}
                >
                  <span className="sr-only">Abrir menú principal</span>
                  <svg className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <svg className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Drawer Panel */}
            <div 
              className={`md:hidden fixed inset-0 z-[1000] transition-all duration-300 ${
                mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={closeAllMenus}
              />
              {/* Drawer Container */}
              <div 
                id="mobile-menu"
                className={`absolute top-0 right-0 h-full w-[290px] bg-gradient-to-b from-[#140b2a] to-[#07040e] border-l border-fuchsia-400/10 shadow-[-12px_0_40px_rgba(0,0,0,0.85)] flex flex-col p-6 overflow-y-auto transition-transform duration-300 ${
                  mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                {/* User Profile Info */}
                <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-500 via-pink-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.45)]">
                      <span className="text-white font-bold text-base">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{user?.username}</p>
                      <span className="inline-block mt-0.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                        {userPlanCaption}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={closeAllMenus}
                    className="text-gray-400 hover:text-white p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 space-y-2">
                  <Link to="/live-tv" className="flex items-center gap-3 text-gray-300 hover:text-white px-3 py-3 rounded-xl hover:bg-white/[0.04] text-base font-semibold transition" onClick={closeAllMenus}>
                    <span className="text-lg">📺</span> TV en Vivo
                  </Link>
                  <Link to="/peliculas" className="flex items-center gap-3 text-gray-300 hover:text-white px-3 py-3 rounded-xl hover:bg-white/[0.04] text-base font-semibold transition" onClick={closeAllMenus}>
                    <span className="text-lg">🎬</span> Películas
                  </Link>
                  <Link to="/mundial-2026" className="flex items-center gap-3 text-lime-400 hover:text-lime-300 px-3 py-3 rounded-xl hover:bg-white/[0.04] text-base font-bold transition" onClick={closeAllMenus}>
                    <span className="text-lg">🏆</span> Mundial 2026
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                    </span>
                  </Link>
 
                  {/* Submenu for Content */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setMobileContenidoOpen((current) => !current)}
                      className="flex items-center justify-between text-gray-300 hover:text-white px-3 py-3 rounded-xl hover:bg-white/[0.04] text-base font-semibold w-full transition"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-lg">📂</span> Contenido
                      </span>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${mobileContenidoOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {mobileContenidoOpen && (
                      <div className="pl-8 space-y-1 border-l border-white/5 ml-5 mt-1">
                        <Link to="/series" className="flex items-center justify-between text-gray-400 hover:text-white block px-3 py-2 rounded-lg text-sm font-semibold transition" onClick={closeAllMenus}>
                          Series
                        </Link>
                        <Link to="/animes" className="flex items-center justify-between text-gray-400 hover:text-white block px-3 py-2 rounded-lg text-sm font-semibold transition" onClick={closeAllMenus}>
                          Animes
                        </Link>
                        <Link to="/doramas" className="flex items-center justify-between text-gray-400 hover:text-white block px-3 py-2 rounded-lg text-sm font-semibold transition" onClick={closeAllMenus}>
                          K-Dramas
                        </Link>
                        <Link to="/novelas" className="flex items-center justify-between text-gray-400 hover:text-white block px-3 py-2 rounded-lg text-sm font-semibold transition" onClick={closeAllMenus}>
                          Novelas
                        </Link>
                        <Link to="/documentales" className="flex items-center justify-between text-gray-400 hover:text-white block px-3 py-2 rounded-lg text-sm font-semibold transition" onClick={closeAllMenus}>
                          Documentales
                        </Link>
                      </div>
                    )}
                  </div>
 
                  <Link to="/kids" className="flex items-center gap-3 text-gray-300 hover:text-white px-3 py-3 rounded-xl hover:bg-white/[0.04] text-base font-semibold transition" onClick={closeAllMenus}>
                    <span className="text-lg">🐻</span> Zona Kids
                  </Link>
                  <Link to="/colecciones" className="flex items-center gap-3 text-gray-300 hover:text-white px-3 py-3 rounded-xl hover:bg-white/[0.04] text-base font-semibold transition" onClick={closeAllMenus}>
                    <span className="text-lg">💎</span> Colecciones
                  </Link>
                  <Link to="/mi-lista" className="flex items-center gap-3 text-gray-300 hover:text-white px-3 py-3 rounded-xl hover:bg-white/[0.04] text-base font-semibold transition" onClick={closeAllMenus}>
                    <span>❤️</span> Mi Lista
                  </Link>
                  <Link to="/test-player" className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300 px-3 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-base font-semibold transition" onClick={closeAllMenus}>
                    <span>🧪</span> Test ExoPlayer
                  </Link>
                </div>

                {/* Bottom Panel */}
                <div className="border-t border-white/5 pt-6 mt-6 space-y-4">
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="flex items-center gap-3 text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/[0.04] text-base font-semibold transition" onClick={closeAllMenus}>
                      🛡️ Panel Admin
                    </Link>
                  )}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 font-semibold">{userExpirationCaption}</p>
                    {userExpirationDateCaption && (
                      <p className="text-[10px] text-gray-500 mt-1">{userExpirationDateCaption}</p>
                    )}
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-3 text-red-400 hover:text-red-300 px-3 py-3 rounded-xl hover:bg-red-500/5 text-base font-semibold w-full text-left transition"
                  >
                    🚪 Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-grow ${shouldShowLayout ? 'pt-20' : ''}`}>
        <Outlet context={{ setAllSearchItems }} />
      </main>

      {shouldShowLayout && (
        <footer className="bg-black text-gray-500 py-8 border-t border-gray-800">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between">
              <div className="mb-6 md:mb-0">
                <img src="./logo-teamg.png" alt="TeamG Play Logo" className="h-12 mb-4 drop-shadow-glow-logo" style={{ objectFit: 'contain' }} />
                <p className="mt-2 max-w-md">La mejor plataforma de streaming para disfrutar de canales en vivo, películas, series y mas.</p>
              </div>
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-6">
                <div>
                  <h3 className="text-white font-medium mb-2">Explorar</h3>
                  <ul className="space-y-2">
                    <li><Link to="/" className="hover:text-white transition">Inicio</Link></li>
                    <li><Link to="/live-tv" className="hover:text-white transition">TV en Vivo</Link></li>
                    <li><Link to="/peliculas" className="hover:text-white transition">VOD</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">Legal</h3>
                  <ul className="space-y-2">
                    <li><a href="#" className="hover:text-white transition">Términos</a></li>
                    <li><a href="#" className="hover:text-white transition">Privacidad</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">Contacto</h3>
                  <ul className="space-y-2">
                    <li><a href="#" className="hover:text-white transition">Soporte</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-8 border-t border-gray-800 pt-8 text-center">
              <p>© {new Date().getFullYear()} TeamG Play. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      )}
      </div>
    </>
  );
}

export default App;

