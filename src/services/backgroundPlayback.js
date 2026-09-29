// src/services/backgroundPlayback.js
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';

// Registrar plugin nativo de Android/iOS para controles de barra de notificaciones y pantalla bloqueada
let NativeMusicPlayback = null;
if (Capacitor.isNativePlatform()) {
  try {
    NativeMusicPlayback = registerPlugin('MusicPlaybackPlugin');
  } catch (e) {
    console.warn('[BackgroundPlayback] Plugin nativo MusicPlaybackPlugin no disponible:', e);
  }
}

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
      // 1. Inicializar Media Session API estándar para navegadores y soporte general
      if ('mediaSession' in navigator) {
        this.mediaSession = navigator.mediaSession;
        console.log('[BackgroundPlayback] Media Session API disponible');
      }

      // 2. Solicitar Wake Lock para mantener la pantalla activa mientras el usuario tiene la app abierta
      if ('wakeLock' in navigator) {
        console.log('[BackgroundPlayback] Wake Lock API disponible');
      }

      // 3. Configurar listeners nativos de Android para botones de la notificación y pantalla bloqueada
      if (Capacitor.isNativePlatform() && NativeMusicPlayback) {
        try {
          NativeMusicPlayback.addListener('onMediaAction', ({ action }) => {
            console.log('[BackgroundPlayback] Acción nativa recibida desde notificación/bloqueo:', action);
            if (action === 'play') {
              window.dispatchEvent(new CustomEvent('backgroundPlayback:play'));
            } else if (action === 'pause') {
              window.dispatchEvent(new CustomEvent('backgroundPlayback:pause'));
            } else if (action === 'toggle') {
              window.dispatchEvent(new CustomEvent('backgroundPlayback:toggle'));
            } else if (action === 'next') {
              window.dispatchEvent(new CustomEvent('backgroundPlayback:next'));
            } else if (action === 'prev') {
              window.dispatchEvent(new CustomEvent('backgroundPlayback:prev'));
            }
          });
          console.log('[BackgroundPlayback] Listeners de MusicPlaybackPlugin nativo conectados');
        } catch (err) {
          console.warn('[BackgroundPlayback] No se pudo añadir listener a MusicPlaybackPlugin:', err);
        }
      }

      // 4. Configurar listeners de ciclo de vida de la app
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

      // Configurar Media Session estándar para navegadores
      if (this.mediaSession) {
        this.mediaSession.metadata = new MediaMetadata({
          title: mediaInfo.title || 'TeamG Play',
          artist: mediaInfo.artist || 'Reproduciendo contenido',
          album: mediaInfo.album || 'TeamG Play',
          artwork: mediaInfo.artwork || [
            { src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        // Configurar controles de reproducción MediaSession
        this.mediaSession.setActionHandler('play', () => {
          this.handlePlay();
        });

        this.mediaSession.setActionHandler('pause', () => {
          this.handlePause();
        });

        this.mediaSession.setActionHandler('stop', () => {
          this.handleStop();
        });

        this.mediaSession.setActionHandler('previoustrack', () => {
          window.dispatchEvent(new CustomEvent('backgroundPlayback:prev'));
        });

        this.mediaSession.setActionHandler('nexttrack', () => {
          window.dispatchEvent(new CustomEvent('backgroundPlayback:next'));
        });

        this.mediaSession.playbackState = 'playing';
      }

      // Notificar al servicio nativo de Android para crear/actualizar la notificación multimedia
      if (Capacitor.isNativePlatform() && NativeMusicPlayback) {
        NativeMusicPlayback.updatePlayback({
          title: mediaInfo.title || 'TeamG Play',
          artist: mediaInfo.artist || 'Reproduciendo',
          coverUrl: mediaInfo.coverUrl || (mediaInfo.artwork && mediaInfo.artwork[0]?.src) || '',
          isPlaying: true,
          duration: mediaInfo.duration ? Math.round(mediaInfo.duration) : 0,
          position: mediaInfo.position ? Math.round(mediaInfo.position) : 0
        }).catch(err => {
          console.warn('[BackgroundPlayback] Error al llamar updatePlayback nativo:', err);
        });
      }

      // Solicitar Wake Lock para evitar que la pantalla se apague mientras la app está abierta
      await this.requestWakeLock();

      console.log('[BackgroundPlayback] Reproducción iniciada:', mediaInfo.title);
    } catch (error) {
      console.error('[BackgroundPlayback] Error iniciando reproducción:', error);
    }
  }

  updatePlaybackState(isPlaying, mediaInfo, position, duration) {
    this.isPlaying = isPlaying;
    if (this.mediaSession) {
      this.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }

    if (Capacitor.isNativePlatform() && NativeMusicPlayback && mediaInfo) {
      NativeMusicPlayback.updatePlayback({
        title: mediaInfo.title || 'TeamG Play',
        artist: mediaInfo.artist || 'Reproduciendo',
        coverUrl: mediaInfo.cover || mediaInfo.coverUrl || '',
        isPlaying: Boolean(isPlaying),
        duration: duration ? Math.round(duration) : 0,
        position: position ? Math.round(position) : 0
      }).catch(err => {
        console.warn('[BackgroundPlayback] Error en updatePlaybackState nativo:', err);
      });
    }
  }

  async stopPlayback() {
    try {
      if (this.isPlaying || this.currentMedia) {
        this.isPlaying = false;
        this.currentMedia = null;

        if (this.mediaSession) {
          this.mediaSession.playbackState = 'none';
          this.mediaSession.metadata = null;
        }

        if (Capacitor.isNativePlatform() && NativeMusicPlayback) {
          NativeMusicPlayback.stopPlayback().catch(() => {});
        }

        await this.releaseWakeLock();
        console.log('[BackgroundPlayback] Reproducción detenida');
      }
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

      if (Capacitor.isNativePlatform() && NativeMusicPlayback && this.currentMedia) {
        NativeMusicPlayback.updatePlayback({
          title: this.currentMedia.title || 'TeamG Play',
          artist: this.currentMedia.artist || 'Reproduciendo',
          coverUrl: this.currentMedia.cover || this.currentMedia.coverUrl || '',
          isPlaying: false,
          duration: 0,
          position: 0
        }).catch(() => {});
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

      if (Capacitor.isNativePlatform() && NativeMusicPlayback && this.currentMedia) {
        NativeMusicPlayback.updatePlayback({
          title: this.currentMedia.title || 'TeamG Play',
          artist: this.currentMedia.artist || 'Reproduciendo',
          coverUrl: this.currentMedia.cover || this.currentMedia.coverUrl || '',
          isPlaying: true,
          duration: 0,
          position: 0
        }).catch(() => {});
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
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch (error) {
        // En móviles algunos navegadores restringen wakeLock de pantalla
      }
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch (error) {
        // Ignorar error al liberar
      }
    }
  }

  handleAppGoingToBackground() {
    console.log('[BackgroundPlayback] App va a segundo plano, manteniendo reproducción continua');
  }

  handleAppComingToForeground() {
    console.log('[BackgroundPlayback] App vuelve a primer plano');
  }

  handlePlay() {
    window.dispatchEvent(new CustomEvent('backgroundPlayback:play'));
  }

  handlePause() {
    window.dispatchEvent(new CustomEvent('backgroundPlayback:pause'));
  }

  handleStop() {
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

  cleanup() {
    this.stopPlayback();
    if (Capacitor.isNativePlatform()) {
      App.removeAllListeners();
    }
  }
}

export const backgroundPlaybackService = new BackgroundPlaybackService();
export default backgroundPlaybackService;
