import { WebPlugin } from '@capacitor/core';

export class VideoPlayerPluginWeb extends WebPlugin {
  async playVideo(options) {
    console.log('VideoPlayerPlugin Web - playVideo called with:', options);
    // Para web, usar el reproductor HTML5 existente
    return { success: true, message: 'Web player not implemented' };
  }

  async pauseVideo() {
    console.log('VideoPlayerPlugin Web - pauseVideo called');
    return { success: true };
  }

  async stopVideo() {
    console.log('VideoPlayerPlugin Web - stopVideo called');
    return { success: true };
  }

  async seekTo(options) {
    console.log('VideoPlayerPlugin Web - seekTo called with:', options);
    return { success: true };
  }

  async getCurrentTime() {
    console.log('VideoPlayerPlugin Web - getCurrentTime called');
    return { currentTime: 0 };
  }

  async getDuration() {
    console.log('VideoPlayerPlugin Web - getDuration called');
    return { duration: 0 };
  }
}
