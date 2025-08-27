import axiosInstance from '../utils/axiosInstance';

export const videoProgressService = {
  async getContinueWatching() {
    try {
      const response = await axiosInstance.get('/api/videos/user/continue-watching');
      return response.data;
    } catch (error) {
      console.error('[VideoProgress] Error obteniendo continuar viendo:', error);
      return [];
    }
  },

  async getProgress(videoId) {
    try {
      const response = await axiosInstance.get(`/api/videos/${videoId}/progress`);
      return response.data.watchProgress;
    } catch (error) {
      console.error('[VideoProgress] Error obteniendo progreso:', error);
      return null;
    }
  },

  // Guarda progreso del video. lastSeason/progress son opcionales para series.
  async saveProgress(videoId, { lastTime, lastChapter, lastSeason, completed, progress } = {}) {
    try {
      if (typeof lastTime !== 'number') {
        // Evitar peticiones inválidas
        return null;
      }
      if (import.meta.env.DEV) {
        console.log(`[VideoProgress] Enviando PUT progreso → videoId=${videoId}, lastTime=${lastTime}, lastChapter=${lastChapter ?? 'n/a'}, lastSeason=${lastSeason ?? 'n/a'}, progress=${progress ?? 'n/a'}`);
      }

      const payload = { lastTime };
      if (lastChapter !== undefined) payload.lastChapter = lastChapter;
      if (lastSeason !== undefined) payload.lastSeason = lastSeason;
      if (completed !== undefined) payload.completed = completed;
      if (progress !== undefined) payload.progress = progress;

      const response = await axiosInstance.put(`/api/videos/${videoId}/progress`, payload);

      if (import.meta.env.DEV) {
        console.log('[VideoProgress] Progreso guardado OK. Respuesta:', response.data?.watchProgress || response.data);
      }
      return response.data.watchProgress;
    } catch (error) {
      console.error('[VideoProgress] Error guardando progreso:', error?.response?.data || error.message || error);
      return null;
    }
  }
};
