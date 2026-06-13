import React, { useState, useEffect, useMemo } from 'react';
import { normalizeSearchText } from '../utils/searchUtils.js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/utils/axiosInstance';
import Card from '@/components/Card';
import TrailerModal from '@/components/TrailerModal';
import MobileVodDetailModal from '../components/MobileVodDetailModal.jsx';
import { Squares2X2Icon } from '@heroicons/react/24/solid';
import { getCollections, addItemsToCollection } from '../utils/api.js';
import CollectionsModal from '../components/CollectionsModal.jsx';
import { addItemToMyList } from '../utils/myListUtils.js';
import useVodDetailOverlay from '../hooks/useVodDetailOverlay.js';
import MobileArcadeDeck from '../components/MobileArcadeDeck.jsx';


export function Novelas() {
  const navigate = useNavigate();
  const [novelas, setNovelas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredNovelas = useMemo(() => {
    let filtered = [...novelas];
    if (searchTerm) {
      const normalizedTerm = normalizeSearchText(searchTerm);
      filtered = filtered.filter(novela => {
        const inName = novela.name && normalizeSearchText(novela.name).includes(normalizedTerm);
        const inDesc = novela.description && normalizeSearchText(novela.description).includes(normalizedTerm);
        const inGenres = Array.isArray(novela.genres)
          ? novela.genres.some(g => g && normalizeSearchText(g).includes(normalizedTerm))
          : (typeof novela.genres === 'string' && normalizeSearchText(novela.genres).includes(normalizedTerm));
        return inName || inDesc || inGenres;
      });
    }
    return filtered;
  }, [novelas, searchTerm]);
  const [error, setError] = useState(null);
  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[1]); // Default to 4 columns

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [collections, setCollections] = useState([]);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);
  const {
    vodDetail,
    openVodDetail,
    closeVodDetail,
    showTrailerModal,
    currentTrailerUrl,
    openTrailer,
    closeTrailer,
    detailProgressPercent,
    detailCanContinue,
    detailTrailerUrl,
    handleContinueFromDetail,
    handlePlayFromDetail,
  } = useVodDetailOverlay({
    getNavigationState: () => ({
      fromSection: 'novelas',
    }),
  });

  useEffect(() => {
    const fetchNovelas = async () => {
      try {
        const response = await axiosInstance.get('/api/videos', {
          params: {
            tipo: 'novela',
            limit: 3000
          }
        });
        setNovelas(response.data.videos || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching novelas:', err);
        setError('Error al cargar las novelas');
        setLoading(false);
      }
    };

    fetchNovelas();
  }, []);

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

  const handleNovelaClick = (novela) => {
    openVodDetail(novela, 'novela');
    return;
    navigate(`/watch/serie/${novela._id}`);
  };

  const handlePlayTrailerClick = (trailerUrl) => {
    openTrailer(trailerUrl);
    return;
  };

  const handleAddToMyList = async (item) => {
    try {
      const response = await axiosInstance.post('/api/users/my-list/add', {
        itemId: item._id || item.id,
        tipo: item.tipo || 'novela',
        title: item.name || item.title,
        thumbnail: item.thumbnail,
        description: item.description
      });
      setToastMessage(`✨ "${item.name || item.title}" agregado a Mi Lista`);
      setToastType('success');
      window.dispatchEvent(new CustomEvent('teamg:refresh-counts'));
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

  const toggleGridView = () => {
    const currentIndex = gridOptions.indexOf(gridCols);
    const nextIndex = (currentIndex + 1) % gridOptions.length;
    setGridCols(gridOptions[nextIndex]);
  };

  const getGridClass = () => {
    switch (gridCols) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';
      case 5: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6';
      default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
  };


  if (loading && !isMobile) {
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
      {isMobile ? (
        <MobileArcadeDeck
          items={novelas}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onItemClick={handleNovelaClick}
          onPlayTrailer={handlePlayTrailerClick}
          onAddToMyList={handleAddToMyList}
          onAddToCollectionClick={handleOpenCollectionsModal}
          title="Novelas"
          itemType="novela"
          variant="cinematic"
          loading={loading}
        />
      ) : (
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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-glow-primary flex items-center gap-2">
                <span>Novelas</span>
                <span className="text-sm font-semibold text-gray-300 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/60">
                  {filteredNovelas.length}
                </span>
              </h1>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={toggleGridView}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                  aria-label="Cambiar vista de cuadrícula"
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Buscar novelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00e5ff] focus:border-[#00e5ff]"
                />
              </div>
            </div>

            
            {filteredNovelas.length > 0 ? (
            <div className={`grid ${getGridClass()} gap-4 md:gap-6`}>
              {filteredNovelas.map((novela) => (
                <Card
                  key={novela._id || novela.id}
                  item={novela}
                  onClick={() => handleNovelaClick(novela)}
                  itemType="novela"
                  onPlayTrailer={handlePlayTrailerClick}
                  onAddToMyList={handleAddToMyList}
                  onAddToCollectionClick={handleOpenCollectionsModal}
                />
              ))}
            </div>
            ) : (
              <p className="text-gray-400 text-center mt-8 py-10 text-lg">
                {searchTerm ? "No se encontraron novelas que coincidan con la búsqueda." : "No hay novelas disponibles en este momento."}
              </p>
            )}
          </div>
        </div>
      )}
      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal
          trailerUrl={currentTrailerUrl}
          onClose={closeTrailer}
        />
      )}
      {vodDetail?.item && (
        <MobileVodDetailModal
          isOpen={Boolean(vodDetail?.item)}
          item={vodDetail.item}
          itemType={vodDetail.itemType}
          canContinue={detailCanContinue}
          progressPercent={detailProgressPercent}
          onClose={closeVodDetail}
          onContinue={handleContinueFromDetail}
          onPlay={handlePlayFromDetail}
          onAddToMyList={addItemToMyList}
          onTrailer={detailTrailerUrl ? () => openTrailer(detailTrailerUrl) : null}
        />
      )}
      <CollectionsModal
          isOpen={isCollectionsModalOpen}
          onClose={handleCloseCollectionsModal}
          item={selectedItemForCollection}
          collections={collections.filter(c => c.itemsModel === 'Video')}
          onAddToCollection={handleAddToCollection}
      />
    </>
  );
}


export default Novelas;
