import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getClientRequests, createClientRequest, searchTMDB } from '../utils/api.js';

// 48 carátulas de películas y series icónicas del cine mundial y streaming
const DEFAULT_CINEMA_POSTERS = [
  'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', // Spider-Man Across the Spider-Verse
  'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Oppenheimer
  'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', // Avengers Endgame
  'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', // The Batman
  'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', // The Dark Knight
  'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', // Joker
  'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg', // Top Gun Maverick
  'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', // Stranger Things
  'https://image.tmdb.org/t/p/w500/fBFjaDWfNslvrs6bJjknmG27wOS.jpg', // Deadpool & Wolverine
  'https://image.tmdb.org/t/p/w500/ntmaNFJ7O60n45E1E6HZlXeSV5e.jpg', // Inside Out 2
  'https://image.tmdb.org/t/p/w500/jPBfFTwmgco94oS9ikdt9tqHsxm.jpg', // Beetlejuice
  'https://image.tmdb.org/t/p/w500/e4P8CIoffzsyjTm9e6U87Mng2CU.jpg', // Gladiator II
  'https://image.tmdb.org/t/p/w500/mKPGRRyXIwN8JOLhAbWnxV1gNrS.jpg', // Alien Romulus
  'https://image.tmdb.org/t/p/w500/ylrSdW6fZYwaInYH6WAqvIEnSiV.jpg', // Despicable Me 4
  'https://image.tmdb.org/t/p/w500/eSS5mvSG84UUuvtbHel5Yu3Wik4.jpg', // The Wild Robot
  'https://image.tmdb.org/t/p/w500/iHPYm59D7kF8yQr03hewusoyNET.jpg', // Twisters
  'https://image.tmdb.org/t/p/w500/pQIpfeenClb2ws9G0kMg3HREjoA.jpg', // Bad Boys Ride or Die
  'https://image.tmdb.org/t/p/w500/kVDHPDggier9ciMc8Xglinq1jWv.jpg', // Furiosa
  'https://image.tmdb.org/t/p/w500/9VWplgfRcYkUao9QGQXUP3rWQK7.jpg', // Kingdom of the Planet of the Apes
  'https://image.tmdb.org/t/p/w500/jfYo76IOCphg2fmKX5UJvgcimy4.jpg', // Kung Fu Panda 4
  'https://image.tmdb.org/t/p/w500/cO7J0XSVKPlAjUCMWC7DVBn1Py2.jpg', // The Fall Guy
  'https://image.tmdb.org/t/p/w500/eB3hWY62tpjjR8Be8Jl8tQF444A.jpg', // Civil War
  'https://image.tmdb.org/t/p/w500/rmCkNtzYR2xTOO3ZXmIqB5zgYdE.jpg', // Godzilla x Kong
  'https://image.tmdb.org/t/p/w500/6WWJiE7Dwj63H122IOG2htJsCGP.jpg', // Dune 2
  'https://image.tmdb.org/t/p/w500/hRaAGZf4U4V1eDsugSKZAllqdc5.jpg', // Wonka
  'https://image.tmdb.org/t/p/w500/gxrGVQdFmc3xxVn6UyY31ZjqM0s.jpg', // Transformers One
  'https://image.tmdb.org/t/p/w500/t6Ub9GTbw6uwphRZQQiQlKim0vO.jpg', // Moana 2
  'https://image.tmdb.org/t/p/w500/txe65aR0g5JiYnHKPjX3E49M5td.jpg', // Venom The Last Dance
  'https://image.tmdb.org/t/p/w500/e2t7NjahJTgz2PMx2BW4ZRgHR6Z.jpg', // Red One
  'https://image.tmdb.org/t/p/w500/s7ye2BFq4HjGMi0dGkzGu5c2fyz.jpg', // Smile 2
  'https://image.tmdb.org/t/p/w500/lmrulvLbmaejTix1YaMxo1oGhH1.jpg', // Terrifier 3
  'https://image.tmdb.org/t/p/w500/yCkPLQ10qKIUgRBXmQVVMF1h96d.jpg', // Heretic
  'https://image.tmdb.org/t/p/w500/3A4IzhQHCzX5nuQParZp07F5rCT.jpg', // Wicked
  'https://image.tmdb.org/t/p/w500/6bnJo6DHzzEZOs9SnECCA1EGRgE.jpg', // Sonic the Hedgehog 3
  'https://image.tmdb.org/t/p/w500/tn2mxPYSSUPHgfcAe5SCga1DO0i.jpg', // Mufasa The Lion King
  'https://image.tmdb.org/t/p/w500/8XFqpmHwbBcqMHJUHglukTeTU7Z.jpg', // Nosferatu
  'https://image.tmdb.org/t/p/w500/clw1EmN6OA0AtogU6iFCwBZSCp1.jpg', // Kraven the Hunter
  'https://image.tmdb.org/t/p/w500/8f33Q5AuM2G5ZqFeusbIqDjr3cI.jpg', // The Penguin
  'https://image.tmdb.org/t/p/w500/mpizUstxJmMbgMwc8MDEXQ6kXTP.jpg', // Arcane S2
  'https://image.tmdb.org/t/p/w500/3YTb97zytlWRWZb7HrOiEhk4e6f.jpg', // Shogun
  'https://image.tmdb.org/t/p/w500/yzDuAQCY2n6zzOlBkn6JzhLhY3k.jpg', // Fallout
  'https://image.tmdb.org/t/p/w500/5uB1PWP3QHEcgMXKChsaYmtTUkQ.jpg', // House of the Dragon
  'https://image.tmdb.org/t/p/w500/ycvuLbEuMG88UPuwuAYJWY0ZI8v.jpg', // The Boys
  'https://image.tmdb.org/t/p/w500/fXvnylD29aoKx4ai3wBlHRXMSVp.jpg', // Cobra Kai
  'https://image.tmdb.org/t/p/w500/iMsORWhD8MawINagL6kvpDVAtS.jpg', // Demon Slayer
  'https://image.tmdb.org/t/p/w500/cFMqLI43ybVFyarJTnfV9YO9KUC.jpg', // Attack on Titan
  'https://image.tmdb.org/t/p/w500/j0CIVzeR7hRAPBPGR54qDZoOQpp.jpg', // Jujutsu Kaisen
];

