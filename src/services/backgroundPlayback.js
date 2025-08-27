// src/services/backgroundPlayback.js
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

class BackgroundPlaybackService {
  constructor() {
    this.isPlaying = false;
    this.currentMedia = null;
    this.mediaSession = null;
    this.wakeLock = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Inicializar Media Session API para controles de reproducción
      if ('mediaSession' in navigator) {
        this.mediaSession = navigator.mediaSession;
        console.log('[BackgroundPlayback] Media Session API disponible');
      }

      // Solicitar Wake Lock para mantener la pantalla activa durante la reproducción
      if ('wakeLock' in navigator) {
        console.log('[BackgroundPlayback] Wake Lock API disponible');
      }

      // En Capacitor, configurar listeners para eventos de la app
      if (Capacitor.isNativePlatform()) {
        App.addListener('appStateChange', ({ isActive }) => {
          console.log('[BackgroundPlayback] App state changed:', isActive ? 'active' : 'background');
          if (!isActive && this.isPlaying) {
            this.handleAppGoingToBackground();
          } else if (isActive && this.isPlaying) {
            this.handleAppComingToForeground();
          }
        });

        App.addListener('pause', () => {
          console.log('[BackgroundPlayback] App paused');
          this.handleAppGoingToBackground();
        });

        App.addListener('resume', () => {
          console.log('[BackgroundPlayback] App resumed');
          this.handleAppComingToForeground();
        });
      }

      this.isInitialized = true;
      console.log('[BackgroundPlayback] Servicio inicializado correctamente');
    } catch (error) {
      console.error('[BackgroundPlayback] Error inicializando servicio:', error);
    }
  }

  async startPlayback(mediaInfo) {
    try {
      await this.initialize();
      
      this.currentMedia = mediaInfo;
      this.isPlaying = true;

      // Configurar Media Session
      if (this.mediaSession) {
        this.mediaSession.metadata = new MediaMetadata({
          title: mediaInfo.title || 'TeamG Play',
          artist: mediaInfo.artist || 'Reproduciendo contenido',
          album: mediaInfo.album || 'TeamG Play',
          artwork: mediaInfo.artwork || [
            { src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        // Configurar controles de reproducción
        this.mediaSession.setActionHandler('play', () => {
          console.log('[BackgroundPlayback] Media Session: Play');
          this.handlePlay();
        });

        this.mediaSession.setActionHandler('pause', () => {
          console.log('[BackgroundPlayback] Media Session: Pause');
          this.handlePause();
        });

        this.mediaSession.setActionHandler('stop', () => {
          console.log('[BackgroundPlayback] Media Session: Stop');
          this.handleStop();
        });

        this.mediaSession.setActionHandler('seekbackward', (details) => {
          console.log('[BackgroundPlayback] Media Session: Seek backward', details);
          this.handleSeekBackward(details.seekOffset || 10);
        });

        this.mediaSession.setActionHandler('seekforward', (details) => {
          console.log('[BackgroundPlayback] Media Session: Seek forward', details);
          this.handleSeekForward(details.seekOffset || 10);
        });

        // Establecer estado de reproducción
        this.mediaSession.playbackState = 'playing';
      }

      // Solicitar Wake Lock para evitar que la pantalla se apague
      await this.requestWakeLock();

      console.log('[BackgroundPlayback] Reproducción iniciada:', mediaInfo.title);
    } catch (error) {
      console.error('[BackgroundPlayback] Error iniciando reproducción:', error);
    }
  }

  async stopPlayback() {
    try {
      this.isPlaying = false;
      this.currentMedia = null;

      // Limpiar Media Session
      if (this.mediaSession) {
        this.mediaSession.playbackState = 'none';
        this.mediaSession.metadata = null;
      }

      // Liberar Wake Lock
      await this.releaseWakeLock();

      console.log('[BackgroundPlayback] Reproducción detenida');
    } catch (error) {
      console.error('[BackgroundPlayback] Error deteniendo reproducción:', error);
    }
  }

  async pausePlayback() {
    try {
      this.isPlaying = false;

      if (this.mediaSession) {
        this.mediaSession.playbackState = 'paused';
      }

      await this.releaseWakeLock();

      console.log('[BackgroundPlayback] Reproducción pausada');
    } catch (error) {
      console.error('[BackgroundPlayback] Error pausando reproducción:', error);
    }
  }

  async resumePlayback() {
    try {
      this.isPlaying = true;

      if (this.mediaSession) {
        this.mediaSession.playbackState = 'playing';
      }

      await this.requestWakeLock();

      console.log('[BackgroundPlayback] Reproducción reanudada');
    } catch (error) {
      console.error('[BackgroundPlayback] Error reanudando reproducción:', error);
    }
  }

  updatePlaybackPosition(position, duration) {
    if (this.mediaSession && 'setPositionState' in this.mediaSession) {
      try {
        this.mediaSession.setPositionState({
          duration: duration || 0,
          playbackRate: 1.0,
          position: position || 0
        });
      } catch (error) {
        console.warn('[BackgroundPlayback] Error actualizando posición:', error);
      }
    }
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[BackgroundPlayback] Wake Lock activado');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('[BackgroundPlayback] Wake Lock liberado');
          this.wakeLock = null;
        });
      } catch (error) {
        console.warn('[BackgroundPlayback] No se pudo activar Wake Lock:', error);
      }
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('[BackgroundPlayback] Wake Lock liberado manualmente');
      } catch (error) {
        console.warn('[BackgroundPlayback] Error liberando Wake Lock:', error);
      }
    }
  }

  handleAppGoingToBackground() {
    console.log('[BackgroundPlayback] App va a segundo plano, manteniendo reproducción');
    // Aquí puedes implementar lógica específica para cuando la app va a segundo plano
    // Por ejemplo, cambiar a modo de solo audio si es un video
  }

  handleAppComingToForeground() {
    console.log('[BackgroundPlayback] App vuelve a primer plano');
    // Aquí puedes implementar lógica para cuando la app vuelve a primer plano
    // Por ejemplo, restaurar el video si estaba en modo solo audio
  }

  // Handlers para los controles de Media Session
  handlePlay() {
    // Emitir evento personalizado para que el reproductor reanude
    window.dispatchEvent(new CustomEvent('backgroundPlayback:play'));
  }

  handlePause() {
    // Emitir evento personalizado para que el reproductor pause
    window.dispatchEvent(new CustomEvent('backgroundPlayback:pause'));
  }

  handleStop() {
    // Emitir evento personalizado para que el reproductor se detenga
    window.dispatchEvent(new CustomEvent('backgroundPlayback:stop'));
  }

  handleSeekBackward(seconds) {
    window.dispatchEvent(new CustomEvent('backgroundPlayback:seekBackward', { 
      detail: { seconds } 
    }));
  }

  handleSeekForward(seconds) {
    window.dispatchEvent(new CustomEvent('backgroundPlayback:seekForward', { 
      detail: { seconds } 
    }));
  }

  // Método para limpiar recursos al cerrar la aplicación
  cleanup() {
    this.stopPlayback();
    if (Capacitor.isNativePlatform()) {
      App.removeAllListeners();
    }
  }
}

// Exportar instancia singleton
export const backgroundPlaybackService = new BackgroundPlaybackService();
export default backgroundPlaybackService;
