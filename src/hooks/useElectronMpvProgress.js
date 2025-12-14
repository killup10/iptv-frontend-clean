import { useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';


// Hook to listen to mpv time-pos events exposed by preload (window.electronAPI)
// and forward progress to backend for the given videoId.
export default function useElectronMpvProgress(videoId, onNextEpisode, seasons, currentChapterInfo, opts = {}) {
  const lastSentRef = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!videoId) return;
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.on) return;

    const INTERVAL_MS = optsRef.current.intervalMs || 20000;

    const handler = async (timePos) => {
      try {
        const now = Date.now();
        if (now - lastSentRef.current < INTERVAL_MS) return; // throttle

        const lastTime = Math.floor(Number(timePos) || 0);
        
        // Preparar datos de progreso con capítulo y temporada si está disponible
        const progressData = { lastTime };
        
        if (currentChapterInfo) {
          progressData.lastChapter = currentChapterInfo.chapterIndex;
          progressData.lastSeason = currentChapterInfo.seasonIndex;
        }
        
        await axiosInstance.put(`/api/videos/${videoId}/progress`, progressData);
        lastSentRef.current = Date.now();
        console.debug('[useElectronMpvProgress] Progreso enviado:', progressData);
      } catch (e) {
        console.warn('[useElectronMpvProgress] failed to send progress', e?.message || e);
      }
    };

    // subscribe to mpv time-pos event
    try {
      window.electronAPI.on('mpv-time-pos', handler);
    } catch (e) {
      console.warn('[useElectronMpvProgress] could not subscribe to mpv-time-pos', e?.message || e);
    }

    // also listen to mpv-ended if exposed to mark completed
    const endedHandler = async (data) => {
      console.log('[useElectronMpvProgress] ✓✓✓ mpv-ended RECIBIDO:', data);
      try {
        const progressData = { completed: true };
        
        if (currentChapterInfo) {
          progressData.lastChapter = currentChapterInfo.chapterIndex;
          progressData.lastSeason = currentChapterInfo.seasonIndex;
        }
        
        console.log('[useElectronMpvProgress] Guardando progreso como completado:', progressData);
        await axiosInstance.put(`/api/videos/${videoId}/progress`, progressData);
        console.log('[useElectronMpvProgress] ✓ Progreso guardado como completado');
        
        if (onNextEpisode && seasons && currentChapterInfo) {
          const { seasonIndex, chapterIndex } = currentChapterInfo;
          const currentSeason = seasons[seasonIndex];
          
          if (currentSeason && currentSeason.chapters.length > chapterIndex + 1) {
            // Next chapter in the same season
            console.log('[useElectronMpvProgress] 🎬 Navegando a siguiente capítulo:', seasonIndex, chapterIndex + 1);
            onNextEpisode(seasonIndex, chapterIndex + 1);
          } else if (seasons.length > seasonIndex + 1) {
            // First chapter of the next season
            console.log('[useElectronMpvProgress] 🎬 Navegando a primera capítulo siguiente temporada:', seasonIndex + 1, 0);
            onNextEpisode(seasonIndex + 1, 0);
          }
        }
      } catch (e) {
        console.warn('[useElectronMpvProgress] failed to send completed', e?.message || e);
      }
    };

    try {
      window.electronAPI.on('mpv-ended', endedHandler);
    } catch (e) {
      console.warn('[useElectronMpvProgress] could not subscribe to mpv-ended', e?.message || e);
    }

    // Listen to mpv-closed to capture final progress when user closes the video
    const closedHandler = async ({ code, signal, url }) => {
      try {
        console.log('[useElectronMpvProgress] MPV cerrado, capturando progreso final');
        // El progreso ya fue enviado periódicamente, pero podemos asegurar que se sincronice
        // Esta es una buena oportunidad para confirmar el último progreso conocido
      } catch (e) {
        console.warn('[useElectronMpvProgress] failed on mpv-closed', e?.message || e);
      }
    };

    try {
      window.electronAPI.on('mpv-closed', closedHandler);
    } catch (e) {
      // optional
    }

    return () => {
      try { window.electronAPI.removeListener && window.electronAPI.removeListener('mpv-time-pos', handler); } catch (e) {}
      try { window.electronAPI.removeListener && window.electronAPI.removeListener('mpv-ended', endedHandler); } catch (e) {}
      try { window.electronAPI.removeListener && window.electronAPI.removeListener('mpv-closed', closedHandler); } catch (e) {}
    };
  }, [videoId, onNextEpisode, seasons, currentChapterInfo]);
}
