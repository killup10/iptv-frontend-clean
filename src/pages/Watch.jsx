import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPlayableUrl } from "@/utils/playerUtils.js";
import { maskUrl } from "@/utils/debugUtils.js";
import axiosInstance from "@/utils/axiosInstance.js";
import SeriesChapters from "@/components/SeriesChapters.jsx";
import VideoPlayer from "@/components/VideoPlayer.jsx";
import { backgroundPlaybackService } from '@/services/backgroundPlayback';
import { getUserProgress, updateUserProgress } from "@/utils/api.js";
import { throttle } from 'lodash';
import { App as CapacitorApp } from '@capacitor/app';

import ContentAccessModal from '@/components/ContentAccessModal.jsx';
import DynamicTheme, { DynamicText, DynamicCard } from '@/components/DynamicTheme.jsx';
import SmartRecommendations from '@/components/SmartRecommendations.jsx';
import useGeminiContent from '@/hooks/useGeminiContent.js';
import useRecommendations from '@/hooks/useRecommendations.js';

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
  const [channelList, setChannelList] = useState([]);
  const [currentChannelIndex, setCurrentChannelIndex] = useState(-1);
  const [isReloadingChannel, setIsReloadingChannel] = useState(false);
  const [channelPlaybackIssue, setChannelPlaybackIssue] = useState(null);
  const [isChannelPickerOpen, setIsChannelPickerOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalData, setAccessModalData] = useState(null);

  const videoAreaRef = useRef(null);
  
  // 🔧 FIX ELECTRON: Recuperar state desde localStorage si es necesario (HashRouter puede perderlo)
  const [isContinueWatching, setIsContinueWatching] = useState(location.state?.continueWatching === true);
  const [startTimeFromState, setStartTimeFromState] = useState(location.state?.startTime || 0);
  const [continueWatchingState, setContinueWatchingState] = useState(
    location.state?.continueWatching ? location.state : null
  );
  
  useEffect(() => {
    if (location.state?.continueWatching) {
      // Guardar el state en localStorage como fallback para Electron
      const cacheKey = `continueWatching_${itemId}`;
      const navigationCache = {
        continueWatching: location.state.continueWatching,
        startTime: location.state.startTime,
        seasonIndex: location.state.seasonIndex,
        chapterIndex: location.state.chapterIndex,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem(cacheKey, JSON.stringify(navigationCache));
        console.log('[Watch] ✅ Estado "Continuar viendo" guardado en localStorage:', navigationCache);
      } catch (e) {
        console.error('[Watch] Error guardando en localStorage:', e);
      }
      setContinueWatchingState(location.state);
      setIsContinueWatching(true);
      setStartTimeFromState(location.state.startTime || 0);
    } else {
      // Intentar recuperar desde localStorage si el state se perdió
      const cacheKey = `continueWatching_${itemId}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          // Solo usar si es reciente (menos de 5 minutos)
          if (Date.now() - data.timestamp < 5 * 60 * 1000) {
            console.log('[Watch] ✅ Estado recuperado desde localStorage:', data);
            setIsContinueWatching(true);
            setStartTimeFromState(data.startTime || 0);
            setContinueWatchingState(data);
            // No borrar de localStorage aún, por si el usuario hace back/forward
          }
        }
      } catch (e) {
        console.error('[Watch] Error recuperando de localStorage:', e);
      }
    }
  }, [itemId, location.state]);

  const [startTime, setStartTime] = useState(startTimeFromState);
  const [reloadKey, setReloadKey] = useState(0);
  
  useEffect(() => {
    if (startTimeFromState > 0 && startTimeFromState !== startTime) {
      setStartTime(startTimeFromState);
    }
  }, [startTimeFromState, startTime]);
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
  const isNavigatingAwayRef = useRef(false); // 🔥 NUEVO: Ref para detectar navegación
  const currentTimeRef = useRef(0);
  const playbackStartTsRef = useRef(null);
  const initialProgressSavedRef = useRef(false); // 🔥 NUEVO: Evitar duplicados
  const suppressMpvClosedRef = useRef(false);
  const nextEpisodeNavigationRef = useRef({ key: null, ts: 0 });

  // Construye un título legible para MPV (canal/película/serie + episodio cuando aplique)
  const buildMpvDisplayTitle = () => {
    const baseTitle = (
      itemData?.name ||
      itemData?.title ||
      location.state?.title ||
      location.state?.name ||
      'TeamG Play'
    ).toString().trim();

    if (!baseTitle) return 'TeamG Play';

    const isSeriesContent = itemData?.tipo !== 'pelicula' && itemData?.tipo !== 'movie' && itemType !== 'channel';
    if (!isSeriesContent) return baseTitle;

    const seasonIndex = currentChapterInfo?.seasonIndex;
    const chapterIndex = currentChapterInfo?.chapterIndex;
    const season = itemData?.seasons?.[currentChapterInfo?.seasonIndex];
    const chapter = season?.chapters?.[currentChapterInfo?.chapterIndex];
    let chapterTitle = (chapter?.title || '').toString().trim();

    const seasonNumberFromData = Number(season?.seasonNumber);
    const chapterNumberFromData = Number(chapter?.episodeNumber);
    const seasonNumber = Number.isFinite(seasonNumberFromData) && seasonNumberFromData > 0
      ? seasonNumberFromData
      : (Number.isFinite(seasonIndex) ? seasonIndex + 1 : null);
    const chapterNumber = Number.isFinite(chapterNumberFromData) && chapterNumberFromData > 0
      ? chapterNumberFromData
      : (Number.isFinite(chapterIndex) ? chapterIndex + 1 : null);

    if (chapterTitle) {
      chapterTitle = chapterTitle
        .replace(/^T(?:emporada)?\s*\d+\s*E(?:pisodio)?\s*\d+\s*[-:]\s*/i, '')
        .replace(/^S(?:eason)?\s*\d+\s*E(?:pisode)?\s*\d+\s*[-:]\s*/i, '')
        .replace(/^\d+\s*x\s*\d+\s*[-:]\s*/i, '')
        .trim();
    }

    const episodeLabel = (seasonNumber && chapterNumber)
      ? `T${seasonNumber} E${chapterNumber}`
      : (chapterNumber ? `E${chapterNumber}` : (seasonNumber ? `T${seasonNumber}` : ''));

    if (episodeLabel && chapterTitle) return `${baseTitle} - ${episodeLabel} - ${chapterTitle}`;
    if (episodeLabel) return `${baseTitle} - ${episodeLabel}`;
    if (chapterTitle) return `${baseTitle} - ${chapterTitle}`;
    return baseTitle;
  };

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

  // Hook para recomendaciones inteligentes del backend
  const {
    recommendations: smartRecommendations,
    loading: smartRecommendationsLoading,
    error: smartRecommendationsError,
    retry: retrySmartRecommendations,
    loadSimilarRecommendations
  } = useRecommendations(itemId, 'similar');

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
          section: data.section || null,
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

  // Cargar catálogo de canales para permitir cambio directo (canal anterior/siguiente)
  useEffect(() => {
    if (itemType !== 'channel') {
      setChannelList([]);
      setCurrentChannelIndex(-1);
      return;
    }

    let cancelled = false;
    const loadChannels = async () => {
      try {
        const response = await axiosInstance.get('/api/channels/list');
        if (cancelled) return;
        const rawChannels = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data?.channels) ? response.data.channels : []);

        const normalizedChannels = rawChannels
          .map((channel) => ({
            id: channel?._id || channel?.id,
            name: channel?.name || channel?.title || 'Canal',
            section: channel?.section || 'General'
          }))
          .filter((channel) => channel.id);

        setChannelList(normalizedChannels);
      } catch (err) {
        if (!cancelled) {
          console.warn('[Watch.jsx] No se pudo cargar lista de canales para zapping:', err?.message || err);
          setChannelList([]);
        }
      }
    };

    loadChannels();

    return () => {
      cancelled = true;
    };
  }, [itemType]);

  useEffect(() => {
    if (itemType !== 'channel') {
      setCurrentChannelIndex(-1);
      return;
    }
    const index = channelList.findIndex((channel) => String(channel.id) === String(itemId));
    setCurrentChannelIndex(index);
  }, [itemType, channelList, itemId]);

  // Cargar progreso guardado
  // 🔥 OPTIMIZADO: Usar caché local primero, background fetch después
  useEffect(() => {
    if (startTimeFromState > 0 || !itemId || itemType === 'channel') return;
    
    const loadSavedProgress = async () => {
      const applyRecoveredProgress = (rawProgress, sourceLabel) => {
        const progress = Math.max(0, Math.floor(Number(rawProgress) || 0));
        if (!Number.isFinite(progress) || progress <= 0) return false;

        // Evita que un progreso tardio reinicie MPV mientras ya esta reproduciendo.
        if (playbackStartTsRef.current || currentTimeRef.current > 0) {
          console.log('[Watch.jsx] Ignorando progreso recuperado porque MPV ya inicio:', {
            source: sourceLabel,
            progress,
            currentTime: currentTimeRef.current
          });
          return false;
        }

        setStartTime(prev => (prev > 0 ? prev : progress));
        return true;
      };

      try {
        // Intentar caché primero
        const cacheKey = `videoProgress_${itemId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          const cachedProgress = data.progress ?? data.lastTime ?? 0;
          if (applyRecoveredProgress(cachedProgress, 'cache')) {
            console.log(`[Watch.jsx] ⚡ Progreso cargado desde caché: ${cachedProgress}s`);
            return; // No esperar al servidor
          }
        }

        // Fetch del servidor en background
        const progressData = await getUserProgress();
        const videoProgress = progressData.find(p => p.video?._id === itemId);
        const progressSeconds = videoProgress?.progress ?? videoProgress?.lastTime ?? 0;
        if (applyRecoveredProgress(progressSeconds, 'server')) {
          console.log(`[Watch.jsx] Progreso cargado del servidor para ${itemId}: ${progressSeconds}`);
          // Actualizar caché
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ progress: progressSeconds }));
          } catch (e) {
            console.error('[Watch.jsx] Error actualizando caché:', e);
          }
        }
      } catch (err) {
        console.error('[Watch.jsx] Error cargando progreso:', err);
      }
    };
    
    loadSavedProgress();
  }, [itemId, itemType, startTimeFromState]);

  // Guardar progreso inicial cuando se carga el video (para que aparezca en "Continuar Viendo")
  // 🔥 OPTIMIZADO: Guardar INMEDIATAMENTE sin esperar getUserProgress()
  useEffect(() => {
    if (!itemData || !itemId || itemType === 'channel' || initialProgressSavedRef.current) return;
    const existingProgress = itemData.watchProgress?.progress ?? itemData.watchProgress?.lastTime ?? 0;
    const isSeries = itemData.tipo !== 'pelicula' && itemData.tipo !== 'movie';

    if (isContinueWatching || (Number.isFinite(existingProgress) && existingProgress > 0)) return;
    if (isSeries && !currentChapterInfo) return;

    const saveInitialProgress = async () => {
      try {
        console.log(`[Watch.jsx] 🚀 Guardando progreso inicial INMEDIATAMENTE para ${itemId}`);
        console.log(`[Watch.jsx] 📊 Item data:`, itemData?.nombre || itemData?.title);
        
        const progressPayload = {
          lastTime: 1,
          progress: 1,
          lastSeason: currentChapterInfo?.seasonIndex ?? 0,
          lastChapter: currentChapterInfo?.chapterIndex ?? 0,
          completed: false,
          totalDuration: 0,
        };
        
        console.log(`[Watch.jsx] 📋 Payload a enviar:`, progressPayload);
        
        const response = await axiosInstance.put(`/api/videos/${itemId}/progress`, progressPayload);
        
        initialProgressSavedRef.current = true;
        console.log(`[Watch.jsx] ✅ Progreso inicial guardado INMEDIATAMENTE. Respuesta:`, response.data);
      } catch (err) {
        console.error('[Watch.jsx] ❌ Error guardando progreso inicial:', err?.response?.data || err.message);
        // Reintentar una sola vez después de 1 segundo
        setTimeout(() => {
          if (!initialProgressSavedRef.current) {
            console.log('[Watch.jsx] 🔄 Reintentando guardar progreso inicial...');
            saveInitialProgress();
          }
        }, 1000);
      }
    };

    saveInitialProgress();
  }, [itemData, itemId, itemType, currentChapterInfo, isContinueWatching]);

  // Determinar capítulo actual
  useEffect(() => {
    if (!itemData) return;
    
    if (itemData.tipo === 'pelicula' || itemData.tipo === 'movie' || itemType === 'channel') {
      console.log('[Watch] Contenido tipo película/canal, no se requiere currentChapterInfo');
      return;
    }

    // Si ya hay un capítulo seleccionado manualmente, no sobrescribirlo con estado viejo.
    if (currentChapterInfo && !isContinueWatching) {
      return;
    }

    let seasonIdx = 0;
    let chapterIdx = 0;
    let foundChapter = false;

    console.log('[Watch] 🔍 Iniciando búsqueda de capítulo con:', {
      hasSeasons: !!itemData.seasons,
      seasonsLength: itemData.seasons?.length,
      locationState: location.state,
      isContinueWatching,
      watchProgress: itemData.watchProgress
    });

    // 🔥 NUEVO: Prioridad 1 - Chequear si vino desde SeriesChapters (seasonIndex/chapterIndex directo)
    const stateForChapters = (location.state?.seasonIndex !== undefined && location.state?.chapterIndex !== undefined)
      ? location.state
      : continueWatchingState;

    let seasonIndexFromState = stateForChapters?.seasonIndex;
    let chapterIndexFromState = stateForChapters?.chapterIndex;
    
    if (seasonIndexFromState !== undefined && chapterIndexFromState !== undefined) {
      seasonIdx = seasonIndexFromState;
      chapterIdx = chapterIndexFromState;
      if (itemData.seasons?.[seasonIdx]?.chapters?.[chapterIdx]) {
        console.log('[Watch] ✅ Capítulo seleccionado desde SeriesChapters:', { seasonIdx, chapterIdx });
        foundChapter = true;
      }
    }

    // Prioridad 2 - Continuar viendo desde state
    if (!foundChapter && stateForChapters?.continueWatching && seasonIndexFromState !== undefined && chapterIndexFromState !== undefined) {
      seasonIdx = seasonIndexFromState;
      chapterIdx = chapterIndexFromState;
      if (itemData.seasons?.[seasonIdx]?.chapters?.[chapterIdx]) {
        console.log('[Watch] ✅ Cargando desde estado de navegación (continuar viendo):', { seasonIdx, chapterIdx });
        foundChapter = true;
        if (stateForChapters?.startTime !== undefined) {
          setStartTime(stateForChapters.startTime);
        }
      }
    }

    // Prioridad 3 - Desde watchProgress
    if (!foundChapter && isContinueWatching && itemData.watchProgress) {
      console.log('[Watch] Intentando cargar desde watchProgress:', itemData.watchProgress);
      const wp = itemData.watchProgress;
      
      if (typeof wp.lastSeason === 'number' && typeof wp.lastChapter === 'number' && wp.lastSeason >= 0 && wp.lastChapter >= 0) {
        const targetSeason = itemData.seasons[wp.lastSeason];
        if (targetSeason?.chapters?.[wp.lastChapter]) {
          seasonIdx = wp.lastSeason;
          chapterIdx = wp.lastChapter;
          const resumeTime = wp.lastTime ?? wp.progress ?? 0;
          setStartTime(resumeTime);
          console.log('[Watch] ✅ Cargando último episodio visto:', { seasonIdx, chapterIdx, startTime: wp.progress });
          foundChapter = true;
        }
      }
    }

    // Prioridad 4 - Fallback al primer capítulo
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
  }, [itemData, location.state?.seasonIndex, location.state?.chapterIndex, location.state?.continueWatching, continueWatchingState, itemType, isContinueWatching, itemId]);

  // 2) Calcular URL reproducible
  useEffect(() => {
    console.log('[Watch.jsx] INICIANDO CÁLCULO DE URL. Data:', { itemData, currentChapterInfo, loading });

    if (!itemData) {
      console.log('[Watch.jsx] CÁLCULO DETENIDO: No hay itemData.');
      return;
    }
    if (loading) {
      console.log('[Watch.jsx] CÁLCULO DETENIDO: loading es true.');
      return;
    }

    let urlToPlay = null;
    const hasChapters = (itemData.chapters && itemData.chapters.length > 0) || (itemData.seasons && itemData.seasons.length > 0);

    if (hasChapters) {
      console.log('[Watch.jsx] Es una serie. Verificando currentChapterInfo.');
      if (currentChapterInfo) {
        const season = itemData.seasons?.[currentChapterInfo.seasonIndex];
        const chapter = season?.chapters?.[currentChapterInfo.chapterIndex];
        console.log('[Watch.jsx] Info de capítulo:', { season, chapter });
        if (chapter?.url) {
          urlToPlay = chapter.url;
          console.log(`[Watch.jsx] URL de capítulo encontrada: ${maskUrl(urlToPlay)}`);
        } else {
          console.error('[Watch.jsx] ERROR: El capítulo no tiene URL.');
          setError('El capítulo seleccionado no tiene una URL válida.');
          return;
        }
      } else {
        console.log('[Watch.jsx] ESPERANDO currentChapterInfo para la serie.');
        // We do nothing and wait for the chapter effect to run
        return;
      }
    } else {
      console.log('[Watch.jsx] No es una serie. Verificando itemData.url.');
      if (itemData.url) {
        urlToPlay = itemData.url;
        console.log(`[Watch.jsx] URL de película/contenido encontrada: ${maskUrl(urlToPlay)}`);
      } else {
        console.error('[Watch.jsx] ERROR: El contenido no tiene URL.');
        setError(`No se encontró una fuente de video para "${itemData.name}".`);
        return;
      }
    }

    if (urlToPlay) {
      console.log(`[Watch.jsx] Procesando URL con getPlayableUrl: ${maskUrl(urlToPlay)}`);
      const finalUrl = getPlayableUrl({ ...itemData, url: urlToPlay }, null);
      console.log(`[Watch.jsx] URL final obtenida: ${maskUrl(finalUrl)}`);
      
      if (finalUrl) {
        setVideoUrl(finalUrl);
      } else {
        console.error('[Watch.jsx] ERROR: getPlayableUrl devolvió una URL vacía.');
        setError('No se pudo procesar la URL del video para la reproducción.');
      }
    } else {
        // This case should not be reached due to the returns above, but as a safeguard:
        console.error('[Watch.jsx] ERROR INESPERADO: No se pudo determinar ninguna URL para reproducir.');
        setError('Error inesperado al intentar obtener el video.');
    }

  }, [itemData, currentChapterInfo, loading]);

  useEffect(() => {
    if (itemType === 'channel') {
      setChannelPlaybackIssue(null);
      setChannelSearch('');
      setIsChannelPickerOpen(false);
    }
  }, [itemType, itemId, videoUrl]);

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

    // --- INICIO DE DEPURACIÓN ---
    console.log('--- DEBUG: ESTADO ANTES DE REPRODUCIR ---');
    console.log({
      isElectronEnv,
      videoUrl,
      bounds,
      startTime,
      itemData,
      currentChapterInfo
    });
    // --- FIN DE DEPURACIÓN ---

    if (!videoUrl || !bounds || !isElectronEnv) {
      if (isElectronEnv) {
        console.log('--- DEBUG: Omitiendo MPV. Razón:', { hasVideoUrl: !!videoUrl, hasBounds: !!bounds });
      }
      return;
    }

    const initializeMPV = async (retryCount = 0) => {
      suppressMpvClosedRef.current = true;
      try {
        console.log('[Watch.jsx] Deteniendo MPV anterior antes de iniciar nuevo...');
        await window.electronMPV.stop();
        await new Promise(resolve => setTimeout(resolve, itemType === 'channel' ? 220 : 700));
        
        console.log(`--- DEBUG: Intentando reproducir con MPV... URL: ${maskUrl(videoUrl)}`);
        const mpvTitle = buildMpvDisplayTitle();
        const result = await window.electronMPV.play(videoUrl, bounds, {
          startTime,
          title: mpvTitle,
          videoId: itemData?.id || itemId
        });
        console.log('--- DEBUG: Resultado de window.electronMPV.play ---', result);

        if (!result.success) {
          throw new Error(result.error || 'Error desconocido al iniciar MPV');
        }

        setError(null);
        setChannelPlaybackIssue(null);
        playbackStartTsRef.current = Date.now();
      } catch (err) {
        console.error('[Watch.jsx] Error al iniciar MPV:', err);
        
        if (err.message.includes('código: 1') && retryCount < 2) {
          console.log(`[Watch.jsx] Reintentando reproducción (intento ${retryCount + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return initializeMPV(retryCount + 1);
        }
        
        setError(`Error al iniciar el reproductor: ${err.message}`);
        if (itemType === 'channel') {
          setChannelPlaybackIssue('La señal del canal no se pudo iniciar. Usa "Recargar canal".');
        }
      } finally {
        setTimeout(() => {
          suppressMpvClosedRef.current = false;
        }, 1200);
      }
    };

    initializeMPV();

    const handleMpvError = (event, message) => {
      console.error('[Watch.jsx] MPV Error:', message);
      setError(`Error del reproductor: ${message}`);
      if (itemType === 'channel') {
        setChannelPlaybackIssue('La señal del canal tuvo un error. Usa "Recargar canal".');
      }
    };

    const handleTimePos = (event, time) => {
      const t = Number(time);
      if (Number.isFinite(t) && t > 0) {
        currentTimeRef.current = t;
      }
    };

    const handleMpvClosed = (event, data = {}) => {
      if (suppressMpvClosedRef.current) {
        return;
      }
      if (itemType !== 'channel') {
        return;
      }
      if (isUnmountingRef.current || isNavigatingAwayRef.current) {
        return;
      }

      const closeCode = data?.code;
      const detail = Number.isFinite(closeCode)
        ? ` (código ${closeCode})`
        : '';
      setChannelPlaybackIssue(`La señal del canal se detuvo${detail}. Usa "Recargar canal".`);
    };
    
    if (window.electronAPI) {
      window.electronAPI.on('mpv-error', handleMpvError);
      window.electronAPI.on('mpv-time-pos', handleTimePos);
      window.electronAPI.on('mpv-closed', handleMpvClosed);
    }

    return () => {
      if (window.electronMPV) {
        suppressMpvClosedRef.current = true;
        window.electronMPV.stop().catch(err => {
          console.error('[Watch.jsx] Error al detener MPV en cleanup:', err);
        });
        setTimeout(() => {
          suppressMpvClosedRef.current = false;
        }, 1200);
      }
      playbackStartTsRef.current = null;
      if (window.electronAPI) {
        window.electronAPI.removeListener('mpv-error', handleMpvError);
        window.electronAPI.removeListener('mpv-time-pos', handleTimePos);
        window.electronAPI.removeListener('mpv-closed', handleMpvClosed);
      }
    };
  }, [videoUrl, bounds, startTime, itemType, itemId, itemData?.id]);

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

  const handleBackNavigation = () => {
    console.log('[Watch.jsx] handleBackNavigation: Iniciando navegación hacia atrás');
    isUnmountingRef.current = true;
    isNavigatingAwayRef.current = true;
    setVideoUrl("");
    setItemData(null);
    
    // Detener VLC y background playback de forma asincrónica (sin esperar)
    try {
      if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
        backgroundPlaybackService.stopPlayback().catch(err => {
          console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo backgroundPlayback:', err);
        });
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error en backgroundPlayback:', err);
    }

    try {
      if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.stopVideo === 'function') {
        window.VideoPlayerPlugin.stopVideo().catch(err => {
          console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo VLC plugin:', err);
        });
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error en VideoPlayerPlugin:', err);
    }

    const fromLocation = location.state?.from;
    const fromSection = location.state?.fromSection;
    
    console.log('[Watch.jsx] fromSection:', fromSection, 'fromLocation:', fromLocation);
    
    if (fromLocation) {
      navigate(fromLocation);
    } else if (fromSection === 'tv') {
      // Regresar a TV en vivo con categoría restaurada
      const selectedCategory = location.state?.selectedCategory || 'Todos';
      const searchTerm = location.state?.searchTerm || '';
      
      console.log('[Watch.jsx] Navegando a /live-tv con estado:', { selectedCategory, searchTerm });
      navigate('/live-tv', { 
        state: { 
          selectedCategory,
          searchTerm
        } 
      });
    } else if (fromSection === 'movies' || fromSection === 'peliculas') {
      // Regresar a películas con filtros restaurados
      const sectionKey = location.state?.sectionKey;
      const genre = location.state?.genre || 'Todas';
      const searchTerm = location.state?.searchTerm || '';
      
      if (sectionKey) {
        navigate('/peliculas', { 
          state: { 
            selectedMainSectionKey: sectionKey,
            selectedGenre: genre,
            searchTerm
          } 
        });
      } else {
        navigate('/peliculas');
      }
    } else if (fromSection === 'series') {
      navigate('/series');
    } else {
      console.log('[Watch.jsx] No fromSection o fromLocation, navegando a home');
      navigate('/');
    }
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setAccessModalData(null);
    handleBackNavigation();
  };

  // 🔥 NUEVO: Manejar el botón atrás del dispositivo en Watch.jsx
  // 🔥 IMPORTANTE: Usar ref para evitar reconfiguraciones cuando cambia location.state
  const handleBackNavigationRef = useRef(handleBackNavigation);
  
  useEffect(() => {
    handleBackNavigationRef.current = handleBackNavigation;
  }, [handleBackNavigation]);

  useEffect(() => {
    let handleRef = null;
    let unsub = null;

    const setupBackButton = async () => {
      try {
        if (CapacitorApp.addListener) {
          const handle = await CapacitorApp.addListener('backButton', () => {
            console.log('[Watch.jsx] 🔥 Back button presionado en Watch - navegando hacia atrás');
            handleBackNavigationRef.current();
          });
          handleRef = handle;
          if (handle && typeof handle.remove === 'function') {
            unsub = () => handle.remove();
          } else if (typeof handle === 'function') {
            unsub = handle;
          }
        }
      } catch (err) {
        console.warn('[Watch.jsx] Error al configurar backButton listener:', err);
      }
    };

    setupBackButton();

    return () => {
      try {
        if (typeof unsub === 'function') {
          unsub();
        } else if (handleRef && typeof handleRef.remove === 'function') {
          handleRef.remove();
        }
      } catch (err) {
        console.warn('[Watch.jsx] Error removiendo backButton listener:', err);
      }
    };
  }, []); // ✅ Dependencias vacías - se configura una sola vez

  const handleNextEpisode = (seasonIndex, chapterIndex) => {
    const targetKey = `${seasonIndex}:${chapterIndex}`;
    const now = Date.now();
    if (
      nextEpisodeNavigationRef.current.key === targetKey &&
      now - nextEpisodeNavigationRef.current.ts < 2500
    ) {
      console.log('[Watch.jsx] handleNextEpisode duplicado ignorado:', targetKey);
      return;
    }
    nextEpisodeNavigationRef.current = { key: targetKey, ts: now };
    navigate(`/watch/${itemType}/${itemId}`, {
      replace: true,
      state: { seasonIndex, chapterIndex, continueWatching: true }
    });
  };

  const persistManualEpisodeSelection = (seasonIndex, chapterIndex) => {
    if (!itemId || itemType === 'channel') return;

    // Guardado inmediato para que Continuar viendo respete el capitulo elegido,
    // incluso si el usuario sale antes del siguiente guardado periodico.
    const progressPayload = {
      lastSeason: seasonIndex,
      lastChapter: chapterIndex,
      lastTime: 6,
      completed: false
    };

    axiosInstance.put(`/api/videos/${itemId}/progress`, progressPayload)
      .then(() => {
        setItemData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            watchProgress: {
              ...(prev.watchProgress || {}),
              ...progressPayload
            }
          };
        });
        try {
          localStorage.setItem(`videoProgress_${itemId}`, JSON.stringify({ progress: progressPayload.lastTime }));
        } catch (e) {
          console.warn('[Watch.jsx] No se pudo actualizar cache local de progreso:', e);
        }
      })
      .catch((err) => {
        console.warn('[Watch.jsx] No se pudo guardar progreso al seleccionar capitulo:', err?.message || err);
      });
  };

  const handleChapterSelect = (seasonIndex, chapterIndex) => {
    const season = itemData?.seasons?.[seasonIndex];
    const chapter = season?.chapters?.[chapterIndex];

    if (!chapter) {
      console.warn('[Watch.jsx] handleChapterSelect: capitulo invalido', { seasonIndex, chapterIndex });
      return;
    }
    persistManualEpisodeSelection(seasonIndex, chapterIndex);
    setIsContinueWatching(false);
    setContinueWatchingState(null);
    setStartTime(0);
    setVideoUrl('');
    setCurrentChapterInfo({ seasonIndex, chapterIndex });
  };

  const handleReturnToChannelList = () => {
    console.log('[Watch.jsx] Retornando a lista de canales');
    isUnmountingRef.current = true;
    isNavigatingAwayRef.current = true;
    setVideoUrl("");
    setItemData(null);
    
    try {
      if (backgroundPlaybackService?.stopPlayback) {
        backgroundPlaybackService.stopPlayback().catch(() => {});
      }
      if (window.VideoPlayerPlugin?.stopVideo) {
        window.VideoPlayerPlugin.stopVideo().catch(() => {});
      }
    } catch (err) {
      console.warn('Error stopping playback:', err);
    }
    
    const selectedCategory = location.state?.selectedCategory || 'Todos';
    const searchTerm = location.state?.searchTerm || '';
    
    navigate('/live-tv', { 
      state: { 
        selectedCategory,
        searchTerm
      } 
    });
  };

  const handleReloadChannel = async () => {
    if (itemType !== 'channel' || isReloadingChannel) return;

    setIsReloadingChannel(true);
    setChannelPlaybackIssue(null);
    setError(null);
    suppressMpvClosedRef.current = true;

    try {
      if (window.electronMPV && videoUrl && bounds) {
        await window.electronMPV.stop().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 350));

        const result = await window.electronMPV.play(videoUrl, bounds, {
          startTime: 0,
          title: buildMpvDisplayTitle(),
          videoId: itemData?.id || itemId
        });

        if (!result?.success) {
          throw new Error(result?.error || 'Fallo al recargar MPV');
        }
        playbackStartTsRef.current = Date.now();
      } else {
        setReloadKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('[Watch.jsx] Error recargando canal:', err);
      setError(`No se pudo recargar el canal: ${err.message}`);
      setChannelPlaybackIssue('No se pudo restablecer la señal. Intenta nuevamente.');
    } finally {
      setIsReloadingChannel(false);
      setTimeout(() => {
        suppressMpvClosedRef.current = false;
      }, 1200);
    }
  };

  const handleSelectChannel = (targetChannel) => {
    if (itemType !== 'channel') return;
    if (!targetChannel?.id || String(targetChannel.id) === String(itemId)) {
      setIsChannelPickerOpen(false);
      return;
    }

    suppressMpvClosedRef.current = true;
    setTimeout(() => {
      suppressMpvClosedRef.current = false;
    }, 1200);

    setChannelPlaybackIssue(null);
    setError(null);
    setLoading(true);
    setVideoUrl('');
    setItemData(null);
    setIsChannelPickerOpen(false);
    setChannelSearch('');

    const nextState = {
      ...(location.state || {}),
      channelName: targetChannel.name,
      selectedCategory: location.state?.selectedCategory || targetChannel.section || 'Todos',
      continueWatching: false,
      startTime: 0
    };
    delete nextState.seasonIndex;
    delete nextState.chapterIndex;

    navigate(`/watch/channel/${targetChannel.id}`, {
      replace: true,
      state: nextState
    });
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
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
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
              setChannelPlaybackIssue(null);
              if (window.electronMPV && videoUrl && bounds) {
                suppressMpvClosedRef.current = true;
                window.electronMPV.stop()
                  .then(() => new Promise(resolve => setTimeout(resolve, itemType === 'channel' ? 220 : 700)))
                  .then(() => window.electronMPV.play(videoUrl, bounds, {
                    startTime,
                    title: buildMpvDisplayTitle(),
                    videoId: itemData?.id || itemId
                  }))
                  .then((result) => {
                    if (!result?.success) {
                      throw new Error(result?.error || 'Fallo al reintentar reproducción');
                    }
                  })
                  .catch(err => {
                    console.error('[Watch.jsx] Error al reintentar reproducción:', err);
                    setError(`Error al reintentar: ${err.message}`);
                  })
                  .finally(() => {
                    setTimeout(() => {
                      suppressMpvClosedRef.current = false;
                    }, 1200);
                  });
              } else if (itemType === 'channel') {
                handleReloadChannel();
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
  const normalizedChannelSearch = channelSearch.trim().toLowerCase();
  const filteredChannelList = normalizedChannelSearch
    ? channelList.filter((channel) => (channel.name || '').toLowerCase().includes(normalizedChannelSearch))
    : channelList;

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
            : `url(./fondo.png)`,
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
                  key={`${itemData.id}-${currentChapterInfo?.seasonIndex}-${currentChapterInfo?.chapterIndex}`}
                  url={videoUrl}
                  itemId={itemData.id}
                  startTime={startTime}
                  initialAutoplay={true}
                  title={itemData.name}
                  seasons={itemData.seasons}
                  currentChapterInfo={currentChapterInfo}
                  onNextEpisode={itemData.tipo !== 'pelicula' && itemData.tipo !== 'movie' && itemData.tipo !== 'channel' ? handleNextEpisode : undefined}
                  isUnmountingRef={isUnmountingRef}
                  isNavigatingAwayRef={isNavigatingAwayRef}
                  onReturnToChannelList={itemType === 'channel' ? handleReturnToChannelList : undefined}
                  disableProgressTracking={itemType === 'channel'}
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

            {itemType === 'channel' && (
              <div className="w-full max-w-5xl mx-auto mb-8">
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-black/45 px-4 py-3 backdrop-blur-sm">
                  <button
                    onClick={() => setIsChannelPickerOpen(true)}
                    disabled={channelList.length === 0}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Seleccionar canal
                  </button>
                  <button
                    onClick={handleReloadChannel}
                    disabled={isReloadingChannel}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isReloadingChannel ? 'Recargando...' : 'Recargar canal'}
                  </button>
                  <span className="text-xs text-gray-300">
                    {currentChannelIndex >= 0 && channelList.length > 0
                      ? `Canal ${currentChannelIndex + 1} de ${channelList.length}: ${itemData?.name || ''}`
                      : 'Canal actual'}
                  </span>
                </div>
                {channelPlaybackIssue && (
                  <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 text-center">
                    {channelPlaybackIssue}
                  </div>
                )}
                {isChannelPickerOpen && (
                  <div className="mt-3 rounded-xl border border-indigo-400/30 bg-black/85 p-3 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={channelSearch}
                        onChange={(e) => setChannelSearch(e.target.value)}
                        placeholder="Buscar canal..."
                        className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                      />
                      <button
                        onClick={() => setIsChannelPickerOpen(false)}
                        className="px-3 py-2 rounded-md text-sm bg-zinc-800 hover:bg-zinc-700 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                      {filteredChannelList.length > 0 ? (
                        filteredChannelList.map((channel) => {
                          const isCurrent = String(channel.id) === String(itemId);
                          return (
                            <button
                              key={String(channel.id)}
                              onClick={() => handleSelectChannel(channel)}
                              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                                isCurrent
                                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                                  : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100'
                              }`}
                            >
                              {channel.name}
                              {isCurrent ? ' (actual)' : ''}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-sm text-zinc-300 px-2 py-4 text-center">
                          No se encontraron canales.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  onSelectChapter={handleChapterSelect}
                />}
              </DynamicCard>
            )}

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

            {/* Recomendaciones inteligentes basadas en similitud */}
            <SmartRecommendations
              recommendations={smartRecommendations}
              theme={visualTheme}
              loading={smartRecommendationsLoading}
              error={smartRecommendationsError}
              onRetry={retrySmartRecommendations}
              title="También te podría gustar"
              maxItems={6}
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