export default function Pedidos() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fondo dinámico de cine
  const [backdropPosters, setBackdropPosters] = useState(DEFAULT_CINEMA_POSTERS);

  // Estados de búsqueda TMDB
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal para pedir
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Estados de pedidos existentes
  const [activeTab, setActiveTab] = useState('disponible'); // 'disponible' | 'pendiente' | 'mis_pedidos'
  const [requestsList, setRequestsList] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Intentar cargar carátulas en tendencia de la semana para mantener el fondo fresco
  useEffect(() => {
    let isMounted = true;
    const fetchTrendingPosters = async () => {
      try {
        const tmdbKey = '9a918356a86407beac5efae2a78bf1c4';
        const res = await fetch(
          `https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbKey}&language=es-MX&page=1`
        );
        if (res.ok) {
          const data = await res.json();
          const livePosters = (data.results || [])
            .filter((item) => item.poster_path)
            .map((item) => `https://image.tmdb.org/t/p/w500${item.poster_path}`);
          if (isMounted && livePosters.length > 0) {
            setBackdropPosters((prev) => {
              const merged = Array.from(new Set([...livePosters, ...prev]));
              return merged.slice(0, 48);
            });
          }
        }
      } catch (err) {
        console.warn('Usando lista fija de pósters para el fondo:', err);
      }
    };
    fetchTrendingPosters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar pedidos de la comunidad
  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const data = await getClientRequests({ limit: 100 });
      setRequestsList(data.requests || []);
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setRequestsList([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Manejar búsqueda en TMDB
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setHasSearched(true);
    try {
      const results = await searchTMDB(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setErrorMsg('Error al consultar el catálogo. Por favor intenta nuevamente.');
    } finally {
      setIsSearching(false);
    }
  };

  // Abrir modal para solicitar un título
  const handleOpenRequestModal = (media) => {
    setSelectedMedia(media);
    setRequestNote('');
    setErrorMsg(null);
    setFeedbackMsg(null);
  };

  // Confirmar y enviar pedido
  const handleConfirmRequest = async () => {
    if (!selectedMedia) return;

    setIsSubmittingRequest(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    try {
      const payload = {
        title: selectedMedia.title,
        tipo: selectedMedia.mediaType || 'pelicula',
        tmdbId: selectedMedia.id,
        poster: selectedMedia.poster,
        backdrop: selectedMedia.backdrop,
        year: selectedMedia.year,
        overview: selectedMedia.overview,
        note: requestNote.trim(),
      };

      const res = await createClientRequest(payload);

      if (res.alreadyExists) {
        setFeedbackMsg(`ℹ️ ${res.message}`);
      } else if (res.inCatalog) {
        setFeedbackMsg(`🎉 ${res.message}`);
      } else {
        setFeedbackMsg(`✅ ¡Pedido registrado con éxito! Nuestro equipo lo subirá a la brevedad.`);
      }

      setSelectedMedia(null);
      loadRequests();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al enviar el pedido.';
      setErrorMsg(msg);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Filtrar pedidos según pestaña
  const disponibles = requestsList.filter((r) => r.status === 'disponible');
  const pendientes = requestsList.filter((r) => r.status === 'pendiente' || r.status === 'en_proceso');
  const misPedidos = requestsList.filter((r) => r.requestedBy?.username === user?.username);

  const displayedList =
    activeTab === 'disponible' ? disponibles : activeTab === 'pendiente' ? pendientes : misPedidos;

  // Reproducir contenido ya disponible
  const handlePlayVideo = (request) => {
    if (!request.videoId) {
      alert('Este contenido aún se está procesando.');
      return;
    }

    const video = request.videoId;
    const itemType = video.tipo === 'pelicula' ? 'movie' : 'serie';
    navigate(`/watch/${itemType}/${video._id}`);
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* ======================================================== */}
      {/* FONDO CINEMATOGRÁFICO DE PÓSTERS DE PELÍCULAS CON BLUR    */}
      {/* ======================================================== */}
      <div 
        className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0" 
        aria-hidden="true"
        style={{ backgroundColor: '#07090f' }}
      >
        {/* Muro denso de carátulas cinematográficas reales */}
        <div 
          className="absolute -inset-8 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 sm:gap-4"
          style={{
            filter: 'blur(5px) brightness(0.70) saturate(1.2)',
            transform: 'scale(1.05)',
            opacity: 0.55
          }}
        >
          {backdropPosters.map((posterUrl, idx) => (
            <div 
              key={idx} 
              className="aspect-[2/3] rounded-xl overflow-hidden bg-black/50 shadow-2xl"
            >
              <img
                src={posterUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          ))}
        </div>

        {/* Gradiente radial de cine: más transparente al centro para lucir las carátulas, oscuro en bordes */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 35%, rgba(7, 9, 15, 0.40) 0%, rgba(7, 9, 15, 0.82) 100%)',
          }}
        />

        {/* Gradiente vertical suave para unificar con el navbar y footer */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#07090f]/90"
        />

        {/* Halos de luz de proyector de sala VIP */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-red-600/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] bg-red-950/20 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-indigo-900/15 rounded-full blur-[150px] pointer-events-none" />
      </div>

      {/* ======================================================== */}
      {/* CONTENIDO PRINCIPAL FLOTANTE SOBRE EL FONDO               */}
      {/* ======================================================== */}
      <div className="relative z-10 max-w-7xl mx-auto pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        {/* HERO / ENCABEZADO ESTILO CINE */}
        <div className="relative rounded-3xl bg-black/60 backdrop-blur-2xl p-6 sm:p-10 mb-10 border border-red-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Halo interior carmesí */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/25 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-600/30 border border-red-500/50 text-red-300 text-xs font-black rounded-full mb-4 uppercase tracking-widest backdrop-blur-md shadow">
              <span>🎬</span>
              <span>SALA DE PEDIDOS ON-DEMAND • TEAMG PLAY</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-md">
              ¿No encuentras una película o serie? <span className="text-red-500">Pídela aquí</span>
            </h1>
            <p className="text-gray-200 text-sm sm:text-base leading-relaxed mb-6 drop-shadow">
              Explora cualquier título del cine mundial, anime o series de streaming. Si aún no está en la cartelera de TeamG Play, solicítalo con un clic y nuestro equipo lo agregará en la mejor calidad disponible.
            </p>

            {/* BUSCADOR */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 text-base">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Escribe el nombre de la película, serie o anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/70 border border-white/25 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm shadow-inner backdrop-blur-md transition"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 text-white font-black px-7 py-3.5 rounded-2xl text-sm transition shadow-[0_10px_25px_rgba(220,38,38,0.5)] flex items-center justify-center gap-2 border border-red-400/30 flex-shrink-0"
              >
                {isSearching ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    <span>Buscando en cine...</span>
                  </>
                ) : (
                  <>
                    <span>Explorar Catálogo</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* MENSAJES FEEDBACK */}
        {feedbackMsg && (
          <div className="mb-6 p-4 bg-green-950/80 backdrop-blur-xl border border-green-500/50 text-green-200 rounded-2xl text-sm flex items-center justify-between shadow-xl animate-fade-in">
            <span className="font-medium">{feedbackMsg}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-green-400 hover:text-white font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/80 backdrop-blur-xl border border-red-500/50 text-red-200 rounded-2xl text-sm flex items-center justify-between shadow-xl animate-fade-in">
            <span className="font-medium">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* RESULTADOS DE BÚSQUEDA TMDB */}
        {hasSearched && (
          <div className="mb-12 bg-black/70 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                <span>🎯 Resultados para:</span>
                <span className="text-red-400 font-bold">"{searchQuery}"</span>
              </h2>
              <button
                onClick={() => {
                  setHasSearched(false);
                  setSearchResults([]);
                }}
                className="text-xs text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-xl font-medium transition"
              >
                Cerrar resultados ✕
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-200 text-base font-semibold mb-1">No se encontraron títulos con ese nombre exacto.</p>
                <p className="text-gray-400 text-xs">Intenta buscar con otra palabra clave o con el título original.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="bg-black/70 backdrop-blur-md rounded-2xl overflow-hidden border border-white/15 flex flex-col justify-between hover:border-red-500/80 hover:shadow-[0_10px_30px_rgba(220,38,38,0.35)] transition-all duration-300 group hover:-translate-y-1 shadow-lg"
                  >
                    <div className="relative aspect-[2/3] bg-gray-950 overflow-hidden">
                      <img
                        src={item.poster || '/img/placeholder-thumbnail.png'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => { e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                      <span className="absolute top-2.5 right-2.5 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-black text-gray-200 uppercase border border-white/10 shadow">
                        {item.mediaType}
                      </span>
                      {item.voteAverage > 0 && (
                        <span className="absolute top-2.5 left-2.5 bg-amber-500 text-black backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-black shadow flex items-center gap-0.5">
                          ★ {item.voteAverage.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-red-400 transition" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">{item.year || 'Año N/A'}</p>
                      </div>
                      <button
                        onClick={() => handleOpenRequestModal(item)}
                        className="w-full bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5"
                      >
                        <span>➕ Pedir este título</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN DEL MURO DE PEDIDOS DE LA COMUNIDAD */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-5">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
              <span>📋 Muro de Pedidos de la Comunidad</span>
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Explora lo que ya está disponible para ver y lo que está próximo a subirse por el equipo.
            </p>
          </div>

          {/* PESTAÑAS */}
          <div className="flex bg-black/60 backdrop-blur-md border border-white/15 rounded-2xl p-1.5 gap-1.5 shadow-inner">
            <button
              onClick={() => setActiveTab('disponible')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'disponible'
                  ? 'bg-green-600 text-white shadow-[0_4px_15px_rgba(22,163,74,0.5)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🟢 Disponibles ({disponibles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('pendiente')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'pendiente'
                  ? 'bg-amber-600 text-white shadow-[0_4px_15px_rgba(217,119,6,0.5)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>⏳ En Cola ({pendientes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('mis_pedidos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'mis_pedidos'
                  ? 'bg-red-600 text-white shadow-[0_4px_15px_rgba(220,38,38,0.5)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>👤 Mis Pedidos ({misPedidos.length})</span>
            </button>
          </div>
        </div>

        {/* LISTADO DE PEDIDOS */}
        {isLoadingRequests ? (
          <div className="py-20 text-center text-gray-300">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent mb-3"></div>
            <p className="text-sm font-medium">Cargando pedidos de la comunidad...</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="py-16 text-center bg-black/45 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl max-w-xl mx-auto">
            <div className="text-4xl mb-3">🍿</div>
            <p className="text-gray-200 text-base font-bold mb-1">
              {activeTab === 'disponible' 
                ? 'Aún no hay títulos marcados como disponibles en esta sección.'
                : activeTab === 'pendiente'
                ? 'No hay títulos pendientes en cola ahora mismo.'
                : 'Aún no has realizado pedidos personales.'}
            </p>
            <p className="text-gray-400 text-xs px-6">¡Usa el buscador arriba para ser el primero en pedir un estreno o tu serie favorita!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedList.map((req) => (
              <div
                key={req._id}
                className="bg-black/65 backdrop-blur-md rounded-2xl overflow-hidden border border-white/15 flex flex-col justify-between hover:border-white/30 transition-all duration-300 shadow-xl group hover:-translate-y-1"
              >
                <div className="relative aspect-[2/3] bg-gray-950 overflow-hidden">
                  <img
                    src={req.poster || '/img/placeholder-thumbnail.png'}
                    alt={req.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    onError={(e) => { e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
                  />

                  {/* BADGE DE ESTADO */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow border ${
                        req.status === 'disponible'
                          ? 'bg-green-600 text-white border-green-400/40 shadow-green-900/50'
                          : 'bg-amber-600 text-white border-amber-400/40 shadow-amber-900/50'
                      }`}
                    >
                      {req.status === 'disponible' ? '✓ Disponible' : '⏳ En Cola'}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span className="bg-black/85 px-2 py-0.5 rounded-lg text-[10px] text-gray-200 font-semibold uppercase backdrop-blur-md border border-white/10 shadow">
                      {req.tipo}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white line-clamp-1 mb-0.5" title={req.title}>
                      {req.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3">
                      <span>{req.year || ''}</span>
                      <span className="truncate max-w-[90px]" title={req.requestedBy?.username}>
                        Por: {req.requestedBy?.username || 'Usuario'}
                      </span>
                    </div>
                  </div>

                  {req.status === 'disponible' && req.videoId ? (
                    <button
                      onClick={() => handlePlayVideo(req)}
                      className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white text-xs font-black py-2.5 rounded-xl transition shadow-[0_4px_15px_rgba(22,163,74,0.4)] flex items-center justify-center gap-1.5"
                    >
                      <span>▶ Ver Ahora</span>
                    </button>
                  ) : (
                    <div className="w-full bg-white/10 text-gray-300 text-[11px] font-semibold py-2 rounded-xl text-center border border-white/10">
                      En preparación...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE PEDIDO */}
        {selectedMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-gray-950/95 border border-white/20 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-red-400">TeamG On-Demand</span>
                  <h3 className="text-xl font-black text-white">Solicitar Título</h3>
                </div>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="text-gray-400 hover:text-white font-bold text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-4">
                <img
                  src={selectedMedia.poster || '/img/placeholder-thumbnail.png'}
                  alt={selectedMedia.title}
                  className="w-24 h-36 object-cover rounded-xl bg-black flex-shrink-0 border border-white/10 shadow-lg"
                  onError={(e) => { e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
                />
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 bg-red-600/30 text-red-300 text-[10px] font-black rounded-md uppercase mb-1 border border-red-500/30">
                    {selectedMedia.mediaType}
                  </span>
                  <h4 className="text-lg font-black text-white line-clamp-1">{selectedMedia.title}</h4>
                  <p className="text-xs text-gray-400 mb-2">{selectedMedia.year}</p>
                  <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed">
                    {selectedMedia.overview || 'Sin descripción disponible.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Nota o detalle adicional (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Temporada 2, audio latino, etc."
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 backdrop-blur-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRequest}
                  disabled={isSubmittingRequest}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-500 active:scale-95 transition shadow-[0_5px_20px_rgba(220,38,38,0.4)] flex items-center gap-2 border border-red-400/30"
                >
                  {isSubmittingRequest ? 'Enviando pedido...' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
