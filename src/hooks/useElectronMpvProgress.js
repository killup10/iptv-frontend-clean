import { useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';

// Listen to mpv events from preload and report progress with safe throttling.
// Critical behavior: next-episode navigation must never be blocked by network failures.
export default function useElectronMpvProgress(videoId, onNextEpisode, seasons, currentChapterInfo, opts = {}) {
  const lastAttemptRef = useRef(0);
  const lastTimeRef = useRef(0);
  const endedHandledRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const nextEpisodeTimeoutRef = useRef(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (optsRef.current?.enabled === false) return;
    if (!videoId) return;
    if (typeof window === 'undefined' || !window.electronAPI?.on) return;

    endedHandledRef.current = false;
    lastAttemptRef.current = 0;
    lastTimeRef.current = 0;
    if (nextEpisodeTimeoutRef.current) {
      clearTimeout(nextEpisodeTimeoutRef.current);
      nextEpisodeTimeoutRef.current = null;
    }

    const INTERVAL_MS = optsRef.current.intervalMs || 20000;
    const REQUEST_TIMEOUT_MS = optsRef.current.requestTimeoutMs || 12000;

    const saveProgress = async (progressData, { force = false, reason = 'progress' } = {}) => {
      if (!videoId || !progressData) return false;
      if (saveInFlightRef.current) return false;

      const now = Date.now();
      if (!force && now - lastAttemptRef.current < INTERVAL_MS) return false;

      // Throttle by attempts, not only by success, to avoid request storms on failures.
      lastAttemptRef.current = now;
      saveInFlightRef.current = true;

      try {
        await axiosInstance.put(`/api/videos/${videoId}/progress`, progressData, {
          timeout: REQUEST_TIMEOUT_MS
        });
        return true;
      } catch (e) {
        console.warn(`[useElectronMpvProgress] failed to send ${reason}`, e?.message || e);
        return false;
      } finally {
        saveInFlightRef.current = false;
      }
    };

    const buildProgressPayload = (extra = {}) => {
      const payload = { ...extra };
      if (currentChapterInfo) {
        payload.lastChapter = currentChapterInfo.chapterIndex;
        payload.lastSeason = currentChapterInfo.seasonIndex;
      }
      return payload;
    };

    const handler = (event, timePos) => {
      if (optsRef.current?.enabled === false) return;
      const rawTimePos = timePos !== undefined ? timePos : event;
      const lastTime = Math.floor(Number(rawTimePos) || 0);
      if (!Number.isFinite(lastTime) || lastTime <= 0) return;

      lastTimeRef.current = lastTime;
      void saveProgress(buildProgressPayload({ lastTime }), { reason: 'progress' });
    };

    const getNextEpisodeTarget = () => {
      if (!onNextEpisode || !seasons || !currentChapterInfo) return null;

      const { seasonIndex, chapterIndex } = currentChapterInfo;
      const currentSeason = seasons[seasonIndex];

      if (currentSeason && currentSeason.chapters.length > chapterIndex + 1) {
        return { seasonIndex, chapterIndex: chapterIndex + 1 };
      }
      if (seasons.length > seasonIndex + 1) {
        return { seasonIndex: seasonIndex + 1, chapterIndex: 0 };
      }
      return null;
    };

    const endedHandler = (event, payload = {}) => {
      if (optsRef.current?.enabled === false) return;
      const eventVideoId = payload?.videoId;
      if (eventVideoId && eventVideoId !== videoId) {
        console.log('[useElectronMpvProgress] mpv-ended ignorado (videoId no coincide):', {
          expected: videoId,
          received: eventVideoId
        });
        return;
      }
      if (endedHandledRef.current) {
        console.log('[useElectronMpvProgress] mpv-ended duplicado ignorado');
        return;
      }
      endedHandledRef.current = true;

      const nextTarget = getNextEpisodeTarget();

      // Never block episode transition on network/API issues.
      if (nextTarget) {
        if (nextEpisodeTimeoutRef.current) {
          clearTimeout(nextEpisodeTimeoutRef.current);
        }
        nextEpisodeTimeoutRef.current = setTimeout(() => {
          try {
            onNextEpisode(nextTarget.seasonIndex, nextTarget.chapterIndex);
          } catch (e) {
            console.warn('[useElectronMpvProgress] failed to navigate next episode', e?.message || e);
          }
          nextEpisodeTimeoutRef.current = null;
        }, 0);
      }

      void saveProgress(buildProgressPayload({ completed: true }), {
        force: true,
        reason: 'completed'
      });
    };

    const closedHandler = () => {
      if (optsRef.current?.enabled === false) return;
      if (endedHandledRef.current) return;
      if (lastTimeRef.current <= 0) return;

      void saveProgress(buildProgressPayload({ lastTime: lastTimeRef.current }), {
        force: true,
        reason: 'closed'
      });
    };

    try { window.electronAPI.on('mpv-time-pos', handler); } catch (e) {}
    try { window.electronAPI.on('mpv-ended', endedHandler); } catch (e) {}
    try { window.electronAPI.on('mpv-closed', closedHandler); } catch (e) {}

    return () => {
      if (nextEpisodeTimeoutRef.current) {
        clearTimeout(nextEpisodeTimeoutRef.current);
        nextEpisodeTimeoutRef.current = null;
      }
      try { window.electronAPI.removeListener?.('mpv-time-pos', handler); } catch (e) {}
      try { window.electronAPI.removeListener?.('mpv-ended', endedHandler); } catch (e) {}
      try { window.electronAPI.removeListener?.('mpv-closed', closedHandler); } catch (e) {}
    };
  }, [videoId, onNextEpisode, seasons, currentChapterInfo, opts?.enabled]);
}
