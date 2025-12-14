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
    captureInput: true,
    webContentsDebuggingEnabled: true,
    // Permitir que el WebView acceda al micrófono y cámara
    permissions: ['RECORD_AUDIO', 'CAMERA'],
    // Permitir que getUserMedia funcione sin restricciones
    allowFileAccess: true
  },
  ios: {
    // Configuración para iOS
    scheme: 'TeamG Play'
  }
};

export default config;
