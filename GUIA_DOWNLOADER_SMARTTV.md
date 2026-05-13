# 📱 Guía: Cómo Instalar TeamG Play en Smart TV con Downloader

## ✅ Requisitos
- Smart TV Android (Sony, TCL, Philips, etc.)
- Downloader instalado (buscar en Google Play Store del TV)
- Conexión Wi-Fi en el TV
- Acceso a internet

---

## 🚀 Pasos de Instalación

### Opción 1: **Instalación Automática (RECOMENDADA)**

#### Paso 1: Copiar enlace de instalación
Ve a tu navegador en PC y accede al servidor de instalación:
```
http://tu-ip-pc:8000
```

#### Paso 2: En el Smart TV
1. Abre **Downloader**
2. Presiona el botón **HOME** o similar
3. En la dirección escribir:
   ```
   http://TU-IP-PC:8000/install.html
   ```
4. Presiona **OK** o **ENTER**
5. Se cargará la página de instalación automática

#### Paso 3: Instalar
1. Haz clic en el botón **INSTALAR TEAMG PLAY** en la página
2. Descargará automáticamente y extraerá los archivos
3. Una vez completado, haz clic en **ABRIR**

---

### Opción 2: **Instalación Manual**

#### Paso 1: Descargar archivo ZIP
En tu PC:
1. El archivo `teamg-play-tv.zip` estará disponible en Downloader
2. Descárgalo en tu Smart TV

#### Paso 2: Extraer archivos
1. En el TV, abre un explorador de archivos
2. Navega donde descargaste el ZIP
3. Extrae el contenido en `Downloads/TeamGPlay/`

#### Paso 3: Abrir en navegador
1. Abre el navegador del TV
2. Ve a la carpeta: `file:///storage/emulated/0/Downloads/TeamGPlay/`
3. Abre `tv-index.html`
4. ¡Disfruta la experiencia de streaming!

---

## 🎮 Controles para Smart TV

### Navegación
- **Flechas (↑↓←→)**: Mover por canales/series
- **OK/ENTER**: Seleccionar
- **BACK/ESC**: Volver atrás
- **HOME**: Ir a inicio
- **EXIT**: Cerrar app

### Reproducción
- **PLAY/PAUSE**: Reproducir/pausar video
- **<<** / **>>**: Retroceder/avanzar 10 segundos
- **VOL +/-**: Controlar volumen
- **MUTE**: Silenciar

---

## 🔧 Configuración

### Ajustar Calidad de Video
1. Durante la reproducción presiona **MENÚ**
2. Selecciona **CONFIGURACIÓN**
3. Elige **CALIDAD**: 720p, 1080p, 4K, etc.
4. Presiona **OK**

### Cambiar Servidor
1. En la pantalla de inicio, presiona **MENÚ**
2. Selecciona **PERFILES**
3. Ingresa la URL de tu servidor IPTV
4. Presiona **GUARDAR**

---

## ⚠️ Solución de Problemas

### No se conecta al servidor
- Verifica que la IP sea correcta (usa `ipconfig` en tu PC)
- Confirma que ambos dispositivos están en la MISMA red Wi-Fi
- Revisa el firewall de tu PC

### Video no carga
- Intenta cambiar la calidad a 720p
- Verifica que el servidor IPTV esté en línea
- Prueba con un canal diferente

### La página se carga lentamente
- Mejora tu conexión Wi-Fi
- Acerca el TV al router
- Cierra otras aplicaciones

---

## 📝 Información de Instalación

- **Versión**: 1.5.6
- **Tamaño**: ~50 MB (comprimido)
- **Resoluciones soportadas**: HD, Full HD, 4K
- **Navegadores**: Chrome, Firefox, Samsung Internet, etc.

---

## 🔗 Acceso Rápido

**Abrir en navegador TV:**
```
file:///storage/emulated/0/Downloads/TeamGPlay/tv-index.html
```

**Desde servidor local:**
```
http://localhost:8000/dist-tv/tv-index.html
```

---

## ✉️ Soporte
Si necesitas ayuda, verifica los logs en la consola de tu navegador (F12).

¡Que disfrutes viendo tus contenidos favoritos! 🎬📺
