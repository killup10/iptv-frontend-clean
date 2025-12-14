import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import axiosInstance from '@/utils/axiosInstance';
import Card from '../components/Card.jsx';
import { Squares2X2Icon } from '@heroicons/react/24/solid';
import Toast from '../components/Toast.jsx';
import { getCollections, addItemsToCollection } from '../utils/api.js';
import CollectionsModal from '../components/CollectionsModal.jsx';



export function Animes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Estados para modales
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');
  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[1]); // Default to 4 columns for better mobile view

  const [collections, setCollections] = useState([]);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);



  // Hook para verificación de acceso al contenido
  const {
    checkContentAccess,
    showAccessModal,
    accessModalData,
    closeAccessModal,
    proceedWithTrial
  } = useContentAccess();

  useEffect(() => {
    const fetchAnimes = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }
      
      try {
        // Buscar tanto animes nuevos (tipo: 'anime') como animes antiguos (tipo: 'serie', subtipo: 'anime')
        const [newAnimes, oldAnimes] = await Promise.all([
          axiosInstance.get('/api/videos', {
            params: {
              tipo: 'anime',
                            limit: 3000
            }
          }).catch(() => ({ data: { videos: [] } })),
          axiosInstance.get('/api/videos', {
            params: {
              tipo: 'serie',
              subtipo: 'anime',
                            limit: 3000
            }
          }).catch(() => ({ data: { videos: [] } }))
        ]);

        console.log("Animes nuevos:", newAnimes.data);
        console.log("Animes antiguos:", oldAnimes.data);
        
        // Combinar ambos resultados y eliminar duplicados por ID
        const newAnimesData = newAnimes.data?.videos || [];
        const oldAnimesData = oldAnimes.data?.videos || [];
        const allAnimes = [...newAnimesData, ...oldAnimesData];

        if (allAnimes.length > 0) {
          console.log("Total animes encontrados antes de eliminar duplicados:", allAnimes.length);
          
          // Eliminar duplicados usando un Map por ID
          const uniqueAnimesMap = new Map();
          allAnimes.forEach(video => {
            const id = video._id || video.id;
            if (id && !uniqueAnimesMap.has(id)) {
              uniqueAnimesMap.set(id, {
                ...video,
                title: video.title || video.name || 'Sin título',
                thumbnail: video.customThumbnail || video.thumbnail || video.logo || video.tmdbThumbnail || '',
                _id: video._id || video.id
              });
            }
          });
          
          const uniqueAnimes = Array.from(uniqueAnimesMap.values());
          console.log("Total animes únicos:", uniqueAnimes.length);
          setAnimes(uniqueAnimes);
        } else {
          setAnimes([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching animes:', err);
        setError('Error al cargar los animes');
        setLoading(false);
      }
    };

    fetchAnimes();
  }, [user?.token]);

  useEffect(() => {
    const loadCollections = async () => {
        try {
            const fetchedCollections = await getCollections();
            setCollections(fetchedCollections);
        } catch (error) {
            console.error("Failed to load collections", error);
        }
    };
    loadCollections();
  }, []);

  const handleOpenCollectionsModal = (item) => {
    setSelectedItemForCollection(item);
    setIsCollectionsModalOpen(true);
  };

  const handleCloseCollectionsModal = () => {
      setIsCollectionsModalOpen(false);
      setSelectedItemForCollection(null);
  };

  const handleAddToCollection = async ({ item, collectionName }) => {
      try {
          let collection = collections.find(c => c.name === collectionName);
          
          if (!collection) {
              console.log('Colección no encontrada, recargando colecciones...');
              const updatedCollections = await getCollections();
              setCollections(updatedCollections);
              collection = updatedCollections.find(c => c.name === collectionName);
          }
          
          if (collection) {
              await addItemsToCollection(collection._id, [item._id || item.id]);
              alert(`${item.name || item.title} fue agregado a la colección ${collectionName}`);
              
              const refreshedCollections = await getCollections();
              setCollections(refreshedCollections);
          } else {
              throw new Error(`No se pudo encontrar la colección "${collectionName}"`);
          }
      } catch (error) {
          console.error("Failed to add item to collection", error);
          alert(`Error al agregar a la colección: ${error.message}`);
      }
      handleCloseCollectionsModal();
  };

  const handleAnimeClick = (anime) => {
    const animeId = anime.id || anime._id;
    if (!animeId) {
      console.error("Animes: Clic en anime sin ID válido.", anime);
      return;
    }

    // Función para navegar después de verificar acceso
    const navigateToAnime = () => {
      // Usar el tipo real del anime para consistencia con continue watching
      const itemType = anime.tipo || 'anime';
      navigate(`/watch/${itemType}/${animeId}`);
    };

    // Verificar acceso antes de navegar
    checkContentAccess(anime, navigateToAnime);
  };

  const handleAddToMyList = async (item) => {
    try {
      console.log('[Animes.jsx] Agregando a Mi Lista:', item);
      const response = await axiosInstance.post('/api/users/my-list/add', {
        itemId: item._id || item.id,
        tipo: item.tipo || 'anime',
        title: item.name || item.title,
        thumbnail: item.thumbnail,
        description: item.description
      });

      console.log('[Animes.jsx] Agregado a Mi Lista exitosamente:', response.data);
      setToastMessage(`✨ "${item.name || item.title}" agregado a Mi Lista`);
      setToastType('success');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('[Animes.jsx] Item ya está en Mi Lista');
        setToastMessage(`ℹ️ "${item.name || item.title}" ya estaba en Mi Lista`);
        setToastType('info');
      } else {
        console.error('[Animes.jsx] Error al agregar a Mi Lista:', error);
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

  const handleProceedWithTrial = () => {
    // El hook maneja la navegación internamente
    proceedWithTrial();
  };

  const toggleGridView = () => {
    const currentIndex = gridOptions.indexOf(gridCols);
    const nextIndex = (currentIndex + 1) % gridOptions.length;
    setGridCols(gridOptions[nextIndex]);
  };

  const getGridClass = () => {
    switch (gridCols) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'; // 3 cols on mobile, 4 on tablet, 5 on desktop
      case 5: return 'grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6'; // 3 cols min on mobile
      default: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5';
    }
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-128px)]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-6 text-lg bg-gray-800 rounded-md mx-auto max-w-md">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-center text-xl text-gray-400 mt-20">
        Debes <a href="/login" className="text-red-500 hover:underline">iniciar sesión</a> para ver este contenido.
      </p>
    );
  }

  return (
    <>
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
            <h1 className="text-3xl md:text-4xl font-bold text-glow-primary">Animes</h1>
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

          
          {animes.length > 0 ? (
            <div className={`grid ${getGridClass()} gap-6`}>
              {animes.map(anime => (
                <Card
                  key={anime.id || anime._id}
                  item={anime}
                  onClick={() => handleAnimeClick(anime)}
                  itemType="anime"
                  onPlayTrailer={handlePlayTrailerClick}
                  onAddToMyList={handleAddToMyList}
                  onAddToCollectionClick={handleOpenCollectionsModal}
                />
              ))}
            </div>


          ) : (
            <p className="text-center text-gray-400 mt-8">
              No hay animes disponibles en este momento.
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

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={handleProceedWithTrial}
      />

        <CollectionsModal
            isOpen={isCollectionsModalOpen}
            onClose={handleCloseCollectionsModal}
            item={selectedItemForCollection}
            collections={collections.filter(c => c.itemsModel === 'Video')}
            onAddToCollection={handleAddToCollection}
        />

      {toastMessage && <Toast
        message={toastMessage}
        type={toastType}
        duration={3000}
        onClose={() => setToastMessage('')}
      />}
    </>
  );
}

export default Animes;
