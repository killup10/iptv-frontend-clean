// src/hooks/useEpgSchedule.js
// Parrilla bajo demanda para UN canal: guía real del backend primero,
// guía estimada local (memoizada) como respaldo. Cacheada 5 min por canal
// para no repetir fetches al abrir/cerrar la guía.
import { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../utils/axiosInstance.js';
import { getEstimatedDaySchedule } from '../utils/epgCache.js';

const SCHEDULE_TTL_MS = 5 * 60 * 1000;
const scheduleCache = new Map(); // normalizedName -> { timestamp, payload }

function cacheKey(name) {
  return String(name || '').trim().toLowerCase().slice(0, 120);
}

function toCommonItem(prog, now = new Date()) {
  const start = prog.start ? new Date(prog.start) : null;
  const stop = prog.stop || prog.end ? new Date(prog.stop || prog.end) : null;
  const nowTs = now.getTime();
  const isCurrent =
    typeof prog.isCurrent === 'boolean'
      ? prog.isCurrent
      : !!(start && stop && start.getTime() <= nowTs && nowTs < stop.getTime());
  return {
    title: prog.title || 'Programa',
    desc: prog.desc || prog.description || '',
    start,
    stop,
    isCurrent,
  };
}

/**
 * @param {string} channelName nombre del canal (o '' para no cargar)
 * @param {string|number} channelId id del canal (para el fallback estimado)
 * @param {boolean} enabled si es false no hace fetch (p.ej. guía cerrada)
 * @param {Array} presetSchedule programación real ya disponible (itemData.epgSchedule) — evita el fetch
 * @returns {{ schedule: Array, source: 'real'|'estimated'|'none', loading: boolean }}
 */
export function useEpgSchedule(channelName, channelId, enabled = true, presetSchedule = null) {
  const [remote, setRemote] = useState(null); // { schedule, now } | null
  const [loading, setLoading] = useState(false);
  const key = cacheKey(channelName);

  useEffect(() => {
    if (!enabled || !channelName) return;
    // Si ya hay parrilla real precargada, no fetchear
    if (Array.isArray(presetSchedule) && presetSchedule.length > 0) return;
    const cached = scheduleCache.get(key);
    if (cached && Date.now() - cached.timestamp < SCHEDULE_TTL_MS) {
      setRemote(cached.payload);
      return;
    }
    let cancelled = false;
    setLoading(true);
    axiosInstance
      .get('/api/channels/epg/schedule', { params: { name: channelName, limit: 10 } })
      .then((res) => {
        if (cancelled) return;
        const payload = {
          schedule: Array.isArray(res.data?.schedule) ? res.data.schedule : [],
          now: res.data?.now || null,
          hasRealGuide: !!res.data?.hasRealGuide,
        };
        scheduleCache.set(key, { timestamp: Date.now(), payload });
        setRemote(payload);
      })
      .catch(() => {
        if (!cancelled) setRemote({ schedule: [], now: null, hasRealGuide: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, channelName, key, presetSchedule]);

  return useMemo(() => {
    const now = new Date();
    // 1. Real precargada desde el detalle del canal
    if (Array.isArray(presetSchedule) && presetSchedule.length > 0) {
      return { schedule: presetSchedule.map((p) => toCommonItem(p, now)), source: 'real', loading: false };
    }
    // 2. Real vía endpoint bajo demanda
    if (remote && Array.isArray(remote.schedule) && remote.schedule.length > 0) {
      return { schedule: remote.schedule.map((p) => toCommonItem(p, now)), source: 'real', loading };
    }
    // 3. Estimada local memoizada (etiquetada como tal en la UI)
    if (channelName) {
      const estimated = getEstimatedDaySchedule(channelName, channelId, now);
      const upcoming = estimated.filter((p) => p.end > now).slice(0, 10);
      if (upcoming.length > 0) {
        return { schedule: upcoming.map((p) => toCommonItem(p, now)), source: 'estimated', loading };
      }
    }
    return { schedule: [], source: 'none', loading };
  }, [presetSchedule, remote, channelName, channelId, loading]);
}

export default useEpgSchedule;
