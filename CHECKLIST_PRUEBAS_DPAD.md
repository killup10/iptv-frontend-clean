# ✅ Checklist de Verificación - Fix D-Pad para Capítulos Android TV

## 📋 Pre-Compilación

- [ ] Verificar que los archivos existen:
  - [ ] `src/components/TVSeriesChapters.jsx`
  - [ ] `src/styles/TVSeriesChapters.css`
  - [ ] `src/pages/Watch.jsx` (actualizado con import)

- [ ] Verificar que Watch.jsx tiene:
  - [ ] Importa: `import TVSeriesChapters from "@/components/TVSeriesChapters.jsx";`
  - [ ] Condicional: `{itemData.seasons.length > 0 && isTVMode ? ... }`

## 🔨 Compilación

- [ ] Ejecutar en terminal:
  ```bash
  npm run build:tv
  ```
  - [ ] Sin errores
  - [ ] `dist-tv/` generado correctamente

- [ ] Sincronizar con Android:
  ```bash
  npm run tv:sync
  ```
  - [ ] Sin errores

## 📱 Ejecución en Android TV

### Opción A: Emulador
- [ ] Abrir Android Studio
- [ ] Crear/seleccionar AVD con skin "TV" (sin touch)
- [ ] Ejecutar: `npm run tv:run`
- [ ] APK se instala en emulador

### Opción B: Device Real
- [ ] Conectar Android TV por USB
- [ ] Habilitar debug en TV
- [ ] Ejecutar: `npm run tv:run`
- [ ] APK se instala en TV

## 🎮 Navegación Básica

### Test 1: Acceso a Serie/Anime/Documental
- [ ] Abrir app en Android TV
- [ ] Navegar a: **Series** o **Animes** o **Documentales** o **Doramas**
- [ ] Ver lista de títulos
- [ ] Seleccionar cualquier título con D-Pad (Arrow Down + Enter)

**Resultado esperado**: Se abre página de detalle

### Test 2: Verificar TVSeriesChapters
- [ ] Una vez en el detalle, buscar el componente TVSeriesChapters
- [ ] **DEBE VER**:
  - [ ] Sección "TEMPORADAS" con cuadros grandes
  - [ ] Sección "EPISODIOS" con lista de capítulos
  - [ ] Texto grande y legible desde lejos
  - [ ] Indicadores claros de enfoque

**Resultado esperado**: El componente renderiza correctamente

### Test 3: Navegación en Temporadas
- [ ] Componente debe estar enfocado en primera temporada
- [ ] Presionar `→ (Arrow Right)`
  - [ ] [ ] Temporada se resalta (debe cambiar a next)
  - [ ] [ ] Color cyan brillante alrededor
- [ ] Presionar `← (Arrow Left)`
  - [ ] [ ] Vuelve a temporada anterior
- [ ] Presionar `↑ (Arrow Up)`
  - [ ] [ ] NO debe hacer nada (está en zona de temporadas)

**Resultado esperado**: Navegación horizontal en temporadas funciona

### Test 4: Cambio de Zona (Temporadas → Episodios)
- [ ] Estar enfocado en una temporada
- [ ] Presionar `↓ (Arrow Down)`
  - [ ] [ ] Foco cambia a lista de episodios
  - [ ] [ ] Primer episodio se resalta en cyan brillante
  - [ ] [ ] Texto de hint cambia a "↑ ↓ para navegar..."

**Resultado esperado**: Cambio de zona fluido

### Test 5: Navegación en Episodios
- [ ] Estando en zona de episodios, primer episodio enfocado
- [ ] Presionar `↓ (Arrow Down)` múltiples veces
  - [ ] [ ] Foco baja por cada presión
  - [ ] [ ] Se puede navegar todos los episodios
  - [ ] [ ] Al llegar al final, no va más abajo
- [ ] Presionar `↑ (Arrow Up)` múltiples veces
  - [ ] [ ] Foco sube por cada presión
  - [ ] [ ] Se puede llegar al primer episodio
  - [ ] [ ] Al llegar al inicio, no va más arriba

**Resultado esperado**: Navegación vertical en episodios completa

### Test 6: Selección de Episodio
- [ ] Episodio enfocado (resaltado en cyan)
- [ ] Presionar `ENTER` o `OK` del control remoto
  - [ ] [ ] Debe comenzar reproducción
  - [ ] [ ] VideoPlayer abre
  - [ ] [ ] Video comienza a reproducirse

**Resultado esperado**: Reproducción inicia sin problemas

### Test 7: Cambio de Temporada desde Episodios
- [ ] Estar en zona de episodios, cualquier episodio enfocado
- [ ] Presionar `← (Arrow Left)`
  - [ ] [ ] Vuelve a zona de temporadas
  - [ ] [ ] Temporada actual sigue enfocada
  - [ ] [ ] Hint vuelve a "← → para cambiar temporada..."
