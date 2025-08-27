# 📺 TeamG Play para LG NetCast via Media Station X

## 🎯 **Instalación con Media Station X**

### **Paso 1: Preparar Media Station X**
1. **Descargar Media Station X** desde el sitio oficial de LG
2. **Instalar Media Station X** en tu LG NetCast TV
3. **Abrir Media Station X** desde el menú de aplicaciones

### **Paso 2: Instalar TeamG Play**

#### **Método 1: Instalación Directa (Recomendado)**
1. **Copiar archivos** a USB (FAT32):
   ```
   USB/
   ├── index.html
   ├── widget.xml
   ├── install.js
   ├── config.xml
   ├── TeamG Play.png
   ├── assets/
   └── otros archivos...
   ```

2. **Conectar USB** a tu LG NetCast
3. **Abrir Media Station X**
4. **Seleccionar "Install from USB"**
5. **Navegar** hasta los archivos de TeamG Play
6. **Seleccionar widget.xml** y confirmar instalación

#### **Método 2: Instalación via Servidor Web**
1. **Subir archivos** a un servidor web accesible
2. **Abrir Media Station X**
3. **Seleccionar "Install from URL"**
4. **Introducir URL** del widget.xml:
   ```
   http://tu-servidor.com/teamg-play/widget.xml
   ```
5. **Confirmar instalación**

### **Paso 3: Configuración Inicial**
1. **Abrir TeamG Play** desde Media Station X
2. **Configurar servidor** (IP del backend):
   - Usar control remoto para navegar
   - Introducir IP: `http://tu-servidor:3000`
3. **Iniciar sesión** con tus credenciales
4. **¡Disfrutar del contenido!**

## 🎮 **Controles en Media Station X**

### **Navegación Básica:**
- **↑↓←→**: Navegar entre elementos
- **OK/Enter**: Seleccionar
- **Back**: Volver (NetCastBack)
- **Exit**: Salir (NetCastExit)

### **Controles de Video:**
- **Play/Pause**: Reproducir/Pausar
- **Stop**: Detener reproducción
- **FF/REW**: Avanzar/Retroceder
- **Vol +/-**: Control de volumen

## 🔧 **Características Específicas**

### **Optimizaciones para NetCast:**
- ✅ **Detección automática** de Media Station X
- ✅ **API NetCast nativa** integrada
- ✅ **Controles remotos** optimizados
- ✅ **Rendimiento mejorado** para hardware antiguo
- ✅ **Compatibilidad total** con LG NetCast 2.0+

### **Formatos Soportados:**
- **Video**: MP4 (H.264), WebM
- **Audio**: AAC, MP3
- **Subtítulos**: SRT, VTT
- **Streaming**: HLS, DASH (limitado)

## 🚨 **Solución de Problemas**

### **Error: "Widget no encontrado"**
- Verificar que `widget.xml` esté en la raíz
- Comprobar formato USB (debe ser FAT32)
- Reiniciar Media Station X

### **Error: "No se puede conectar al servidor"**
- Verificar IP del backend
- Comprobar conectividad de red
- Verificar que el backend esté ejecutándose

### **Error: "Video no se reproduce"**
- Verificar formato del video (preferir MP4)
- Comprobar codecs soportados
- Verificar URL del video

### **Rendimiento lento:**
- Reducir calidad de video
- Cerrar otras aplicaciones
- Verificar conexión de red

## 📋 **Archivos Incluidos**

```
TeamG-Play-NetCast/
├── index.html              # Página principal
├── widget.xml              # Configuración Media Station X
├── install.js              # Script de instalación
├── config.xml              # Configuración NetCast
├── TeamG Play.png          # Icono de la aplicación
├── assets/                 # Recursos de la aplicación
│   ├── index-C5YhT-2a.js  # JavaScript principal
│   ├── index-Bv5h5Cy2.css # Estilos CSS
│   └── otros archivos...
├── bg-login-placeholder.jpg
├── fondo.png
└── README-MediaStationX.md # Este archivo
```

## 🌐 **Compatibilidad**

### **LG NetCast Versiones:**
- ✅ NetCast 2.0 (2011-2012)
- ✅ NetCast 3.0 (2012-2013)
- ✅ NetCast 4.0 (2013-2014)
- ✅ NetCast 4.5 (2014)

### **Media Station X:**
- ✅ Versión 1.0+
- ✅ Todas las variantes regionales
- ✅ Instalación USB y web

## 🆘 **Soporte**

Si tienes problemas con la instalación:

1. **Verificar compatibilidad** de tu modelo LG
2. **Comprobar versión** de Media Station X
3. **Revisar logs** en la consola del navegador
4. **Contactar soporte** si persisten los problemas

## 🎉 **¡Listo para Disfrutar!**

Una vez instalado correctamente, tendrás acceso completo a:
- 🎬 **Películas y series** en pantalla grande
- 📺 **Canales IPTV** en vivo
- 🎵 **Contenido multimedia** optimizado
- 🎮 **Navegación fluida** con control remoto

¡Disfruta de TeamG Play en tu LG NetCast! 🚀✨
