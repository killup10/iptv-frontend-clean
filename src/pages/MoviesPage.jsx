import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import { fetchUserMovies, fetchMainMovieSections, fetchAdminVideos } from '@/utils/api.js';
import Card from '@/components/Card.jsx';
import MovieSectionCard from '@/components/MovieSectionCard.jsx';
import { ChevronLeftIcon, Squares2X2Icon } from '@heroicons/react/24/solid';

import { useContentAccess } from '@/hooks/useContentAccess.js';
import ContentAccessModal from '@/components/ContentAccessModal.jsx';
import TrailerModal from '@/components/TrailerModal.jsx';


const getUniqueValuesFromArray = (items, field) => {
    if (!items || items.length === 0) return ['Todas'];
    const values = items.flatMap(item => {
        const fieldValue = item[field];
        if (Array.isArray(fieldValue)) return fieldValue;
        return fieldValue ? [fieldValue] : [];
    }).filter(Boolean);
    return ['Todas', ...new Set(values.sort((a,b) => a.localeCompare(b)))];
};

// Normaliza cadenas para comparaciones: trim, lowercase y quitar diacríticos
const normalizeString = (str) => {
    if (!str && str !== 0) return '';
    try {
        return String(str).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
    } catch (e) {
        // Fallback si normalize no está soportado
        return String(str).replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }
};

const isSectionAllowedForPlan = (sectionKey, userPlan) => {
    const restricciones = {
        "CINE_4K": ["cinefilo", "premium"],
        "CINE_60FPS": ["cinefilo", "premium"],
        "CINE_2025": ["cinefilo", "premium"],
        "TV_EN_VIVO": ["premium"],
        "DORAMAS": ["estandar", "cinefilo", "premium"]
    };
    if (!restricciones[sectionKey]) return true;
    return restricciones[sectionKey].includes(userPlan);
};