- [ ] Presionar `↑ (Arrow Up)`
  - [ ] [ ] NO hace nada (está en zona de temporadas)

**Resultado esperado**: Vuelve a zona anterior correctamente

### Test 8: Navegación Rápida (T2E5)
- [ ] Empezar en T1E1
- [ ] Presionar `→` tres veces para llegar a T4
- [ ] Presionar `↓` para entrar a episodios
- [ ] Presionar `↓ ↓ ↓ ↓` para llegar a E5
- [ ] Presionar `ENTER`
  - [ ] [ ] Reproduce T4E5 correctamente

**Resultado esperado**: Navegación rápida y precisa

## 📊 Progreso y Estados

### Test 9: Mostrar Progreso
- [ ] Ver episodio que ya se vio parcialmente
- [ ] En episodio debe mostrar:
  - [ ] Barra de progreso
  - [ ] Porcentaje visto (ej: "65% visto")
- [ ] Si la serie tiene capítulo "en reproducción":
  - [ ] Badge rojo "📺 REPRODUCIENDO" visible

**Resultado esperado**: Progreso se muestra correctamente

### Test 10: Cambio de Temporada
- [ ] Ver T1E3 parcialmente visto (30%)
- [ ] Cambiar a T2
- [ ] Presionar `↓` para ir a episodios
- [ ] Lista debe mostrar episodios de T2
  - [ ] [ ] Primer episodio de T2 seleccionado (no el 3)
  - [ ] [ ] Progreso de T1E3 NO se muestra aquí

**Resultado esperado**: Al cambiar temporada, reset de selección

## 🔙 Navegación de Retorno

### Test 11: ESC/BACK desde Episodios
- [ ] Estar en zona de episodios
- [ ] Presionar `ESC` o `BACK` del control remoto
  - [ ] [ ] Vuelve a zona de temporadas (no sale del componente)

**Resultado esperado**: Retorno a temporadas

### Test 12: ESC/BACK desde Temporadas
- [ ] Estar en zona de temporadas
- [ ] Presionar `ESC` o `BACK` del control remoto
  - [ ] [ ] Sale del componente TVSeriesChapters
  - [ ] [ ] Vuelve a página anterior (o home)

**Resultado esperado**: Navegación hacia atrás funciona

## 🎥 Reproducción

### Test 13: Reproducción Correcta
- [ ] Seleccionar episodio con D-Pad + ENTER
- [ ] VideoPlayer debe abrirse
- [ ] **Android TV debe usar ExoPlayer** (no VLC)
- [ ] Video reproducción:
  - [ ] [ ] Sin errores
  - [ ] [ ] Controles accesibles
  - [ ] [ ] Audio funciona

**Resultado esperado**: Reproducción en ExoPlayer nativo

### Test 14: Botón de Canales en ExoPlayer
- [ ] Durante reproducción en ExoPlayer
- [ ] Buscar botón flotante "📺 EPISODIOS" o "📺 CANALES"
- [ ] Este botón debe permitir cambiar episodio sin salir del reproductor

**Resultado esperado**: Control de episodios desde reproductor

## 🖥️ Desktop Mode (Opcional pero Recomendado)

### Test 15: Modo Forzado TV en Desktop
- [ ] En navegador desktop, abrir consola
- [ ] Ejecutar:
  ```javascript
  localStorage.setItem('FORCE_TV_MODE', 'true');
  location.reload();
  ```
- [ ] Navegar a serie
- [ ] **DEBE VER TVSeriesChapters** (no UI tradicional)
- [ ] Usar teclas de flecha:
  - [ ] [ ] Arrow Left/Right = cambiar temporada
  - [ ] [ ] Arrow Up/Down = navegar episodios
  - [ ] [ ] Enter = seleccionar
  - [ ] [ ] Escape = volver

**Resultado esperado**: TVSeriesChapters funciona en desktop también

### Test 16: Desactivar Modo Forzado TV
- [ ] En consola:
  ```javascript
  localStorage.removeItem('FORCE_TV_MODE');
  location.reload();
  ```
- [ ] Volver a serie
- [ ] **DEBE VER UI tradicional** (botones normales con grid)
- [ ] Navegación con mouse funciona

**Resultado esperado**: Retrocompatibilidad perfecta

## 🎨 Estilos y Visuales

