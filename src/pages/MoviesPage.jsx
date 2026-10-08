import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchUserMovies, fetchMainMovieSections, getCollections, addItemsToCollection, updateAdminVideo } from '../utils/api.js';
import { normalizeSearchText } from '../utils/searchUtils.js';
import useDataCache from '../hooks/useDataCache.js';
import Card from '../components/Card.jsx';
import { ChevronLeftIcon, Squares2X2Icon, ChevronRightIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import { useContentAccess } from '../hooks/useContentAccess.js';
import ContentAccessModal from '../components/ContentAccessModal.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import MobileVodDetailModal from '../components/MobileVodDetailModal.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import CollectionsModal from '../components/CollectionsModal.jsx';
import axiosInstance from '../utils/axiosInstance.js';
import Toast from '../components/Toast.jsx';
import { addItemToMyList } from '../utils/myListUtils.js';
import { getAccessLockState } from '../utils/planAccess.js';
import useVodDetailOverlay from '../hooks/useVodDetailOverlay.js';
import MobileArcadeDeck from '../components/MobileArcadeDeck.jsx';
import { extractUniqueGenres, itemMatchesGenre } from '../utils/genreUtils.js';

const getUniqueValuesFromArray = (items) => extractUniqueGenres(items);

const isSectionAllowedForPlan = () => true;

const HIDDEN_MOVIE_SECTION_KEYS = new Set(["CINE_2025"]);
const filterVisibleMovieSections = (sections = []) =>
    sections.filter(section => section && !HIDDEN_MOVIE_SECTION_KEYS.has(section.key));

export default function MoviesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const dataCache = useDataCache();

    const [movies, setMovies] = useState([]);
    const [page, setPage] = useState(1);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [totalPages, setTotalPages] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [mainSections, setMainSections] = useState([]);
    const [moviesBySection, setMoviesBySection] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMainSectionKey, setSelectedMainSectionKey] = useState(location.state?.selectedMainSectionKey || 'todas');
    const [sectionCounts, setSectionCounts] = useState({});
    const [allGenres, setAllGenres] = useState(['Todas']);
    const [selectedGenre, setSelectedGenre] = useState(location.state?.selectedGenre || 'Todas');
    const [searchTerm, setSearchTerm] = useState(location.state?.searchTerm || '');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const gridOptions = [3, 4, 5, 1];
    const [gridCols, setGridCols] = useState(gridOptions[0]); // Default to 6 columns for smaller cards

    const [collections, setCollections] = useState([]);
    const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
    const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);

    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    const { checkContentAccess, showAccessModal, accessModalData, closeAccessModal, proceedWithTrial } = useContentAccess();
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
            fromSection: 'movies',
            sectionKey: selectedMainSectionKey,
            genre: selectedGenre,
            searchTerm: debouncedSearchTerm,
        }),
    });

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
            const isGenreSection = mainSection === 'por-generos' || mainSection === 'POR_GENERO';
            const isAllSection = mainSection === 'todas' || mainSection === 'TODAS';
            const sectionToFetch = isGenreSection ? 'POR_GENERO' : (isAllSection ? null : mainSection);
            const limit = window.innerWidth < 768 ? 1000 : 20;
            const data = await fetchUserMovies(currentPage, limit, sectionToFetch, genre, search);
            
            setMovies(prevMovies => currentPage === 1 ? data.videos : [...prevMovies, ...data.videos]);
            setTotalPages(data.totalPages);
            setPage(data.page);
            setHasMore(data.page < data.totalPages);

            if (isGenreSection || mainSection === 'todas' || mainSection === 'TODAS') {
                const newGenres = extractUniqueGenres(data.videos);
                setAllGenres(prevGenres => {
                    return extractUniqueGenres([...movies, ...data.videos]);
                });
            }

            // 🔴 CAMBIO IMPORTANTE: NO actualizar SearchBar aquí
            // Cada página tiene su propio buscador local

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
            // Verificar si hay datos cacheados
            const cachedData = dataCache.get('moviesPageData');
            if (cachedData) {
                console.log('[MoviesPage] Cargando desde cache...');
                setMainSections(filterVisibleMovieSections(cachedData.mainSections || []));
                setMoviesBySection(cachedData.moviesBySection || {});
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const sectionsDataFromAPI = filterVisibleMovieSections(await fetchMainMovieSections());
                setMainSections(sectionsDataFromAPI || []);

                const moviesForSections = {};
                await Promise.all(
                    sectionsDataFromAPI.map(async (section) => {
                        try {
                            const data = await fetchUserMovies(1, 5, section.key, 'Todas');
                            moviesForSections[section.key] = data.videos;
                        } catch (err) {
                            console.error(`Error cargando muestra para ${section.key}:`, err);
                            moviesForSections[section.key] = [];
                        }
                    })
                );
                setMoviesBySection(moviesForSections);

                // Guardar en cache
                dataCache.set('moviesPageData', {
                    mainSections: sectionsDataFromAPI,
                    moviesBySection: moviesForSections
                });

            } catch (err) {
                console.error("MoviesPage: Error cargando secciones:", err);
                setError(err.message || "No se pudieron cargar las secciones.");
            }
            setIsLoading(false);
        };

        loadInitialData();
    }, [user?.token, dataCache]);

    useEffect(() => {
        if (!user?.token || mainSections.length === 0) return;
        let cancelled = false;
        const loadCounts = async () => {
            const entries = await Promise.all(
                ['todas', ...mainSections.map(s => s.key)].map(async (key) => {
                    try {
                        const data = await fetchUserMovies(1, 1, key === 'todas' ? null : key, 'Todas');
                        const total = data.total ?? data.totalVideos ?? data.videos?.length ?? 0;
                        return [key, total];
                    } catch {
                        return [key, 0];
                    }
                })
            );
            if (!cancelled) setSectionCounts(Object.fromEntries(entries));
        };
        loadCounts();
        return () => { cancelled = true; };
    }, [user?.token, mainSections]);

    useEffect(() => {
        if (location.state?.selectedMainSectionKey !== undefined) {
            setSelectedMainSectionKey(location.state.selectedMainSectionKey || 'todas');
        }
        if (location.state?.selectedGenre !== undefined) {
            setSelectedGenre(location.state.selectedGenre);
        }
    }, [location.state]);

    useEffect(() => {
        if (selectedMainSectionKey || selectedGenre !== 'Todas') {
            setMovies([]);
            setPage(1);
            setTotalPages(0);
            setHasMore(true);
            setIsLoading(true);
            const sectionToFetch = selectedMainSectionKey || 'POR_GENERO';
            loadMovies(1, sectionToFetch, selectedGenre, debouncedSearchTerm);
        }
    }, [selectedMainSectionKey, selectedGenre, debouncedSearchTerm, user?.token]);

    const handleMovieClick = (movie) => {
        openVodDetail(movie, 'movie');
        return;
        const movieId = movie.id || movie._id;
        if (!movieId) {
            console.error("MoviesPage: Clic en película sin ID válido.", movie);
            return;
        }
        const navigateToMovie = () => {
            navigate(`/watch/movie/${movieId}`, {
                state: {
                    fromSection: 'movies',
                    sectionKey: selectedMainSectionKey,
                    genre: selectedGenre,
                    searchTerm: debouncedSearchTerm
                }
            });
        };
        checkContentAccess(movie, navigateToMovie);
    };

    const handleProceedWithTrial = () => {
        proceedWithTrial();
    };

    const handleGoBack = () => {
        navigate('/home');
    };

    const toggleGridView = () => {
        const currentIndex = gridOptions.indexOf(gridCols);
        const nextIndex = (currentIndex + 1) % gridOptions.length;
        setGridCols(gridOptions[nextIndex]);
    };

    const getGridClass = () => {
        switch (gridCols) {
            case 1: return 'grid-cols-1';
            case 3: return 'grid-cols-2 md:grid-cols-3';
            case 4: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';
            case 5: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
            default: return 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5';
        }
    };

    const handlePlayTrailerClick = (trailerUrl) => {
        openTrailer(trailerUrl);
        return;
        if (trailerUrl) {
            setCurrentTrailerUrl(trailerUrl);
            setShowTrailerModal(true);
        }
    };

    const handleOpenCollectionsModal = (item) => {
        setSelectedItemForCollection(item);
        setIsCollectionsModalOpen(true);
    };

    const handleToggleHalloween = async (item) => {
        const id = item._id || item.id;
        if (!id) return;
        const next = !item.showInHalloween;
        const title = item.name || item.title || 'Título';
        try {
            await updateAdminVideo(id, { showInHalloween: next });
            const patchList = (list) => (list || []).map((m) =>
                ((m._id || m.id) === id ? { ...m, showInHalloween: next } : m)
            );
            setMovies(patchList);
            setMoviesBySection((prev) =>
                Object.fromEntries(Object.entries(prev || {}).map(([k, v]) => [k, patchList(v)]))
            );
            setToastMessage(next ? `🎃 "${title}" entra al Especial Halloween` : ` "${title}" sale del Especial Halloween`);
            setToastType('success');
        } catch (err) {
            setToastMessage(err.message || 'Error al actualizar Halloween');
            setToastType('error');
        } finally {
            setTimeout(() => setToastMessage(''), 3000);
        }
    };

    const handleToggleKids = async (item) => {
        const id = item._id || item.id;
        if (!id) return;
        const next = !item.halloweenKidsOnly;
        const title = item.name || item.title || 'Título';
        try {
            await updateAdminVideo(id, { halloweenKidsOnly: next });
            const patchList = (list) => (list || []).map((m) =>
                ((m._id || m.id) === id ? { ...m, halloweenKidsOnly: next } : m)
            );
            setMovies(patchList);
            setMoviesBySection((prev) =>
                Object.fromEntries(Object.entries(prev || {}).map(([k, v]) => [k, patchList(v)]))
            );
            setToastMessage(next ? `👻 "${title}" entra a Halloween Kids` : ` "${title}" sale de Halloween Kids`);
            setToastType('success');
        } catch (err) {
            setToastMessage(err.message || 'Error al actualizar Halloween Kids');
            setToastType('error');
        } finally {
            setTimeout(() => setToastMessage(''), 3000);
        }
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

    const handleAddToMyList = async (item) => {
        try {
          console.log('[MoviesPage.jsx] Agregando a Mi Lista:', item);
          const response = await axiosInstance.post('/api/users/my-list/add', {
            itemId: item._id || item.id,
            tipo: item.tipo || item.itemType || 'movie',
            title: item.name || item.title,
            thumbnail: item.thumbnail,
            description: item.description
          });
    
          console.log('[MoviesPage.jsx] Agregado a Mi Lista exitosamente:', response.data);
          // Mostrar notificación de éxito
          setToastMessage(`✨ "${item.name || item.title}" agregado a Mi Lista`);
          setToastType('success');
          window.dispatchEvent(new CustomEvent('teamg:refresh-counts'));
        } catch (error) {
          if (error.response?.status === 409) {
            console.log('[MoviesPage.jsx] Item ya está en Mi Lista');
            setToastMessage(`ℹ️ "${item.name || item.title}" ya estaba en Mi Lista`);
            setToastType('info');
          } else {
            console.error('[MoviesPage.jsx] Error al agregar a Mi Lista:', error);
            setToastMessage('❌ Error al agregar a Mi Lista');
            setToastType('error');
          }
        }
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

    const openMainSection = (sectionKey) => {
        setSelectedMainSectionKey(sectionKey);
        setSelectedGenre('Todas');
        setSearchTerm('');
    };

    const handleAddToMyListSafe = async (item) => {
        try {
          const result = await addItemToMyList(item);
          setToastMessage(
            result.status === 'duplicate'
              ? `"${item.name || item.title}" ya estaba en Mi Lista`
              : `"${item.name || item.title}" agregado a Mi Lista`,
          );
          setToastType(result.status === 'duplicate' ? 'info' : 'success');
        } catch (error) {
          console.error('[MoviesPage.jsx] Error al agregar a Mi Lista:', error);
          setToastMessage('Error al agregar a Mi Lista');
          setToastType('error');
        }
      };

    if (isLoading && page === 1 && !isMobile) {
        return <div className="flex justify-center items-center min-h-[calc(100vh-128px)]"><div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-600"></div></div>;
    }

    if (error)
        return <p className="text-center text-red-400 p-6 text-lg bg-gray-800 rounded-md mx-auto max-w-md">{error}</p>;

    const sectionOptions = [{ key: 'todas', displayName: 'TODAS' }, ...mainSections];
    const currentSectionLabel = selectedMainSectionKey === 'todas' || selectedMainSectionKey === 'TODAS'
        ? 'TODAS'
        : (mainSections.find(s => s.key === selectedMainSectionKey)?.displayName || 'Películas');

    if (!user)
        return <p className="text-center text-xl text-gray-400 mt-20">Debes <a href="/login" className="text-red-500 hover:underline">iniciar sesión</a> para ver este contenido.</p>;

    const currentMainSection = mainSections.find(s => s.key === selectedMainSectionKey);
    const genresToShow = (selectedMainSectionKey === 'por-generos' || selectedMainSectionKey === 'todas' || selectedMainSectionKey === 'TODAS') ? (allGenres.length > 1 ? allGenres : extractUniqueGenres(movies)) : extractUniqueGenres(movies);
    const displayedMovies = selectedGenre && selectedGenre !== 'Todas' ? movies.filter(m => itemMatchesGenre(m, selectedGenre)) : movies;

    if (isMobile && selectedMainSectionKey) {
        return (
            <>
                <div className="px-4 pt-4 overflow-x-auto whitespace-nowrap scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="flex gap-2 pb-2">
                        {sectionOptions.map(section => {
                            const isActive = (selectedMainSectionKey || 'todas') === section.key;
                            return (
                                <button
                                    key={section.key}
                                    onClick={() => setSelectedMainSectionKey(section.key)}
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                                        isActive
                                            ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)] scale-[1.02]'
                                            : 'bg-zinc-900/90 border border-zinc-800 text-gray-300 hover:bg-zinc-800'
                                    }`}
                                >
                                    <span>{section.displayName}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                        isActive
                                            ? 'bg-black/15 text-white'
                                            : 'bg-zinc-800 text-slate-400'
                                    }`}>
                                        {sectionCounts[section.key] ?? 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <MobileArcadeDeck
                    items={movies}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onItemClick={handleMovieClick}
                    onPlayTrailer={handlePlayTrailerClick}
                    onAddToMyList={handleAddToMyListSafe}
                    onAddToCollectionClick={handleOpenCollectionsModal}
                    title={currentMainSection?.displayName || "Películas"}
                    itemType="movie"
                    variant="cinematic"
                    categories={genresToShow}
                    selectedCategory={selectedGenre}
                    onCategoryChange={setSelectedGenre}
                    loading={isLoading}
                />
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
                        onAddToMyList={handleAddToMyListSafe}
                        onTrailer={openTrailer}
                    />
                )}

                <CollectionsModal
                    isOpen={isCollectionsModalOpen}
                    onClose={handleCloseCollectionsModal}
                    item={selectedItemForCollection}
                    collections={collections.filter(c => c.itemsModel === 'Video')}
                    onAddToCollection={handleAddToCollection}
                />

                {toastMessage && (
                    <Toast
                        message={toastMessage}
                        type={toastType}
                        duration={3000}
                        onClose={() => setToastMessage('')}
                    />
                )}
            </>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row gap-8">
            {/* Secciones: Desktop Sidebar (hidden on mobile) */}
            <div className="hidden md:block md:w-64 flex-shrink-0">
                <div className="bg-zinc-900/80 border border-zinc-800/60 backdrop-blur-md rounded-2xl p-4 sticky top-24 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 text-white">Secciones</h2>
                    <div className="space-y-2">
                        {sectionOptions.map(section => {
                            const isActive = (selectedMainSectionKey || 'todas') === section.key;
                            const sectionLockState = section.key === 'todas' ? { locked: false } : getAccessLockState({ ...section, mainSection: section.key }, user?.plan);
                            return (
                                <button
                                    key={section.key}
                                    onClick={() => setSelectedMainSectionKey(section.key)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-200 ${
                                        isActive
                                            ? 'bg-red-600 text-white font-bold shadow-[0_0_15px_rgba(220,38,38,0.35)] scale-[1.02]'
                                            : 'text-gray-300 hover:bg-zinc-800 hover:text-white'
                                    }`}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        {sectionLockState.locked && <LockClosedIcon className="h-4 w-4 shrink-0 text-amber-200" />}
                                        <span className="truncate">{section.displayName}</span>
                                    </span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors ${
                                        isActive
                                            ? 'bg-black/15 text-white'
                                            : 'bg-zinc-800 text-slate-400'
                                    }`}>
                                        {sectionCounts[section.key] ?? 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Secciones: Mobile Horizontal Row (visible on mobile, hidden on desktop) */}
            <div className="block md:hidden -mx-4 px-4 overflow-x-auto whitespace-nowrap mb-6 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex gap-2 pb-2">
                    {sectionOptions.map(section => {
                        const isActive = (selectedMainSectionKey || 'todas') === section.key;
                        return (
                            <button
                                key={section.key}
                                onClick={() => setSelectedMainSectionKey(section.key)}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)] scale-[1.02]'
                                        : 'bg-zinc-900/90 border border-zinc-800 text-gray-300 hover:bg-zinc-800'
                                }`}
                            >
                                <span>{section.displayName}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                    isActive
                                        ? 'bg-black/15 text-white'
                                        : 'bg-zinc-800 text-slate-400'
                                }`}>
                                    {sectionCounts[section.key] ?? 0}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div className="flex items-center">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight flex items-center gap-2">
                        <span>Películas: {currentSectionLabel}</span>
                        <span className="text-sm font-semibold text-gray-300 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/60 align-middle">
                            {movies.length}
                        </span>
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

            {displayedMovies.length > 0 ? (
                <div className={`grid ${getGridClass()} gap-6`}>
                    {displayedMovies.map((movie, index) => {
                        if (displayedMovies.length === index + 1) {
                            return (
                                <div ref={lastMovieElementRef} key={movie.id || movie._id}>
                                    <Card
                                        item={movie}
                                        onClick={() => handleMovieClick(movie)}
                                        itemType="movie"
                                        onPlayTrailer={handlePlayTrailerClick}
                                        onAddToCollectionClick={handleOpenCollectionsModal}
                                        onAddToMyList={handleAddToMyListSafe}
                                        onToggleHalloweenClick={handleToggleHalloween}
                                        onToggleKidsClick={handleToggleKids}
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
                                    onAddToMyList={handleAddToMyListSafe}
                                    onToggleHalloweenClick={handleToggleHalloween}
                                    onToggleKidsClick={handleToggleKids}
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
            </div>
            </div>

            <ContentAccessModal
                isOpen={showAccessModal}
                onClose={closeAccessModal}
                data={accessModalData}
                onProceedWithTrial={handleProceedWithTrial}
                onGoBack={handleGoBack}
            />

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
                    onAddToMyList={handleAddToMyListSafe}
                    onTrailer={openTrailer}
                />
            )}

            <CollectionsModal
                isOpen={isCollectionsModalOpen}
                onClose={handleCloseCollectionsModal}
                item={selectedItemForCollection}
                collections={collections.filter(c => c.itemsModel === 'Video')}
                onAddToCollection={handleAddToCollection}
            />

            {toastMessage && (
                <Toast
                message={toastMessage}
                type={toastType}
                duration={3000}
                onClose={() => setToastMessage('')}
                />
            )}
        </div>
    );
}