export default function MoviesPage() {
    const [specialEvents, setSpecialEvents] = useState([]);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allUserMovies, setAllUserMovies] = useState([]);
    const [mainSections, setMainSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMainSectionKey, setSelectedMainSectionKey] = useState(null);
    const [genresForSelectedSection, setGenresForSelectedSection] = useState(['Todas']);
    const [selectedGenre, setSelectedGenre] = useState('Todas');
    const [searchTerm, setSearchTerm] = useState('');
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

    const shouldShowSpecialsSection = () => specialEvents.length > 0;
    const getSpecialEventName = () => specialEvents[0]?.specialEventName || "Especial";

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user?.token) {
                setError("Por favor, inicia sesión para acceder al contenido.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                // Si el usuario es admin, pedir la vista de admin para obtener todos los VODs (incluye los recientemente editados)
                const moviesPromise = user?.role === 'admin' ? fetchAdminVideos() : fetchUserMovies();
                const [moviesData, sectionsDataFromAPI] = await Promise.all([
                    moviesPromise,
                    fetchMainMovieSections()
                ]);
                // fetchAdminVideos devuelve un objeto { videos, total, page, pages }
                if (user?.role === 'admin' && moviesData && moviesData.videos) {
                    console.log('MoviesPage (admin): datos recibidos de fetchAdminVideos:', moviesData);
                    // Asegurarse de usar solo películas en esta página
                    const onlyMovies = (moviesData.videos || []).filter(v => v.tipo === 'pelicula' || v.tipo === undefined || v.tipo === null);
                    setAllUserMovies(onlyMovies);
                } else {
                    console.log('MoviesPage: datos recibidos de fetchUserMovies:', moviesData?.length || 0);
                    setAllUserMovies(moviesData || []);
                }
                let filteredSections = sectionsDataFromAPI || [];
                if (!shouldShowSpecialsSection()) {
                    filteredSections = filteredSections.filter(section => section.key !== "ESPECIALES");
                }
                setMainSections(filteredSections);
            } catch (err) {
                console.error("MoviesPage: Error cargando datos iniciales:", err);
                setError(err.message || "No se pudieron cargar los datos de películas.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, [user?.token]);

    useEffect(() => {
        if (!selectedMainSectionKey || !allUserMovies.length) {
            setGenresForSelectedSection(['Todas']);
            setSelectedGenre('Todas');
            return;
        }
        const moviesForGenreExtraction = allUserMovies.filter(m =>
            selectedMainSectionKey === "POR_GENERO"
                ? m.mainSection === "POR_GENERO" || !m.mainSection
                : m.mainSection === selectedMainSectionKey
        );
        setGenresForSelectedSection(getUniqueValuesFromArray(moviesForGenreExtraction, 'genres'));
        setSelectedGenre('Todas');
        setSearchTerm('');
    }, [selectedMainSectionKey, allUserMovies]);

    const displayedMovies = useMemo(() => {
        let filtered = [...allUserMovies];
        if (selectedMainSectionKey) {
            filtered = filtered.filter(m =>
                selectedMainSectionKey === "POR_GENERO"
                    ? m.mainSection === "POR_GENERO" || !m.mainSection
                    : m.mainSection === selectedMainSectionKey
            );
        }
        if (selectedGenre !== 'Todas') {
            const normalizedSelected = normalizeString(selectedGenre);
            filtered = filtered.filter(m => {
                if (!m.genres) return false;
                if (Array.isArray(m.genres)) {
                    return m.genres.some(g => normalizeString(g) === normalizedSelected);
                }
                return normalizeString(m.genres) === normalizedSelected;
            });
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(m =>
                (m.title && m.title.toLowerCase().includes(term)) ||
                (m.name && m.name.toLowerCase().includes(term))
            );
        }
        return filtered;
    }, [allUserMovies, selectedMainSectionKey, selectedGenre, searchTerm]);

    // Debug: log counts to help troubleshooting why items might not appear
    useEffect(() => {
        try {
            console.log(`MoviesPage: allUserMovies=${allUserMovies.length} | displayedMovies=${displayedMovies.length} | selectedMainSection=${selectedMainSectionKey} | selectedGenre=${selectedGenre} | searchTerm='${searchTerm}'`);
        } catch (e) {}
    }, [allUserMovies, displayedMovies.length, selectedMainSectionKey, selectedGenre, searchTerm]);

    const handleMovieClick = (movie) => {
        const movieId = movie.id || movie._id;
        if (!movieId) {
            console.error("MoviesPage: Clic en película sin ID válido.", movie);
            return;
        }

        // Función para navegar después de verificar acceso
        const navigateToMovie = () => {
            navigate(`/watch/movie/${movieId}`);
        };

        // Verificar acceso antes de navegar
        checkContentAccess(movie, navigateToMovie);
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
        case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
        case 4: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';
        case 5: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
        default: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5';
      }
    };


  const handlePlayTrailerClick = (trailerUrl) => {
    if (trailerUrl) {
      setCurrentTrailerUrl(trailerUrl);
      setShowTrailerModal(true);
    }
  };

    const handleSelectMainSection = (sectionKey) => {
        const planUsuario = user?.plan || "gratuito";
        if (!isSectionAllowedForPlan(sectionKey, planUsuario)) {
            const requerido = sectionKey.includes("CINE") ? "Cinéfilo o Premium" : "un plan superior";
            setError(`🎬 Estimado cliente, debe tener el plan ${requerido} para acceder a esta sección.`);
            setTimeout(() => setError(null), 5000);
            return;
        }
        setSelectedMainSectionKey(sectionKey);
        setSelectedGenre('Todas');
        setSearchTerm('');
    };

    if (isLoading)
        return <div className="flex justify-center items-center min-h-[calc(100vh-128px)]"><div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-600"></div></div>;

    if (error)
        return <p className="text-center text-red-400 p-6 text-lg bg-gray-800 rounded-md mx-auto max-w-md">{error}</p>;

    if (!user)
        return <p className="text-center text-xl text-gray-400 mt-20">Debes <a href="/login" className="text-red-500 hover:underline">iniciar sesión</a> para ver este contenido.</p>;

    if (!selectedMainSectionKey) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 text-center sm:text-left">Explorar Películas</h1>
                {mainSections.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {mainSections.map(section => {
                            if (section.key === "ESPECIALES" && !shouldShowSpecialsSection()) return null;
                            const sectionData = section.key === "ESPECIALES"
                                ? { ...section, displayName: getSpecialEventName() }
                                : section;
                            return (
                                <MovieSectionCard
                                    key={sectionData.key}
                                    section={sectionData}
                                    onClick={handleSelectMainSection}
                                    userPlan={user.plan || 'gratuito'}
                                    moviesInSection={allUserMovies.filter(movie => {
                                        if (section.key === "POR_GENERO") {
                                            return movie.mainSection === "POR_GENERO" || !movie.mainSection;
                                        }
                                        return movie.mainSection === section.key;
                                    })}
                                />

                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 mt-10 text-lg">No hay secciones de películas disponibles.</p>
                )}
            </div>
        );
    }

    const currentMainSection = mainSections.find(s => s.key === selectedMainSectionKey);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div className="flex items-center">
                    <button
                        onClick={() => { setSelectedMainSectionKey(null); setSearchTerm(''); }}
                        className="mr-3 text-gray-300 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
                        title="Volver a Secciones"
                    >
                        <ChevronLeftIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                        {currentMainSection?.displayName || "Películas"}
                    </h1>
                </div>
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
                      placeholder={`Buscar...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-auto px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                  />
                </div>

            </div>


            {genresForSelectedSection.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-gray-700">
                    {genresForSelectedSection.map(genre => (
                        <button
                            key={genre}
                            onClick={() => setSelectedGenre(genre)}
                            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-150 ${selectedGenre === genre ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}`}
                        >
                            {genre}
                        </button>
                    ))}
                </div>
            )}

            {displayedMovies.length > 0 ? (
                <div className={`grid ${getGridClass()} gap-6`}>
                    {displayedMovies.map(movie => (
                        <Card
                            key={movie.id || movie._id}
                            item={movie}
                            onClick={() => handleMovieClick(movie)}
                            itemType="movie"
                            onPlayTrailer={handlePlayTrailerClick}

                        />
                    ))}
                </div>

            ) : (
                <p className="text-center text-gray-400 mt-12 text-lg">
                    {`No se encontraron películas para "${selectedGenre}" en ${currentMainSection?.displayName || 'la sección actual'}.`}
                </p>
            )}

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
