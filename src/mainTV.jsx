// Smart TV entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import PlatformDetector from './utils/platformDetector.js';

// Import TV-optimized components
import AppTV from './AppTV.jsx';
import TVHome from './pages/TVHome.jsx';
import TVVideoPlayer from './components/TVVideoPlayer.jsx';

// Import regular components as fallback
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// TV-optimized pages (you can create these or reuse existing ones with TV styling)
import { Movies } from './pages/Movies.jsx';
import { Series } from './pages/Series.jsx';
import Animes from './pages/Animes.jsx';
import Doramas from './pages/Doramas.jsx';
import Novelas from './pages/Novelas.jsx';
import Documentales from './pages/Documentales.jsx';

// Import CSS
import './index.css';

// TV-specific global styles
const tvStyles = `
  /* TV-optimized global styles */
  * {
    box-sizing: border-box;
  }
  
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #000;
    color: #fff;
    overflow-x: hidden;
  }
  
  /* TV-specific font sizes */
  .tv-interface {
    font-size: 18px;
    line-height: 1.6;
  }
  
  .tv-interface h1 { font-size: 3rem; }
  .tv-interface h2 { font-size: 2.5rem; }
  .tv-interface h3 { font-size: 2rem; }
  .tv-interface h4 { font-size: 1.5rem; }
  .tv-interface p { font-size: 1.2rem; }
  
  /* Focus styles for TV navigation */
  .tv-focusable:focus,
  .tv-focused {
    outline: 3px solid #00ffff;
    outline-offset: 2px;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  }
  
  /* Smooth transitions for TV */
  .tv-interface * {
    transition: all 0.3s ease;
  }
  
  /* Hide scrollbars on TV */
  .tv-interface::-webkit-scrollbar {
    display: none;
  }
  
  .tv-interface {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  /* TV-safe area margins */
  .tv-safe-area {
    margin: 2% 5%;
  }
  
  /* Platform-specific optimizations */
  .platform-webos .tv-interface {
    --tv-scale: 1.0;
  }
  
  .platform-tizen .tv-interface {
    --tv-scale: 1.0;
  }
  
  .platform-smarttv .tv-interface {
    --tv-scale: 1.1;
  }
`;

// Inject TV styles
const styleSheet = document.createElement('style');
styleSheet.textContent = tvStyles;
document.head.appendChild(styleSheet);

// Initialize platform detection
const platform = PlatformDetector.initializePlatform();
console.log('[MainTV] Initializing TeamG Play TV for platform:', platform);

// TV-optimized routing component
function TVApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppTV />}>
            {/* TV Home - optimized for remote control navigation */}
            <Route index element={<TVHome />} />
            
            {/* Content categories */}
            <Route path="movies" element={<Movies />} />
            <Route path="peliculas" element={<Movies />} />
            <Route path="series" element={<Series />} />
            <Route path="animes" element={<Animes />} />
            <Route path="doramas" element={<Doramas />} />
            <Route path="novelas" element={<Novelas />} />
            <Route path="documentales" element={<Documentales />} />
            
            {/* TV Live - you can create a TV-optimized version */}
            <Route path="tv" element={<Navigate to="/" replace />} />
            
            {/* Video player - TV optimized */}
            <Route path="watch" element={<TVVideoPlayerPage />} />
            
            {/* Authentication - simplified for TV */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// TV Video Player Page Component
function TVVideoPlayerPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoUrl = urlParams.get('url');
  const title = urlParams.get('title') || 'Video';
  
  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Error</h2>
          <p className="text-xl text-gray-300">No se encontró la URL del video</p>
        </div>
      </div>
    );
  }
  
  return (
    <TVVideoPlayer 
      videoUrl={videoUrl}
      title={title}
      autoPlay={true}
    />
  );
}

// Platform-specific initialization
if (PlatformDetector.isWebOS()) {
  console.log('[MainTV] Initializing for LG WebOS');
  // WebOS specific initialization
  if (window.webOS) {
    // Enable WebOS features
    try {
      window.webOS.platformBack = () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      };
    } catch (error) {
      console.warn('WebOS initialization warning:', error);
    }
  }
} else if (PlatformDetector.isTizen()) {
  console.log('[MainTV] Initializing for Samsung Tizen');
  // Tizen specific initialization
  if (window.tizen) {
    try {
      // Register for Tizen application events
      window.addEventListener('tizenhwkey', (e) => {
        if (e.keyName === 'back') {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.tizen.application.getCurrentApplication().exit();
          }
        }
      });
    } catch (error) {
      console.warn('Tizen initialization warning:', error);
    }
  }
} else {
  console.log('[MainTV] Initializing for Generic Smart TV');
}

// Render the TV app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TVApp />);

// Global error handler for TV
window.addEventListener('error', (event) => {
  console.error('[MainTV] Global error:', event.error);
  // You could show a TV-friendly error screen here
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[MainTV] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// TV-specific performance optimizations
if (PlatformDetector.isSmartTV()) {
  // Disable some features that might slow down TV browsers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });
  }
  
  // Optimize for TV memory constraints
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    // Limit console output on TV to prevent memory issues
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[MainTV]')) {
      originalConsoleLog.apply(console, args);
    }
  };
}

console.log('[MainTV] TeamG Play TV initialized successfully!');
