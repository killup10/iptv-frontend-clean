// src/hooks/usePrefetch.js
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchFeaturedMovies,
  fetchFeaturedSeries,
  fetchFeaturedAnimes,
  fetchFeaturedDoramas,
  fetchFeaturedNovelas,
  fetchFeaturedDocumentales,
} from '../utils/api.js';

/**
 * Hook para precargar datos de páginas antes de navegar
 * Mejora significativamente la fluidez de navegación
 */
export const usePrefetch = () => {
  const navigate = useNavigate();

  const prefetchPageData = useCallback((pageType) => {
    // Ejecutar en background sin bloquear UI
    setTimeout(() => {
      switch (pageType) {
        case 'movies':
          fetchFeaturedMovies().catch(() => {});
          break;
        case 'series':
          fetchFeaturedSeries().catch(() => {});
          break;
        case 'animes':
          fetchFeaturedAnimes().catch(() => {});
          break;
        case 'doramas':
          fetchFeaturedDoramas().catch(() => {});
          break;
        case 'novelas':
          fetchFeaturedNovelas().catch(() => {});
          break;
        case 'documentales':
          fetchFeaturedDocumentales().catch(() => {});
          break;
        default:
          break;
      }
    }, 0);
  }, []);

  return { prefetchPageData };
};

export default usePrefetch;
