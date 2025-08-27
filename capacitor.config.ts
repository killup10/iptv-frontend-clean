import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'play.teamg.store',
  appName: 'TeamG Play',
  webDir: 'dist',
  plugins: {
    VideoPlayerPlugin: {
      androidPackage: 'play.teamg.store.VideoPlayerPlugin'
    },
    App: {
      // Configuración para manejar eventos de la aplicación
      handleAppUrlOpen: true
    }
  },
  android: {
    // Configuración específica para Android
    allowMixedContent: true,
    captureInput: true
  },
  ios: {
    // Configuración para iOS
    scheme: 'TeamG Play'
  }
};

export default config;
