import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TVNavigation() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const navigate = useNavigate();
  const navRef = useRef(null);

  const menuItems = [
    { path: '/', label: 'Inicio', icon: '🏠' },
    { path: '/tv', label: 'TV en Vivo', icon: '📺' },
    { path: '/movies', label: 'Películas', icon: '🎬' },
    { path: '/series', label: 'Series', icon: '📽️' },
    { path: '/animes', label: 'Animes', icon: '🎌' },
    { path: '/doramas', label: 'Doramas', icon: '💝' },
    { path: '/novelas', label: 'Novelas', icon: '💕' },
    { path: '/documentales', label: 'Documentales', icon: '📚' }
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.keyCode) {
        case 37: // Left arrow
          e.preventDefault();
          setFocusedIndex(prev => prev > 0 ? prev - 1 : menuItems.length - 1);
          break;
        case 39: // Right arrow
          e.preventDefault();
          setFocusedIndex(prev => prev < menuItems.length - 1 ? prev + 1 : 0);
          break;
        case 13: // Enter/OK
          e.preventDefault();
          navigate(menuItems[focusedIndex].path);
          break;
        case 8: // Back
          e.preventDefault();
          navigate(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, navigate]);

  return (
    <>
      <style>{`
        :root {
          --primary: 190 100% 50%;
          --secondary: 315 100% 60%;
        }
        
        .tv-nav-item {
          transition: all 0.3s ease;
          border: 3px solid transparent;
        }
        
        .tv-nav-item.focused {
          border-color: hsl(var(--primary));
          background: linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--secondary) / 0.2));
          box-shadow: 0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--secondary) / 0.3);
          transform: scale(1.1);
        }
        
        .tv-logo {
          filter: drop-shadow(0 0 20px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 10px hsl(var(--primary) / 0.4));
        }
      `}</style>
      
      <nav 
        ref={navRef}
        className="fixed top-0 w-full z-50 bg-black/95 backdrop-blur-sm border-b border-cyan-500/30"
        style={{ height: '120px' }}
      >
        <div className="container mx-auto px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/TeamG Play.png" 
              alt="TeamG Play Logo" 
              className="h-20 tv-logo" 
            />
          </div>
          
          {/* Navigation Menu */}
          <div className="flex space-x-4">
            {menuItems.map((item, index) => (
              <div
                key={item.path}
                className={`tv-nav-item px-6 py-4 rounded-lg text-center cursor-pointer ${
                  index === focusedIndex ? 'focused' : ''
                }`}
                style={{ minWidth: '120px' }}
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-white font-medium text-lg">{item.label}</div>
              </div>
            ))}
          </div>
          
          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="text-white text-lg">Smart TV</div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">TV</span>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
