import React from 'react';
import { Link } from 'react-router-dom';

export default function NavBar() {
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
      `}</style>
      <nav 
        className="fixed top-0 w-full z-50 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(190, 255, 255, 0.1)'
        }}
      >
        <Link to="/" className="flex items-center">
          <img 
            src="./logo-teamg.png" 
            alt="TeamG Play Logo" 
            className="h-10 sm:h-12 drop-shadow-glow-logo hover:scale-105 transition-transform duration-300" 
          />
        </Link>
        
        <div className="hidden lg:flex space-x-6 text-sm">
          <Link to="/" className="text-white hover:text-primary text-glow-primary transition-colors duration-300">Inicio</Link>
          <Link to="/tv" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">TV en Vivo</Link>
          <Link to="/#peliculas" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">Películas</Link>
          <Link to="/series" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">Series</Link>
          <Link to="/#animes" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">Animes</Link>
          <Link to="/#doramas" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">Doramas</Link>
          <Link to="/#novelas" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">Novelas</Link>
          <Link to="/#documentales" className="text-gray-300 hover:text-primary hover:text-glow-primary transition-colors duration-300">Documentales</Link>
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
