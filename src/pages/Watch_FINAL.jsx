import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPlayableUrl } from "@/utils/playerUtils.js";
import axiosInstance from "@/utils/axiosInstance.js";
import SeriesChapters from "@/components/SeriesChapters.jsx";
import VideoPlayer from "@/components/VideoPlayer.jsx";
import { backgroundPlaybackService } from '@/services/backgroundPlayback';
import { getUserProgress, updateUserProgress } from "@/utils/api.js";
import { throttle } from 'lodash'; // Se necesita lodash para throttling

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
  
  // Estado para el modal de acceso
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalData, setAccessModalData] = useState(null);

  const videoAreaRef = useRef(null);
  const isContinueWatching = location.state?.continueWatching === true;
  const startTimeFromState = location.state?.startTime || 0;
  const [startTime, setStartTime] = useState(startTimeFromState);
  
  // Forzar reintentos de carga (útil tras activar prueba gratuita)
  const [reloadKey, setReloadKey] = useState(0);
  
  // Flag para solicitar datos con ?useTrial=true cuando aplique
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

  // 🔥 FLAG CRÍTICO para prevenir re-inicios al salir de la página
  const isUnmountingRef = useRef(false);
  
  // 🔥 NUEVO: Flag para prevenir navegación duplicada
  const isNavigatingRef = useRef(false);

  // 🔥 NUEVO: Guardar estado de navegación en sessionStorage
  useEffect(() => {
    // Al montar, verificar si venimos de una navegación hacia atrás
    const navigationState = sessionStorage.getItem('watch_navigation_state');
    if (navigationState === 'backing_out') {
      console.log('[Watch] ⛔ Detectado retorno desde navegación - bloqueando reproducción');
      isUnmountingRef.current = true;
      sessionStorage.removeItem('watch_navigation_state');
      // Navegar inmediatamente fuera
      navigate('/', { replace: true });
      return;
    }
    
    // Limpiar cualquier estado previo
    sessionStorage.removeItem('watch_navigation_state');
  }, [navigate]);

  // --- REFS PARA ELECTRON MPV (solo para compatibilidad)
  const mpvContainerRef = useRef(null);
  const mpvReadyRef = useRef(false);
  const mpvRetryCount = useRef(0);

  // Gemini AI content
  const { contentInfo, recommendations, loading: geminiLoading, error: geminiError, retry: retryGemini } = useGeminiContent(itemData);

  // Visual theme based on content
  const [visualTheme, setVisualTheme] = useState(null);

  useEffect(() => {
    if (contentInfo?.visualTheme) {
      setVisualTheme(contentInfo.visualTheme);
    }
  }, [contentInfo]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = "";
      if (itemType === "channel") {
        endpoint = `/api/channels/${itemId}`;
      } else if (itemType === "movie") {
        endpoint = `/api/videos/${itemId}`;
      } else if (itemType === "serie") {
        endpoint = `/api/series/${itemId}`;
      } else {
        throw new Error("Tipo de contenido no válido");
      }

      if (useTrial) {
        endpoint += '?useTrial=true';
      }

      const response = await axiosInstance.get(endpoint);
      console.log(`[Watch.jsx] fetchItemDetails - response for endpoint ${endpoint}:`, response.status, response.data);
      const data = response.data;

      if (process.env.NODE_ENV === "development") {
        console.log("[Watch.jsx] Datos normalizados:", data);
      }

      // Cargar progreso del usuario si existe
      if (data.id && !isContinueWatching) {
        try {
          const videoProgress = await getUserProgress(data.id);
          if (videoProgress?.progress) {
            console.log(`[Watch.jsx] Progreso cargado para ${itemId}: ${videoProgress.progress}`);
            setStartTime(videoProgress.progress);
          }
        } catch (err) {
          console.error('[Watch.jsx] Error cargando progreso:', err);
        }
      }

      setItemData(data);

      if (data.url) {
        const playableUrl = getPlayableUrl(data.url);
        setVideoUrl(playableUrl);
      } else if (data.seasons && data.seasons.length > 0) {
        const firstSeason = data.seasons[0];
        const firstChapter = firstSeason.chapters[0];
        if (firstChapter && firstChapter.url) {
          const playableUrl = getPlayableUrl(firstChapter.url);
          setVideoUrl(playableUrl);
          setCurrentChapterInfo({ seasonIndex: 0, chapterIndex: 0 });
        }
      }
    } catch (err) {
      console.error("Error fetching item details:", err);
      
      if (err.response?.status === 401) {
        // Sesión expirada o no autorizado
        setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente para acceder a este contenido.');
        setTimeout(() => {
          navigate('/login', { state: { from: location.pathname } });
        }, 2000);
        setLoading(false);
        return;
      }
      
      if (err.response?.status === 403 && err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.requiresAuth) {
          navigate('/login', { 
            state: { from: location.pathname },
            replace: true 
          });
          return;
        }
        
        if (errorData.trialAvailable || errorData.requiresSubscription) {
          setAccessModalData({
            contentTitle: errorData.contentTitle || 'Contenido Premium',
            message: errorData.message,
            trialAvailable: errorData.trialAvailable,
            requiresSubscription: errorData.requiresSubscription,
            userPlan: errorData.userPlan,
            requiredPlan: errorData.requiredPlan
          });
          setShowAccessModal(true);
          setLoading(false);
          return;
        }
      }
      
      setError(err.message || "Error al cargar el contenido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemData) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Watch.jsx] itemData recibido:", itemData);
      }
    }
  }, [itemData]);

  useEffect(() => {
    fetchItemDetails();
  }, [itemType, itemId, reloadKey, useTrial]);

  // 🔥 LIMPIEZA AGRESIVA cuando Watch.jsx se desmonta
  useEffect(() => {
    return () => {
      console.log('[Watch.jsx] 🛑 Watch.jsx se está desmontando - limpieza TOTAL...');
      isUnmountingRef.current = true;
      
      // Detener TODO múltiples veces
      for (let i = 0; i < 5; i++) {
        try {
          // Detener background playback
          if (backgroundPlaybackService?.stopPlayback) {
            backgroundPlaybackService.stopPlayback();
          }
          
          // Detener VLC plugin - múltiples métodos
          if (window.VideoPlayerPlugin) {
            if (typeof window.VideoPlayerPlugin.stopVideo === 'function') {
              window.VideoPlayerPlugin.stopVideo();
            }
            if (typeof window.VideoPlayerPlugin.forceStopVideo === 'function') {
              window.VideoPlayerPlugin.forceStopVideo();
            }
            if (typeof window.VideoPlayerPlugin.stop === 'function') {
              window.VideoPlayerPlugin.stop();
            }
          }
        } catch (err) {
          // Ignorar errores, seguir intentando
        }
      }
      
      // Limpiar videos HTML5
      try {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          try {
            video.pause();
            video.removeAttribute('src');
            video.load();
          } catch (e) {
            // Ignorar
          }
        });
      } catch (err) {
        // Ignorar
      }
      
      console.log('[Watch.jsx] Limpieza completa finalizada');
    };
  }, []);

  // 🔥 FUNCIÓN MEJORADA para manejar navegación hacia atrás
  const handleBackNavigation = async () => {
    // Prevenir navegación duplicada
    if (isNavigatingRef.current) {
      console.log('[Watch.jsx] ⚠️ Navegación ya en proceso, ignorando');
      return;
    }
    
    console.log('[Watch.jsx] 🔙 handleBackNavigation: Iniciando limpieza TOTAL...');
    
    // Marcar que estamos navegando
    isNavigatingRef.current = true;
    isUnmountingRef.current = true;
    
    // Guardar estado en sessionStorage para prevenir re-inicios
    sessionStorage.setItem('watch_navigation_state', 'backing_out');
    
    // LIMPIAR TODO INMEDIATAMENTE
    setVideoUrl("");
    setItemData(null);
    setCurrentChapterInfo(null);
    
    // Detener TODO múltiples veces
    for (let i = 0; i < 3; i++) {
      try {
        // Detener background playback
        if (backgroundPlaybackService?.stopPlayback) {
          await backgroundPlaybackService.stopPlayback();
        }
      } catch (err) {
        // Ignorar
      }
      
      try {
        // Detener VLC plugin - todos los métodos posibles
        if (window.VideoPlayerPlugin) {
          if (typeof window.VideoPlayerPlugin.stopVideo === 'function') {
            await window.VideoPlayerPlugin.stopVideo();
          }
          if (typeof window.VideoPlayerPlugin.forceStopVideo === 'function') {
            await window.VideoPlayerPlugin.forceStopVideo();
          }
          if (typeof window.VideoPlayerPlugin.stop === 'function') {
            await window.VideoPlayerPlugin.stop();
          }
        }
      } catch (err) {
        // Ignorar
      }
    }
    
    // Limpiar videos HTML5
    try {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {
          // Ignorar
        }
      });
    } catch (err) {
      // Ignorar
    }
    
    console.log('[Watch.jsx] Limpieza completa, navegando...');
    
    // Navegar con replace para evitar volver aquí
    navigate('/', { replace: true });
  };

  const handleChapterSelect = (seasonIndex, chapterIndex) => {
    const selectedSeason = itemData.seasons[seasonIndex];
    const selectedChapter = selectedSeason.chapters[chapterIndex];
    
    if (selectedChapter && selectedChapter.url) {
      const playableUrl = getPlayableUrl(selectedChapter.url);
      setVideoUrl(playableUrl);
      setCurrentChapterInfo({ seasonIndex, chapterIndex });
      setStartTime(0);
    }
  };

  const handleNextEpisode = (seasonIndex, chapterIndex) => {
    console.log(`[Watch.jsx] handleNextEpisode called with seasonIndex: ${seasonIndex}, chapterIndex: ${chapterIndex}`);
    handleChapterSelect(seasonIndex, chapterIndex);
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    navigate(-1);
  };

  const handleProceedWithTrial = () => {
    setShowAccessModal(false);
    setUseTrial(true);
    setReloadKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <DynamicTheme theme={visualTheme}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white">Cargando contenido...</p>
          </div>
        </div>
      </DynamicTheme>
    );
  }

  if (error) {
    return (
      <DynamicTheme theme={visualTheme}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 text-xl">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Volver
            </button>
          </div>
        </div>
      </DynamicTheme>
    );
  }

  if (!itemData) {
    return (
      <DynamicTheme theme={visualTheme}>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-white">No se encontró el contenido</p>
        </div>
      </DynamicTheme>
    );
  }

  return (
    <DynamicTheme theme={visualTheme}>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header with back button */}
          <div className="mb-6">
            <button
              onClick={handleBackNavigation}
              className="flex items-center text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
          </div>

          {/* Video Player Area */}
          <div ref={videoAreaRef} className="mb-8">
            {videoUrl && !isUnmountingRef.current && (
              <VideoPlayer
                url={videoUrl}
                itemId={itemData.id}
                startTime={startTime}
                initialAutoplay={true}
                title={itemData.title || itemData.name}
                seasons={itemData.seasons}
                currentChapterInfo={currentChapterInfo}
                onNextEpisode={handleNextEpisode}
                isUnmountingRef={isUnmountingRef}
              />
            )}
          </div>

          {/* Content Information */}
          <div className="space-y-6">
            {/* Title and metadata */}
            <DynamicCard theme={visualTheme} className="p-6 rounded-xl" glow={true}>
              <h1 className="text-3xl font-bold mb-2">
                <DynamicText theme={visualTheme} variant="title" glow={true}>
                  {itemData.title || itemData.name}
                </DynamicText>
              </h1>
              
              {itemData.metadata && (
                <div className="flex flex-wrap gap-4 text-sm opacity-80">
                  {itemData.metadata.year && (
                    <span>{itemData.metadata.year}</span>
                  )}
                  {itemData.metadata.duration && (
                    <span>{itemData.metadata.duration}</span>
                  )}
                  {itemData.metadata.rating && (
                    <span className="flex items-center">
                      <span className="text-yellow-400 mr-1">★</span>
                      {itemData.metadata.rating}
                    </span>
                  )}
                </div>
              )}
            </DynamicCard>

            {/* Series chapters */}
            {itemData.seasons && itemData.seasons.length > 0 && (
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

            {/* Original description with enhanced styling */}
            {itemData.description && (
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
                    Descripción
                  </DynamicText>
                </h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap" 
                     style={{ color: visualTheme?.textColor || '#ffffff' }}>
                    {itemData.description}
                  </p>
                </div>
              </DynamicCard>
            )}

            {/* Enhanced content info powered by Gemini */}
            <EnhancedContentInfo
              contentInfo={contentInfo}
              loading={geminiLoading}
              error={geminiError}
              onRetry={retryGemini}
            />

            {/* Content recommendations */}
            <ContentRecommendations
              recommendations={recommendations}
              theme={visualTheme}
              loading={geminiLoading}
              error={geminiError}
              onRetry={retryGemini}
            />
          </div>
        </div>
      </div>

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={handleProceedWithTrial}
      />
    </DynamicTheme>
  );
}

export default Watch;
