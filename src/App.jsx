// iptv-frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from "./context/AuthContext.jsx";
import Animes from "./pages/Animes.jsx";
import Documentales from "./pages/Documentales.jsx";
import Doramas from "./pages/Doramas.jsx";
import Novelas from "./pages/Novelas.jsx";

function App() {
  console.log('[App.jsx] Renderizando AppLayout (App.jsx)...'); // LOG AÑADIDO
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Loguear estado del usuario y ubicación para depuración
  useEffect(() => {
    console.log('[App.jsx] Estado del usuario:', user);
    console.log('[App.jsx] Ubicación actual:', location.pathname);
  }, [user, location.pathname]);

  // Verificar si estamos en una página de autenticación
  const isAuthPage = !user && (location.pathname === "/login" || location.pathname.startsWith("/register"));
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detectar scroll para cambiar el fondo del header
  useEffect(() => {
    if (isAuthPage) {
      setScrolled(false); // Asegurar que no haya fondo de scroll en páginas de auth
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
  }, [scrolled, isAuthPage]);

  // Cerrar dropdown y mobile menu al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("#user-menu")) {
        setDropdownOpen(false);
      }
      if (!event.target.closest("#mobile-menu") && !event.target.closest("#mobile-menu-button")) {
        setMobileMenuOpen(false);
      }
    };

    if (dropdownOpen || mobileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }

    return () => document.removeEventListener("click", handleClickOutside);
  }, [dropdownOpen, mobileMenuOpen]);

  // Manejar el botón de retroceso en Android
  useEffect(() => {
    // Escucha el evento del botón de retroceso del dispositivo.
    // CapacitorApp.addListener puede devolver un "handle" o una promesa
    // según el entorno; manejamos ambos casos y guardamos la función de
    // limpieza en una referencia para llamarla de forma segura al
    // desmontarse.
    let handleRef = null;
    let unsub = null;

    const init = async () => {
      try {
        const handle = await CapacitorApp.addListener('backButton', () => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            CapacitorApp.exitApp();
          }
        });

        // Algunos entornos devuelven un objeto con .remove, otros
        // devuelven una función; normalizamos a una única función
        // de limpieza en `unsub`.
        handleRef = handle;
        if (handle && typeof handle.remove === 'function') {
          unsub = () => handle.remove();
        } else if (typeof handle === 'function') {
          unsub = handle;
        } else {
          // Por seguridad, no hacemos nada si no podemos obtener
          // una función de limpieza.
          unsub = null;
        }
      } catch (err) {
        console.warn('[App.jsx] Error adding backButton listener:', err);
      }
    };

    init();

    // Limpia el listener cuando el componente se desmonta
    return () => {
      try {
        if (typeof unsub === 'function') {
          unsub();
        } else if (handleRef && typeof handleRef.remove === 'function') {
          // Fallback por si quedó asignado pero no normalizamos
          handleRef.remove();
        }
      } catch (err) {
        console.warn('[App.jsx] Error removing backButton listener:', err);
      }
    };
  }, [navigate]);

  // Debug: global click logger to detect if clicks reach the document
  useEffect(() => {
    const globalClickLogger = (e) => {
      // Limit logs to clicks on elements inside cards to reduce noise
      const target = e.target;
      // You can adjust the selector if your card uses different classes
      if (target.closest && (target.closest('.group') || target.closest('[data-card]'))) {
        console.log('GLOBAL CLICK (card area):', target, 'closest button?', !!target.closest('button'));
      }
    };
    document.addEventListener('click', globalClickLogger, true);
    return () => document.removeEventListener('click', globalClickLogger, true);
  }, []);

  const handleLogout = () => {
    console.log('[App.jsx] Ejecutando handleLogout...');
    logout();
    navigate("/login");
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
      `}</style>
      <div className="min-h-screen bg-black text-white flex flex-col">
      {!isAuthPage && (
        <header 
          className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
            scrolled ? 'bg-black/95 backdrop-blur-sm' : 'bg-transparent'
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-20">
              {/* Logo y Navegación Principal */}
              <div className="flex items-center flex-1">
                <Link to="/" className="flex items-center py-2">
                  <img 
                    src="/TeamG Play.png" 
                    alt="TeamG Play Logo" 
                    className="h-16 sm:h-18 drop-shadow-glow-logo hover:scale-105 transition-transform duration-300" 
                  />
                </Link>
                
                {/* Navegación Desktop - mantiene el diseño original */}
                <nav className="hidden md:flex ml-10 space-x-4">
                  <Link to="/" className="text-gray-300 hover:text-white px-3 py-2">Inicio</Link>
                  <Link to="/tv" className="text-gray-300 hover:text-white px-3 py-2">TV en Vivo</Link>
                  <Link to="/peliculas" className="text-gray-300 hover:text-white px-3 py-2">Películas</Link>
                  <Link to="/series" className="text-gray-300 hover:text-white px-3 py-2">Series</Link>
                  <Link to="/animes" className="text-gray-300 hover:text-white px-3 py-2">Animes</Link>
                  <Link to="/doramas" className="text-gray-300 hover:text-white px-3 py-2">Doramas</Link>
                  <Link to="/novelas" className="text-gray-300 hover:text-white px-3 py-2">Novelas</Link>
                  <Link to="/documentales" className="text-gray-300 hover:text-white px-3 py-2">Documentales</Link>
                  <Link to="/zona-kids" className="text-gray-300 hover:text-white px-3 py-2">Zona Kids</Link>
                  <Link to="/colecciones" className="text-gray-300 hover:text-white px-3 py-2">Colecciones</Link>
                </nav>
              </div>

              {/* Menú de Usuario y Hamburguesa */}
              <div className="flex items-center space-x-4">
                {/* Botón Admin - visible en desktop */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="hidden md:block text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Admin
                  </Link>
                )}

                {/* Menú de Usuario - visible en desktop */}
                <div className="hidden md:block relative" id="user-menu">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
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

                {/* Botón Hamburguesa - solo visible en móvil */}
                <button
                  id="mobile-menu-button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-expanded="false"
                >
                  <span className="sr-only">Abrir menú principal</span>
                  {/* Icono hamburguesa */}
                  <svg className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {/* Icono X */}
                  <svg className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menú Móvil - solo visible en móvil cuando está abierto */}
            {mobileMenuOpen && (
              <div id="mobile-menu" className="md:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1 bg-black/95 backdrop-blur-sm border-t border-gray-700">
                  <Link
                    to="/"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inicio
                  </Link>
                  <Link
                    to="/tv"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    TV en Vivo
                  </Link>
                  <Link
                    to="/peliculas"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Películas
                  </Link>
                  <Link
                    to="/series"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Series
                  </Link>
                  <Link
                    to="/animes"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Animes
                  </Link>
                  <Link
                    to="/doramas"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Doramas
                  </Link>
                  <Link
                    to="/novelas"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Novelas
                  </Link>
                  <Link
                    to="/documentales"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Documentales
                  </Link>
                  <Link
                    to="/zona-kids"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Zona Kids
                  </Link>
                  <Link
                    to="/colecciones"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Colecciones
                  </Link>
                  
                  {/* Test ExoPlayer - solo en móvil */}
                  <Link
                    to="/test-player"
                    className="text-yellow-400 hover:text-yellow-300 block px-3 py-2 rounded-md text-base font-medium border border-yellow-600 mx-2 text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🧪 Test ExoPlayer
                  </Link>
                  
                  {/* Separador */}
                  <div className="border-t border-gray-700 pt-4">
                    {/* Admin link para móvil */}
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    
                    {/* Perfil de usuario para móvil */}
                    <div className="flex items-center px-3 py-2">
                      <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center mr-3">
                        <span className="text-white font-semibold text-sm">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-300 text-sm">{user?.username}</span>
                    </div>
                    
                    {/* Botón cerrar sesión para móvil */}
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-gray-300 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      <main className={`flex-grow ${!isAuthPage ? 'pt-20' : ''}`}>
        <Outlet />
      </main>

      {!isAuthPage && (
        <footer className="bg-black text-gray-500 py-8 border-t border-gray-800">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between">
              <div className="mb-6 md:mb-0">
                <img 
                  src="/TeamG Play.png" 
                  alt="TeamG Play Logo" 
                  className="h-12 mb-4 drop-shadow-glow-logo" 
                />
                <p className="mt-2 max-w-md">La mejor plataforma de streaming para disfrutar de canales en vivo, películas, series y mas.</p>
              </div>

              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-6">
                <div>
                  <h3 className="text-white font-medium mb-2">Explorar</h3>
                  <ul className="space-y-2">
                    <li><Link to="/" className="hover:text-white transition">Inicio</Link></li>
                    <li><Link to="/tv" className="hover:text-white transition">TV en Vivo</Link></li>
                    <li><Link to="/movies" className="hover:text-white transition">VOD</Link></li> {/* Considera si esto debería ser /movies y /series */}
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
