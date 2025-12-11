import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/utils/axiosInstance';
import Card from '@/components/Card';
import TrailerModal from '@/components/TrailerModal';
import { Squares2X2Icon } from '@heroicons/react/24/solid';
import Toast from '@/components/Toast';

export function Series() {
  const navigate = useNavigate();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[1]); // Default to 4 columns

  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await axiosInstance.get('/api/videos', {
          params: {
            tipo: 'serie',
            limit: 3000
          }
        });
        setSeries(response.data.videos || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching series:', err);
        setError('Error al cargar las series');
        setLoading(false);
      }
    };

    fetchSeries();
  }, []);

  const handleSerieClick = (serie) => {
    navigate(`/watch/serie/${serie._id}`);
  };

  const handleAddToMyList = async (item) => {
    try {
      const response = await axiosInstance.post('/api/users/my-list/add', {
        itemId: item._id || item.id,
        tipo: item.tipo || 'serie',
        title: item.name || item.title,
        thumbnail: item.thumbnail,
        description: item.description
      });
      setToastMessage(`✨ "${item.name || item.title}" agregado a Mi Lista`);
      setToastType('success');
    } catch (error) {
      if (error.response?.status === 409) {
        setToastMessage(`ℹ️ "${item.name || item.title}" ya estaba en Mi Lista`);
        setToastType('info');
      } else {
        setToastMessage('❌ Error al agregar a Mi Lista');
        setToastType('error');
      }
    } finally {
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handlePlayTrailerClick = (trailerUrl) => {
    if (trailerUrl) {
      setCurrentTrailerUrl(trailerUrl);
      setShowTrailerModal(true);
    }
  };

  const toggleGridView = () => {
    const currentIndex = gridOptions.indexOf(gridCols);
    const nextIndex = (currentIndex + 1) % gridOptions.length;
    setGridCols(gridOptions[nextIndex]);
  };

  const getGridClass = () => {
    switch (gridCols) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';
      case 5: return 'grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6';
      default: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5';
    }
  };

  if (loading) {
    return (
      <>
        <style>{`
          :root {
            --primary: 190 100% 50%;
          }
        `}</style>
        <div 
          className="flex justify-center items-center min-h-screen"
          style={{
            backgroundImage: `url(./fondo.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }}></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{`
          :root {
            --primary: 190 100% 50%;
          }
        `}</style>
        <div 
          className="text-red-400 p-10 text-center min-h-screen flex items-center justify-center"
          style={{
            backgroundImage: `url(./fondo.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {error}
        </div>
      </>
    );
  }

  return (
    <>
      {toastMessage && <Toast message={toastMessage} type={toastType} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

        :root {
          --background: 254 50% 5%;
          --foreground: 210 40% 98%;
          --primary: 190 100% 50%;
          --primary-foreground: 254 50% 5%;
          --secondary: 315 100% 60%;
          --secondary-foreground: 210 40% 98%;
          --muted-foreground: 190 30% 80%;
          --card-background: 254 50% 8%;
          --input-background: 254 50% 12%;
          --input-border: 315 100% 25%;
          --footer-text: 210 40% 70%;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        .text-glow-primary {
          text-shadow: 0 0 5px hsl(var(--primary) / 0.8), 0 0 10px hsl(var(--primary) / 0.6);
        }
        .text-glow-secondary {
          text-shadow: 0 0 5px hsl(var(--secondary) / 0.8), 0 0 10px hsl(var(--secondary) / 0.6);
        }
        .shadow-glow-primary {
          box-shadow: 0 0 25px hsl(var(--primary) / 0.8);
        }
        .drop-shadow-glow-logo {
          filter: drop-shadow(0 0 25px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 15px hsl(var(--primary) / 0.5));
        }
      `}</style>
      <div 
        className="text-white min-h-screen"
        style={{
          backgroundImage: `url(./fondo.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-glow-primary">Series</h1>
            <div className="flex items-center">
              <button
                onClick={toggleGridView}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                aria-label="Cambiar vista de cuadrícula"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
            </div>
          </div>

          
          {series.length > 0 ? (
          <div className={`grid ${getGridClass()} gap-4 md:gap-6`}>
            {series.map((serie) => (
              <Card
                key={serie._id}
                item={serie}
                onClick={() => handleSerieClick(serie)}
                itemType="serie"
                onPlayTrailer={handlePlayTrailerClick}
                onAddToMyList={handleAddToMyList}
              />
            ))}
          </div>
          ) : (
            <p className="text-gray-400 text-center mt-8 py-10 text-lg">
              No hay series disponibles en este momento.
            </p>
          )}
        </div>
      </div>
      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal
          trailerUrl={currentTrailerUrl}
          onClose={() => {
            setShowTrailerModal(false);
            setCurrentTrailerUrl('');
          }}
        />
      )}
    </>
  );
}

export default Series;