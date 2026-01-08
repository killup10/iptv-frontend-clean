import React, { useState, useEffect } from 'react';
import TVNavigation from '../components/TVNavigation';
import TVCard from '../components/TVCard';
import axios from 'axios';



export default function TVHome() {
  const [featuredContent, setFeaturedContent] = useState([]);
  const [moviesContent, setMoviesContent] = useState([]);
  const [seriesContent, setSeriesContent] = useState([]);
  const [liveChannels, setLiveChannels] = useState([]);
  const [cine2026Content, setCine2026Content] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        // Load content from optimized endpoints in parallel
        const requests = {
          featured: axios.get('/api/videos?isFeatured=true&limit=10'),
          movies: axios.get('/public/featured-movies'),
          series: axios.get('/public/featured-series'),
          animes: axios.get('/public/featured-animes'),
          doramas: axios.get('/public/featured-doramas'),
          novelas: axios.get('/public/featured-novelas'),
          documentales: axios.get('/public/featured-documentales'),
          live: axios.get('/api/videos?tipo=live&limit=10'),
          cine2026: axios.get('/api/videos?mainSection=CINE_2026&limit=10')
        };

        const responses = await Promise.all(Object.values(requests));
        const data = {
          featured: responses[0].data.videos || responses[0].data,
          movies: responses[1].data,
          series: responses[2].data,
          animes: responses[3].data,
          doramas: responses[4].data,
          novelas: responses[5].data,
          documentales: responses[6].data,
          live: responses[7].data.videos || responses[7].data,
          cine2026: responses[8].data.videos || responses[8].data
        };

        // Map to consistent format
        const mapVideo = (v) => ({
          id: v._id || v.id,
          title: v.title,
          thumbnail: v.customThumbnail || v.thumbnail || v.logo,
          year: v.releaseYear || v.year,
          genre: v.genres ? v.genres.join(', ') : (v.genre || ''),
          isPremium: v.requiresPlan && v.requiresPlan.length > 1,
          videoUrl: v.url
        });

        const mapSeries = (v) => ({
          ...mapVideo(v),
          seasons: v.seasons || []
        });

        setFeaturedContent(data.featured.map(mapVideo));
        setMoviesContent(data.movies.map(mapVideo));
        setSeriesContent(data.series.map(mapSeries));
        setLiveChannels(data.live.map(mapVideo));
        setCine2026Content(data.cine2026.map(mapVideo));

        setLoading(false);
      } catch (error) {
        console.error('Error loading content:', error);
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  if (loading) {
    return (
      <>
        <TVNavigation />
        <div 
          className="min-h-screen flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
            paddingTop: '120px'
          }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-cyan-500 mb-8"></div>
            <h2 className="text-white text-4xl font-bold mb-4">Cargando TeamG Play TV</h2>
            <p className="text-gray-300 text-xl">Preparando tu experiencia de entretenimiento...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .tv-home-container {
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          min-height: 100vh;
          padding-top: 120px;
        }
        
        .tv-hero-section {
          background: linear-gradient(135deg, rgba(0,255,255,0.1) 0%, rgba(255,0,255,0.1) 100%);
          border: 1px solid rgba(0,255,255,0.2);
          backdrop-filter: blur(10px);
        }
        
        .tv-welcome-text {
          background: linear-gradient(135deg, #00ffff, #ff00ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 30px rgba(0,255,255,0.5);
        }
      `}</style>

      <TVNavigation />
      
      <div className="tv-home-container">
        {/* Hero Section */}
        <div className="px-8 mb-12">
          <div className="tv-hero-section rounded-2xl p-12 text-center">
            <img 
              src="./logo-teamg.png" 
              alt="TeamG Play Logo" 
              className="h-32 mx-auto mb-8"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(0,255,255,0.6)) drop-shadow(0 0 15px rgba(255,0,255,0.4))',
                objectFit: 'contain'
              }}
            />
            <h1 className="tv-welcome-text text-6xl font-bold mb-6">
              Bienvenido a TeamG Play TV
            </h1>
            <p className="text-white text-2xl mb-8 max-w-4xl mx-auto">
              Disfruta de la mejor experiencia de entretenimiento en tu Smart TV. 
              Miles de películas, series, animes y canales en vivo.
            </p>
            <div className="flex justify-center space-x-8 text-lg text-gray-300">
              <span className="flex items-center">
                <span className="text-2xl mr-2">🎬</span>
                Películas HD
              </span>
              <span className="flex items-center">
                <span className="text-2xl mr-2">📺</span>
                Series Completas
              </span>
              <span className="flex items-center">
                <span className="text-2xl mr-2">🌟</span>
                Contenido Premium
              </span>
              <span className="flex items-center">
                <span className="text-2xl mr-2">📡</span>
                TV en Vivo
              </span>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          <TVCard 
            items={featuredContent}
            title="🌟 Contenido Destacado"
            startFocused={true}
          />
          
          <TVCard 
            items={liveChannels}
            title="📺 Canales en Vivo"
          />
          
          <TVCard 
            items={moviesContent}
            title="🎬 Películas Populares"
          />
          
          <TVCard 
            items={seriesContent}
            title="📽️ Series Trending"
          />

          <TVCard 
            items={cine2026Content}
            title="🍿 Cine 2026"
          />
        </div>

        {/* Footer */}
        <div className="text-center py-12 text-gray-400">
          <p className="text-xl mb-4">
            🎮 Usa el control remoto para navegar • OK para seleccionar • BACK para volver
          </p>
          <p className="text-lg">
            © 2024 TeamG Play. La mejor experiencia de streaming para Smart TV.
          </p>
        </div>
      </div>
    </>
  );
}
