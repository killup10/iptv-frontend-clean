// src/pages/LiveTVPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
    fetchUserChannels,          // Para obtener la lista de canales filtrada por categoría/sección
    fetchChannelFilterSections  // Para obtener los nombres de las categorías para los botones de filtro
} from '../utils/api.js';      // TU api.js YA EXPORTA ESTAS DOS FUNCIONES
import Card from '../components/Card.jsx'; // Asumo que Card.jsx está en ../components/

export default function LiveTVPage() {
  const { user } = useAuth(); // Para verificar si el usuario está logueado si es necesario
  const navigate = useNavigate();
  const location = useLocation();

  const [allChannels, setAllChannels] = useState([]); // Canales de la categoría seleccionada
  const [filterCategories, setFilterCategories] = useState(['Todos']); // Ej: ["Todos", "KIDS", "Deportes"]
  const [selectedCategory, setSelectedCategory] = useState(location.state?.selectedCategory || 'Todos'); // Categoría actualmente seleccionada
  
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false); 
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(location.state?.searchTerm || '');

  // 1. Cargar las categorías/secciones para los botones de filtro al montar
  useEffect(() => {
    const loadFilterCategories = async () => {
      setIsLoadingCategories(true);
      setError(null);
      try {
        console.log("LiveTVPage: Cargando categorías de filtro (fetchChannelFilterSections)...");
        const categoriesData = await fetchChannelFilterSections(); // Llama a /api/channels/sections
        setFilterCategories(categoriesData && categoriesData.length > 0 ? categoriesData : ['Todos']);
        // Establecer la primera categoría (usualmente "Todos") como seleccionada para la carga inicial de canales
        if (categoriesData && categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0]); 
        } else {
          setSelectedCategory('Todos'); // Fallback
        }
      } catch (err) {
        console.error("LiveTVPage: Error cargando categorías de filtro:", err.message);
        setError(err.message || "No se pudieron cargar las categorías de TV.");
        setFilterCategories(['Todos']); // Fallback
        setSelectedCategory('Todos'); // Fallback
      } finally {
        setIsLoadingCategories(false);
      }
    };
    loadFilterCategories();
  }, []); // Se ejecuta solo una vez al montar

  // 2. Cargar canales cuando selectedCategory cambia (y después de que las categorías iniciales se hayan cargado)
  useEffect(() => {
    if (!isLoadingCategories && selectedCategory) { // Solo cargar si las categorías están listas y hay una seleccionada
        // Llamar a la función que realmente carga los canales
        const loadChannelsForCategory = async (category) => {
            setIsLoadingChannels(true);
            setError(null); 
            // No es necesario limpiar el searchTerm aquí si el usuario está escribiendo
            try {
              console.log(`LiveTVPage: Cargando canales para categoría: ${category} (fetchUserChannels)...`);
              const channelsData = await fetchUserChannels(category); // Llama a /api/channels/list?section=CATEGORY
              setAllChannels(channelsData || []);
            } catch (err) {
              console.error(`LiveTVPage: Error cargando canales para categoría ${category}:`, err.message);
              setError(err.message || `Error al cargar canales de ${category}.`);
              setAllChannels([]);
            } finally {
              setIsLoadingChannels(false);
            }
        };
        loadChannelsForCategory(selectedCategory);
    }
  }, [selectedCategory, isLoadingCategories]); // Dependencias clave

  // Función para manejar el clic en un botón de categoría
  const handleCategoryButtonClick = (category) => {
    if (category !== selectedCategory) { // Solo si es una nueva categoría
        setSearchTerm(''); // Limpiar búsqueda al cambiar de categoría
        setSelectedCategory(category); // Esto disparará el useEffect de arriba para cargar canales
    }
  };
  
  // Filtrar canales por término de búsqueda (esto es solo frontend sobre 'allChannels')
  const displayedChannels = useMemo(() => {
    if (!allChannels) return [];
    if (!searchTerm) return allChannels;
    return allChannels.filter(ch =>
      ch.name && ch.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allChannels, searchTerm]);

  const handleChannelClick = (channel) => {
    const channelId = channel.id || channel._id;
  console.log('LiveTVPage: handleChannelClick called for channel:', channel, 'resolvedId:', channelId);
    if (!channelId) {
      console.error("handleChannelClick: channelId no encontrado", channel);
      return;
    }
    navigate(`/watch/channel/${channelId}`, {
        state: {
            fromSection: 'tv',
            selectedCategory: selectedCategory,
            searchTerm: searchTerm
        }
    }); // El backend /api/channels/id/:channelId verificará el plan
  };

  // --- RENDERIZADO ---
  const showInitialLoading = isLoadingCategories && filterCategories.length <= 1;
  const showChannelLoading = isLoadingChannels;
  const showGeneralError = error && !showChannelLoading && displayedChannels.length === 0 && filterCategories.length <=1;

  if (showInitialLoading) {
      return <div className="flex justify-center items-center min-h-[calc(100vh-128px)]"><div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div><p className="ml-4 text-xl text-white">Cargando Interfaz...</p></div>;
  }
  
  if (showGeneralError) { 
    return (
        <div className="container mx-auto px-4 py-8 text-center">
             <h1 className="text-3xl font-bold text-white mb-6">TV en Vivo</h1>
            <p className="text-red-400 p-4 bg-gray-800 rounded-md">{error}</p>
        </div>
    );
  }

  // No necesitas verificar !user aquí si la ruta /tv está protegida por PrivateRoute que ya lo hace
  // if (!user) return <p>...</p>; 

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-center md:text-left">
          TV en Vivo
        </h1>
        <input
          type="text"
          placeholder="Buscar canal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-2/5 lg:w-1/3 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
        />
      </div>

      {!isLoadingCategories && filterCategories.length > 0 && (
        <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-8 pb-4 border-b border-gray-700">
          {filterCategories.map(categoryName => (
            <button
              key={categoryName}
              onClick={() => handleCategoryButtonClick(categoryName)} // Usa la nueva función de manejo
              disabled={isLoadingChannels && selectedCategory === categoryName}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ease-in-out
                          ${selectedCategory === categoryName
                              ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-400'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500'}
                          ${(isLoadingChannels && selectedCategory === categoryName) ? 'opacity-50 cursor-wait' : ''}`}
            >
              {categoryName}
            </button>
          ))}
        </div>
      )}
      
      {showChannelLoading && <div className="flex justify-center items-center mt-10"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div><p className="ml-3 text-lg">Cargando canales para {selectedCategory}...</p></div>}
      
      {error && !showChannelLoading && ( // Muestra error si no se están cargando canales activamente
          <p className="text-center text-red-400 my-6 p-4 bg-red-900/30 rounded-md">{error}</p>
      )}

      {!showChannelLoading && !error && displayedChannels.length > 0 && (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
          {displayedChannels.map(channel => (
        <Card
        key={channel.id || channel._id}
        item={{ 
          id: channel.id || channel._id,
          name: channel.name,
          title: channel.name,
          thumbnail: channel.customThumbnail || channel.thumbnail || channel.logo || '/img/placeholder-thumbnail.png', // Asegúrate que esta imagen exista en public/img
        }}
              onClick={() => handleChannelClick(channel)}
              itemType="channel"
            />
          ))}
        </div>
      )}

      {!showChannelLoading && !error && displayedChannels.length === 0 && (
        <p className="text-center text-gray-400 mt-12 text-lg">
          {searchTerm ? `No se encontraron canales para "${searchTerm}" en la categoría "${selectedCategory}".` :
           (filterCategories.length > 0 ? `No hay canales disponibles en la categoría "${selectedCategory}".` : `No hay canales disponibles.`)}
        </p>
      )}
      {!isLoadingCategories && filterCategories.length <= 1 && !error && displayedChannels.length === 0 && ( 
           <p className="text-center text-gray-500 mt-10 text-lg">No hay categorías de TV en vivo para mostrar.</p>
      )}
    </div>
  );
}
