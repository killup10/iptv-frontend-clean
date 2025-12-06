import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function NavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <>
      <style>{`
        :root {
          --primary: 190 100% 50%;
          --secondary: 315 100% 60%;
        }
        
        .text-glow-primary {
          text-shadow: 0 0 5px hsl(var(--primary) / 0.8), 0 0 10px hsl(var(--primary) / 0.6);
        }
        .text-glow-secondary {
          text-shadow: 0 0 5px hsl(var(--secondary) / 0.8), 0 0 10px hsl(var(--secondary) / 0.6);
        }
        .drop-shadow-glow-logo {
          filter: drop-shadow(0 0 15px hsl(var(--secondary) / 0.4)) drop-shadow(0 0 8px hsl(var(--primary) / 0.3));
        }
        
        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: rgba(20, 20, 20, 0.98);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(190, 255, 255, 0.2);
          border-radius: 0.5rem;
          padding: 0.5rem 0;
          min-width: 200px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        
        .dropdown-menu a {
          display: block;
          padding: 0.75rem 1.5rem;
          color: #d1d5db;
          transition: all 0.3s ease;
          border-left: 3px solid transparent;
        }
        
        .dropdown-menu a:hover {
          background: rgba(0, 255, 255, 0.1);
          color: white;
          border-left-color: hsl(var(--primary));
          padding-left: 1.75rem;
        }
      `}</style>
      <nav 
        className="fixed top-0 w-full z-50 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(190, 255, 255, 0.1)'
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img 
            src="./logo-teamg.png" 
            alt="TeamG Play Logo" 
            className="h-10 sm:h-12 drop-shadow-glow-logo hover:scale-105 transition-transform duration-300" 
          />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex space-x-8 text-sm items-center">
          <Link to="/tv" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">TV en Vivo</Link>
          <Link to="/peliculas" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">Películas</Link>
          
          {/* Dropdown Contenido */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300 flex items-center gap-2"
            >
              Contenido
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <Link to="/series" onClick={() => setIsDropdownOpen(false)}>Series</Link>
                <Link to="/animes" onClick={() => setIsDropdownOpen(false)}>Animes</Link>
                <Link to="/doramas" onClick={() => setIsDropdownOpen(false)}>Doramas</Link>
                <Link to="/novelas" onClick={() => setIsDropdownOpen(false)}>Novelas</Link>
                <Link to="/documentales" onClick={() => setIsDropdownOpen(false)}>Documentales</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu button - you can expand this later */}
        <div className="lg:hidden">
          <button className="text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  );
}
