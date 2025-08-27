import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchUserMovies } from '../utils/api.js';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';

const SUBCATEGORIAS_KIDS = [
  "TODOS",
  "Disney",
  "Nickelodeon",
  "Cartoon Network",
  "PBS Kids",
  "Educativo",
  "Animadas",
  "Preescolar"
];

export default function ZonaKids() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

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
        // Por ahora usamos fetchUserMovies, pero se puede crear una función específica para contenido kids
        const userContent = await fetchUserMovies();
        // Filtrar solo contenido apropiado para niños (puedes ajustar esta lógica)
        const kidsContent = userContent?.filter(item => 
          item.subcategoria && SUBCATEGORIAS_KIDS.includes(item.subcategoria)
        ) || [];
        setContent(kidsContent);
      } catch (err) {
        console.error("Error cargando contenido kids en ZonaKids:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user?.token]);

  const handleContentClick = (item) => {
    const itemId = item.id || item._id;
    if (!itemId) {
      console.error("ZonaKids: Clic en contenido sin ID válido.", item);
      return;
    }

    // Función para navegar después de verificar acceso
    const navigateToContent = () => {
      const type = item.tipo === 'serie' ? 'serie' : 'movie';
      navigate(`/watch/${type}/${itemId}`);
    };

    // Verificar acceso antes de navegar
    checkContentAccess(item, navigateToContent);
  };

  const handleProceedWithTrial = () => {
    // El hook maneja la navegación internamente
    proceedWithTrial();
  };

  const filteredContent = content.filter(item => {
    const matchesSubcategoria = selectedSubcategoria === "TODOS" || item.subcategoria === selectedSubcategoria;
    const matchesSearch = searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
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
          <div className="bg-gradient-to-br from-purple-800 to-pink-800 rounded-lg p-4 sticky top-24">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center">
              🎈 Categorías Kids
            </h2>
            <div className="space-y-2">
              {SUBCATEGORIAS_KIDS.map(subcategoria => (
                <button
                  key={subcategoria}
                  onClick={() => setSelectedSubcategoria(subcategoria)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    selectedSubcategoria === subcategoria
                      ? 'bg-yellow-500 text-black font-semibold'
                      : 'text-gray-200 hover:bg-purple-700'
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
            <h1 className="text-3xl font-bold text-white flex items-center">
              🌈 Zona Kids: {selectedSubcategoria}
            </h1>
            <input
              type="text"
              placeholder="Buscar contenido para niños..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          {filteredContent.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredContent.map(item => (
                <div
                  key={item.id || item._id}
                  onClick={() => handleContentClick(item)}
                  className="cursor-pointer group"
                >
                  <div className="aspect-[2/3] bg-gradient-to-br from-purple-800 to-pink-800 rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105 relative border-2 border-yellow-400">
                    <img 
                      src={item.customThumbnail || item.thumbnail || item.logo || '/placeholder-thumbnail.png'} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => e.currentTarget.src = '/placeholder-thumbnail.png'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 p-4">
                        <h3 className="text-white text-sm font-semibold line-clamp-2">{item.name}</h3>
                        <div className="flex items-center mt-1">
                          <span className="text-yellow-400 text-xs">⭐ Kids</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎪</div>
              <p className="text-gray-400 text-lg">
                No hay contenido disponible en la categoría {selectedSubcategoria}.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                ¡Pronto agregaremos más diversión para los pequeños!
              </p>
            </div>
          )}
        </div>
      </div>

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={handleProceedWithTrial}
      />
    </div>
  );
}
