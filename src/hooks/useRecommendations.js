// src/hooks/useRecommendations.js
import { useState, useEffect, useCallback } from 'react';
import {
  fetchVideoRecommendations,
  fetchSimilarByGenre,
  fetchPersonalizedRecommendations,
  fetchVideosByGenre
} from '../utils/api.js';

/**
 * Hook personalizado para manejar recomendaciones de videos
 * Proporciona múltiples tipos de recomendaciones y gestión de estado
 */
export function useRecommendations(videoId, videoType = 'similar') {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Cargar recomendaciones basadas en similitud
  const loadSimilarRecommendations = useCallback(async (limit = 6) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchVideoRecommendations(videoId, limit);
      setRecommendations(data);
      setSuccess(true);
      return data;
    } catch (err) {
      console.error('Error loading similar recommendations:', err);
      setError(err.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  // Cargar recomendaciones por género
  const loadGenreRecommendations = useCallback(async (limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSimilarByGenre(videoId, limit);
      setRecommendations(data);
      setSuccess(true);
      return data;
    } catch (err) {
      console.error('Error loading genre recommendations:', err);
      setError(err.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  // Cargar recomendaciones personalizadas (basadas en historial del usuario)
  const loadPersonalizedRecommendations = useCallback(async (limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPersonalizedRecommendations(limit);
      setRecommendations(data);
      setSuccess(true);
      return data;
    } catch (err) {
      console.error('Error loading personalized recommendations:', err);
      setError(err.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar videos por género específico
  const loadVideosByGenre = useCallback(async (genre, tipo = null, limit = 20, page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchVideosByGenre(genre, tipo, limit, page);
      setRecommendations(data.videos);
      setSuccess(true);
      return data;
    } catch (err) {
      console.error('Error loading videos by genre:', err);
      setError(err.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar recomendaciones automáticamente según el tipo
  useEffect(() => {
    if (!videoId) return;

    switch (videoType) {
      case 'similar':
        loadSimilarRecommendations();
        break;
      case 'genre':
        loadGenreRecommendations();
        break;
      case 'personalized':
        loadPersonalizedRecommendations();
        break;
      default:
        loadSimilarRecommendations();
    }
  }, [videoId, videoType]);

  // Reintentar carga
  const retry = useCallback(() => {
    switch (videoType) {
      case 'similar':
        return loadSimilarRecommendations();
      case 'genre':
        return loadGenreRecommendations();
      case 'personalized':
        return loadPersonalizedRecommendations();
      default:
        return loadSimilarRecommendations();
    }
  }, [videoType, loadSimilarRecommendations, loadGenreRecommendations, loadPersonalizedRecommendations]);

  return {
    recommendations,
    loading,
    error,
    success,
    retry,
    loadSimilarRecommendations,
    loadGenreRecommendations,
    loadPersonalizedRecommendations,
    loadVideosByGenre
  };
}

export default useRecommendations;
