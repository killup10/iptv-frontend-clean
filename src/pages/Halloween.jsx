import React, { useState, useEffect, useMemo } from 'react';
import { normalizeSearchText } from '../utils/searchUtils.js';
import { useNavigate, Navigate } from 'react-router-dom';
import { isHalloweenSeason } from '../utils/halloweenSeason.js';
import axiosInstance from '@/utils/axiosInstance';
import Card from '@/components/Card';
import TrailerModal from '@/components/TrailerModal';
import MobileVodDetailModal from '../components/MobileVodDetailModal.jsx';
import { Squares2X2Icon } from '@heroicons/react/24/solid';
import Toast from '@/components/Toast';
import { getCollections, addItemsToCollection, fetchHalloweenVideos } from '../utils/api.js';
import CollectionsModal from '../components/CollectionsModal.jsx';
import { addItemToMyList } from '../utils/myListUtils.js';
import useVodDetailOverlay from '../hooks/useVodDetailOverlay.js';
import MobileArcadeDeck from '../components/MobileArcadeDeck.jsx';

const getId = (item) => item?._id || item?.id;
const getTitle = (item) => item?.title || item?.name || 'Sin título';

function dedupe(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const id = getId(item);
    const key = id || `${item?.tipo}-${getTitle(item)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const FAMILY_GENRE_KEYS = ['familiar', 'familia', 'family', 'infantil', 'kids', 'nino', 'ninos', 'animacion', 'animation', 'disney', 'pixar'];

function isFamilyItem(item) {
  if (!Array.isArray(item?.genres)) return false;
  return item.genres.some((g) => {
    const n = String(g || '').toLowerCase();
    return FAMILY_GENRE_KEYS.some((k) => n.includes(k));
  });
}

const HW_BG_EMOJIS = [
  { e: '🎃', top: '6%', left: '4%', size: '4.5rem', delay: '0s' },
  { e: '🦇', top: '10%', left: '78%', size: '3rem', delay: '1.2s' },
  { e: '👻', top: '38%', left: '90%', size: '3.6rem', delay: '2s', hideMobile: true },
  { e: '🕷️', top: '64%', left: '6%', size: '2.6rem', delay: '0.6s' },
  { e: '🌙', top: '4%', left: '55%', size: '3.2rem', delay: '3s', hideMobile: true },
  { e: '🕸️', top: '82%', left: '80%', size: '4rem', delay: '1.6s', hideMobile: true },
  { e: '🎃', top: '74%', left: '42%', size: '2.4rem', delay: '2.4s' },
  { e: '🦇', top: '30%', left: '12%', size: '2.2rem', delay: '4s' },
  { e: '🍬', top: '52%', left: '95%', size: '2rem', delay: '0.9s', hideMobile: true },
];

function HalloweenBg() {
  return (
    <div className="hw-bg" aria-hidden="true">
      {HW_BG_EMOJIS.map((b, i) => (
        <span
          key={i}
          className={`hw-bg-emoji${b.hideMobile ? ' hide-mobile' : ''}`}
          style={{ top: b.top, left: b.left, fontSize: b.size, animationDelay: b.delay }}
        >
          {b.e}
        </span>
      ))}
    </div>
  );
}

export function Halloween() {
  const navigate = useNavigate();
  const [exclusive, setExclusive] = useState([]);
  const [autoTerror, setAutoTerror] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [shownCounts, setShownCounts] = useState({});
  const PAGE_SIZE = 30;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    handleContinueFromDetail,
    handlePlayFromDetail,
  } = useVodDetailOverlay({
    getNavigationState: () => ({
      fromSection: 'halloween',
    }),
  });

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [exclusiveRes] = await Promise.allSettled([
          fetchHalloweenVideos(1, 500),
        ]);

        const exclusiveItems = exclusiveRes.status === 'fulfilled'
          ? dedupe(exclusiveRes.value?.videos || [])
          : [];
        setExclusive(exclusiveItems);
        setAutoTerror([]);
      } catch (err) {
        console.error('Error cargando Especial Halloween:', err);
        setError('Error al cargar el Especial Halloween');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    getCollections().then(setCollections).catch(() => {});
  }, []);

  const matchesTab = (item) => {
    if (activeTab === 'todos') return true;
    // Series: por Tipo (incluye Halloween sin marcar); Kids no se repite aquí.
    if (activeTab === 'series') {
      const t = (item?.tipo || '').toLowerCase();
      return !kidsBaseIds.has(getId(item)) && t !== 'pelicula';
    }
    // Películas: por Tipo, marcado o no.
    if (activeTab === 'peliculas') {
      return (item?.tipo || '').toLowerCase() === 'pelicula' && !kidsBaseIds.has(getId(item));
    }
    // Especiales: solo lo subido con Tipo Halloween.
    if (activeTab === 'especiales') {
      return (item?.tipo || '').toLowerCase() === 'halloween' && !kidsBaseIds.has(getId(item));
    }
    if (activeTab === 'kids') {
      return kidsBaseIds.has(getId(item));
    }
    return true;
  };

  const matchesSearch = (item) => {
    if (!searchTerm) return true;
    const term = normalizeSearchText(searchTerm);
    const inTitle = getTitle(item) && normalizeSearchText(getTitle(item)).includes(term);
    const inDesc = item.description && normalizeSearchText(item.description).includes(term);
    const inGenres = Array.isArray(item.genres)
      ? item.genres.some((g) => g && normalizeSearchText(g).includes(term))
      : (typeof item.genres === 'string' && normalizeSearchText(item.genres).includes(term));
    return inTitle || inDesc || inGenres;
  };

  const allItems = useMemo(
    () => dedupe([...exclusive, ...autoTerror]),
    [exclusive, autoTerror],
  );
  // Grupo Kids: flag Solo Halloween Kids + géneros familiares.
  // Lo Kids es exclusivo: no se repite en Series/Películas.
  const kidsBase = useMemo(
    () => dedupe([
      ...allItems.filter((i) => i?.halloweenKidsOnly === true),
      ...allItems.filter((i) => (i?.tipo || '').toLowerCase() !== 'halloween' && isFamilyItem(i)),
    ]),
    [allItems],
  );
  const kidsBaseIds = useMemo(
    () => new Set(kidsBase.map(getId).filter(Boolean)),
    [kidsBase],
  );
  const filteredAll = useMemo(
    () => allItems.filter((i) => matchesTab(i) && matchesSearch(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, activeTab, kidsBase, searchTerm],
  );

  // Grupos por tipo para las secciones: Especiales = solo subido como Halloween,
  // Series/Películas = todo lo demás (incluye lo marcado con el checkbox).
  const getTipo = (item) => (item?.tipo || '').toLowerCase();
  const searchedAll = useMemo(
    () => allItems.filter((i) => matchesSearch(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, searchTerm],
  );
  const especialItems = useMemo(
    () => searchedAll.filter((i) => getTipo(i) === 'halloween' && !kidsBaseIds.has(getId(i))),
    [searchedAll, kidsBaseIds],
  );
  const seriesItems = useMemo(
    () => searchedAll.filter((i) => getTipo(i) !== 'pelicula' && !kidsBaseIds.has(getId(i))),
    [searchedAll, kidsBaseIds],
  );
  const movieItems = useMemo(
    () => searchedAll.filter((i) => getTipo(i) === 'pelicula' && !kidsBaseIds.has(getId(i))),
    [searchedAll, kidsBaseIds],
  );
  const kidsItems = useMemo(
    () => kidsBase.filter((i) => matchesSearch(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kidsBase, searchTerm],
  );

  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[0]);
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
      let collection = collections.find((c) => c.name === collectionName);
      if (!collection) {
        const updatedCollections = await getCollections();
        setCollections(updatedCollections);
        collection = updatedCollections.find((c) => c.name === collectionName);
      }
      if (collection) {
        await addItemsToCollection(collection._id, [item._id || item.id]);
        setToastMessage(`"${getTitle(item)}" agregado a ${collectionName}`);
        setToastType('success');
        const refreshedCollections = await getCollections();
        setCollections(refreshedCollections);
      } else {
        throw new Error(`No se pudo encontrar la colección "${collectionName}"`);
      }
    } catch (err) {
      console.error('Failed to add item to collection', err);
      setToastMessage(`Error al agregar a la colección: ${err.message}`);
      setToastType('error');
    } finally {
      setTimeout(() => setToastMessage(''), 3000);
    }
    handleCloseCollectionsModal();
  };

  const handleItemClick = (item) => {
    openVodDetail(item, item?.tipo || 'halloween');
  };

  const handleAddToMyList = async (item) => {
    try {
      await axiosInstance.post('/api/users/my-list/add', {
        itemId: item._id || item.id,
        tipo: item.tipo || 'halloween',
        title: getTitle(item),
        thumbnail: item.thumbnail,
        description: item.description,
      });
      setToastMessage(`"${getTitle(item)}" agregado a Mi Lista`);
      setToastType('success');
      window.dispatchEvent(new CustomEvent('teamg:refresh-counts'));
    } catch (err) {
      if (err.response?.status === 409) {
        setToastMessage(`"${getTitle(item)}" ya estaba en Mi Lista`);
        setToastType('info');
      } else {
        setToastMessage('Error al agregar a Mi Lista');
        setToastType('error');
      }
    } finally {
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handlePlayTrailerClick = (trailerUrl) => {
    openTrailer(trailerUrl);
  };

  const tabs = [
    { key: 'todos', label: 'Todo' },
    { key: 'peliculas', label: 'Películas' },
    { key: 'series', label: 'Series' },
    { key: 'especiales', label: 'Especiales' },
    { key: 'kids', label: '👻 Halloween Kids' },
  ];

  // Fuera de temporada (solo octubre) el especial se oculta y redirige al inicio.
  if (!isHalloweenSeason()) {
    return <Navigate to="/home" replace />;
  }

  if (loading && !isMobile) {
    return (
      <div
        className="flex justify-center items-center min-h-screen"
        style={{ background: 'radial-gradient(circle at 50% 20%, #2a0a3b 0%, #0b0614 60%, #000 100%)' }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎃</div>
          <div className="w-16 h-16 mx-auto border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#ff6b00', borderTopColor: 'transparent' }}></div>
          <p className="text-orange-300 mt-4">Invocando espíritus...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-red-400 p-10 text-center min-h-screen flex items-center justify-center"
        style={{ background: '#0b0614' }}
      >
        {error}
      </div>
    );
  }

  const renderSection = (key, emoji, title, items, emptyHint) => {
    if (!items.length && !emptyHint) return null;
    const visible = items.slice(0, shownCounts[key] || PAGE_SIZE);
    return (
      <section className="mb-10">
        <h2 className="text-xl md:text-2xl font-extrabold mb-4 flex items-center gap-2">
          <span>{emoji}</span>
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
            {title}
          </span>
          <span className="text-sm font-semibold text-orange-200/70 bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-800/60">
            {items.length}
          </span>
        </h2>
        {visible.length > 0 ? (
          <>
          <div className={`grid ${getGridClass()} gap-4 md:gap-6`}>
            {visible.map((item) => (
              <Card
                key={getId(item) || `${title}-${getTitle(item)}`}
                item={item}
                onClick={() => handleItemClick(item)}
                itemType={item?.tipo || 'halloween'}
                onPlayTrailer={handlePlayTrailerClick}
                onAddToMyList={handleAddToMyList}
                onAddToCollectionClick={handleOpenCollectionsModal}
              />
            ))}
          </div>
          {items.length > visible.length && (
            <div className="text-center mt-5">
              <button
                onClick={() => setShownCounts((prev) => ({ ...prev, [key]: (prev[key] || PAGE_SIZE) + PAGE_SIZE }))}
                className="px-6 py-2.5 rounded-full text-sm font-bold bg-orange-600/20 border border-orange-500/50 text-orange-200 hover:bg-orange-600/40 transition-colors"
              >
                Ver más 🎃 ({items.length - visible.length} restantes)
              </button>
            </div>
          )}
          </>
        ) : (
          <p className="text-orange-200/50 text-center py-6">{emptyHint}</p>
        )}
      </section>
    );
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} type={toastType} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        :root {
          --hw-primary: 24 100% 55%;
          --hw-secondary: 275 80% 60%;
        }
        body { font-family: 'Inter', sans-serif; }
        .hw-float { animation: hwFloat 4s ease-in-out infinite; }
        .hw-float-slow { animation: hwFloat 7s ease-in-out infinite; }
        @keyframes hwFloat {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-14px) rotate(4deg); }
        }
        .hw-fog {
          background:
            radial-gradient(circle at 15% 20%, rgba(255,107,0,0.16), transparent 32%),
            radial-gradient(circle at 85% 15%, rgba(124,58,237,0.22), transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(255,107,0,0.08), transparent 40%),
            linear-gradient(180deg, #150826 0%, #0b0614 55%, #000 100%);
        }
        .hw-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          contain: strict;
          background:
            radial-gradient(44vw 44vw at 6% 10%, rgba(255,107,0,0.22), transparent 62%),
            radial-gradient(38vw 38vw at 94% 6%, rgba(124,58,237,0.26), transparent 62%),
            radial-gradient(52vw 52vw at 50% 112%, rgba(255,60,0,0.14), transparent 62%),
            radial-gradient(30vw 30vw at 88% 72%, rgba(255,107,0,0.12), transparent 62%),
            radial-gradient(26vw 26vw at 10% 85%, rgba(124,58,237,0.16), transparent 62%),
            linear-gradient(180deg, #150826 0%, #0b0614 55%, #000 100%);
        }
        .hw-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(120% 90% at 50% 38%, transparent 52%, rgba(0,0,0,0.6) 100%);
        }
        .hw-content {
          position: relative;
          z-index: 1;
        }
        .hw-bg-emoji {
          position: absolute;
          filter: blur(2px);
          opacity: 0.55;
          animation: hwDrift 9s ease-in-out infinite;
          user-select: none;
          will-change: transform;
          transform: translateZ(0);
        }
        @keyframes hwDrift {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-24px) rotate(6deg); }
        }
        @media (max-width: 768px) {
          .hw-bg-emoji { filter: blur(1px); opacity: 0.3; }
          .hw-bg-emoji.hide-mobile { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hw-bg-emoji, .hw-float, .hw-float-slow { animation: none !important; }
        }
      `}</style>

      {isMobile ? (
        <div className="min-h-screen">
          <HalloweenBg />
          <div className="hw-content">
          <MobileArcadeDeck
            items={filteredAll}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onItemClick={handleItemClick}
            onPlayTrailer={handlePlayTrailerClick}
            onAddToMyList={handleAddToMyList}
            onAddToCollectionClick={handleOpenCollectionsModal}
            title="🎃 Especial Halloween"
            itemType="halloween"
            variant="arcade"
            loading={loading}
          />
          </div>
        </div>
      ) : (
        <div className="text-white min-h-screen">
          <HalloweenBg />
          <div className="hw-content">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8">
            <div
              className="relative overflow-hidden rounded-2xl border border-orange-800/50 mb-8 p-6 md:p-10"
              style={{ background: 'linear-gradient(120deg, rgba(60,12,80,0.9) 0%, rgba(20,8,30,0.95) 55%, rgba(80,25,0,0.85) 100%)' }}
            >
              <div className="absolute top-2 left-6 text-4xl md:text-6xl hw-float">🎃</div>
              <div className="absolute top-4 right-8 text-3xl md:text-5xl hw-float-slow">👻</div>
              <div className="absolute bottom-3 left-1/3 text-2xl md:text-4xl hw-float-slow">🦇</div>
              <div className="absolute bottom-4 right-1/4 text-2xl md:text-4xl hw-float">🕷️</div>
              <div className="relative text-center">
                <p className="text-orange-300/80 tracking-[0.3em] text-xs md:text-sm font-bold mb-2">🦇 TRUCO O TRATO 🍬</p>
                <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-200 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,107,0,0.45)]">
                  ESPECIAL HALLOWEEN
                </h1>
                <p className="text-purple-200/80 mt-3 text-sm md:text-base">
                  Películas, series y cortos para una maratón escalofriante 🎃 {allItems.length} títulos embrujados
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setShownCounts({}); }}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors border ${
                      activeTab === tab.key
                        ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_18px_rgba(255,107,0,0.55)]'
                        : 'bg-white/5 border-purple-700/50 text-purple-200 hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={toggleGridView}
                  className="bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white p-2 rounded-md transition-colors border border-purple-800"
                  aria-label="Cambiar vista de cuadrícula"
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Buscar en Halloween... 🎃"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShownCounts({}); }}
                  className="w-full sm:w-auto px-4 py-2 bg-black/50 border border-orange-800 rounded-lg text-white placeholder-orange-200/40 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {renderSection('especiales', '🎃', 'Especiales', (activeTab === 'todos' || activeTab === 'especiales') ? especialItems : [], activeTab === 'especiales' ? 'Lo subido con Tipo Halloween aparece aquí.' : '')}
            {renderSection('kids', '👻', 'Halloween Kids', (activeTab === 'todos' || activeTab === 'kids') ? kidsItems : [], activeTab === 'kids' ? 'Marca 👻 Solo Halloween Kids o usa géneros familiares.' : '')}
            {renderSection('series', '📺', 'Series', (activeTab === 'todos' || activeTab === 'series') ? seriesItems : [], activeTab === 'series' ? 'No hay series aquí todavía.' : '')}
            {renderSection('peliculas', '🎬', 'Películas', (activeTab === 'todos' || activeTab === 'peliculas') ? movieItems : [], activeTab === 'peliculas' ? 'No hay películas aquí todavía.' : '')}

            {!allItems.length && (
              <div className="text-center py-14">
                <div className="text-6xl mb-4">🕸️</div>
                <p className="text-purple-200 text-lg">La cripta está vacía... por ahora.</p>
                <p className="text-purple-300/60 text-sm mt-2">
                  Marca el checkbox 🎃 Halloween en tus pelis/series,
                  o sube contenido con tipo Halloween desde el Admin.
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal trailerUrl={currentTrailerUrl} onClose={closeTrailer} />
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
          onTrailer={openTrailer}
        />
      )}
      <CollectionsModal
        isOpen={isCollectionsModalOpen}
        onClose={handleCloseCollectionsModal}
        item={selectedItemForCollection}
        collections={collections.filter((c) => c.itemsModel === 'Video')}
        onAddToCollection={handleAddToCollection}
      />
    </>
  );
}

export default Halloween;
