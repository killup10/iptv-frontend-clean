// src/utils/epgCache.js
// Caché memoizado para la guía ESTIMADA de cliente (fallback cuando el backend
// no tiene guía real para un canal). Evita regenerar el arreglo completo en
// cada render, que era la principal causa de tirones en vistas con EPG.
import { getEPGForChannel, getCurrentProgram } from './epgGenerator.js';

const MAX_ENTRIES = 250;
const dayCache = new Map(); // `${channelId|name}|YYYY-M-D` -> programs[]

function dayKey(channelName, channelId, date = new Date()) {
  return `${channelId || channelName || 'chan'}|${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function pruneCache() {
  if (dayCache.size > MAX_ENTRIES) {
    const oldest = dayCache.keys().next().value;
    if (oldest) dayCache.delete(oldest);
  }
}

/** Programación estimada del día para un canal (memoizada por canal+día). */
export function getEstimatedDaySchedule(channelName, channelId, date = new Date()) {
  const key = dayKey(channelName, channelId, date);
  const cached = dayCache.get(key);
  if (cached) return cached;
  let programs = [];
  try {
    programs = getEPGForChannel(channelName, channelId, date) || [];
  } catch (_) {
    programs = [];
  }
  dayCache.set(key, programs);
  pruneCache();
  return programs;
}

/** Programa estimado actual + siguiente, sin regenerar de más. */
export function getEstimatedNowNext(channelName, channelId, now = new Date()) {
  const programs = getEstimatedDaySchedule(channelName, channelId, now);
  let current = null;
  try {
    current = getCurrentProgram(programs, now) || null;
  } catch (_) {
    current = null;
  }
  let next = null;
  if (current) {
    const idx = programs.indexOf(current);
    next = idx >= 0 ? programs[idx + 1] || null : null;
  } else if (programs.length > 0) {
    next = programs.find((p) => p.end > now) || null;
  }
  return { current, next, schedule: programs };
}

/** Fracción 0..1 del progreso de un programa respecto a `now`. */
export function getProgramProgress(start, stop, now = new Date()) {
  try {
    const s = new Date(start).getTime();
    const e = new Date(stop).getTime();
    const n = new Date(now).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
    if (n <= s) return 0;
    if (n >= e) return 1;
    return (n - s) / (e - s);
  } catch (_) {
    return 0;
  }
}

/** "20:30" local. Acepta Date o string ISO. */
export function formatGuideTime(value) {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (_) {
    return '';
  }
}
