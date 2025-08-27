# TeamG Play TV - Smart TV Version

🚀 **La mejor experiencia de streaming optimizada para Smart TVs**

## 📺 Plataformas Soportadas

### ✅ LG WebOS
- **Versiones**: WebOS 4.0+
- **Resoluciones**: HD, Full HD, 4K
- **Controles**: Magic Remote, Control Remoto Estándar
- **Formatos**: HLS, MP4, DASH

### ✅ Samsung Tizen
- **Versiones**: Tizen 6.0+
- **Resoluciones**: HD, Full HD, 4K, 8K
- **Controles**: Control Remoto Samsung, Control por Voz
- **Formatos**: HLS, MP4

### ✅ Smart TV Genérico
- **Navegadores**: Chrome, Firefox, Safari para TV
- **Resoluciones**: HD, Full HD, 4K
- **Controles**: Control Remoto Estándar
- **Formatos**: HLS, MP4

## 🛠️ Desarrollo

### Requisitos Previos
```bash
# Node.js 18+ y npm
node --version  # v18.0.0+
npm --version   # 8.0.0+

# Herramientas específicas por plataforma
# Para LG WebOS:
# - LG webOS TV SDK
# - webOS TV CLI

# Para Samsung Tizen:
# - Tizen Studio
# - Samsung TV SDK
```

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/teamg/teamg-play.git
cd teamg-play/iptv-frontend

# Instalar dependencias
npm install

# Desarrollo para TV
npm run dev:tv
```

### Scripts Disponibles

#### 🔧 Desarrollo
```bash
# Servidor de desarrollo para TV (puerto 5174)
npm run dev:tv

# Vista previa de la build para TV
npm run preview:tv
```

#### 📦 Construcción
```bash
# Construir para todas las plataformas de TV
npm run build:smarttv

# Construir específicamente para LG WebOS
npm run build:webos

# Construir específicamente para Samsung Tizen
npm run build:tizen
```

## 🎮 Navegación con Control Remoto

### Controles Universales
- **Flechas**: Navegación entre elementos
- **OK/Enter**: Seleccionar elemento
- **Back**: Volver atrás
- **Home**: Ir al inicio
- **Exit**: Salir de la aplicación

### Controles de Video
- **Play/Pause**: Reproducir/Pausar
- **Stop**: Detener reproducción
- **Rewind**: Retroceder 10 segundos
- **Fast Forward**: Avanzar 10 segundos
- **Volume +/-**: Controlar volumen
- **Mute**: Silenciar

### Gestos Especiales
- **Flecha Arriba/Abajo**: Ajustar volumen durante reproducción
- **Flecha Izquierda/Derecha**: Buscar en video durante reproducción

## 🏗️ Arquitectura

### Estructura de Archivos
```
iptv-frontend/
├── src/
│   ├── components/
│   │   ├── TVNavigation.jsx     # Navegación optimizada para TV
│   │   ├── TVCard.jsx           # Tarjetas con navegación por control remoto
│   │   └── TVVideoPlayer.jsx    # Reproductor optimizado para TV
│   ├── pages/
│   │   └── TVHome.jsx           # Página principal para TV
│   ├── utils/
│   │   └── platformDetector.js  # Detección automática de plataforma
│   ├── AppTV.jsx                # App principal para TV
│   └── mainTV.jsx               # Punto de entrada para TV
├── webos/
│   └── appinfo.json             # Configuración LG WebOS
├── tizen/
│   └── config.xml               # Configuración Samsung Tizen
├── tv-index.html                # HTML optimizado para TV
├── vite.tv.config.js            # Configuración Vite para TV
└── build-tv.js                  # Script de construcción para TV
```

### Componentes Principales

#### 🧭 TVNavigation
- Navegación horizontal optimizada para control remoto
- Indicadores visuales de foco
- Soporte para Magic Remote (LG) y Control por Voz (Samsung)

#### 🎴 TVCard
- Grid de contenido con navegación 2D
- Previsualización de contenido
- Indicadores de calidad (HD, 4K, Premium)

#### 📺 TVVideoPlayer
- Reproductor nativo optimizado para TV
- Controles personalizados para control remoto
- Soporte para HLS y formatos nativos
- Auto-play del siguiente capítulo

## 🚀 Despliegue

### LG WebOS

#### 1. Preparar el Entorno
```bash
# Instalar webOS TV CLI
npm install -g @webosose/ares-cli

# Verificar instalación
ares-setup-device --list
```

#### 2. Construir y Empaquetar
```bash
# Construir para WebOS
npm run build:webos

# El paquete estará en: dist-tv/teamg-play-tv-webos.zip
```

#### 3. Instalar en TV
```bash
# Conectar TV (reemplazar IP_DE_TU_TV)
ares-setup-device --add webos-tv --info "host=IP_DE_TU_TV,port=9922,username=developer"

# Instalar aplicación
ares-install --device webos-tv dist-tv/webos/