### Test 17: Calidad Visual
- [ ] Verificar colores:
  - [ ] [ ] Cyan (#00ffff) para enfoque
  - [ ] [ ] Magenta para "reproduciendo"
  - [ ] [ ] Azul suave para normal
- [ ] Verificar tamaños:
  - [ ] [ ] Fuentes grandes (legibles desde 3m)
  - [ ] [ ] Botones grandes (~150px ancho mín)
  - [ ] [ ] Espaciado cómodo
- [ ] Verificar animaciones:
  - [ ] [ ] Enfoque tiene pulso suave
  - [ ] [ ] Transiciones suaves sin saltos

**Resultado esperado**: Diseño optimizado para TV

### Test 18: Responsive
- [ ] En emulador de TV (1280x720):
  - [ ] [ ] Todo cabe en pantalla
  - [ ] [ ] No hay overflow horizontal
- [ ] En emulador 4K (3840x2160):
  - [ ] [ ] Escalado correcto
  - [ ] [ ] Sigue siendo legible

**Resultado esperado**: Funciona en diferentes resoluciones

## 🚨 Casos Edge/Errores

### Test 19: Sin Episodios
- [ ] Crear/editar una serie sin capítulos
- [ ] Abrir en Android TV
- [ ] Debe mostrar mensaje:
  - [ ] [ ] "No hay temporadas disponibles para esta serie"
  - [ ] [ ] O "No hay episodios disponibles"
- [ ] No debe crashear

**Resultado esperado**: Manejo graceful de error

### Test 20: Un Solo Episodio
- [ ] Serie con T1 y solo 1 episodio
- [ ] Abrir TVSeriesChapters
- [ ] Navegar:
  - [ ] [ ] Primer episodio seleccionado por defecto
  - [ ] [ ] Arrow Down no hace nada
  - [ ] [ ] Arrow Up no hace nada
  - [ ] [ ] ENTER reproduce

**Resultado esperado**: Navegación limitada pero funciona

## 📝 Logs y Debugging

### Test 21: Verificar Logs
- [ ] Abrir DevTools (F12)
- [ ] Ir a Consola
- [ ] Buscar logs con "[TVSeriesChapters]"
- [ ] Cada navegación debe mostrar:
  ```
  [TVSeriesChapters] Key: ArrowDown Focus: chapters
  [TVSeriesChapters] Key: Enter Focus: chapters
  ```

**Resultado esperado**: Logs confirman navegación

### Test 22: Sin Errores en Consola
- [ ] En DevTools, pestaña Consola
- [ ] Navegar extensivamente por TVSeriesChapters
- [ ] **NO DEBE HABER**:
  - [ ] [ ] Errores (rojo)
  - [ ] [ ] Warnings graves
  - [ ] [ ] Undefined variables

**Resultado esperado**: Código limpio, sin errores

## 🎯 Casos de Uso Reales

### Test 23: Ver Nueva Serie
- [ ] Abrir serie NUEVA sin progress
- [ ] Todos los episodios sin ver
- [ ] Seleccionar E1
- [ ] Reproducir
- [ ] Cerrar y volver
- [ ] E1 debe mostrar "X% visto"

**Resultado esperado**: Guardado de progreso funciona

### Test 24: Continuar Viendo
- [ ] Abrir serie donde se estaba viendo T2E5
- [ ] TVSeriesChapters debe mostrar:
  - [ ] [ ] T2 seleccionada
  - [ ] [ ] E5 enfocado
  - [ ] [ ] Badge "REPRODUCIENDO" en E5
  - [ ] [ ] Botón "CONTINUAR REPRODUCIENDO"

**Resultado esperado**: Continuar viendo funciona

### Test 25: Cambiar a Otra Temporada Mientras ve
- [ ] Estar reproduciendo T1E3
- [ ] Presionar ESC para volver a TVSeriesChapters
- [ ] Cambiar a T3
- [ ] E1 de T3 se selecciona
- [ ] ENTER reproduce T3E1
- [ ] Vuelve a TVSeriesChapters
- [ ] T1E3 aún muestra "REPRODUCIENDO" (recordatorio)

**Resultado esperado**: Historia de reproducción se mantiene

## ✅ Resumen Final

Contar cuántas pruebas pasaron:

- [ ] Pruebas Pre-Compilación: 2/2
- [ ] Pruebas Compilación: 2/2
- [ ] Pruebas Navegación Básica: 8/8
- [ ] Pruebas Progreso: 2/2
- [ ] Pruebas Retorno: 2/2
- [ ] Pruebas Reproducción: 2/2
- [ ] Pruebas Desktop: 2/2
- [ ] Pruebas Visuales: 2/2
- [ ] Pruebas Edge: 2/2
- [ ] Pruebas Debugging: 2/2
- [ ] Pruebas Casos Reales: 3/3

**Total: [ ] / 25 Pruebas Pasadas**

Si todas pasan → ✅ **FIX COMPLETADO EXITOSAMENTE**
Si alguna falla → 🔧 Revisar logs y reportar error

---

**Versión**: 1.0  
**Fecha**: 2025-12-04  
**Responsable**: QA Team  
