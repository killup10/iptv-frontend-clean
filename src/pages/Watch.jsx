import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPlayableUrl } from "@/utils/playerUtils.js";
import axiosInstance from "@/utils/axiosInstance.js";
import SeriesChapters from "@/components/SeriesChapters.jsx";
import VideoPlayer from "@/components/VideoPlayer.jsx";
import { getUserProgress, updateUserProgress } from "@/utils/api.js";
import { throttle } from 'lodash'; // Se necesita lodash para throttling

import ContentAccessModal from '@/components/ContentAccessModal.jsx';

export function Watch() {
  const { itemType, itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [bounds, setBounds] = useState(null);
  
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


  // --- 2. USEREF PARA GUARDAR LA ÚLTIMA POSICIÓN Y EVITAR RE-RENDERS ---
  const lastSavedTimeRef = useRef(0);
  // Mantener el último tiempo reportado por MPV para permitir un guardado final al salir
  const currentTimeRef = useRef(0);
  // Timestamp de inicio de reproducción para estimar progreso si no recibimos eventos de MPV
  const playbackStartTsRef = useRef(null);

  // --- 3. FUNCIÓN PARA GUARDAR PROGRESO CON THROTTLE ---
  const throttledSaveProgress = useRef(
    throttle((currentTime) => {
      if (!itemId || itemType === 'channel') return;

      if (Math.abs(currentTime - lastSavedTimeRef.current) > 4) {
        console.log(`[Watch.jsx] Guardando progreso... Tiempo: ${currentTime}`);
        updateUserProgress(itemId, currentTime);
        lastSavedTimeRef.current = currentTime;
      }
    }, 5000)
  ).current;



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
        } else if (["movie", "serie", "series"].includes(itemType)) {
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
          // Aplanar capítulos para la lógica de reproducción y comprobaciones
          chapters: (data.seasons || []).flatMap(season => season.chapters || []),
          watchProgress: data.watchProgress || null
        };


        if (process.env.NODE_ENV === "development") {
          console.log("[Watch.jsx] Datos normalizados:", normalizedData);
        }
        setItemData(normalizedData);
      } catch (err) {
        // Manejar específicamente errores 403 relacionados con planes
        if (err.response?.status === 403) {
          const errorData = err.response.data || {};
          
          // SIEMPRE mostrar modal personalizado para errores 403
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
          // Otros tipos de errores
          setError(`No se pudo cargar el contenido. ${err.response?.data?.error || err.message || "Error desconocido."}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchItemDetails();
  }, [itemId, itemType, reloadKey, useTrial]);

  // Cargar progreso guardado si no viene desde el estado
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


  // 2) Cuando tenemos itemData, calculamos la URL reproducible
  useEffect(() => {
    if (!itemData) return;
    if (process.env.NODE_ENV === "development") {
      console.log("[Watch.jsx] itemData recibido:", itemData);
    }
    const M3U8_PROXY_BASE_URL = null;

    let finalUrl = "";
    // Detectar automáticamente si el contenido tiene capítulos/seasons.
    const hasChapters = (itemData.chapters && itemData.chapters.length > 0) || (itemData.seasons && itemData.seasons.length > 0);
    if (hasChapters) {
      const chapterIndex = location.state?.chapterIndex || 0;
      const chapter = itemData.chapters?.[chapterIndex] || (itemData.seasons?.[0]?.chapters?.[chapterIndex]);
      if (chapter?.url) {
        finalUrl = getPlayableUrl({ ...itemData, url: chapter.url }, M3U8_PROXY_BASE_URL);
      } else {
        setError("El capítulo seleccionado no tiene una URL válida.");
        return;
      }
    } else if (itemData.url) {
      finalUrl = getPlayableUrl(itemData, M3U8_PROXY_BASE_URL);
    }
    setVideoUrl(finalUrl);
  }, [itemData, location.state?.chapterIndex]);

  // 3) Cuando cambie videoUrl, medimos las bounds de videoAreaRef
  useEffect(() => {
    if (videoUrl && videoAreaRef.current) {
      const rect = videoAreaRef.current.getBoundingClientRect();
      if (process.env.NODE_ENV === "development") {
        console.log('[Watch.jsx] getBoundingClientRect →', rect);
      }
      setBounds({
        x: Math.floor(rect.left),
        y: Math.floor(rect.top),
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    }
  }, [videoUrl]);

  // 4) Iniciar MPV y SUSCRIBIRSE a eventos de progreso (solo para Electron)
  useEffect(() => {
    const isElectronEnv = typeof window !== "undefined" && window.electronMPV;
    if (!videoUrl || !bounds || !isElectronEnv) return;

    const initializeMPV = async (retryCount = 0) => {
      try {
        // Primero, asegurar que cualquier instancia anterior de MPV esté detenida
        console.log('[Watch.jsx] Deteniendo MPV anterior antes de iniciar nuevo...');
        await window.electronMPV.stop();
        
        // Pausa más larga para asegurar que MPV se haya cerrado completamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (process.env.NODE_ENV === "development") {
          console.log('[Watch.jsx] Iniciando MPV con URL:', videoUrl);
        }
        
        const result = await window.electronMPV.play(videoUrl, bounds, { startTime });
        if (!result.success) {
          throw new Error(result.error || 'Error desconocido al iniciar MPV');
        }

        // Si llegamos aquí, la reproducción se inició correctamente
        setError(null);
        // Marcar timestamp de inicio para fallback de progreso
        playbackStartTsRef.current = Date.now();
        
      } catch (err) {
        console.error('[Watch.jsx] Error al iniciar MPV:', err);
        
        // Si es un error de código 1 y no hemos excedido los reintentos, intentar de nuevo
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

    // --- LÓGICA PARA ESCUCHAR EL TIEMPO ---
    const handleTimePos = (event, time) => {
        // 'time' desde MPV puede llegar como número o string; normalizamos
        const t = Number(time);
        if (Number.isFinite(t) && t > 0) {
            // Guardar último tiempo observado para hacer un flush al salir
            currentTimeRef.current = t;
            if (process.env.NODE_ENV === "development") {
              console.log('[Watch.jsx] mpv-time-pos →', t);
            }
            // Guardado periódico (con throttle)
            throttledSaveProgress(t);
        } else {
            if (process.env.NODE_ENV === "development") {
              console.warn('[Watch.jsx] mpv-time-pos inválido:', time, 'typeof=', typeof time);
            }
        }
    };
    
    if (window.electronAPI) {
      console.log('[Watch.jsx] Suscribiendo a eventos MPV (error y time-pos)...');
      window.electronAPI.on('mpv-error', handleMpvError);
      // Suscribirse al evento que notifica la posición del tiempo
      window.electronAPI.on('mpv-time-pos', handleTimePos); 
    }

    return () => {
      console.log('[Watch.jsx] Limpiando recursos MPV...');
      // Hacer flush del throttling y enviar un guardado final del progreso si corresponde
      try {
        if (throttledSaveProgress && typeof throttledSaveProgress.flush === 'function') {
          throttledSaveProgress.flush();
        }
        const finalTime = currentTimeRef.current || 0;
        if (itemId && itemType !== 'channel' && finalTime > (lastSavedTimeRef.current || 0)) {
          if (process.env.NODE_ENV === "development") {
            console.log('[Watch.jsx] Guardado final de progreso en cleanup. Tiempo:', finalTime);
          }
          // No await: el cleanup no es async; registrar mejor-esfuerzo
          updateUserProgress(itemData?.id || itemId, finalTime).catch(err => {
            console.error('[Watch.jsx] Error guardando progreso final:', err);
          });

          lastSavedTimeRef.current = finalTime;
        }
      } catch (e) {
        console.warn('[Watch.jsx] No se pudo hacer flush de progreso en cleanup:', e);
      }

      if (window.electronMPV) {
        window.electronMPV.stop().catch(err => {
          console.error('[Watch.jsx] Error al detener MPV en cleanup:', err);
        });
      }
      // Resetear timestamp de inicio
      playbackStartTsRef.current = null;
      if (window.electronAPI) {
        // Limpiar los listeners al desmontar el componente
        window.electronAPI.removeListener('mpv-error', handleMpvError);
        window.electronAPI.removeListener('mpv-time-pos', handleTimePos);
      }
    };
  }, [videoUrl, bounds, startTime, throttledSaveProgress]); // Añadir dependencias



  // 5) Suscribirse a petición de sincronización de bounds
  useEffect(() => {
    const isElectronEnv = typeof window !== "undefined" && window.electronMPV;
    if (!bounds || !isElectronEnv) return;

    if (process.env.NODE_ENV === "development") {
      console.log('[Watch.jsx] Registrando handler onRequestVideoBoundsSync');
    }

    const removeListener = window.electronMPV.onRequestVideoBoundsSync(() => {
      if (process.env.NODE_ENV === "development") {
        console.log('[Watch.jsx] onRequestVideoBoundsSync: reenviando bounds', bounds);
      }
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
      if (process.env.NODE_ENV === "development") {
        console.log('[Watch.jsx] Eliminando handler onRequestVideoBoundsSync');
      }
      removeListener();
    };
  }, [bounds]);

  // Funciones del modal de acceso
  const closeAccessModal = () => {
    setShowAccessModal(false);
    setAccessModalData(null);
    // Navegar de vuelta después de cerrar el modal
    navigate(-1);
  };

  const handleProceedWithTrial = () => {
    // Si hay tiempo de prueba disponible, cerrar modal y reintentar carga
    if (accessModalData?.trialMinutesRemaining > 0) {
      setShowAccessModal(false);
      setAccessModalData(null);
      // Marcar uso de prueba para este contenido y reintentar fetch con ?useTrial=true
      setUseTrial(true);
      setReloadKey((prev) => prev + 1);
    }
  };

  // --- RENDERIZADO (CÓDIGO RESTAURADO) ---
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  // Si hay un error de acceso (403) mostramos el modal aunque itemData sea null
  if (showAccessModal) {
    return (
      <div className="bg-zinc-900 min-h-screen flex flex-col pt-16">
        <div className="container mx-auto px-2 sm:px-4 py-4 flex-grow flex flex-col">
          <div className="mb-4 flex items-center justify-between w-full max-w-screen-xl mx-auto">
            <button
              onClick={() => navigate(-1)}
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

  // Mostrar error pero mantener el contenido visible
  const showError = error && (
    <div className="w-full max-w-screen-xl mx-auto mb-4">
      <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-4 rounded-lg">
        <div className="whitespace-pre-wrap">{error}</div>
        {!error.includes('plan') && (
          <button
            onClick={() => {
              setError(null);
              // Re-intentar reproducción
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
          onClick={() => navigate(-1)}
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
          onClick={() => navigate(-1)}
          className="block mx-auto mt-4 bg-gray-700 px-3 py-1 rounded"
        >
          Volver
        </button>
      </div>
    );

  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col pt-16">
      <div className="container mx-auto px-2 sm:px-4 py-4 flex-grow flex flex-col">
        {showError}
        <div className="mb-4 flex items-center justify-between w-full max-w-screen-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm transition-colors"
          >
            ← Volver
          </button>
        </div>

        <div className="flex-grow flex flex-col items-center">
          <div className="w-full max-w-screen-xl">
            <h1 className="text-2xl font-bold text-white mb-4">
              {itemData.name}
            </h1>
            
            {itemData.chapters?.length > 0 && location.state?.chapterIndex !== undefined && (
              <p className="text-sm text-gray-400 mb-2">
                Episodio: {itemData.chapters[location.state.chapterIndex]?.title || "Sin título"}
              </p>
            )}
            
            <div
              ref={videoAreaRef}
              className="w-[70%] mx-auto mb-6 bg-black rounded-lg overflow-hidden"
              style={{ position: "relative", aspectRatio: "16/9" }}
            >
              {videoUrl ? (
                <VideoPlayer 
                  url={videoUrl}
                  itemId={itemData.id}
                  startTime={startTime}
                  initialAutoplay={true}
                  title={itemData.name}
                  chapters={itemData.chapters}
                />

              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  Cargando video...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 w-full max-w-screen-xl">
            {itemData.description && (
              <div className="p-4 bg-zinc-800 rounded-lg text-gray-300">
                <h3 className="text-xl font-semibold text-white mb-2">Descripción</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {itemData.description}
                </p>
              </div>
            )}

            {(
              itemData.tipo !== 'pelicula' &&
              itemData.tipo !== 'movie' &&
              itemData.tipo !== 'channel' &&
              ( (itemData.seasons && itemData.seasons.length > 0) || (itemData.chapters && itemData.chapters.length > 0) )
            ) && (
              <SeriesChapters
                seasons={itemData.seasons}
                serieId={itemData.id}
                currentChapter={location.state?.chapterIndex || 0}
                watchProgress={itemData.watchProgress}
                currentSeason={location.state?.seasonIndex}
              />
            )}


          </div>
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

export default Watch;
