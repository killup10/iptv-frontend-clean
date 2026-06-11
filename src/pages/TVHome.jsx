import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TVNavigation from '../components/TVNavigation';
import TVGrid from '../components/TVGrid';
import axios from 'axios';
import { rewriteImageUrl } from '../utils/imageUrl.js';
import { focusTVContent } from '../utils/tvFocusZone';

export default function TVHome() {
  const [featuredContent, setFeaturedContent] = useState([]);
  const [moviesContent, setMoviesContent] = useState([]);
  const [seriesContent, setSeriesContent] = useState([]);
  const [liveChannels, setLiveChannels] = useState([]);
  const [cine2026Content, setCine2026Content] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        // Load content from optimized endpoints in parallel
        const requests = {
          featured: axios.get('/api/videos?isFeatured=true&limit=10'),
          movies: axios.get('/public/featured-movies'),
          series: axios.get('/public/featured-series'),
          live: axios.get('/api/videos?tipo=live&limit=10'),
          cine2026: axios.get('/api/videos?mainSection=CINE_2026&limit=10')
        };

        const responses = await Promise.all(Object.values(requests));
        const data = {
          featured: responses[0].data.videos || responses[0].data,
          movies: responses[1].data,
          series: responses[2].data,
          live: responses[3].data.videos || responses[3].data,
          cine2026: responses[4].data.videos || responses[4].data
        };

        // Map to consistent format
        const mapVideo = (v) => ({
          id: v._id || v.id,
          title: v.title,
          thumbnail: rewriteImageUrl(v.customThumbnail || v.thumbnail || v.logo),
          year: v.releaseYear || v.year,
          genre: v.genres ? v.genres.join(', ') : (v.genre || ''),
          isPremium: v.requiresPlan && v.requiresPlan.length > 1,
          videoUrl: v.url,
          tipo: v.tipo || 'movie'
        });

        setFeaturedContent(data.featured.map(mapVideo));
        setMoviesContent(data.movies.map(mapVideo));
        setSeriesContent(data.series.map(mapVideo));
        setLiveChannels(data.live.map(mapVideo));
        setCine2026Content(data.cine2026.map(mapVideo));

        setLoading(false);
        // Auto-focus content after loading
        setTimeout(() => focusTVContent(), 500);
      } catch (error) {
        console.error('Error loading content:', error);
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  const handleItemSelect = useCallback((item) => {
    const type = item.tipo === 'live' ? 'channel' : (item.tipo || 'movie');
    navigate(`/watch/${type}/${item.id}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center">
        <TVNavigation />
        <div className="text-center">
          <div className="relative w-24 h-24 mb-8 mx-auto">
            <div className="absolute inset-0 rounded-full border-t-4 border-cyan-500 animate-spin"></div>
            <div className="absolute inset-4 rounded-full border-t-4 border-fuchsia-500 animate-spin-slow"></div>
          </div>
          <h2 className="text-white text-4xl font-black uppercase tracking-widest animate-pulse">Cargando TeamG Play</h2>
          <p className="text-cyan-400/60 font-bold mt-4 uppercase text-xs tracking-[0.3em]">Preparando tu experiencia...</p>
        </div>
        <style>{`
          .animate-spin-slow { animation: spin 2s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      <style>{`
        .tv-home-container {
          background: radial-gradient(circle at top right, #1a1033 0%, #050510 60%);
          padding-top: 140px;
        }
        .hero-banner {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(217, 70, 239, 0.1) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
        }
      `}</style>

      <TVNavigation />

      <div className="tv-home-container pb-20">
        {/* Hero Branding */}
        <div className="px-8 mb-16">
          <div className="hero-banner rounded-[2rem] p-16 flex flex-col items-center text-center shadow-2xl">
             <img 
               src="/logo-teamg.png" 
               alt="Logo" 
               className="h-24 mb-8 drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]"
             />
             <h1 className="text-6xl font-black mb-4 uppercase tracking-tighter italic italic">
                Bienvenido a <span className="text-cyan-400">TeamG Play</span> TV
             </h1>
             <p className="text-xl text-white/60 max-w-3xl font-medium leading-relaxed">
                Navega entre miles de titulos premium con la mejor calidad y fluidez.
                Usa tu control remoto para explorar el catalogo.
             </p>
          </div>
        </div>

        {/* Content Grids */}
        <div className="space-y-4">
          <TVGrid 
            items={featuredContent} 
            title="🌟 Contenido Destacado" 
            columns={4}
            onItemSelect={handleItemSelect}
            autoFocus={true}
            gridId="featured"
          />

          <TVGrid 
            items={liveChannels} 
            title="📺 TV en Vivo" 
            columns={5}
            onItemSelect={handleItemSelect}
            gridId="live"
          />

          <TVGrid 
            items={moviesContent} 
            title="🎬 Películas Populares" 
            columns={5}
            onItemSelect={handleItemSelect}
            gridId="movies"
          />

          <TVGrid 
            items={seriesContent} 
            title="📽️ Series Trending" 
            columns={5}
            onItemSelect={handleItemSelect}
            gridId="series"
          />

          <TVGrid 
            items={cine2026Content} 
            title="🍿 Cine 2026" 
            columns={5}
            onItemSelect={handleItemSelect}
            gridId="cine2026"
          />
        </div>
      </div>
      
      {/* Footer Hint */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black to-transparent flex justify-center gap-12 text-xs font-bold uppercase tracking-widest text-white/30 pointer-events-none">
         <div className="flex items-center gap-2"><span className="bg-white/10 px-2 py-1 rounded text-white">↑↓←→</span> Navegar</div>
         <div className="flex items-center gap-2"><span className="bg-cyan-500/20 px-2 py-1 rounded text-cyan-400">OK</span> Seleccionar</div>
         <div className="flex items-center gap-2"><span className="bg-white/10 px-2 py-1 rounded text-white">BACK</span> Volver</div>
      </div>
    </div>
  );
}
