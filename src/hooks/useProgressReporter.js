import { useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';

// Hook to report playback progress for a given videoId using the HTML5 video element ref.
// Sends periodic PUT /api/videos/{id}/progress with { lastTime, progress, completed }
export default function useProgressReporter(videoRef, videoId, opts = {}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!videoRef || !videoRef.current || !videoId) return;

    const INTERVAL_MS = optsRef.current.intervalMs || 20000; // 20s
    const MIN_DELTA_SECONDS = optsRef.current.minDeltaSeconds || 5; // avoid tiny updates
    let lastSentAt = 0;
    let lastSentTime = 0;

    const sendProgress = async (completed = false) => {
      const v = videoRef.current;
      if (!v) return;
      const now = Math.floor(v.currentTime || 0);
      const duration = Math.floor(v.duration || 0) || undefined;
      const progress = duration ? Math.min(1, now / duration) : undefined;

      const payload = {
        lastTime: now,
        progress,
        completed: completed || false
      };

      try {
        await axiosInstance.put(`/api/videos/${videoId}/progress`, payload);
        // update last sent markers
        lastSentAt = Date.now();
        lastSentTime = now;
      } catch (e) {
        // Non fatal. We'll retry on next interval or important events.
        console.warn('[useProgressReporter] progress update failed:', e?.message || e);
      }
    };

    const onTimeUpdate = () => {
      const v = videoRef.current;
      if (!v) return;
      const nowSec = Math.floor(v.currentTime || 0);
      const now = Date.now();

      if (Math.abs(nowSec - lastSentTime) < MIN_DELTA_SECONDS) return;
      if (now - lastSentAt >= INTERVAL_MS) {
        sendProgress(false);
      }
    };

    const onPause = () => sendProgress(false);
    const onEnded = () => sendProgress(true);

    const onSeeking = () => {
      const v = videoRef.current;
      if (!v) return;
      const nowSec = Math.floor(v.currentTime || 0);
      if (Math.abs(nowSec - lastSentTime) > 10) {
        // big seek -> report immediately
        sendProgress(false);
      }
    };

    const el = videoRef.current;
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('seeking', onSeeking);

    // send an initial report shortly after startTime if provided
    const initialPing = setTimeout(() => sendProgress(false), 1500);

    return () => {
      clearTimeout(initialPing);
      try {
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('seeking', onSeeking);
      } catch (e) {
        // ignore
      }
    };
  }, [videoRef, videoId]);
}
