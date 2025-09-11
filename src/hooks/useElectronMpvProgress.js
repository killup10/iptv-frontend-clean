import { useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';


// Hook to listen to mpv time-pos events exposed by preload (window.electronAPI)
// and forward progress to backend for the given videoId.
export default function useElectronMpvProgress(videoId, opts = {}) {
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
        await axiosInstance.put(`/api/videos/${videoId}/progress`, { lastTime });
        lastSentRef.current = Date.now();
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
    const endedHandler = async () => {
      try {
        await axiosInstance.put(`/api/videos/${videoId}/progress`, { lastTime: undefined, completed: true });
      } catch (e) {
        console.warn('[useElectronMpvProgress] failed to send completed', e?.message || e);
      }
    };

    try {
      window.electronAPI.on('mpv-ended', endedHandler);
    } catch (e) {
      // optional
    }

    return () => {
      try { window.electronAPI.removeListener && window.electronAPI.removeListener('mpv-time-pos', handler); } catch (e) {}
      try { window.electronAPI.removeListener && window.electronAPI.removeListener('mpv-ended', endedHandler); } catch (e) {}
    };
  }, [videoId]);
}
