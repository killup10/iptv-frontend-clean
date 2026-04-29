// src/hooks/useDataCache.js
import { useCallback, useMemo } from 'react';

const CACHE_DURATION = 10 * 60 * 1000;
const STORAGE_PREFIX = 'teamg-cache:v2026-04-18-content-fix:';
const sharedCache = {};
const sharedTimestamps = {};

const canUseSessionStorage = () => (
  typeof window !== 'undefined' &&
  typeof window.sessionStorage !== 'undefined'
);

const getStorageKey = (key) => `${STORAGE_PREFIX}${key}`;

const readPersistentEntry = (key) => {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(getStorageKey(key));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Object.prototype.hasOwnProperty.call(parsed, 'value') ||
      typeof parsed.timestamp !== 'number'
    ) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return null;
    }

    return parsed;
  } catch (error) {
    try {
      window.sessionStorage.removeItem(getStorageKey(key));
    } catch {
    }
    return null;
  }
};

const writePersistentEntry = (key, value, timestamp) => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getStorageKey(key),
      JSON.stringify({ value, timestamp }),
    );
  } catch {
  }
};

const removePersistentEntry = (key) => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(getStorageKey(key));
  } catch {
  }
};

const getCachedValue = (key, options = {}) => {
  const { allowStale = false } = options;
  let timestamp = sharedTimestamps[key];

  if (typeof timestamp !== 'number') {
    const persistentEntry = readPersistentEntry(key);
    if (persistentEntry) {
      sharedCache[key] = persistentEntry.value;
      sharedTimestamps[key] = persistentEntry.timestamp;
      timestamp = persistentEntry.timestamp;
    }
  }

  if (typeof timestamp !== 'number') {
    return null;
  }

  const now = Date.now();
  const isExpired = now - timestamp > CACHE_DURATION;

  if (isExpired && !allowStale) {
    clearCachedValue(key);
    return null;
  }

  return sharedCache[key] || null;
};

const setCachedValue = (key, value) => {
  const timestamp = Date.now();
  sharedCache[key] = value;
  sharedTimestamps[key] = timestamp;
  writePersistentEntry(key, value, timestamp);
};

const clearCachedValue = (key) => {
  if (key) {
    delete sharedCache[key];
    delete sharedTimestamps[key];
    removePersistentEntry(key);
    return;
  }

  Object.keys(sharedCache).forEach((cacheKey) => delete sharedCache[cacheKey]);
  Object.keys(sharedTimestamps).forEach((cacheKey) => delete sharedTimestamps[cacheKey]);
  if (canUseSessionStorage()) {
    Object.keys(window.sessionStorage)
      .filter((storageKey) => storageKey.startsWith(STORAGE_PREFIX))
      .forEach((storageKey) => window.sessionStorage.removeItem(storageKey));
  }
};

/**
 * Hook para cachear datos y evitar recargas innecesarias.
 * La cache es compartida a nivel de modulo para sobrevivir a desmontes/remontes.
 */
export const useDataCache = () => {
  const get = useCallback((key) => getCachedValue(key), []);
  const getStale = useCallback((key) => getCachedValue(key, { allowStale: true }), []);
  const set = useCallback((key, value) => setCachedValue(key, value), []);
  const clear = useCallback((key) => clearCachedValue(key), []);

  return useMemo(() => ({
    get,
    getStale,
    set,
    clear,
  }), [clear, get, getStale, set]);
};

export default useDataCache;
