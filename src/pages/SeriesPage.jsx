import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchUserSeries } from '../utils/api.js';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import Card from '../components/Card.jsx';
import { Squares2X2Icon } from '@heroicons/react/24/solid';



const SUBCATEGORIAS = [
  "TODOS",
  "Netflix",
  "Prime Video",
  "Disney",
  "Apple TV",
  "HBO MAX",
  "Hulu y Otros",
  "Retro",
  "Animadas"
];

export default function SeriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [series, setSeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const gridOptions = [5, 4, 3, 1];
  const [gridCols, setGridCols] = useState(gridOptions[0]);

  // Estados para el modal de tráiler

  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  // Hook para verificación de acceso al contenido

  const {
    checkContentAccess,
    showAccessModal,
    accessModalData,
    closeAccessModal,
    proceedWithTrial
  } = useContentAccess();

  useEffect(() => {
    const loadData = async () => {
      if (!user?.token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const userSeries = await fetchUserSeries();
        setSeries(userSeries || []);
      } catch (err) {
        console.error("Error cargando series en SeriesPage:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user?.token]);

  const handleSerieClick = (serie) => {
    const serieId = serie.id || serie._id;
    if (!serieId) {
      console.error("SeriesPage: Clic en serie sin ID válido.", serie);
      return;
    }

    // Función para navegar después de verificar acceso
    const navigateToSerie = () => {
      navigate(`/watch/serie/${serieId}`);
    };

    // Verificar acceso antes de navegar
    checkContentAccess(serie, navigateToSerie);
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

  const handlePlayTrailerClick = (trailerUrl) => {

    if (trailerUrl) {
      setCurrentTrailerUrl(trailerUrl);
      setShowTrailerModal(true);
    }
  };

  const getGridClass = () => {
    switch (gridCols) {
      case 1: return 'grid-cols-1';
  case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  case 4: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';
  case 5: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
      default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
  };



  const filteredSeries = series.filter(serie => {
    const matchesSubcategoria = selectedSubcategoria === "TODOS" || serie.subcategoria === selectedSubcategoria;
    if (!searchTerm) return matchesSubcategoria;
    const term = searchTerm.toLowerCase().trim();
    const inName = serie.name && serie.name.toLowerCase().includes(term);
    const inDesc = serie.description && serie.description.toLowerCase().includes(term);
    const inGenres = Array.isArray(serie.genres)
      ? serie.genres.some(g => g && g.toLowerCase().includes(term))
      : (typeof serie.genres === 'string' && serie.genres.toLowerCase().includes(term));
    const matchesSearch = inName || inDesc || inGenres;
    return matchesSubcategoria && matchesSearch;
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[calc(100vh-128px)]">
      <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="text-center text-red-400 p-6 text-lg bg-gray-800 rounded-md mx-auto max-w-md">
      {error}
    </div>
  );
  
  if (!user) return (
    <p className="text-center text-xl text-gray-400 mt-20">
      Debes <a href="/login" className="text-red-500 hover:underline">iniciar sesión</a> para ver este contenido.
    </p>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar con subcategorías */}
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-zinc-800 rounded-lg p-4 sticky top-24">
            <h2 className="text-xl font-bold mb-4 text-white">Categorías</h2>
            <div className="space-y-2">
              {SUBCATEGORIAS.map(subcategoria => (
                <button
                  key={subcategoria}
                  onClick={() => setSelectedSubcategoria(subcategoria)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    selectedSubcategoria === subcategoria
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-zinc-700'
                  }`}
                >
                  {subcategoria}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-white">Series: {selectedSubcategoria}</h1>
            <div className="flex items-center gap-4">
                <button
                  onClick={toggleGridView}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                  aria-label="Cambiar vista de cuadrícula"
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Buscar series..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
            </div>
          </div>


          {filteredSeries.length > 0 ? (
            <div className={`grid ${getGridClass()} gap-6`}>
              {filteredSeries.map(serie => (
                <Card
                  key={serie.id || serie._id}
                  item={serie}
                  onClick={() => handleSerieClick(serie)}
                  itemType="serie"
                  onPlayTrailer={handlePlayTrailerClick}
                />
              ))}
            </div>

          ) : (
            <p className="text-center text-gray-400 mt-8">
              No hay series disponibles en la categoría {selectedSubcategoria}.
            </p>
          )}
        </div>
      </div>

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={handleProceedWithTrial}
      />

      {showTrailerModal && currentTrailerUrl && (
        <TrailerModal
          trailerUrl={currentTrailerUrl}
          onClose={() => {
            setShowTrailerModal(false);
            setCurrentTrailerUrl('');
          }}
        />
      )}
    </div>

  );
}
