// Smart TV version of App.jsx
import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import PlatformDetector from "./utils/platformDetector.js";
import TVNavigation from "./components/TVNavigation.jsx";

function AppTV() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('smarttv');

  // Initialize platform detection
  useEffect(() => {
    const detectedPlatform = PlatformDetector.initializePlatform();
    setPlatform(detectedPlatform);
    console.log('[AppTV] Platform detected:', detectedPlatform);
  }, []);

  // Verificar si estamos en una página de autenticación
  const isAuthPage = !user && (location.pathname === "/login" || location.pathname.startsWith("/register"));

  // Handle remote control back button for Smart TVs
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle platform-specific back button
      if (e.keyCode === 8 || e.keyCode === 27) { // Back or Escape
        e.preventDefault();
        if (window.history.length > 1) {
          navigate(-1);
        }
      }
    };

    // Register key events for different platforms
    if (PlatformDetector.isWebOS()) {
      // WebOS specific key handling
      document.addEventListener('keydown', handleKeyDown);
    } else if (PlatformDetector.isTizen()) {
      // Tizen specific key handling
      document.addEventListener('keydown', handleKeyDown);
      
      // Register Tizen TV keys
      if (window.tizen && window.tizen.tvinputdevice) {
        try {
          window.tizen.tvinputdevice.registerKey('Back');
          window.tizen.tvinputdevice.registerKey('Exit');
        } catch (error) {
          console.warn('Tizen key registration failed:', error);
        }
      }
    } else {
      // Generic Smart TV key handling
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  const handleLogout = () => {
    console.log('[AppTV] Executing logout...');
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
        
        .tv-app-container {
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .tv-main-content {
          padding-top: 120px;
        }
        
        .tv-auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
        }
        
        .tv-auth-card {
          background: rgba(0, 0, 0, 0.8);
          border: 2px solid hsl(var(--primary) / 0.3);
          border-radius: 20px;
          padding: 60px;
          text-align: center;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 50px hsl(var(--primary) / 0.2);
        }
        
        .tv-logo-auth {
          filter: drop-shadow(0 0 30px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 15px hsl(var(--primary) / 0.4));
          margin-bottom: 40px;
        }
        
        .tv-welcome-text {
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 3rem;
          font-weight: bold;
          margin-bottom: 20px;
        }
        
        .tv-instruction-text {
          color: white;
          font-size: 1.5rem;
          margin-bottom: 30px;
        }
        
        .tv-remote-hint {
          color: #888;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        /* Platform-specific optimizations */
        .platform-webos {
          --tv-scale: 1.0;
        }
        
        .platform-tizen {
          --tv-scale: 1.0;
        }
        
        .platform-smarttv {
          --tv-scale: 1.1;
        }
        
        .tv-interface * {
          transform: scale(var(--tv-scale, 1.0));
        }
        
        /* Disable text selection and context menus for TV */
        .tv-interface {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        .tv-interface * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>

      <div className="tv-app-container">
        {isAuthPage ? (
          // Authentication page for TV
          <div className="tv-auth-container">
            <div className="tv-auth-card">
              <img 
                src="/TeamG Play.png" 
                alt="TeamG Play Logo" 
                className="tv-logo-auth h-32 mx-auto"
              />
              <h1 className="tv-welcome-text">
                TeamG Play TV
              </h1>
              <p className="tv-instruction-text">
                Inicia sesión desde tu dispositivo móvil o computadora
              </p>
              <p className="tv-instruction-text">
                Visita: <strong style={{color: 'hsl(var(--primary))'}}>teamgplay.com/tv</strong>
              </p>
              <div className="tv-remote-hint">
                <span>🎮</span>
                <span>Usa el control remoto para navegar</span>
              </div>
            </div>
          </div>
        ) : (
          // Main app interface for TV
          <>
            <TVNavigation />
            <main className="tv-main-content">
              <Outlet />
            </main>
            
            {/* TV Footer */}
            <footer className="text-center py-8 text-gray-400 border-t border-gray-800">
              <div className="container mx-auto px-8">
                <div className="flex justify-center items-center space-x-8 mb-4">
                  <img 
                    src="/TeamG Play.png" 
                    alt="TeamG Play Logo" 
                    className="h-12"
                    style={{
                      filter: 'drop-shadow(0 0 15px hsl(var(--secondary) / 0.4)) drop-shadow(0 0 8px hsl(var(--primary) / 0.3))'
                    }}
                  />
                </div>
                <p className="text-xl mb-2">
                  La mejor experiencia de streaming para Smart TV
                </p>
                <p className="text-lg">
                  🎮 Control Remoto • 📺 {platform.toUpperCase()} • 🌟 HD/4K
                </p>
                <p className="text-sm mt-4">
                  © 2024 TeamG Play. Todos los derechos reservados.
                </p>
              </div>
            </footer>
          </>
        )}
      </div>
    </>
  );
}

export default AppTV;
