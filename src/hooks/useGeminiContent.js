import { useState, useEffect, useCallback } from 'react';
import geminiService from '../services/geminiService.js';

export function useGeminiContent(title, year, genre, description) {
  const [contentInfo, setContentInfo] = useState(null);
  const [visualTheme, setVisualTheme] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadContent = useCallback(async () => {
    if (!title) return;

    setLoading(true);
    setError(null);

    try {
      // Cargar información de contenido, tema visual y recomendaciones en paralelo
      const [contentData, themeData, recommendationsData] = await Promise.allSettled([
        geminiService.generateContentInfo(title, year, genre, description),
        geminiService.generateVisualTheme(title, genre, year),
        geminiService.generateRecommendations(title, genre, year)
      ]);

      // Procesar resultados
      if (contentData.status === 'fulfilled') {
        setContentInfo(contentData.value);
      } else {
        console.warn('Error cargando información de contenido:', contentData.reason);
      }

      if (themeData.status === 'fulfilled') {
        setVisualTheme(themeData.value);
      } else {
        console.warn('Error cargando tema visual:', themeData.reason);
      }

      if (recommendationsData.status === 'fulfilled') {
        setRecommendations(recommendationsData.value);
      } else {
        console.warn('Error cargando recomendaciones:', recommendationsData.reason);
      }

    } catch (err) {
      console.error('Error general cargando contenido Gemini:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [title, year, genre, description]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const retry = useCallback(() => {
    loadContent();
  }, [loadContent]);

  return {
    contentInfo,
    visualTheme,
    recommendations,
    loading,
    error,
    retry
  };
}

export function useGeminiVisualTheme(title, genre, year) {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!title || !genre) return;

    const loadTheme = async () => {
      setLoading(true);
      try {
        const themeData = await geminiService.generateVisualTheme(title, genre, year);
        setTheme(themeData);
      } catch (error) {
        console.error('Error cargando tema visual:', error);
        // Usar tema por defecto
        setTheme(geminiService.getFallbackVisualTheme(genre));
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [title, genre, year]);

  return { theme, loading };
}

export default useGeminiContent;
