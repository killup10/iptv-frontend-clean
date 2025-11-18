# Plan de Correcciones para TeamG Play

## Cambios a Implementar:

### 1. VideoPlayer.jsx
- [x] Eliminar el botón de candado para Android VLC (no funcional)
- [x] Mejorar detección de cierre de app con Capacitor
- [x] Agregar limpieza más agresiva al desmontar componente

### 2. Watch.jsx  
- [x] Agregar flag isUnmountingRef para prevenir re-inicios
- [x] Limpiar estado inmediatamente al navegar hacia atrás
- [x] Mejorar secuencia de limpieza

### 3. VideoPlayerPlugin.java
- [x] Agregar método forceStopVideo() para cerrar actividad VLC
- [x] Mejorar manejo de lifecycle

### 4. VLCPlayerActivity.java
- [x] Agregar finish() cuando se detenga el video
- [x] Mejorar manejo de onDestroy()
