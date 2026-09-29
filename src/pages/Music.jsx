// src/pages/Music.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Search, 
  Radio, 
  Heart, 
  Shuffle, 
  Volume2,
  Clock,
  Music2,
  Disc3,
  Loader2,
  TrendingUp,
  LayoutGrid,
  ListMusic
} from 'lucide-react';
import { useMusic } from '../context/MusicContext.jsx';
import { musicService, LIVE_RADIOS, GENRES, INITIAL_FEATURED_TRACKS } from '../services/musicService.js';

export default function Music() {
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    playRadio, 
    togglePlay, 
    toggleFavorite, 
    isFavorite,
    favorites,
    queue,
    queueIndex
  } = useMusic();

  const [activeTab, setActiveTab] = useState('top'); // 'top' | 'genres' | 'radios' | 'favorites' | 'queue'
  const [topTracks, setTopTracks] = useState(INITIAL_FEATURED_TRACKS);
  const [genreTracks, setGenreTracks] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingTop, setIsLoadingTop] = useState(true);
  const [isLoadingGenre, setIsLoadingGenre] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Cargar Top Éxitos iniciales
  useEffect(() => {
    let isMounted = true;
    async function loadTop() {
      setIsLoadingTop(true);
      try {
        const tracks = await musicService.getTopTracks('global');
        if (isMounted && tracks && tracks.length > 0) {
          setTopTracks(tracks);
        }
      } catch (err) {
        console.warn('[MusicPage] Error cargando Top Tracks:', err);
      } finally {
        if (isMounted) setIsLoadingTop(false);
      }
    }
    loadTop();
    return () => { isMounted = false; };
  }, []);

  // Cargar canciones del género seleccionado
  useEffect(() => {
    let isMounted = true;
    async function loadGenreTracks() {
      if (!selectedGenre) return;
      setIsLoadingGenre(true);
      try {
        const results = await musicService.getTracksByGenre(selectedGenre.query, 24);
        if (isMounted) {
          setGenreTracks(results);
        }
      } catch (err) {
        console.warn('[MusicPage] Error cargando canciones de género:', err);
      } finally {
        if (isMounted) setIsLoadingGenre(false);
      }
    }
    loadGenreTracks();
    return () => { isMounted = false; };
  }, [selectedGenre]);

  // Búsqueda en vivo con Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await musicService.searchTracks(searchQuery, 30);
        setSearchResults(results);
      } catch (err) {
        console.warn('[MusicPage] Error en búsqueda:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Reproducir todo el Top 50
  const handlePlayAllTop = () => {
    if (topTracks.length > 0) {
      playTrack(topTracks[0], topTracks);
    }
  };

  // Reproducir en modo aleatorio
  const handleShuffleTop = () => {
    if (topTracks.length > 0) {
      const randomIdx = Math.floor(Math.random() * topTracks.length);
      playTrack(topTracks[randomIdx], topTracks);
    }
  };

  // Determinar qué lista de canciones mostrar
  const displayTracks = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return searchResults;
    }
    if (activeTab === 'top') {
      return topTracks;
    }
    if (activeTab === 'genres') {
      return genreTracks;
    }
    if (activeTab === 'favorites') {
      return favorites;
    }
    if (activeTab === 'queue') {
      return queue;
    }
    return topTracks;
  }, [searchQuery, searchResults, activeTab, topTracks, genreTracks, favorites, queue]);

  return (
    <div className="min-h-screen pb-32 text-white bg-gradient-to-b from-[#0a0614] via-[#090514] to-[#05020a]">
      
      {/* 1. HERO BANNER PRINCIPAL (ESTILO SPOTIFY / APPLE MUSIC) */}
      <div className="relative pt-6 pb-8 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-fuchsia-950/60 via-purple-900/40 to-cyan-950/60 border border-fuchsia-500/20 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          
          {/* Luces y brillos de fondo */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-fuchsia-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-wider uppercase">
                <Disc3 className="w-3.5 h-3.5 animate-spin" />
                TeamG Music • Audio en Alta Fidelidad
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                Top 50 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-fuchsia-500">Éxitos Globales</span>
              </h1>
              <p className="text-gray-300 text-sm sm:text-base max-w-xl">
                Escucha los lanzamientos más escuchados del momento, sintoniza radios en vivo o explora por tus géneros con reproducción instantánea en alta fidelidad.
              </p>

              {/* Botones de acción rápida */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <button
                  onClick={handlePlayAllTop}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-black font-bold shadow-lg shadow-fuchsia-500/25 hover:scale-105 active:scale-95 transition"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Reproducir Todo</span>
                </button>

                <button
                  onClick={handleShuffleTop}
                  className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/10 hover:border-white/20 transition"
                >
                  <Shuffle className="w-4 h-4 text-cyan-400" />
                  <span>Aleatorio</span>
                </button>
              </div>
            </div>

            {/* Carátula flotante ilustrativa del Top */}
            <div className="relative group hidden sm:block">
              <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/20 transform rotate-2 group-hover:rotate-0 transition-transform duration-500">
                <img 
                  src={topTracks[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'} 
                  alt="Top 50 Cover" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg border border-white/20">
                #1 Global
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA Y PESTAÑAS */}
      <div className="px-4 sm:px-8 max-w-7xl mx-auto space-y-6">
        
        {/* Input de Búsqueda */}
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por canción, artista, álbum o tema..."
            className="w-full pl-11 pr-10 py-3.5 bg-white/[0.05] border border-white/10 focus:border-cyan-400/60 rounded-2xl text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-md transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Pestañas de Navegación */}
        {!searchQuery && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('top')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'top'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Top Éxitos</span>
            </button>

            <button
              onClick={() => setActiveTab('genres')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'genres'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-fuchsia-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Explorar Géneros</span>
            </button>

            <button
              onClick={() => setActiveTab('radios')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'radios'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Radios en Vivo</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'favorites'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Mis Me Gusta ({favorites.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'queue'
                  ? 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>Lista de Reproducción ({queue.length})</span>
            </button>
          </div>
        )}

        {/* 3. VISTA SEGÚN PESTAÑA O BÚSQUEDA */}

        {/* CASO A: BÚSQUEDA EN VIVO */}
        {searchQuery && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Resultados para "{searchQuery}"</span>
              <span className="text-xs text-gray-400 font-normal">({searchResults.length} canciones encontradas)</span>
            </h2>

            {isSearching ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Music2 className="w-12 h-12 mx-auto mb-3 opacity-40 text-cyan-400" />
                <p className="text-base font-semibold">No se encontraron resultados para tu búsqueda</p>
                <p className="text-xs text-gray-500 mt-1">Prueba escribiendo el nombre exacto de la canción o artista.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {searchResults.map((track) => (
                  <TrackCard 
                    key={track.id} 
                    track={track} 
                    queue={searchResults}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() => playTrack(track, searchResults)}
                    isFav={isFavorite(track.id)}
                    onToggleFav={() => toggleFavorite(track)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CASO B: GÉNEROS Y MOODS (ESTILO SPOTIFY BROWSE) */}
        {!searchQuery && activeTab === 'genres' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {GENRES.map((genre) => {
                const isSelected = selectedGenre.id === genre.id;
                return (
                  <button
                    key={genre.id}
                    onClick={() => setSelectedGenre(genre)}
                    style={{ background: genre.bg }}
                    className={`group relative overflow-hidden rounded-2xl p-5 h-36 sm:h-44 text-left transition-all duration-300 transform hover:scale-[1.02] shadow-lg cursor-pointer ${
                      isSelected 
                        ? 'ring-2 ring-white shadow-2xl scale-[1.02]' 
                        : 'hover:shadow-2xl hover:brightness-105'
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      {genre.subtitle}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight pr-14 drop-shadow-sm">
                      {genre.name}
                    </h3>
                    
                    {/* Imagen de carátula rotada estilo oficial Spotify */}
                    <div className="absolute -bottom-3 -right-3 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shadow-2xl transform rotate-[22deg] group-hover:rotate-[15deg] group-hover:scale-105 transition-all duration-300 border border-black/20">
                      <img 
                        src={genre.cover} 
                        alt={genre.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Canciones del Género Seleccionado */}
            <div className="pt-2">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Canciones Destacadas • {selectedGenre.name}</span>
              </h3>

              {isLoadingGenre ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {genreTracks.map((track) => (
                    <TrackCard 
                      key={track.id} 
                      track={track} 
                      queue={genreTracks}
                      isPlaying={isPlaying && currentTrack?.id === track.id}
                      onPlay={() => playTrack(track, genreTracks)}
                      isFav={isFavorite(track.id)}
                      onToggleFav={() => toggleFavorite(track)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASO C: RADIOS EN VIVO */}
        {!searchQuery && activeTab === 'radios' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                <Radio className="w-5 h-5 text-red-500" />
                <span>Estaciones de Radio en Vivo 24/7</span>
              </h2>
              <p className="text-xs text-gray-400">Transmisiones oficiales continuas en streaming de alta calidad de sonido.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {LIVE_RADIOS.map((radio) => {
                const isSelected = currentTrack?.id === radio.id;
                const isRadioPlaying = isSelected && isPlaying;

                return (
                  <div
                    key={radio.id}
                    onClick={() => playRadio(radio)}
                    className={`group relative overflow-hidden rounded-2xl p-4 cursor-pointer border transition duration-300 flex items-center gap-4 ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-950/40 via-purple-950/40 to-black border-red-500/40 shadow-xl'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/10">
                      <img 
                        src={radio.cover} 
                        alt={radio.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Play className="w-6 h-6 fill-white text-white" />
                      </div>
                      <span className="absolute top-1 left-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                        VIVO
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider">
                        {radio.category}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition">
                        {radio.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate">{radio.artist}</p>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          togglePlay();
                        } else {
                          playRadio(radio);
                        }
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition flex-shrink-0 ${
                        isRadioPlaying
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-105'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isRadioPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CASO D: MIS ME GUSTA */}
        {!searchQuery && activeTab === 'favorites' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                  <span>Mis Me Gusta</span>
                  <span className="text-xs text-gray-400 font-normal">({favorites.length})</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tus canciones favoritas guardadas para escuchar en cualquier momento, incluso sin conexión a internet.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Modo Offline Disponible
              </span>
            </div>

            {favorites.length === 0 ? (
              <div className="text-center py-20 text-gray-400 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                <Heart className="w-12 h-12 mx-auto mb-3 text-pink-500/40 animate-pulse" />
                <p className="text-base font-semibold text-white">Aún no has agregado canciones a Mis Me Gusta</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Toca el icono del corazón en cualquier canción que escuches para guardarla en tu lista personal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {favorites.map((track) => (
                  <TrackCard 
                    key={track.id} 
                    track={track} 
                    queue={favorites}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() => playTrack(track, favorites)}
                    isFav={true}
                    onToggleFav={() => toggleFavorite(track)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CASO: LISTA DE REPRODUCCIÓN */}
        {!searchQuery && activeTab === 'queue' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-fuchsia-400" />
                  <span>Lista de Reproducción</span>
                  <span className="text-xs text-gray-400 font-normal">({queue.length} canciones en cola)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Orden de reproducción en curso. Toca cualquier tema para saltar a él directamente.
                </p>
              </div>
              {queue.length > 0 && (
                <button
                  onClick={() => playTrack(queue[0], queue)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-bold text-xs shadow-md shadow-fuchsia-500/20 transition self-start sm:self-auto cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Reproducir desde el inicio</span>
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-20 text-gray-400 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                <ListMusic className="w-12 h-12 mx-auto mb-3 text-fuchsia-400/40" />
                <p className="text-base font-semibold text-white">La lista de reproducción está vacía</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Selecciona cualquier canción o pulsa "Reproducir Todo" en el Top para cargar tu lista de reproducción.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {queue.map((track, idx) => (
                  <TrackCard 
                    key={`${track.id}-${idx}`} 
                    track={track} 
                    queue={queue}
                    index={idx + 1}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() => playTrack(track, queue)}
                    isFav={isFavorite(track.id)}
                    onToggleFav={() => toggleFavorite(track)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CASO E: TOP 50 ÉXITOS (DEFAULT) */}
        {!searchQuery && activeTab === 'top' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <span>Lo Más Escuchado Esta Semana</span>
                </h2>
                <p className="text-xs text-gray-400">Tendencias musicales actualizadas minuto a minuto.</p>
              </div>
            </div>

            {isLoadingTop ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {topTracks.map((track, idx) => (
                  <TrackCard 
                    key={track.id} 
                    track={track} 
                    queue={topTracks}
                    index={idx + 1}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() => playTrack(track, topTracks)}
                    isFav={isFavorite(track.id)}
                    onToggleFav={() => toggleFavorite(track)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Subcomponente de Tarjeta de Canción / Álbum
function TrackCard({ track, queue, index, isPlaying, onPlay, isFav, onToggleFav }) {
  const rawSecs = track.fullDuration || track.duration || 210;
  const durationLabel = track.isRadio
    ? 'EN VIVO'
    : `${Math.floor(rawSecs / 60)}:${(rawSecs % 60).toString().padStart(2, '0')}`;

  return (
    <div 
      onClick={onPlay}
      className={`group relative overflow-hidden rounded-2xl p-3 bg-white/[0.03] hover:bg-white/[0.08] border transition duration-300 flex flex-col cursor-pointer ${
        isPlaying 
          ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/10 bg-cyan-500/5' 
          : 'border-white/5 hover:border-white/20'
      }`}
    >
      {/* Carátula */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-black/40 shadow-md">
        <img 
          src={track.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
          alt={track.title} 
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Número de posición (para Top charts) */}
        {index && (
          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 backdrop-blur-md text-cyan-300 text-xs font-black flex items-center justify-center border border-white/10">
            {index}
          </span>
        )}

        {/* Botón flotante Play */}
        <div className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black flex items-center justify-center shadow-xl transition-all duration-300 ${
          isPlaying ? 'opacity-100 scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110'
        }`}>
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-black" />
          ) : (
            <Play className="w-5 h-5 fill-black ml-0.5" />
          )}
        </div>
      </div>

      {/* Título y Artista */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-xs sm:text-sm font-bold truncate transition ${isPlaying ? 'text-cyan-400' : 'text-white group-hover:text-cyan-300'}`}>
          {track.title}
        </h4>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">
          {track.artist}
        </p>
      </div>

      {/* Footer de la tarjeta: Género musical, Duración y Favorito */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {track.genre && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 font-semibold text-[9px] truncate max-w-[85px]">
              {track.genre}
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-400 font-mono">
            <Clock className="w-3 h-3 text-gray-500" />
            {durationLabel}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav();
          }}
          className={`p-1 rounded-full transition ${
            isFav ? 'text-pink-500 hover:text-pink-400' : 'text-gray-500 hover:text-white'
          }`}
          title={isFav ? 'Quitar de Mis Me Gusta' : 'Guardar en Mis Me Gusta'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-pink-500' : ''}`} />
        </button>
      </div>
    </div>
  );
}
