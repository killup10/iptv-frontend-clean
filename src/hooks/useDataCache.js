// src/hooks/useDataCache.js
import { useRef, useCallback } from 'react';

/**
 * Hook para cachear datos y evitar recargas innecesarias
 * Útil cuando navegas entre páginas y vuelves
 */
export const useDataCache = () => {
  const cacheRef = useRef({});
  const timestampRef = useRef({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const get = useCallback((key) => {
    const timestamp = timestampRef.current[key];
    const now = Date.now();

    // Si el cache expiró, eliminar
    if (timestamp && now - timestamp > CACHE_DURATION) {
      delete cacheRef.current[key];
      delete timestampRef.current[key];
      return null;
    }

    return cacheRef.current[key] || null;
  }, []);

  const set = useCallback((key, value) => {
    cacheRef.current[key] = value;
    timestampRef.current[key] = Date.now();
  }, []);

  const clear = useCallback((key) => {
    if (key) {
      delete cacheRef.current[key];
      delete timestampRef.current[key];
    } else {
      cacheRef.current = {};
      timestampRef.current = {};
    }
  }, []);

  return { get, set, clear };
};

export default useDataCache;
