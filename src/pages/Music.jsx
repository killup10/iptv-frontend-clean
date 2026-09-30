// src/pages/Music.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ListMusic,
  ListPlus,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Check,
  Download,
  DownloadCloud,
  HardDrive,
  Mic,
  MicOff
} from 'lucide-react';
import { useMusic } from '../context/MusicContext.jsx';
import { musicService, LIVE_RADIOS, GENRES, INITIAL_FEATURED_TRACKS } from '../services/musicService.js';
import { checkAndRequestMicrophonePermission, supportsSpeechRecognition } from '../utils/microphonePermission.js';

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
    queueIndex,
    customPlaylists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    removeTrackFromPlaylist,
    openAddToPlaylistModal,
    offlineTracks,
    isTrackDownloaded,
    downloadTrack,
    deleteOfflineTrack,
    downloadPlaylist,
    isPlaylistDownloaded,
    activeDownloadsMap,
    isDownloadingPlaylistId,
    playlistDownloadProgress,
    getOfflineTotalStorage,
    clearAllOffline,
    isExpandedPlayer,
    setIsExpandedPlayer
  } = useMusic();

  const [activeTab, setActiveTab] = useState('top'); // 'top' | 'genres' | 'radios' | 'favorites' | 'playlists' | 'offline'
  const [tabHistory, setTabHistory] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistSubTab, setPlaylistSubTab] = useState('custom'); // 'custom' | 'queue'
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [topTracks, setTopTracks] = useState(INITIAL_FEATURED_TRACKS);
  const [genreTracks, setGenreTracks] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingTop, setIsLoadingTop] = useState(true);
  const [isLoadingGenre, setIsLoadingGenre] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);

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

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsVoiceListening(false);
  }, []);

  const startVoiceSearch = useCallback(async () => {
    setVoiceError('');

    if (isVoiceListening) {
      stopVoiceSearch();
      return;
    }

    if (!supportsSpeechRecognition()) {
      setVoiceError('Tu dispositivo o navegador no soporta búsqueda por voz.');
      return;
    }

    try {
      const hasPermission = await checkAndRequestMicrophonePermission();
      if (!hasPermission) {
        setVoiceError('Permiso de micrófono denegado. Actívalo en los ajustes de tu dispositivo.');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceError('Reconocimiento de voz no disponible.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceError('');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setSearchQuery(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[MusicVoiceSearch] Error de voz:', event.error);
        let errorMsg = '';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMsg = 'Permiso denegado para usar el micrófono.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'No se detectó audio. Habla más cerca del micrófono.';
        } else if (event.error === 'network') {
          errorMsg = 'Error de conexión para procesar voz.';
        } else if (event.error !== 'aborted') {
          errorMsg = 'No se pudo reconocer la voz.';
        }
        if (errorMsg) {
          setVoiceError(errorMsg);
        }
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      console.warn('[MusicVoiceSearch] Error iniciando reconocimiento:', err);
      setVoiceError('No se pudo iniciar la búsqueda por voz.');
      setIsVoiceListening(false);
    }
  }, [isVoiceListening, stopVoiceSearch]);

  useEffect(() => {
    if (!voiceError) return;
    const timer = setTimeout(() => {
      setVoiceError('');
    }, 4000);
    return () => clearTimeout(timer);
  }, [voiceError]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const navigateToTab = useCallback((newTab) => {
    if (newTab === activeTab) return;
    setTabHistory(prev => [...prev.slice(-10), activeTab]);
    setActiveTab(newTab);
    if (newTab !== 'playlists') {
      setSelectedPlaylistId(null);
    }
  }, [activeTab]);

  // Manejador inteligente de botón atrás: retrocede al nivel anterior dentro de Música antes de salir
  const handleMusicBack = useCallback(() => {
    // -1. Si el reconocimiento por voz está activo, cancelarlo
    if (isVoiceListening) {
      stopVoiceSearch();
      return true;
    }
    // 0. Si el reproductor expandido (pantalla completa) está abierto, cerrarlo
    if (isExpandedPlayer) {
      setIsExpandedPlayer(false);
      return true;
    }
    // 1. Si está viendo una playlist personalizada específica
    if (selectedPlaylistId) {
      setSelectedPlaylistId(null);
      return true;
    }
    // 2. Si hay una búsqueda activa
    if (searchQuery) {
      setSearchQuery('');
      return true;
    }
    // 3. Si hay historial previo de pestañas dentro de Música (ej: vino de radios a listas)
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      setActiveTab(prevTab);
      return true;
    }
    // 4. Si está en otra pestaña que no es 'top'
    if (activeTab !== 'top') {
      setActiveTab('top');
      return true;
    }
    // Si ya está en la vista raíz de Música, permitir que la app retroceda normalmente a Home
    return false;
  }, [isExpandedPlayer, selectedPlaylistId, searchQuery, tabHistory, activeTab, setIsExpandedPlayer]);

  useEffect(() => {
    window.__musicBackHandler = handleMusicBack;
    return () => {
      window.__musicBackHandler = null;
    };
  }, [handleMusicBack]);

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

  const selectedPlaylist = useMemo(() => {
    if (!selectedPlaylistId) return null;
    return customPlaylists.find(p => p.id === selectedPlaylistId) || null;
  }, [selectedPlaylistId, customPlaylists]);

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
    if (activeTab === 'playlists' || activeTab === 'queue') {
      if (selectedPlaylist) return selectedPlaylist.tracks;
      return queue;
    }
    return topTracks;
  }, [searchQuery, searchResults, activeTab, topTracks, genreTracks, favorites, queue, selectedPlaylist]);

  return (
    <div className="min-h-screen pb-32 text-white bg-gradient-to-b from-[#0a0614] via-[#090514] to-[#05020a]">
      
      {/* 1. HERO BANNER PRINCIPAL (SOLO DESKTOP PARA MANTENER MÓVIL ÁGIL COMO SPOTIFY) */}
      <div className="hidden md:block relative pt-6 pb-8 px-4 sm:px-8 max-w-7xl mx-auto">
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

        {/* Botón de retroceso contextual dentro de Música */}
        {(activeTab !== 'top' || selectedPlaylistId || searchQuery || tabHistory.length > 0) && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleMusicBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-400/30 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {selectedPlaylistId 
                  ? 'Volver a Mis Listas' 
                  : searchQuery 
                    ? 'Limpiar Búsqueda' 
                    : 'Atrás'}
              </span>
            </button>
          </div>
        )}
        
        {/* Input de Búsqueda */}
        <div className="max-w-xl">
          <div className="relative">
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
              placeholder={isVoiceListening ? "🎙️ Escuchando... Di una canción o artista" : "Buscar por canción, artista, álbum o tema..."}
              className={`w-full pl-11 pr-24 py-3.5 bg-white/[0.05] border rounded-2xl text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 backdrop-blur-md transition shadow-inner ${
                isVoiceListening
                  ? 'border-pink-500 ring-2 ring-pink-500/30 bg-pink-950/20 placeholder-pink-300/70'
                  : 'border-white/10 focus:border-cyan-400/60 focus:ring-cyan-500/20'
              }`}
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                  title="Borrar búsqueda"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
                  isVoiceListening
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/40 animate-pulse scale-105'
                    : 'text-gray-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95'
                }`}
                title={isVoiceListening ? "Detener búsqueda por voz" : "Buscar por voz"}
                aria-label={isVoiceListening ? "Detener búsqueda por voz" : "Buscar por voz"}
              >
                {isVoiceListening ? (
                  <MicOff className="w-4 h-4 animate-bounce" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Feedback de voz activo */}
          {isVoiceListening && (
            <div className="mt-2 flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              <span>Escuchando... Di el título de la canción o el artista</span>
            </div>
          )}

          {/* Alerta de error de voz */}
          {voiceError && (
            <div className="mt-2 flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
              <span>{voiceError}</span>
              <button 
                type="button" 
                onClick={() => setVoiceError('')} 
                className="ml-2 text-rose-400 hover:text-rose-200"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Pestañas de Navegación estilo Píldoras */}
        {!searchQuery && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
            <button
              onClick={() => navigateToTab('top')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                activeTab === 'top'
                  ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-black shadow-md shadow-cyan-500/25'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Top Éxitos</span>
            </button>

            <button
              onClick={() => navigateToTab('genres')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                activeTab === 'genres'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-md shadow-fuchsia-500/25'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Explorar Géneros</span>
            </button>

            <button
              onClick={() => navigateToTab('radios')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                activeTab === 'radios'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-500/25'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Radios en Vivo</span>
            </button>

            <button
              onClick={() => navigateToTab('favorites')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                activeTab === 'favorites'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Tus Me Gusta ({favorites.length})</span>
            </button>

            <button
              onClick={() => navigateToTab('playlists')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                activeTab === 'playlists' || activeTab === 'queue'
                  ? 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md shadow-purple-500/25'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Tus Listas ({customPlaylists.length})</span>
            </button>

            <button
              onClick={() => navigateToTab('offline')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                activeTab === 'offline'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-md shadow-emerald-500/25'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Modo Offline ({offlineTracks.length})</span>
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
                    onAddToPlaylist={() => openAddToPlaylistModal(track)}
                    isDownloaded={isTrackDownloaded(track.id)}
                    downloadStatus={activeDownloadsMap[track.id]}
                    onDownload={() => downloadTrack(track)}
                    onDeleteOffline={() => deleteOfflineTrack(track.id)}
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
                      onAddToPlaylist={() => openAddToPlaylistModal(track)}
                      isDownloaded={isTrackDownloaded(track.id)}
                      downloadStatus={activeDownloadsMap[track.id]}
                      onDownload={() => downloadTrack(track)}
                      onDeleteOffline={() => deleteOfflineTrack(track.id)}
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
              {favorites.length > 0 && (
                <button
                  onClick={() => downloadPlaylist({ id: 'fav_list', title: 'Mis Me Gusta', tracks: favorites })}
                  disabled={isDownloadingPlaylistId === 'fav_list'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition cursor-pointer active:scale-95 shadow-sm w-fit"
                  title="Descargar todas tus canciones favoritas en el dispositivo para modo offline"
                >
                  {isDownloadingPlaylistId === 'fav_list' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Descargando ({playlistDownloadProgress?.current || 0}/{favorites.length})...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Descargar Todos Mis Me Gusta ({favorites.length})</span>
                    </>
                  )}
                </button>
              )}
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
                    onAddToPlaylist={() => openAddToPlaylistModal(track)}
                    isDownloaded={isTrackDownloaded(track.id)}
                    downloadStatus={activeDownloadsMap[track.id]}
                    onDownload={() => downloadTrack(track)}
                    onDeleteOffline={() => deleteOfflineTrack(track.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CASO: LISTAS DE REPRODUCCIÓN & PLAYLISTS PERSONALIZADAS */}
        {!searchQuery && (activeTab === 'playlists' || activeTab === 'queue') && (
          <div className="space-y-6 animate-in fade-in">
            {/* Si el usuario tiene una playlist seleccionada, mostramos la vista detallada de esa playlist */}
            {selectedPlaylist ? (
              <div className="space-y-6">
                {/* Botón Volver */}
                <button
                  onClick={() => setSelectedPlaylistId(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Mis Listas</span>
                </button>

                {/* Banner de la Playlist */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/50 via-[#160f29] to-fuchsia-950/40 border border-fuchsia-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
                  {/* Carátula de la Playlist */}
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden bg-black/60 border border-white/15 flex items-center justify-center flex-shrink-0 shadow-2xl">
                    {selectedPlaylist.cover ? (
                      <img 
                        src={selectedPlaylist.cover} 
                        alt={selectedPlaylist.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <ListMusic className="w-16 h-16 text-fuchsia-400 opacity-60" />
                    )}
                  </div>

                  {/* Info y Acciones */}
                  <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                      Lista de reproducción personalizada
                    </span>

                    {editingPlaylistId === selectedPlaylist.id ? (
                      <div className="flex items-center gap-2 max-w-md mx-auto md:mx-0">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white/10 border border-cyan-400 rounded-xl text-white text-base font-bold focus:outline-none"
                          autoFocus
                          maxLength={50}
                        />
                        <button
                          onClick={() => {
                            if (editingTitle.trim()) {
                              renamePlaylist(selectedPlaylist.id, editingTitle.trim());
                            }
                            setEditingPlaylistId(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-400 text-black font-bold text-xs cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingPlaylistId(null)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-300 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <h2 className="text-2xl sm:text-4xl font-black text-white truncate">
                          {selectedPlaylist.name}
                        </h2>
                        <button
                          onClick={() => {
                            setEditingPlaylistId(selectedPlaylist.id);
                            setEditingTitle(selectedPlaylist.name);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                          title="Renombrar lista"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      {selectedPlaylist.tracks.length} {selectedPlaylist.tracks.length === 1 ? 'canción' : 'canciones'}
                      {selectedPlaylist.tracks.length > 0 && ` • ${Math.round(selectedPlaylist.tracks.reduce((acc, t) => acc + (t.fullDuration || t.duration || 210), 0) / 60)} min`}
                    </p>

                    {/* Botones de acción */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                      {selectedPlaylist.tracks.length > 0 && (
                        <>
                          <button
                            onClick={() => playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-black font-bold text-xs shadow-lg transition cursor-pointer hover:scale-105"
                          >
                            <Play className="w-4 h-4 fill-black" />
                            <span>Reproducir Todo</span>
                          </button>

                          <button
                            onClick={() => {
                              const shuffled = [...selectedPlaylist.tracks].sort(() => Math.random() - 0.5);
                              playTrack(shuffled[0], shuffled);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition cursor-pointer"
                          >
                            <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Aleatorio</span>
                          </button>

                          {/* Botón Descargar Playlist Completa en Modo Offline */}
                          {isPlaylistDownloaded(selectedPlaylist) ? (
                            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs shadow-sm">
                              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                              <span>Playlist Descargada (Offline)</span>
                            </div>
                          ) : isDownloadingPlaylistId === selectedPlaylist.id ? (
                            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold text-xs shadow-sm">
                              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                              <span>Descargando {playlistDownloadProgress?.current || 0}/{playlistDownloadProgress?.total || selectedPlaylist.tracks.length} ({playlistDownloadProgress?.percentage || 0}%)</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => downloadPlaylist(selectedPlaylist)}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white font-semibold text-xs border border-emerald-500/30 transition cursor-pointer active:scale-95 shadow-sm"
                              title="Descargar todas las canciones de esta playlist para escuchar sin conexión"
                            >
                              <DownloadCloud className="w-4 h-4 text-emerald-400" />
                              <span>Descargar Lista ({selectedPlaylist.tracks.length})</span>
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => {
                          if (window.confirm(`¿Seguro que deseas eliminar la lista "${selectedPlaylist.name}"?`)) {
                            deletePlaylist(selectedPlaylist.id);
                            setSelectedPlaylistId(null);
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 font-semibold text-xs border border-red-500/30 transition cursor-pointer md:ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Lista</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Canciones de la playlist */}
                {selectedPlaylist.tracks.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-8">
                    <Music2 className="w-12 h-12 mx-auto mb-3 text-cyan-400/50" />
                    <p className="text-base font-semibold text-white">Esta lista aún no tiene canciones</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Explora el Top de Éxitos o busca tus canciones favoritas y toca el icono <strong>+</strong> para agregarlas aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {selectedPlaylist.tracks.map((track, idx) => (
                      <TrackCard 
                        key={`${track.id}-${idx}`} 
                        track={track} 
                        queue={selectedPlaylist.tracks}
                        index={idx + 1}
                        isPlaying={isPlaying && currentTrack?.id === track.id}
                        onPlay={() => playTrack(track, selectedPlaylist.tracks)}
                        isFav={isFavorite(track.id)}
                        onToggleFav={() => toggleFavorite(track)}
                        onAddToPlaylist={() => openAddToPlaylistModal(track)}
                        onRemoveFromPlaylist={() => removeTrackFromPlaylist(selectedPlaylist.id, track.id)}
                        isDownloaded={isTrackDownloaded(track.id)}
                        downloadStatus={activeDownloadsMap[track.id]}
                        onDownload={() => downloadTrack(track)}
                        onDeleteOffline={() => deleteOfflineTrack(track.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Vista Principal de Playlists */
              <div className="space-y-6">
                {/* Cabecera con selector de sub-pestaña */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <ListMusic className="w-5 h-5 text-fuchsia-400" />
                      <span>Tus Listas de Reproducción</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Crea y organiza tus propias colecciones de canciones personalizadas.
                    </p>
                  </div>

                  {/* Selector Mis Playlists vs Cola en Reproducción */}
                  <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl self-start sm:self-auto">
                    <button
                      onClick={() => setPlaylistSubTab('custom')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        playlistSubTab === 'custom'
                          ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Mis Playlists ({customPlaylists.length})
                    </button>
                    <button
                      onClick={() => setPlaylistSubTab('queue')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        playlistSubTab === 'queue'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Cola en Vivo ({queue.length})
                    </button>
                  </div>
                </div>

                {/* SUB-PESTAÑA 1: MIS PLAYLISTS PERSONALIZADAS */}
                {playlistSubTab === 'custom' && (
                  <div className="space-y-6">
                    {/* Formulario para crear nueva lista */}
                    {isCreatingPlaylist && (
                      <div className="p-4 rounded-2xl bg-fuchsia-950/30 border border-fuchsia-500/30 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
                        <input
                          type="text"
                          value={newPlaylistTitle}
                          onChange={(e) => setNewPlaylistTitle(e.target.value)}
                          placeholder="Nombre de la nueva playlist (ej. Reggaeton 2026, Gym, Relax...)"
                          className="flex-1 px-4 py-2.5 bg-black/50 border border-white/20 focus:border-cyan-400 rounded-xl text-white text-sm focus:outline-none w-full"
                          autoFocus
                          maxLength={50}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (newPlaylistTitle.trim()) {
                                createPlaylist(newPlaylistTitle.trim());
                                setNewPlaylistTitle('');
                                setIsCreatingPlaylist(false);
                              }
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              if (newPlaylistTitle.trim()) {
                                createPlaylist(newPlaylistTitle.trim());
                                setNewPlaylistTitle('');
                                setIsCreatingPlaylist(false);
                              }
                            }}
                            disabled={!newPlaylistTitle.trim()}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold text-xs shadow-md transition disabled:opacity-40 cursor-pointer"
                          >
                            Crear Lista
                          </button>
                          <button
                            onClick={() => {
                              setIsCreatingPlaylist(false);
                              setNewPlaylistTitle('');
                            }}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Grilla de Playlists */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {/* Tarjeta para "+ Crear Playlist" */}
                      <button
                        onClick={() => setIsCreatingPlaylist(true)}
                        className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-fuchsia-500/30 hover:border-cyan-400/60 bg-fuchsia-950/10 hover:bg-fuchsia-950/20 text-center transition duration-300 cursor-pointer min-h-[220px]"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-fuchsia-500/20 to-cyan-500/20 border border-fuchsia-400/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Plus className="w-7 h-7 text-cyan-300" />
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                          Crear Playlist
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Personaliza con tus temas
                        </p>
                      </button>

                      {/* Tarjetas de playlists del usuario */}
                      {customPlaylists.map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => setSelectedPlaylistId(pl.id)}
                          className="group relative overflow-hidden rounded-2xl p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-fuchsia-500/40 transition duration-300 flex flex-col cursor-pointer min-h-[220px]"
                        >
                          {/* Carátula */}
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-black/50 border border-white/10 flex items-center justify-center">
                            {pl.cover ? (
                              <img 
                                src={pl.cover} 
                                alt={pl.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-gray-500">
                                <ListMusic className="w-10 h-10 text-fuchsia-400/40 mb-1" />
                                <span className="text-[10px] text-gray-500">Vacía</span>
                              </div>
                            )}

                            {/* Badge offline si la playlist completa está descargada */}
                            {pl.tracks.length > 0 && isPlaylistDownloaded(pl) && (
                              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-[8px] font-black text-black tracking-wider uppercase shadow flex items-center gap-1 backdrop-blur-sm z-10">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                OFFLINE
                              </div>
                            )}

                            {/* Botón flotante Play si tiene canciones */}
                            {pl.tracks.length > 0 && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playTrack(pl.tracks[0], pl.tracks);
                                }}
                                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 transition-all duration-300"
                                title="Reproducir playlist"
                              >
                                <Play className="w-4 h-4 fill-black ml-0.5" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition">
                              {pl.name}
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {pl.tracks.length} {pl.tracks.length === 1 ? 'canción' : 'canciones'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUB-PESTAÑA 2: COLA EN REPRODUCCIÓN */}
                {playlistSubTab === 'queue' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {queue.length} canciones actualmente en cola de reproducción.
                      </p>
                      {queue.length > 0 && (
                        <button
                          onClick={() => playTrack(queue[0], queue)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Reiniciar Cola</span>
                        </button>
                      )}
                    </div>

                    {queue.length === 0 ? (
                      <div className="text-center py-20 text-gray-400 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                        <ListMusic className="w-12 h-12 mx-auto mb-3 text-fuchsia-400/40" />
                        <p className="text-base font-semibold text-white">La cola de reproducción está vacía</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                          Selecciona cualquier tema o pulsa "Reproducir Todo" en el Top para cargar canciones.
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
                            onAddToPlaylist={() => openAddToPlaylistModal(track)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CASO E: TOP 50 ÉXITOS (DEFAULT) */}
        {!searchQuery && activeTab === 'top' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in">
            
            {/* GRILLA DE ACCESO RÁPIDO ESTILO BENTO (2 COLUMNAS EN MÓVIL, 3 EN DESKTOP) */}
            <div className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400">
                Acceso Rápido
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                
                {/* 1. Tus Me Gusta */}
                <div 
                  onClick={() => setActiveTab('favorites')}
                  className="group relative flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 rounded-xl overflow-hidden cursor-pointer transition active:scale-[0.98] shadow-sm"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white" />
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-pink-300 transition">
                      Tus Me Gusta
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {favorites.length} {favorites.length === 1 ? 'canción' : 'canciones'}
                    </p>
                  </div>
                </div>

                {/* 2. Top 50 Global */}
                <div 
                  onClick={handlePlayAllTop}
                  className="group relative flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-cyan-500/30 rounded-xl overflow-hidden cursor-pointer transition active:scale-[0.98] shadow-sm"
                >
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 overflow-hidden flex-shrink-0 bg-cyan-950">
                    <img 
                      src={topTracks[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
                      alt="Top 50" 
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute top-1 left-1 bg-cyan-400 text-[8px] font-black text-black px-1 rounded shadow">
                      #1
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition">
                      Top 50 Éxitos
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      Los más escuchados
                    </p>
                  </div>
                </div>

                {/* 3. Radio en Vivo */}
                <div 
                  onClick={() => playRadio(LIVE_RADIOS[0])}
                  className="group relative flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-red-500/30 rounded-xl overflow-hidden cursor-pointer transition active:scale-[0.98] shadow-sm"
                >
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-ping" />
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-orange-300 transition">
                      {LIVE_RADIOS[0]?.title || 'Radio Moda FM'}
                    </p>
                    <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      En Vivo 24/7
                    </p>
                  </div>
                </div>

                {/* 4. Reggaetón Hits */}
                <div 
                  onClick={() => {
                    const reggaeton = GENRES.find(g => g.id === 'reggaeton');
                    if (reggaeton) setSelectedGenre(reggaeton);
                    setActiveTab('genres');
                  }}
                  className="group relative flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 rounded-xl overflow-hidden cursor-pointer transition active:scale-[0.98] shadow-sm"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 overflow-hidden flex-shrink-0 bg-pink-900">
                    <img 
                      src={GENRES[0]?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'} 
                      alt="Reggaetón" 
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-pink-300 transition">
                      Reggaetón Hits
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Urbano & Perreo
                    </p>
                  </div>
                </div>

                {/* 5. Modo Offline */}
                <div 
                  onClick={() => {
                    setActiveTab('offline');
                    setSelectedPlaylistId(null);
                  }}
                  className="group relative flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-emerald-500/40 rounded-xl overflow-hidden cursor-pointer transition active:scale-[0.98] shadow-sm"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center flex-shrink-0 shadow-md">
                    <DownloadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-300 transition">
                      Modo Offline
                    </p>
                    <p className="text-[10px] text-emerald-400 font-medium truncate">
                      {offlineTracks.length} {offlineTracks.length === 1 ? 'descargada' : 'descargadas'} • Sin datos
                    </p>
                  </div>
                </div>

                {/* 6. Listas Propias */}
                <div 
                  onClick={() => {
                    setActiveTab('playlists');
                    setSelectedPlaylistId(null);
                  }}
                  className="group relative flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-purple-500/30 rounded-xl overflow-hidden cursor-pointer transition active:scale-[0.98] shadow-sm"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300 transition">
                      {customPlaylists.length > 0 ? customPlaylists[0].name : 'Tus Listas'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {customPlaylists.length} creadas
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* SECCIÓN PRINCIPAL: LO MÁS ESCUCHADO */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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
                      onAddToPlaylist={() => openAddToPlaylistModal(track)}
                      isDownloaded={isTrackDownloaded(track.id)}
                      downloadStatus={activeDownloadsMap[track.id]}
                      onDownload={() => downloadTrack(track)}
                      onDeleteOffline={() => deleteOfflineTrack(track.id)}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* CASO E: MODO OFFLINE (CANCIONES GUARDADAS EN EL DISPOSITIVO) */}
        {!searchQuery && activeTab === 'offline' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Cabecera del Modo Offline */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-[#0a231c] to-teal-950/40 border border-emerald-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-xl border border-white/20">
                <DownloadCloud className="w-12 h-12 text-black" />
              </div>

              <div className="flex-1 min-w-0 text-center md:text-left space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Almacenamiento Local en Dispositivo</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Música Descargada • Modo Offline
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                  Estas canciones están guardadas físicamente en tu teléfono o PC. Se reproducen instantáneamente sin gastar datos móviles y sin requerir señal de internet.
                </p>

                {/* Info de almacenamiento y botones de acción */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-emerald-400">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Espacio utilizado: {getOfflineTotalStorage()} ({offlineTracks.length} {offlineTracks.length === 1 ? 'canción' : 'canciones'})</span>
                  </span>

                  {offlineTracks.length > 0 && (
                    <>
                      <button
                        onClick={() => playTrack(offlineTracks[0], offlineTracks)}
                        className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black font-bold text-xs shadow-lg transition cursor-pointer hover:scale-105"
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>Reproducir Todo Offline</span>
                      </button>

                      <button
                        onClick={() => {
                          const shuffled = [...offlineTracks].sort(() => Math.random() - 0.5);
                          playTrack(shuffled[0], shuffled);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Aleatorio Offline</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm('¿Seguro que deseas eliminar todas las canciones descargadas para liberar espacio?')) {
                            clearAllOffline();
                          }
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 font-semibold text-xs border border-red-500/30 transition cursor-pointer md:ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Borrar Todas</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Listado de pistas offline */}
            {offlineTracks.length === 0 ? (
              <div className="text-center py-20 text-gray-400 bg-white/[0.02] border border-dashed border-emerald-500/20 rounded-3xl p-8 space-y-4">
                <DownloadCloud className="w-14 h-14 mx-auto text-emerald-400/40 animate-pulse" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">No tienes canciones descargadas todavía</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Toca el icono de descarga <Download className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> en cualquier canción de Top Éxitos, Géneros, o el botón "Descargar Playlist" para escuchar tu música favorita sin conexión a internet.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('top')}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold text-xs shadow-md transition hover:scale-105"
                >
                  Explorar Top Éxitos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {offlineTracks.map((track, idx) => (
                  <TrackCard 
                    key={`offline-${track.id}-${idx}`} 
                    track={track} 
                    queue={offlineTracks}
                    index={idx + 1}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() => playTrack(track, offlineTracks)}
                    isFav={isFavorite(track.id)}
                    onToggleFav={() => toggleFavorite(track)}
                    onAddToPlaylist={() => openAddToPlaylistModal(track)}
                    isDownloaded={true}
                    onDeleteOffline={() => deleteOfflineTrack(track.id)}
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
function TrackCard({ 
  track, 
  queue, 
  index, 
  isPlaying, 
  onPlay, 
  isFav, 
  onToggleFav, 
  onAddToPlaylist, 
  onRemoveFromPlaylist,
  isDownloaded,
  downloadStatus,
  onDownload,
  onDeleteOffline
}) {
  const rawSecs = track.fullDuration || track.duration || 210;
  const durationLabel = track.isRadio
    ? 'EN VIVO'
    : `${Math.floor(rawSecs / 60)}:${(rawSecs % 60).toString().padStart(2, '0')}`;

  const isDownloading = downloadStatus?.status === 'downloading';

  return (
    <div 
      onClick={onPlay}
      className={`group relative overflow-hidden rounded-2xl p-2.5 sm:p-3 bg-white/[0.03] hover:bg-white/[0.08] border transition duration-300 flex flex-col cursor-pointer active:scale-[0.98] ${
        isPlaying 
          ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/10 bg-cyan-500/5' 
          : 'border-white/5 hover:border-white/20'
      }`}
    >
      {/* Carátula */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2.5 bg-black/40 shadow-md">
        <img 
          src={track.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
          alt={track.title} 
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Número de posición (para Top charts) */}
        {index && (
          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/75 backdrop-blur-md text-cyan-300 text-xs font-black flex items-center justify-center border border-white/10 shadow z-10">
            {index}
          </span>
        )}

        {/* Indicador visual de Modo Offline Descargada */}
        {isDownloaded && !index && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-[8px] font-black text-black tracking-wider uppercase shadow flex items-center gap-1 backdrop-blur-sm z-10">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            OFFLINE
          </span>
        )}

        {/* Género sobre la carátula (elegante y sin quitar espacio abajo) */}
        {!track.isRadio && track.genre && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-bold text-cyan-300 tracking-wider uppercase shadow truncate max-w-[90px] z-10">
            {track.genre}
          </span>
        )}

        {/* Botón flotante Play */}
        <div className={`absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black flex items-center justify-center shadow-xl transition-all duration-300 ${
          isPlaying ? 'opacity-100 scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110'
        }`}>
          {isPlaying ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
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

      {/* Footer de la tarjeta: Duración a la izquierda y Botones de acción con espaciado generoso a la derecha */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
          <Clock className="w-3 h-3 text-gray-500" />
          {durationLabel}
        </span>

        <div className="flex items-center gap-1">
          {/* Botón Modo Offline: Descargar / En descarga / Descargada */}
          {!track.isRadio && (
            isDownloaded ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOffline?.();
                }}
                className="p-1.5 rounded-lg text-emerald-400 hover:text-red-400 hover:bg-white/5 active:scale-90 transition"
                title="Canción descargada en tu dispositivo (Modo Offline). Toca para borrar archivo"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : isDownloading ? (
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg text-cyan-400"
                title={`Descargando: ${downloadStatus?.progress || 0}%`}
              >
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              </button>
            ) : onDownload ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-white/5 active:scale-90 transition"
                title="Descargar para escuchar sin internet (Modo Offline)"
              >
                <Download className="w-4 h-4" />
              </button>
            ) : null
          )}

          {!track.isRadio && onAddToPlaylist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-fuchsia-400 hover:bg-white/5 active:scale-90 transition"
              title="Añadir a lista personalizada"
            >
              <ListPlus className="w-4 h-4" />
            </button>
          )}

          {onRemoveFromPlaylist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromPlaylist();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 active:scale-90 transition"
              title="Quitar de esta lista"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav();
            }}
            className={`p-1.5 rounded-lg active:scale-90 transition ${
              isFav ? 'text-pink-500 hover:text-pink-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title={isFav ? 'Quitar de Mis Me Gusta' : 'Guardar en Mis Me Gusta'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
