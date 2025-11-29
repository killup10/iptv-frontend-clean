import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPlayableUrl } from "@/utils/playerUtils.js";
import axiosInstance from "@/utils/axiosInstance.js";
import SeriesChapters from "@/components/SeriesChapters.jsx";
import VideoPlayer from "@/components/VideoPlayer.jsx";
import { backgroundPlaybackService } from '@/services/backgroundPlayback';
import { getUserProgress, updateUserProgress } from "@/utils/api.js";
import { throttle } from 'lodash';

import ContentAccessModal from '@/components/ContentAccessModal.jsx';
import DynamicTheme, { DynamicText, DynamicCard } from '@/components/DynamicTheme.jsx';
import EnhancedContentInfo from '@/components/EnhancedContentInfo.jsx';
import ContentRecommendations from '@/components/ContentRecommendations.jsx';
import useGeminiContent from '@/hooks/useGeminiContent.js';

export function Watch() {
  const { itemType, itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [bounds, setBounds] = useState(null);
  const [currentChapterInfo, setCurrentChapterInfo] = useState(null);
  
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalData, setAccessModalData] = useState(null);

  const videoAreaRef = useRef(null);
  const isContinueWatching = location.state?.continueWatching === true;
  const startTimeFromState = location.state?.startTime || 0;
  const [startTime, setStartTime] = useState(startTimeFromState);
  const [reloadKey, setReloadKey] = useState(0);
  const [useTrial, setUseTrial] = useState(() => {
    try {
      const key = `useTrial:${itemId}`;
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        return true;
      }
    } catch {}
    return location.state?.useTrial === true;
  });

  const isUnmountingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const playbackStartTsRef = useRef(null);

  const {
    contentInfo,
    visualTheme,
    recommendations,
    loading: geminiLoading,
    error: geminiError,
    retry: retryGemini
  } = useGeminiContent(
    itemData?.name,
    itemData?.releaseYear,
    Array.isArray(itemData?.genres) ? itemData.genres.join(', ') : itemData?.genres,
    itemData?.description
  );

  // 1) Fetch de detalles del contenido
  useEffect(() => {
    const fetchItemDetails = async () => {
      if (!itemId || !itemType) {
        setError("Falta información para cargar el contenido.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let endpoint = "";
        if (itemType === "channel") {
          endpoint = `/api/channels/id/${itemId}`;
        } else if (["movie", "serie", "series", "pelicula", "anime", "dorama", "novela", "documental", "zona kids"].includes(itemType)) {
          endpoint = `/api/videos/${itemId}${useTrial ? '?useTrial=true' : ''}`;
        } else {
          setError(`Tipo de contenido "${itemType}" no reconocido.`);
          setLoading(false);
          return;
        }
        const response = await axiosInstance.get(endpoint);
        console.log(`[Watch.jsx] fetchItemDetails - response for endpoint ${endpoint}:`, response.status, response.data);
        const data = response.data;
        if (!data) {
          throw new Error("No se recibieron datos del backend.");
        }
        const normalizedData = {
          id: data._id || data.id,
          name: data.name || data.title || data.titulo || "Sin título",
          url: data.url,
          description: data.description || data.descripcion || "",
          releaseYear: data.releaseYear,
          tipo: data.tipo || itemType,
          seasons: data.seasons || [],
          chapters: (data.seasons || []).flatMap(season => season.chapters || []),
          watchProgress: data.watchProgress || null
        };

        if (process.env.NODE_ENV === "development") {
          console.log("[Watch.jsx] Datos normalizados:", normalizedData);
        }
        setItemData(normalizedData);
      } catch (err) {
        if (err.response?.status === 401) {
          // Sesión expirada o no autorizado
          setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente para acceder a este contenido.');
          setTimeout(() => {
            navigate('/login', { state: { from: location.pathname } });
          }, 2000);
        } else if (err.response?.status === 403) {
          const errorData = err.response.data || {};
          setAccessModalData({
            title: errorData.title || location.state?.title || location.state?.name || 'Contenido Premium',
            error: errorData.error || 'Acceso denegado',
            message: errorData.message || 'Tu plan actual no permite acceder a este contenido.',
            currentPlan: errorData.currentPlan || 'gplay',
            requiredPlans: errorData.requiredPlans || ['premium'],
            upgradeMessage: errorData.upgradeMessage || 'Actualiza tu plan para acceder a todo el contenido premium.',
            trialMessage: errorData.trialMessage,
            trialMinutesRemaining: errorData.trialMinutesRemaining || 0,
            trialUsedToday: errorData.trialUsedToday || 0,
            itemId: itemId,
            itemType: itemType
          });
          setShowAccessModal(true);
        } else {
          setError(`No se pudo cargar el contenido. ${err.response?.data?.error || err.message || "Error desconocido."}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchItemDetails();
  }, [itemId, itemType, reloadKey, useTrial]);

  // Cargar progreso guardado
  useEffect(() => {
    async function loadSavedProgress() {
      if (startTimeFromState > 0 || !itemId || itemType === 'channel') return;
      try {
        const progressData = await getUserProgress();
        const videoProgress = progressData.find(p => p.video?._id === itemId);
        if (videoProgress?.progress) {
          console.log(`[Watch.jsx] Progreso cargado para ${itemId}: ${videoProgress.progress}`);
          setStartTime(videoProgress.progress);
        }
      } catch (err) {
        console.error('[Watch.jsx] Error cargando progreso:', err);
      }
    }
    loadSavedProgress();
  }, [itemId, itemType, startTimeFromState]);

  // Determinar capítulo actual
  useEffect(() => {
    if (!itemData) return;
    
    if (itemData.tipo === 'pelicula' || itemData.tipo === 'movie' || itemType === 'channel') {
      console.log('[Watch] Contenido tipo película/canal, no se requiere currentChapterInfo');
      return;
    }

    let seasonIdx = 0;
    let chapterIdx = 0;
    let foundChapter = false;

    console.log('[Watch] 🔍 Iniciando búsqueda de capítulo con:', {
      hasSeasons: !!itemData.seasons,
      seasonsLength: itemData.seasons?.length,
      locationState: location.state,
      watchProgress: itemData.watchProgress
    });

    if (location.state?.continueWatching && location.state?.seasonIndex !== undefined && location.state?.chapterIndex !== undefined) {
      seasonIdx = location.state.seasonIndex;
      chapterIdx = location.state.chapterIndex;
      if (itemData.seasons?.[seasonIdx]?.chapters?.[chapterIdx]) {
        console.log('[Watch] ✅ Cargando desde estado de navegación (continuar viendo):', { seasonIdx, chapterIdx });
        foundChapter = true;
        if (location.state?.startTime !== undefined) {
          setStartTime(location.state.startTime);
        }
      }
    }

    if (!foundChapter && location.state?.continueWatching && itemData.watchProgress) {
      console.log('[Watch] Intentando cargar desde watchProgress:', itemData.watchProgress);
      const wp = itemData.watchProgress;
      
      if (typeof wp.lastSeason === 'number' && typeof wp.lastChapter === 'number' && wp.lastSeason >= 0 && wp.lastChapter >= 0) {
        const targetSeason = itemData.seasons[wp.lastSeason];
        if (targetSeason?.chapters?.[wp.lastChapter]) {
          seasonIdx = wp.lastSeason;
          chapterIdx = wp.lastChapter;
          setStartTime(wp.progress || 0);
          console.log('[Watch] ✅ Cargando último episodio visto:', { seasonIdx, chapterIdx, startTime: wp.progress });
          foundChapter = true;
        }
      }
    }

    if (!foundChapter && location.state?.seasonIndex !== undefined && location.state?.chapterIndex !== undefined) {
      seasonIdx = location.state.seasonIndex;
      chapterIdx = location.state.chapterIndex;
      if (itemData.seasons?.[seasonIdx]?.chapters?.[chapterIdx]) {
        console.log('[Watch] ✅ Cargando desde estado de navegación directo:', { seasonIdx, chapterIdx });
        foundChapter = true;
      }
    }

    if (!foundChapter) {
      if (itemData.seasons?.[0]?.chapters?.[0]) {
        seasonIdx = 0;
        chapterIdx = 0;
        console.log('[Watch] ✅ Usando fallback: primer capítulo de primera temporada');
        foundChapter = true;
      }
    }
    
    if (foundChapter) {
      console.log('[Watch] 🎬 Estableciendo currentChapterInfo:', { seasonIndex: seasonIdx, chapterIndex: chapterIdx });
      setCurrentChapterInfo({ seasonIndex: seasonIdx, chapterIndex: chapterIdx });
    } else {
      console.error('[Watch] ❌ No se encontró ningún capítulo válido para reproducir');
      setError('No se encontró ningún capítulo válido para reproducir');
    }
  }, [itemData, location.state, itemType]);

  // 2) Calcular URL reproducible
  useEffect(() => {
    if (isUnmountingRef.current) {
      console.log('[Watch.jsx] Omitiendo carga de video: en proceso de unmount');
      return;
    }
    
    if (!itemData) return;
    
    const M3U8_PROXY_BASE_URL = null;
    let finalUrl = "";
    const hasChapters = (itemData.chapters && itemData.chapters.length > 0) || (itemData.seasons && itemData.seasons.length > 0);
    
    try {
      if (videoAreaRef.current) {
        const existingVideo = videoAreaRef.current.querySelector('video');
        if (existingVideo) {
          try {
            existingVideo.pause();
            existingVideo.removeAttribute('src');
            existingVideo.load();
          } catch (e) { /* ignore */ }
        }
      }
    } catch (cleanupErr) {
      console.warn('[Watch.jsx] Error during pre-switch cleanup:', cleanupErr);
    }

    try {
      if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
        backgroundPlaybackService.stopPlayback();
      }
    } catch (bgErr) {
      console.warn('[Watch.jsx] backgroundPlaybackService.stopPlayback failed:', bgErr);
    }

    if (hasChapters) {
      if (currentChapterInfo) {
        const season = itemData.seasons?.[currentChapterInfo.seasonIndex];
        const chapter = season?.chapters?.[currentChapterInfo.chapterIndex];
        if (chapter?.url) {
          finalUrl = getPlayableUrl({ ...itemData, url: chapter.url }, M3U8_PROXY_BASE_URL);
        } else {
          setError("El capítulo seleccionado no tiene una URL válida.");
          return;
        }
      }
    } else if (itemData.url) {
      finalUrl = getPlayableUrl(itemData, M3U8_PROXY_BASE_URL);
    }
    setVideoUrl(finalUrl);
  }, [itemData, currentChapterInfo]);

  // 3) Medir bounds
  useEffect(() => {
    if (videoUrl && videoAreaRef.current) {
      const rect = videoAreaRef.current.getBoundingClientRect();
      setBounds({
        x: Math.floor(rect.left),
        y: Math.floor(rect.top),
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    }
  }, [videoUrl]);

  // 4) Iniciar MPV (solo Electron)
  useEffect(() => {
    const isElectronEnv = typeof window !== "undefined" && window.electronMPV;
    if (!videoUrl || !bounds || !isElectronEnv) return;

    const initializeMPV = async (retryCount = 0) => {
      try {
        console.log('[Watch.jsx] Deteniendo MPV anterior antes de iniciar nuevo...');
        await window.electronMPV.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await window.electronMPV.play(videoUrl, bounds, { startTime });
        if (!result.success) {
          throw new Error(result.error || 'Error desconocido al iniciar MPV');
        }

        setError(null);
        playbackStartTsRef.current = Date.now();
      } catch (err) {
        console.error('[Watch.jsx] Error al iniciar MPV:', err);
        
        if (err.message.includes('código: 1') && retryCount < 2) {
          console.log(`[Watch.jsx] Reintentando reproducción (intento ${retryCount + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return initializeMPV(retryCount + 1);
        }
        
        setError(`Error al iniciar el reproductor: ${err.message}`);
      }
    };

    initializeMPV();

    const handleMpvError = (event, message) => {
      console.error('[Watch.jsx] MPV Error:', message);
      setError(`Error del reproductor: ${message}`);
    };

    const handleTimePos = (event, time) => {
      const t = Number(time);
      if (Number.isFinite(t) && t > 0) {
        currentTimeRef.current = t;
      }
    };

    // Intervalo para enviar progreso periódicamente (cada 30 segundos)
    const progressInterval = setInterval(() => {
      if (currentTimeRef.current > 0 && itemId) {
        console.log('[Watch.jsx] Enviando progreso periódico:', currentTimeRef.current);
        axiosInstance.put(`/api/videos/${itemId}/progress`, { 
          lastTime: Math.floor(currentTimeRef.current) 
        }).catch(err => {
          console.warn('[Watch.jsx] Error al enviar progreso periódico:', err?.message);
        });
      }
    }, 30000); // Cada 30 segundos
    
    if (window.electronAPI) {
      window.electronAPI.on('mpv-error', handleMpvError);
      window.electronAPI.on('mpv-time-pos', handleTimePos); 
    }

    return () => {
      clearInterval(progressInterval); // Limpiar intervalo
      
      if (window.electronMPV) {
        window.electronMPV.stop().catch(err => {
          console.error('[Watch.jsx] Error al detener MPV en cleanup:', err);
        });
        
        // Guardar progreso cuando se detiene MPV
        if (currentTimeRef.current > 0 && itemId) {
          console.log('[Watch.jsx] Guardando progreso final:', currentTimeRef.current);
          axiosInstance.put(`/api/videos/${itemId}/progress`, { 
            lastTime: Math.floor(currentTimeRef.current) 
          }).catch(err => {
            console.warn('[Watch.jsx] Error al guardar progreso final:', err?.message);
          });
        }
      }
      playbackStartTsRef.current = null;
      if (window.electronAPI) {
        window.electronAPI.removeListener('mpv-error', handleMpvError);
        window.electronAPI.removeListener('mpv-time-pos', handleTimePos);
      }
    };
  }, [videoUrl, bounds, startTime]);

  // 5) Sincronización de bounds
  useEffect(() => {
    const isElectronEnv = typeof window !== "undefined" && window.electronMPV;
    if (!bounds || !isElectronEnv) return;

    const removeListener = window.electronMPV.onRequestVideoBoundsSync(() => {
      if (videoAreaRef.current) {
        const r = videoAreaRef.current.getBoundingClientRect();
        window.electronMPV.updateBounds({
          x: Math.floor(r.left),
          y: Math.floor(r.top),
          width: Math.floor(r.width),
          height: Math.floor(r.height),
        });
      }
    });

    return () => {
      removeListener();
    };
  }, [bounds]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      console.log('[Watch.jsx] Watch.jsx se está desmontando - limpieza AGRESIVA...');
      isUnmountingRef.current = true;
      
      if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
        try {
          backgroundPlaybackService.stopPlayback();
        } catch (err) {
          console.warn('[Watch.jsx] Cleanup: Error deteniendo backgroundPlayback:', err);
        }
      }

      if (window.VideoPlayerPlugin) {
        try {
          if (typeof window.VideoPlayerPlugin.stopVideo === 'function') {
            window.VideoPlayerPlugin.stopVideo();
          }
        } catch (err) {
          console.warn('[Watch.jsx] Cleanup: Error intento 1:', err);
        }
      }

      try {
        if (videoAreaRef.current) {
          const videoElements = videoAreaRef.current.querySelectorAll('video');
          videoElements.forEach(video => {
            try {
              video.pause();
              video.removeAttribute('src');
              video.load();
            } catch (e) { /* ignore */ }
          });
        }
      } catch (err) {
        console.warn('[Watch.jsx] Cleanup: Error limpiando videos HTML5:', err);
      }
    };
  }, []);

  const handleBackNavigation = async () => {
    isUnmountingRef.current = true;
    setVideoUrl("");
    setItemData(null);
    
    try {
      if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
        await backgroundPlaybackService.stopPlayback();
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo backgroundPlayback:', err);
    }

    try {
      if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.stopVideo === 'function') {
        await window.VideoPlayerPlugin.stopVideo();
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo VLC plugin:', err);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const fromLocation = location.state?.from;
    const fromSection = location.state?.fromSection;
    
    if (fromLocation) {
      navigate(fromLocation);
    } else if (fromSection) {
      switch (fromSection) {
        case 'movies':
        case 'peliculas':
          navigate('/');
          break;
        case 'series':
          navigate('/series');
          break;
        case 'channels':
        case 'canales':
          navigate('/');
          break;
        default:
          navigate('/');
          break;
      }
    } else {
      navigate('/');
    }
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setAccessModalData(null);
    // No llamar handleBackNavigation aquí directamente
    // El usuario puede cerrar el modal desde el botón X y seguir en la página
    // Solo volver atrás si presiona el botón "Volver"
  };

  const handleNextEpisode = (seasonIndex, chapterIndex) => {
    navigate(`/watch/${itemType}/${itemId}`, { state: { seasonIndex, chapterIndex, continueWatching: true } });
  };

  const handleProceedWithTrial = () => {
    if (accessModalData?.trialMinutesRemaining > 0) {
      setShowAccessModal(false);
      setAccessModalData(null);
      setUseTrial(true);
      setReloadKey((prev) => prev + 1);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (showAccessModal) {
    return (
      <div className="bg-zinc-900 min-h-screen flex flex-col pt-16">
        <div className="container mx-auto px-2 sm:px-4 py-4 flex-grow flex flex-col">
          <div className="mb-4 flex items-center justify-between w-full max-w-screen-xl mx-auto">
            <button
              onClick={handleBackNavigation}
              className="text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm transition-colors"
            >
              ← Volver
            </button>
          </div>
          <div className="flex-grow flex items-center justify-center text-gray-300">
            {/* El modal se encargará de mostrar el detalle del error de acceso */}
          </div>
        </div>

        <ContentAccessModal
          isOpen={showAccessModal}
          onClose={closeAccessModal}
          data={accessModalData}
          onProceedWithTrial={handleProceedWithTrial}
          onGoBack={handleBackNavigation}
        />
      </div>
    );
  }

  const showError = error && (
    <div className="w-full max-w-screen-xl mx-auto mb-4">
      <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-4 rounded-lg">
        <div className="whitespace-pre-wrap">{error}</div>
        {!error.includes('plan') && (
          <button
            onClick={() => {
              setError(null);
              if (window.electronMPV && videoUrl && bounds) {
                window.electronMPV.stop()
                  .then(() => new Promise(resolve => setTimeout(resolve, 1000)))
                  .then(() => window.electronMPV.play(videoUrl, bounds, { startTime }))
                  .catch(err => {
                    console.error('[Watch.jsx] Error al reintentar reproducción:', err);
                    setError(`Error al reintentar: ${err.message}`);
                  });
              }
            }}
            className="mt-3 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );

  if (!itemData)
    return (
      <div className="text-white p-10 text-center min-h-screen bg-black pt-20">
        Información del contenido no disponible.
        <button
          onClick={handleBackNavigation}
          className="block mx-auto mt-4 bg-gray-700 px-3 py-1 rounded"
        >
          Volver
        </button>
      </div>
    );

  const hasValidContent = itemData.url || (itemData.chapters && itemData.chapters.length > 0);
  
  if (!hasValidContent)
    return (
      <div className="text-white p-10 text-center min-h-screen bg-black pt-20">
        No hay contenido disponible para reproducir.
        <div className="mt-4 text-sm text-gray-400">
          Debug info: URL={itemData.url || 'null'}, Chapters={itemData.chapters?.length || 0}
        </div>
        <button
          onClick={handleBackNavigation}
          className="block mx-auto mt-4 bg-gray-700 px-3 py-1 rounded"
        >
          Volver
        </button>
      </div>
    );

  const currentChapter = currentChapterInfo && itemData.seasons[currentChapterInfo.seasonIndex]?.chapters[currentChapterInfo.chapterIndex];

  return (
    <DynamicTheme 
      theme={visualTheme} 
      className="min-h-screen flex flex-col pt-16 relative"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: itemData?.poster || itemData?.backdrop || itemData?.thumbnail 
            ? `url(${itemData.poster || itemData.backdrop || itemData.thumbnail})` 
            : "url('/fondo.png')",
          filter: 'brightness(0.3) blur(1px)'
        }}
      />
      
      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 flex-grow flex flex-col">
        {showError}
        
        <div className="mb-4 flex items-center justify-between w-full max-w-screen-xl mx-auto">
          <button
            onClick={handleBackNavigation}
            className="px-4 py-2 rounded-md text-sm transition-all duration-300 border backdrop-blur-sm"
            style={{
              backgroundColor: visualTheme ? `${visualTheme.gradientStart}90` : 'rgba(31, 41, 55, 0.9)',
              color: visualTheme?.textColor || '#ffffff',
              borderColor: visualTheme ? `${visualTheme.primaryColor}50` : 'rgba(59, 130, 246, 0.5)',
              boxShadow: visualTheme ? `0 4px 15px ${visualTheme.primaryColor}20` : '0 4px 15px rgba(59, 130, 246, 0.2)'
            }}
          >
            ← Volver
          </button>
        </div>

        <div className="flex-grow flex flex-col items-center">
          <div className="w-full max-w-screen-xl">
            <div className="text-center sm:text-left mb-6">
              <h1 className="text-4xl sm:text-5xl font-black mb-4">
                <DynamicText theme={visualTheme} glow={true}>
                  {itemData.name}
                </DynamicText>
              </h1>
              
              <div className="flex flex-wrap gap-3 mb-4 justify-center sm:justify-start">
                {itemData.releaseYear && (
                  <span 
                    className="px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm"
                    style={{
                      backgroundColor: visualTheme ? `${visualTheme.primaryColor}20` : 'rgba(59, 130, 246, 0.2)',
                      color: visualTheme?.primaryColor || '#3b82f6',
                      border: `1px solid ${visualTheme?.primaryColor || '#3b82f6'}40`
                    }}
                  >
                    📅 {itemData.releaseYear}
                  </span>
                )}
                {itemData.genres && (
                  <span 
                    className="px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm"
                    style={{
                      backgroundColor: visualTheme ? `${visualTheme.secondaryColor}20` : 'rgba(236, 72, 153, 0.2)',
                      color: visualTheme?.secondaryColor || '#ec4899',
                      border: `1px solid ${visualTheme?.secondaryColor || '#ec4899'}40`
                    }}
                  >
                    🎭 {Array.isArray(itemData.genres) ? itemData.genres.join(', ') : itemData.genres}
                  </span>
                )}
              </div>
            </div>
            
            <div
              ref={videoAreaRef}
              className="w-full max-w-5xl mx-auto mb-8 rounded-2xl overflow-hidden"
              style={{ 
                position: "relative", 
                aspectRatio: "16/9",
                boxShadow: visualTheme ? `0 0 40px ${visualTheme.primaryColor}30` : '0 0 40px rgba(59, 130, 246, 0.3)'
              }}
            >
              {videoUrl ? (
                <VideoPlayer 
                  url={videoUrl}
                  itemId={itemData.id}
                  startTime={startTime}
                  initialAutoplay={true}
                  title={itemData.name}
                  seasons={itemData.seasons}
                  currentChapterInfo={currentChapterInfo}
                  onNextEpisode={itemData.tipo !== 'pelicula' ? handleNextEpisode : undefined}
                  isUnmountingRef={isUnmountingRef}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-black rounded-2xl">
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                      style={{ borderColor: visualTheme?.primaryColor || '#3b82f6' }}
                    ></div>
                    <DynamicText theme={visualTheme} glow={true}>
                      <span className="text-lg font-medium">Cargando video...</span>
                    </DynamicText>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8 w-full max-w-screen-xl">
            {(
              itemData.tipo !== 'pelicula' &&
              itemData.tipo !== 'movie' &&
              itemData.tipo !== 'channel' &&
              ( (itemData.seasons && itemData.seasons.length > 0) || (itemData.chapters && itemData.chapters.length > 0) )
            ) && (
              <DynamicCard theme={visualTheme} className="p-6 rounded-xl" glow={true}>
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <span 
                    className="w-1 h-8 rounded-full mr-3"
                    style={{
                      background: visualTheme 
                        ? `linear-gradient(to bottom, ${visualTheme.primaryColor}, ${visualTheme.secondaryColor})`
                        : 'linear-gradient(to bottom, #3b82f6, #ec4899)'
                    }}
                  ></span>
                  <DynamicText theme={visualTheme} glow={true}>
                    Episodios
                  </DynamicText>
                </h3>
                {currentChapterInfo && <SeriesChapters
                  seasons={itemData.seasons}
                  serieId={itemData.id}
                  currentChapter={currentChapterInfo.chapterIndex}
                  watchProgress={itemData.watchProgress}
                  currentSeason={currentChapterInfo.seasonIndex}
                />}
              </DynamicCard>
            )}

            {itemData.description && (
              <D
