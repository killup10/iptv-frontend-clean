import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import axiosInstance from '../utils/axiosInstance.js';
import TrailerModal from '../components/TrailerModal.jsx';
import MobileVodDetailModal from '../components/MobileVodDetailModal.jsx';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import { useContentAccess } from '../hooks/useContentAccess.js';
import { addItemToMyList } from '../utils/myListUtils.js';
import useVodDetailOverlay from '../hooks/useVodDetailOverlay.js';
import Card from '../components/Card.jsx';

export function MyList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myListItems, setMyListItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    checkContentAccess,
    showAccessModal,
    accessModalData,
    closeAccessModal,
    proceedWithTrial
  } = useContentAccess();
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
    checkContentAccess,
    getNavigationState: () => ({
      fromSection: 'my-list',
    }),
  });

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
    openVodDetail(item, itemType);
    return;
    const navigateToPlayer = (resolvedItem, resolvedType) => {
      const id = resolvedItem._id || resolvedItem.id;
      const path = `/watch/${resolvedType}/${id}`;
      console.log(`Navigating to: ${path}`);
      navigate(path);
    };

    checkContentAccess(item, () => navigateToPlayer(item, itemType));
  };

  const handlePlayTrailerClick = (trailerUrl, onCloseCallback) => {
    openTrailer(trailerUrl, onCloseCallback);
  };

  const handleRemoveFromList = async (itemId) => {
    try {
      console.log('[MyList.jsx] Removiendo item:', itemId);
      await axiosInstance.post(`/api/users/my-list/remove/${itemId}`);
      
      // Actualizar la lista localmente
      setMyListItems(prevItems => prevItems.filter(item => item._id !== itemId && item.id !== itemId));
      
      console.log('[MyList.jsx] Item removido de Mi Lista');
      window.dispatchEvent(new CustomEvent('teamg:refresh-counts'));
    } catch (err) {
      console.error('[MyList.jsx] Error al remover item:', err);
      setError('Error al remover de la lista');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
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
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-white flex items-center gap-2">
            <span>Mi Lista</span>
            <span className="text-sm font-semibold text-gray-300 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/60 align-middle">
              {myListItems.length}
            </span>
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
                  <Card
                    key={item._id || item.id}
                    item={item}
                    onClick={() => handleItemClick(item, item.tipo || item.itemType || 'movie')}
                    itemType={(() => {
                      const t = (item.tipo || item.itemType || '').toLowerCase();
                      if (t === 'pelicula' || t === 'peliculas' || t === 'movie' || t === 'movies' || t === 'video' || t === 'videos') return 'película';
                      if (t === 'serie' || t === 'series') return 'serie';
                      if (t === 'anime' || t === 'animes') return 'anime';
                      if (t === 'dorama' || t === 'doramas') return 'dorama';
                      if (t === 'novela' || t === 'novelas') return 'novela';
                      if (t === 'documental' || t === 'documentales') return 'documental';
                      return item.seasons || item.episodes ? 'serie' : 'película';
                    })()}
                    showItemTypeBadge={true}
                    showRemoveButton={true}
                    onRemoveFromCollection={() => handleRemoveFromList(item._id || item.id)}
                    onPlayTrailer={handlePlayTrailerClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
          onTrailer={detailTrailerUrl ? () => handlePlayTrailerClick(detailTrailerUrl) : null}
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
