import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import axiosInstance from '../utils/axiosInstance.js';
import TrailerModal from '../components/TrailerModal.jsx';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import { useContentAccess } from '../hooks/useContentAccess.js';

export function MyList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myListItems, setMyListItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  const {
    checkContentAccess,
    showAccessModal,
    accessModalData,
    closeAccessModal,
    proceedWithTrial
  } = useContentAccess();

  // Cargar Mi Lista
  useEffect(() => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    const loadMyList = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[MyList.jsx] Cargando Mi Lista...');
        
        const response = await axiosInstance.get('/api/users/my-list');
        console.log('[MyList.jsx] Respuesta:', response.data);
        
        setMyListItems(response.data.items || []);
      } catch (err) {
        console.error('[MyList.jsx] Error al cargar Mi Lista:', err);
        setError('Error al cargar tu lista');
        setMyListItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadMyList();
  }, [user?.token]);

  const handleItemClick = (item, itemType) => {
    const navigateToPlayer = (resolvedItem, resolvedType) => {
      const id = resolvedItem._id || resolvedItem.id;
      const path = `/watch/${resolvedType}/${id}`;
      console.log(`Navigating to: ${path}`);
      navigate(path);
    };

    checkContentAccess(item, () => navigateToPlayer(item, itemType));
  };

  const handlePlayTrailerClick = (trailerUrl, onCloseCallback) => {
    if (trailerUrl) {
      console.log('[MyList.jsx] Playing trailer:', trailerUrl);
      setCurrentTrailerUrl(trailerUrl);
      setShowTrailerModal(true);
      if (onCloseCallback && typeof onCloseCallback === 'function') {
        window.__lastTrailerOnClose = onCloseCallback;
      }
    }
  };

  const handleRemoveFromList = async (itemId) => {
    try {
      console.log('[MyList.jsx] Removiendo item:', itemId);
      await axiosInstance.post(`/api/users/my-list/remove/${itemId}`);
      
      // Actualizar la lista localmente
      setMyListItems(prevItems => prevItems.filter(item => item._id !== itemId && item.id !== itemId));
      
      console.log('[MyList.jsx] Item removido de Mi Lista');
    } catch (err) {
      console.error('[MyList.jsx] Error al remover item:', err);
      setError('Error al remover de la lista');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="text-white min-h-screen"
        style={{
          backgroundImage: "url('background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-white">
            Mi Lista
          </h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {myListItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-xl mb-4">Tu lista está vacía</p>
              <p className="text-gray-500 mb-6">Agrega contenido a tu lista desde cualquier película o serie</p>
              <button
                onClick={() => navigate('/')}
                className="bg-[#00e5ff] hover:bg-[#00c4d9] text-black font-semibold py-2 px-6 rounded-lg transition-all duration-200 hover:scale-105"
              >
                Explorar Contenido
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-400 mb-6">
                Tienes <span className="font-bold text-[#00e5ff]">{myListItems.length}</span> item{myListItems.length !== 1 ? 's' : ''} en tu lista
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myListItems.map((item) => (
                  <div
                    key={item._id || item.id}
                    className="group/card relative"
                  >
                    <div className="aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden transition-transform duration-300 group-hover/card:scale-105 relative shadow-lg">
                      <img
                        src={item.thumbnail || '/img/placeholder-thumbnail.png'}
                        alt={item.name || item.title || 'Póster'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/img/placeholder-thumbnail.png';
                        }}
                        loading="lazy"
                      />

                      <div 
                        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 className="text-white text-sm font-bold line-clamp-2 mb-2 drop-shadow-lg">
                          {item.name || item.title}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleItemClick(item, item.tipo || item.itemType || 'movie');
                            }}
                            className="flex-1 bg-[#00e5ff] hover:bg-[#00c4d9] text-black text-xs font-semibold py-1 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1 pointer-events-auto hover:scale-110 hover:shadow-[0_0_20px_rgba(0,229,255,0.8)] relative z-50 active:scale-95"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleRemoveFromList(item._id || item.id);
                            }}
                            className="w-10 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-1 rounded-md transition-all duration-200 flex items-center justify-center pointer-events-auto hover:scale-110 relative z-50"
                            title="Remover de Mi Lista"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div 
                        className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent group-hover/card:opacity-0 transition-opacity duration-300"
                      >
                        <p className="text-white text-xs font-semibold truncate pointer-events-none">
                          {item.name || item.title || 'Título no disponible'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal
          trailerUrl={currentTrailerUrl}
          onClose={() => {
            setShowTrailerModal(false);
            setCurrentTrailerUrl('');
            try {
              const cb = window.__lastTrailerOnClose;
              if (typeof cb === 'function') {
                cb();
              }
            } catch (err) {
              console.warn('[MyList.jsx] Error calling trailer onClose callback', err);
            } finally {
              window.__lastTrailerOnClose = null;
            }
          }}
        />
      )}

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={proceedWithTrial}
      />
    </>
  );
}

export default MyList;
