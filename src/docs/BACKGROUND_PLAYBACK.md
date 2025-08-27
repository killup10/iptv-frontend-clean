# Reproducción en Segundo Plano - TeamG Play

## Descripción General

La funcionalidad de reproducción en segundo plano permite que los usuarios continúen escuchando el audio del contenido mientras usan otras aplicaciones o cuando la pantalla del dispositivo se apaga.

## Características Implementadas

### 1. Media Session API
- **Controles de reproducción**: Play, Pause, Stop, Seek Forward, Seek Backward
- **Metadatos**: Título, artista, álbum, artwork
- **Notificaciones**: Controles de reproducción en la barra de notificaciones
- **Lock Screen**: Controles en la pantalla de bloqueo

### 2. Wake Lock API
- **Prevención de suspensión**: Mantiene la pantalla activa durante la reproducción
- **Gestión automática**: Se activa al reproducir y se libera al pausar/detener

### 3. Capacitor App Events
- **Estado de la aplicación**: Detecta cuando la app va a segundo plano
- **Continuidad**: Mantiene la reproducción activa en segundo plano
- **Restauración**: Restaura el estado al volver a primer plano

## Arquitectura

### Servicios

#### `backgroundPlaybackService.js`
- Servicio singleton que maneja toda la lógica de segundo plano
- Inicializa Media Session API y Wake Lock API
- Maneja eventos de Capacitor para cambios de estado de la app
- Proporciona métodos para controlar la reproducción

#### `useBackgroundPlayback.js`
- Hook personalizado para integrar fácilmente la funcionalidad
- Maneja el ciclo de vida del servicio
- Proporciona métodos de control simplificados

### Componentes

#### `VideoPlayer.jsx`
- Integra la funcionalidad de segundo plano según la plataforma
- **Android**: Usa VLC con controles nativos
- **Web**: Usa HTML5 video con Media Session API
- **Electron**: Mantiene comportamiento original con MPV

## Uso

### Inicialización Básica

```javascript
import { backgroundPlaybackService } from '../services/backgroundPlayback';

// Inicializar reproducción en segundo plano
await backgroundPlaybackService.startPlayback({
  title: "Nombre del contenido",
  artist: "Información adicional",
  album: "TeamG Play",
  artwork: [
    { src: '/logo.png', sizes: '512x512', type: 'image/png' }
  ]
});
```

### Usando el Hook

```javascript
import useBackgroundPlayback from '../hooks/useBackgroundPlayback';

function MyPlayer({ mediaInfo, isPlaying }) {
  const { play, pause, stop, updatePosition } = useBackgroundPlayback(
    mediaInfo, 
    isPlaying
  );

  // Los controles se manejan automáticamente
  // updatePosition se llama en timeupdate del video
}
```

## Plataformas Soportadas

### Android (Capacitor)
- ✅ Media Session API nativa
- ✅ Controles en notificaciones
- ✅ Controles en pantalla de bloqueo
- ✅ Wake Lock para mantener reproducción
- ✅ Integración con VLC Player

### iOS (Capacitor)
- ✅ Media Session API nativa
- ✅ Controles en Control Center
- ✅ Controles en pantalla de bloqueo
- ✅ Integración con reproductor nativo

### Web (PWA)
- ✅ Media Session API del navegador
- ✅ Controles en notificaciones (Chrome/Edge)
- ✅ Wake Lock API
- ✅ Reproductor HTML5

### Electron
- ⚠️ Funcionalidad limitada (depende del sistema)
- ✅ Wake Lock básico
- ✅ Integración con MPV

## Eventos Personalizados

El sistema utiliza eventos personalizados para comunicación entre componentes:

```javascript
// Eventos que el servicio puede emitir
window.dispatchEvent(new CustomEvent('backgroundPlayback:play'));
window.dispatchEvent(new CustomEvent('backgroundPlayback:pause'));
window.dispatchEvent(new CustomEvent('backgroundPlayback:stop'));
window.dispatchEvent(new CustomEvent('backgroundPlayback:seekForward', { 
  detail: { seconds: 10 } 
}));
window.dispatchEvent(new CustomEvent('backgroundPlayback:seekBackward', { 
  detail: { seconds: 10 } 
}));
```

## Permisos Requeridos

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

### iOS (Info.plist)
```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

## Limitaciones

### Navegadores Web
- Media Session API no está disponible en todos los navegadores
- Wake Lock API es experimental en algunos navegadores
- Los controles pueden variar según el navegador

### Dispositivos Móviles
- El sistema operativo puede terminar la aplicación si consume demasiados recursos
- Algunos dispositivos tienen optimizaciones de batería agresivas
- La funcionalidad puede variar según la versión del OS

## Debugging

### Logs del Servicio
```javascript
// Habilitar logs detallados
localStorage.setItem('backgroundPlayback:debug', 'true');
```

### Verificar Soporte
```javascript
// Verificar Media Session API
console.log('Media Session:', 'mediaSession' in navigator);

// Verificar Wake Lock API
console.log('Wake Lock:', 'wakeLock' in navigator);

// Verificar plataforma Capacitor
console.log('Capacitor:', Capacitor.isNativePlatform());
```

## Mejoras Futuras

1. **Sincronización de progreso**: Guardar posición de reproducción automáticamente
2. **Cola de reproducción**: Soporte para listas de reproducción
3. **Controles avanzados**: Siguiente/anterior, repetir, aleatorio
4. **Visualizaciones**: Ecualizador, efectos visuales
5. **Integración con servicios**: Chromecast, AirPlay
6. **Optimizaciones**: Reducir consumo de batería y memoria

## Troubleshooting

### Problema: Los controles no aparecen
- Verificar que Media Session API esté disponible
- Comprobar que los metadatos estén configurados correctamente
- Revisar permisos de la aplicación

### Problema: La reproducción se detiene en segundo plano
- Verificar permisos de segundo plano
- Comprobar configuraciones de optimización de batería
- Revisar que Wake Lock esté activo

### Problema: No funciona en ciertos dispositivos
- Verificar compatibilidad del navegador/OS
- Comprobar configuraciones específicas del dispositivo
- Revisar logs de la consola para errores