# Lanzar aplicación
ares-launch --device webos-tv com.teamg.play.tv
```

### Samsung Tizen

#### 1. Preparar el Entorno
```bash
# Instalar Tizen CLI (requiere Tizen Studio)
# Descargar desde: https://developer.tizen.org/development/tizen-studio

# Verificar instalación
tizen version
```

#### 2. Construir y Empaquetar
```bash
# Construir para Tizen
npm run build:tizen

# El paquete estará en: dist-tv/teamg-play-tv-tizen.zip
```

#### 3. Instalar en TV
```bash
# Conectar TV
tizen connect IP_DE_TU_TV

# Instalar certificado de desarrollador
tizen security-profiles add -n TeamGProfile -a /path/to/author.p12 -p password

# Empaquetar aplicación
tizen package -t wgt -s TeamGProfile -- dist-tv/tizen/

# Instalar en TV
tizen install -n TeamGPlayTV.wgt -t IP_DE_TU_TV
```

## 🎨 Personalización

### Temas y Colores
```css
/* Variables CSS personalizables */
:root {
  --tv-primary: #00ffff;        /* Color primario (cian) */
  --tv-secondary: #ff00ff;      /* Color secundario (magenta) */
  --tv-background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  --tv-focus-color: #00ffff;    /* Color de foco */
  --tv-safe-area: 5%;           /* Área segura para TV */
}
```

### Configuración de Plataforma
```javascript
// src/utils/platformDetector.js
const customConfig = {
  webos: {
    preferNative: true,
    supportedFormats: ['hls', 'dash', 'mp4'],
    controls: 'custom'
  },
  tizen: {
    preferNative: true,
    supportedFormats: ['hls', 'mp4'],
    controls: 'custom'
  }
};
```

## 🐛 Solución de Problemas

### Problemas Comunes

#### ❌ "No se puede conectar al servidor"
```bash
# Verificar que el backend esté ejecutándose
cd ../iptv-backend
npm start

# Verificar configuración de red en TV
# Asegurar que TV y servidor estén en la misma red
```

#### ❌ "Video no se reproduce"
```javascript
// Verificar formato de video soportado
const supportedFormats = ['mp4', 'm3u8', 'hls'];
// Asegurar que el video esté en formato compatible
```

#### ❌ "Control remoto no responde"
```javascript
// Verificar registro de teclas (Tizen)
if (window.tizen && window.tizen.tvinputdevice) {
  tizen.tvinputdevice.registerKey('MediaPlay');
  tizen.tvinputdevice.registerKey('MediaPause');
}
```

### Logs y Depuración

#### WebOS
```bash
# Ver logs en tiempo real
ares-log --device webos-tv --follow

# Inspeccionar aplicación
ares-inspect --device webos-tv --app com.teamg.play.tv
```

#### Tizen
```bash
# Ver logs del sistema
tizen log -t IP_DE_TU_TV

# Depurar aplicación
tizen debug -t IP_DE_TU_TV
```

## 📊 Rendimiento

### Optimizaciones Implementadas
- ✅ **Lazy Loading**: Carga diferida de componentes
- ✅ **Code Splitting**: División de código por rutas
- ✅ **Image Optimization**: Compresión automática de imágenes
- ✅ **Bundle Minification**: Minificación de JavaScript y CSS
- ✅ **Memory Management**: Gestión optimizada de memoria para TV

### Métricas Objetivo
- **Tiempo de Carga**: < 3 segundos
- **Uso de Memoria**: < 100MB
- **Tiempo de Respuesta**: < 100ms para navegación
- **Calidad de Video**: Hasta 4K/60fps

## 🤝 Contribuir

### Desarrollo Local
```bash
# Fork del repositorio
git clone https://github.com/tu-usuario/teamg-play.git

# Crear rama para TV
git checkout -b feature/tv-enhancement

# Desarrollar y probar
npm run dev:tv

# Construir para todas las plataformas
npm run build:smarttv

# Commit y push
git add .
git commit -m "feat(tv): nueva funcionalidad para Smart TV"
git push origin feature/tv-enhancement
```

### Guías de Estilo
- **Componentes**: Usar sufijo `TV` para componentes específicos de TV
- **Estilos**: Usar clases con prefijo `tv-` para estilos específicos
- **Funciones**: Documentar compatibilidad con plataformas de TV

## 📞 Soporte

### Contacto
- **Email**: support@teamgplay.com
- **Discord**: [TeamG Play Community](https://discord.gg/teamgplay)
- **GitHub Issues**: [Reportar Problemas](https://github.com/teamg/teamg-play/issues)

### Documentación Adicional
- [LG WebOS Developer Guide](https://webostv.developer.lge.com/)
- [Samsung Tizen TV Guide](https://developer.samsung.com/smarttv)
- [Smart TV Best Practices](https://developer.mozilla.org/en-US/docs/Web/Guide/TV)

---

## 🎉 ¡Disfruta de TeamG Play en tu Smart TV!

**Desarrollado con ❤️ por el equipo de TeamG**

*La mejor experiencia de streaming, ahora optimizada para la pantalla grande.*
