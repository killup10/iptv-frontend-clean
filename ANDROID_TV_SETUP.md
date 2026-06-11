# 📱 TeamG Play - Android TV Integración

## ✅ Completado

Se ha integrado soporte para **Android TV** en el proyecto existente **sin afectar** las versiones de:
- ✅ Web
- ✅ Android Móvil
- ✅ Electron Desktop

## 📁 Estructura del Proyecto (Sin Cambios)

```
iptv-frontend-clean-updated/
├── src/
│   ├── components/
│   │   ├── VideoPlayer.jsx        (Soporte mobile + TV)
│   │   ├── TVVideoPlayer.jsx      (Nuevo - Reproductor TV)
│   │   ├── TVGrid.jsx             (Nuevo - Grilla para TV)
│   │   ├── TVGrid.css             (Nuevo - Estilos TV)
│   │   └── ...
│   ├── hooks/
│   │   ├── useTVNavigation.js      (Hook para D-Pad)
│   │   └── ...
│   ├── utils/
│   │   ├── platformUtils.js        (Actualizado - Detecta TV)
│   │   └── ...
│   └── ...
├── android/
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml    (Actualizado - Soporte TV)
│   │   ├── java/.../VLCPlayerActivity.java
│   │   └── res/drawable/channel_button_background.xml (Nuevo)
│   └── ...
├── dist/                           (Build mobile)
├── dist-tv/                        (Build TV - Generado)
├── capacitor.config.json           (Mobile)
├── capacitor-tv.config.json        (Nuevo - TV)
├── package.json                    (Scripts agregados)
└── ...
```

## 🚀 Scripts Disponibles

### Mobile (Android + Web + Electron)
```bash
npm run build              # Build web/mobile
npm run mobile:build       # Build + sync mobile
npm run mobile:run         # Build + sync + run en Android
npm run electron:dev       # Electron dev
npm run electron:build     # Build Electron
```

### Android TV (Nuevo)
```bash
npm run build:tv           # Build optimizado para TV
npm run tv:build           # Alias
npm run tv:sync            # Build TV + sync
npm run tv:run             # Build TV + sync + run
npm run tv:open            # Abrir Android Studio
```

### Smart TV (WebOS, Tizen, NetCast)
```bash
npm run build:webos        # LG WebOS
npm run build:tizen        # Samsung Tizen
npm run build:netcast      # LG NetCast
npm run build:smarttv      # Todos
```

## 🎮 Características Android TV

### 1. Detección Automática
```javascript
import { isAndroidTV, getUIType } from './utils/platformUtils';

if (isAndroidTV()) {
  // Mostrar interfaz optimizada para TV
  // Usar TVGrid, TVVideoPlayer
}
```

### 2. Navegación con D-Pad
- **Arrow Keys**: Navegar (arriba, abajo, izquierda, derecha)
- **Enter/OK**: Seleccionar
- **Back/Escape**: Volver
- **Volumen**: Control automático

### 3. Reproductor
- **Android TV puede usar VLC o ExoPlayer** (configurable)
- `TVSeriesChapters` funciona con ambos
- La selección de capítulo se pasa al reproductor activo
- Soporta: MKV, MP4, AVI, WebM, etc.

### 4. Interfaz TV
- **TVGrid**: Grilla de canales/series con navegación 2D
- **TVVideoPlayer**: Controles grandes y focalizables
- **Estilos**: Optimizados para ver desde lejos

## 🔧 Configuración

### Android TV en AndroidManifest.xml
```xml
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<uses-feature android:name="android.software.leanback" android:required="false" />

<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```

### Detección de Plataforma
```javascript
// En platformUtils.js
getPlatform() → 'android-tv' (si es TV)
getPlayerType() → 'android-vlc' o 'android-exoplayer' (según configuración)
getUIType() → 'tv' (usar TVGrid, TVVideoPlayer, TVSeriesChapters)
```

## 📊 Compatibilidad

| Versión | Estado | Build | Deploy |
|---------|--------|-------|--------|
| Web | ✅ | `npm run build` | Servidor web |
| Android Mobile | ✅ | `npm run mobile:build` | APK mobile |
| Android TV | ✅ | `npm run tv:build` | APK TV |
| Electron | ✅ | `npm run electron:build` | EXE/DMG |
| LG WebOS | ⚠️ | `npm run build:webos` | WebOS package |
| Samsung Tizen | ⚠️ | `npm run build:tizen` | Tizen package |

## 🎯 Próximos Pasos

1. **Compilar para Android TV**:
   ```bash
   npm run tv:run
   ```

2. **Compilar APK para distribuir**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Testear en Android TV emulator**:
   ```bash
   # Usar Android Studio AVD con TV skin
   npm run tv:run
   ```

## 🛠️ Troubleshooting

### Error: "AndroidManifest.xml no reconoce TV"
**Solución**: Limpiar gradle cache
```bash
cd android
./gradlew clean
cd ..
npm run tv:build
npx cap sync
```

### Error: "dist-tv no existe"
**Solución**: Ejecutar build:tv primero
```bash
npm run build:tv
npm run tv:sync
```

### Error: "Canal button no aparece en VLC"
**Solución**: El botón flotante aparece SOLO en Android TV (ExoPlayer), no en móvil (VLC)

## 📝 Notas Importantes

✅ **No afecta versiones existentes**:
- Web sigue siendo igual
- Mobile Android sigue usando VLC
- Electron no cambia
- Backend es el MISMO para todas

✅ **Android TV usa**:
- ExoPlayer nativo (no VLC)
- D-Pad para navegación (no touch)
- TVGrid para UI (no listados)
- Botón flotante sin salir del reproductor

✅ **Datos compartidos**:
- Backend (`iptv-backend`) = MISMO
- Películas/series = se ven en todas partes
- Backend updates = reflejado automáticamente

## 🎬 Diferencias UI por Plataforma

```
Web/Desktop:      [Botones pequeños] [Touch] [16:9]
Mobile Android:   [VLC Player]      [Touch] [Gestos]
Android TV:       [VLC o ExoPlayer] [D-Pad] [Grilla 4x3]
```

---

**Versión**: 1.0 - Android TV Integrado
**Fecha**: Diciembre 4, 2025
**Estado**: ✅ Listo para compilar y distribuir
