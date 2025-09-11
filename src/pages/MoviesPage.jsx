import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import { fetchUserMovies, fetchMainMovieSections, getCollections, addItemsToCollection } from '@/utils/api.js';
import Card from '@/components/Card.jsx';
import MovieSectionCard from '@/components/MovieSectionCard.jsx';
import { ChevronLeftIcon, Squares2X2Icon } from '@heroicons/react/24/solid';
import { useContentAccess } from '@/hooks/useContentAccess.js';
import ContentAccessModal from '@/components/ContentAccessModal.jsx';
import TrailerModal from '@/components/TrailerModal.jsx';
import { useDebounce } from '@/hooks/useDebounce.js';
import CollectionsModal from '@/components/CollectionsModal.jsx';

const getUniqueValuesFromArray = (items, field) => {
    if (!items || items.length === 0) return ['Todas'];
    const values = items.flatMap(item => {
        const fieldValue = item[field];
        if (Array.isArray(fieldValue)) return fieldValue;
        return fieldValue ? [fieldValue] : [];
    }).filter(Boolean);
    return ['Todas', ...new Set(values.sort((a,b) => a.localeCompare(b)))];
};

const normalizeString = (str) => {
    if (!str && str !== 0) return '';
    try {
        return String(str).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
    } catch (e) {
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
    const { user } = useAuth();
    const navigate = useNavigate();

    const [movies, setMovies] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [mainSections, setMainSections] = useState([]);
    const [moviesBySection, setMoviesBySection] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMainSectionKey, setSelectedMainSectionKey] = useState(null);
    const [allGenres, setAllGenres] = useState(['Todas']);
    const [selectedGenre, setSelectedGenre] = useState('Todas');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const gridOptions = [5, 4, 3, 1];
    const [gridCols, setGridCols] = useState(gridOptions[0]);

    const [showTrailerModal, setShowTrailerModal] = useState(false);
    const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

    const [collections, setCollections] = useState([]);
    const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
    const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);

    const { checkContentAccess, showAccessModal, accessModalData, closeAccessModal, proceedWithTrial } = useContentAccess();

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

    const observer = useRef();
    const lastMovieElementRef = useCallback(node => {
        if (isLoading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !debouncedSearchTerm) {
                loadMoreMovies();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, loadingMore, hasMore, debouncedSearchTerm]);

    const loadMovies = async (currentPage, mainSection, genre, search) => {
        if (!user?.token) {
            setError("Por favor, inicia sesión para acceder al contenido.");
            setIsLoading(false);
            return;
        }
        
        setLoadingMore(true);
        setError(null);

        try {
            const isGenreSection = mainSection === 'por-generos';
            const sectionToFetch = isGenreSection ? null : mainSection;
            const data = await fetchUserMovies(currentPage, 20, sectionToFetch, genre, search);
            
            setMovies(prevMovies => currentPage === 1 ? data.videos : [...prevMovies, ...data.videos]);
            setTotalPages(data.totalPages);
            setPage(data.page);
            setHasMore(data.page < data.totalPages);

            if (isGenreSection) {
                const newGenres = getUniqueValuesFromArray(data.videos, 'genres');
                setAllGenres(prevGenres => {
                    const combined = [...prevGenres, ...newGenres];
                    return ['Todas', ...new Set(combined.filter(g => g !== 'Todas'))].sort((a,b) => a.localeCompare(b));
                });
            }

        } catch (err) {
            console.error("MoviesPage: Error cargando películas:", err);
            setError(err.message || "No se pudieron cargar las películas.");
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreMovies = () => {
        if (page < totalPages) {
            loadMovies(page + 1, selectedMainSectionKey, selectedGenre, debouncedSearchTerm);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const sectionsDataFromAPI = await fetchMainMovieSections();
                setMainSections(sectionsDataFromAPI || []);

                const moviesForSections = {};
                for (const section of sectionsDataFromAPI) {
                    try {
                        const data = await fetchUserMovies(1, 5, section.key, 'Todas');
                        moviesForSections[section.key] = data.videos;
                    } catch (err) {
                        console.error(`Error cargando muestra para ${section.key}:`, err);
                        moviesForSections[section.key] = [];
                    }
                }
                setMoviesBySection(moviesForSections);

            } catch (err) {
                console.error("MoviesPage: Error cargando secciones:", err);
                setError(err.message || "No se pudieron cargar las secciones.");
            }
            setIsLoading(false);
        };

        loadInitialData();
    }, [user?.token]);

    useEffect(() => {
        if (selectedMainSectionKey) {
            setMovies([]);
            setPage(1);
            setTotalPages(0);
            setHasMore(true);
            loadMovies(1, selectedMainSectionKey, selectedGenre, debouncedSearchTerm);
        }
    }, [selectedMainSectionKey, selectedGenre, debouncedSearchTerm, user?.token]);

    const handleMovieClick = (movie) => {
        const movieId = movie.id || movie._id;
        if (!movieId) {
            console.error("MoviesPage: Clic en película sin ID válido.", movie);
            return;
        }
        const navigateToMovie = () => navigate(`/watch/movie/${movieId}`);
        checkContentAccess(movie, navigateToMovie);
    };

    const handleProceedWithTrial = () => {
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
            
            // Si no se encuentra la colección, recargar las colecciones (puede ser una nueva)
            if (!collection) {
                console.log('Colección no encontrada, recargando colecciones...');
                const updatedCollections = await getCollections();
                setCollections(updatedCollections);
                collection = updatedCollections.find(c => c.name === collectionName);
            }
            
            if (collection) {
                await addItemsToCollection(collection._id, [item._id || item.id]);
                alert(`${item.name || item.title} fue agregado a la colección ${collectionName}`);
                
                // Recargar colecciones para mantener sincronización
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

    const handleSelectMainSection = (sectionKey) => {
        const planUsuario = user?.plan || "gratuito";
        if (sectionKey !== 'por-generos' && !isSectionAllowedForPlan(sectionKey, planUsuario)) {
            const requerido = sectionKey.includes("CINE") ? "Cinéfilo o Premium" : "un plan superior";
            setError(`🎬 Estimado cliente, debe tener el plan ${requerido} para acceder a esta sección.`);
            setTimeout(() => setError(null), 5000);
            return;
        }
        setSelectedMainSectionKey(sectionKey);
        setSelectedGenre('Todas');
        setSearchTerm('');
    };

    if (isLoading && page === 1) {
        return <div className="flex justify-center items-center min-h-[calc(100vh-128px)]"><div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-600"></div></div>;
    }

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
                        {mainSections.map(section => (
                            <MovieSectionCard
                                key={section.key}
                                section={section}
                                onClick={handleSelectMainSection}
                                userPlan={user.plan || 'gratuito'}
                                moviesInSection={moviesBySection[section.key] || []}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 mt-10 text-lg">No hay secciones de películas disponibles.</p>
                )}
            </div>
        );
    }

    const currentMainSection = mainSections.find(s => s.key === selectedMainSectionKey);
    const genresToShow = selectedMainSectionKey === 'por-generos' ? allGenres : getUniqueValuesFromArray(movies, 'genres');

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

            {genresToShow.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-gray-700">
                    {genresToShow.map(genre => (
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

            {movies.length > 0 ? (
                <div className={`grid ${getGridClass()} gap-6`}>
                    {movies.map((movie, index) => {
                        if (movies.length === index + 1) {
                            return (
                                <div ref={lastMovieElementRef} key={movie.id || movie._id}>
                                    <Card
                                        item={movie}
                                        onClick={() => handleMovieClick(movie)}
                                        itemType="movie"
                                        onPlayTrailer={handlePlayTrailerClick}
                                        onAddToCollectionClick={handleOpenCollectionsModal}
                                    />
                                </div>
                            );
                        } else {
                            return (
                                <Card
                                    key={movie.id || movie._id}
                                    item={movie}
                                    onClick={() => handleMovieClick(movie)}
                                    itemType="movie"
                                    onPlayTrailer={handlePlayTrailerClick}
                                    onAddToCollectionClick={handleOpenCollectionsModal}
                                />
                            );
                        }
                    })}
                </div>
            ) : (
                <p className="text-center text-gray-400 mt-12 text-lg">
                    {`No se encontraron películas para "${selectedGenre}" en ${currentMainSection?.displayName || 'la sección actual'}.`}
                </p>
            )}

            {loadingMore && (
                <div className="flex justify-center items-center mt-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
                </div>
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

            <CollectionsModal
                isOpen={isCollectionsModalOpen}
                onClose={handleCloseCollectionsModal}
                item={selectedItemForCollection}
                collections={collections.filter(c => c.itemsModel === 'Video')}
                onAddToCollection={handleAddToCollection}
            />
        </div>
    );
}
