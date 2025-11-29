import React, { useState, useEffect } from 'react';
import TVNavigation from '../components/TVNavigation';
import TVCard from '../components/TVCard';

useEffect(() => {
  sessionStorage.removeItem('vlc_opened');
}, []);

export default function TVHome() {
  const [featuredContent, setFeaturedContent] = useState([]);
  const [moviesContent, setMoviesContent] = useState([]);
  const [seriesContent, setSeriesContent] = useState([]);
  const [liveChannels, setLiveChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadContent = async () => {
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setFeaturedContent([
          {
            id: 1,
            title: "Película Destacada 1",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Acción",
            isPremium: true,
            videoUrl: "https://example.com/video1.m3u8"
          },
          {
            id: 2,
            title: "Serie Popular 1",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Drama",
            isPremium: false,
            videoUrl: "https://example.com/video2.m3u8"
          },
          {
            id: 3,
            title: "Anime Trending",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Anime",
            isPremium: true,
            videoUrl: "https://example.com/video3.m3u8"
          },
          {
            id: 4,
            title: "Documental Nuevo",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Documental",
            isPremium: false,
            videoUrl: "https://example.com/video4.m3u8"
          }
        ]);

        setMoviesContent([
          {
            id: 5,
            title: "Acción Extrema",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Acción",
            videoUrl: "https://example.com/movie1.m3u8"
          },
          {
            id: 6,
            title: "Comedia Romántica",
            thumbnail: "/api/placeholder/400/225",
            year: "2023",
            genre: "Comedia",
            videoUrl: "https://example.com/movie2.m3u8"
          },
          {
            id: 7,
            title: "Thriller Psicológico",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Thriller",
            isPremium: true,
            videoUrl: "https://example.com/movie3.m3u8"
          },
          {
            id: 8,
            title: "Ciencia Ficción",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Sci-Fi",
            videoUrl: "https://example.com/movie4.m3u8"
          }
        ]);

        setSeriesContent([
          {
            id: 9,
            title: "Drama Familiar",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Drama",
            videoUrl: "https://example.com/series1.m3u8"
          },
          {
            id: 10,
            title: "Misterio Criminal",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Crimen",
            isPremium: true,
            videoUrl: "https://example.com/series2.m3u8"
          },
          {
            id: 11,
            title: "Aventura Épica",
            thumbnail: "/api/placeholder/400/225",
            year: "2023",
            genre: "Aventura",
            videoUrl: "https://example.com/series3.m3u8"
          },
          {
            id: 12,
            title: "Comedia Situacional",
            thumbnail: "/api/placeholder/400/225",
            year: "2024",
            genre: "Comedia",
            videoUrl: "https://example.com/series4.m3u8"
          }
        ]);

        setLiveChannels([
          {
            id: 13,
            title: "Canal Noticias 24h",
            thumbnail: "/api/placeholder/400/225",
            genre: "Noticias",
            videoUrl: "https://example.com/live1.m3u8"
          },
          {
            id: 14,
            title: "Deportes en Vivo",
            thumbnail: "/api/placeholder/400/225",
            genre: "Deportes",
            videoUrl: "https://example.com/live2.m3u8"
          },
          {
            id: 15,
            title: "Música 24/7",
            thumbnail: "/api/placeholder/400/225",
            genre: "Música",
            videoUrl: "https://example.com/live3.m3u8"
          },
          {
            id: 16,
            title: "Entretenimiento",
            thumbnail: "/api/placeholder/400/225",
            genre: "Entretenimiento",
            videoUrl: "https://example.com/live4.m3u8"
          }
        ]);

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
                filter: 'drop-shadow(0 0 30px rgba(0,255,255,0.6)) drop-shadow(0 0 15px rgba(255,0,255,0.4))'
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
