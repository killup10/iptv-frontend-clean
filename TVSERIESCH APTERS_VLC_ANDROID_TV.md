# ✅ TVSeriesChapters + VLC en Android TV

## 📝 Resumen Rápido

**Tu setup**: Android TV con **VLC Player**  
**Componente**: `TVSeriesChapters.jsx` (D-Pad Navigation)  
**Compatible**: ✅ 100% funcional

---

## 🔄 Flujo de Datos

```
TVSeriesChapters (UI D-Pad)
        ↓
  Usuario selecciona capítulo
        ↓
  onSelectChapter(seasonIdx, chapterIdx)
        ↓
  handleChapterSelect()
        ↓
  VideoPlayer.jsx recibe URL del capítulo
        ↓
  VLC Player Activity (Java) recibe Intent con URL
        ↓
  VLC reproduce el capítulo
```

---

## 🎮 Interacción Usuario en Android TV

### Paso 1: Serie/Anime/Dorama
```
Seleccionar con D-Pad
        ↓
Se abre Watch.jsx
        ↓
isTVMode === true
```

### Paso 2: TVSeriesChapters Aparece
```
┌────────────────────────────────┐
│ SELECCIONA TEMPORADA Y EPISODIO │
└────────────────────────────────┘
│ ← → cambiar temporada, ↓ ver eps │
│ TEMPORADAS │ EPISODIOS │
│  [T1] [T2] │  E1 E2 E3 │ ← D-Pad
│  [T3] [T4] │  E4 E5 E6 │   navega
└────────────────────────────────┘
```

### Paso 3: D-Pad Navigation
```
← → : Cambiar entre T1, T2, T3, T4...
↓ (en temporadas) : Ir a lista de episodios
↑ ↓ (en episodios) : Navegar E1, E2, E3...
ENTER : Reproducir con VLC
```

### Paso 4: VLC Abre
```
VideoPlayer.jsx → VLCPlayerActivity.java
        ↓
VLC reproduce URL del capítulo
        ↓
Usuario ve video completo
```

---

## 📋 Información Pasada a VLC

Cuando el usuario selecciona un capítulo, se envía:

```javascript
{
  video_url: "https://tu-backend/videos/serie-ep1.m3u8",
  video_title: "T1E1 - Título del Episodio",
  
  // Para cambiar entre capítulos sin salir de VLC
  chapterTitles: ["E1 - Pilot", "E2 - Segundo", ...],
  chapterUrls: ["url/ep1", "url/ep2", ...],
  chapterNumbers: [1, 2, ...],
  chapterSeasonNumbers: [1, 1, ...],
  
  // Información de canales en vivo (si aplica)
  isLiveTV: false
}
```

---

## ✅ TVSeriesChapters Funciona Con:

- ✅ VLC en Android TV
- ✅ ExoPlayer en Android TV (también compatible)
- ✅ VLC en Android Mobile (pero no se usa en mobile por defecto)
- ✅ Web Desktop (modo forzado TV)

El componente **solo maneja la UI de selección**, no importa qué reproductor uses.

---

## 🛠️ VideoPlayerPlugin en Android TV

Cuando TVSeriesChapters detecta que se está reproduciendo, intenta:

```javascript
// Detener VLC antes de cambiar capítulo
window.VideoPlayerPlugin.stopVideo()
```

Esto es importante porque:
- Libera recursos
- Permite transición limpia entre capítulos
- Evita reproducción simultánea

---

## 📊 Capítulos en VLCPlayerActivity

En tu `VLCPlayerActivity.java` ya tienes:

```java
private ArrayList<String> chapterTitles;       // ["E1", "E2", ...]
private ArrayList<String> chapterUrls;         // ["url1", "url2", ...]
private ArrayList<Integer> chapterNumbers;     // [1, 2, ...]
private ArrayList<Integer> chapterSeasonNumbers; // [1, 1, ...]
```

TVSeriesChapters proporciona:
- `selectedSeasonIdx` → índice en seasons array
- `selectedChapterIdx` → índice en chapters array
- Estos se usan para recuperar `chapterUrls[index]`

---

## 🎯 Cambiar de Capítulo Sin Salir de VLC

En VLC ya existe un botón flotante (Android TV):

```java
channelsButton.setOnClickListener(v -> {
    showChaptersDialog();
    hideControls();
});
```

Esto muestra un diálogo con todos los episodios. **TVSeriesChapters** está antes de esto, en la pantalla de selección inicial.

---

## 🔌 Conexión: TVSeriesChapters → VideoPlayer → VLC

```
TVSeriesChapters.jsx
  ├─ onSelectChapter(seasonIdx, chapterIdx)
  └─ handleChapterSelect()
       ├─ Obtiene: chaptersInSeason[chapterIdx].url
       ├─ Llama: navigate(`/watch/serie/${serieId}`, state)
       ├─ setState: setCurrentChapterInfo({ seasonIndex, chapterIndex })
       └─ setState: setVodPlaybackRequested(true)
            ↓
            Watch.jsx
            ├─ setCurrentChapterInfo actualiza
            ├─ videoUrl se actualiza con nueva URL
            └─ VideoPlayer recibe url actualizada
                 ↓
                 VideoPlayer.jsx
                 ├─ Llama: getPlayableUrl(videoUrl)
                 ├─ Llama: window.VideoPlayerPlugin.play()
                 └─ Intent hacia VLCPlayerActivity
                      ↓
                      VLCPlayerActivity.java
                      ├─ onCreate(Intent)
                      ├─ String videoUrl = getIntent().getStringExtra("video_url")
                      ├─ Inicializa LibVLC
                      └─ mediaPlayer.play(url)
                           ↓
                           VLC reproduce episodio ✅
```

---

## 🧪 Testing con VLC

### En Android TV (Device/Emulator):

1. **Compilar**:
   ```bash
   npm run build:tv
   npm run tv:sync
   npm run tv:run
   ```

2. **Navegar a Serie**:
   - Ir a: Series/Animes/Documentales/Doramas
   - Seleccionar título con D-Pad

3. **Verificar TVSeriesChapters**:
   - Debe mostrar temporadas y episodios
   - Botones deben ser navigables con D-Pad
   - No debe usar mouse/touch

4. **Cambiar Temporada**:
   - Presionar `← →` (Arrow Left/Right)
   - Temporada debe cambiar
   - Lista de episodios actualiza

5. **Seleccionar Episodio**:
   - Presionar `↓` para ir a episodios
   - Presionar `↑ ↓` para navegar
   - Presionar `ENTER` para reproducir

6. **Reproducción**:
   - VLC debe abrirse y reproducir
   - Debe verse el video completamente
   - Los controles de VLC deben funcionar

7. **Cambiar Capítulo en VLC**:
   - Durante reproducción
   - Presionar botón flotante "EPISODIOS"
   - Debe permitir cambiar entre capítulos

---

## 🐛 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| TVSeriesChapters no aparece | `isTVMode` es false | Compilar como TV: `npm run build:tv` |
| D-Pad no funciona | Foco no en componente | Reiniciar app (F12 console) |
| VLC no inicia | URL incorrecta | Verificar `chapterUrls` en Intent |
| Cambio de capítulo lento | VLC tarda en cerrar | Normal, es timeout de 400ms |
| Progreso no se guarda | Backend no actualiza | Verificar backend log |

---

## 📱 Diferencia: Android TV vs Mobile

| Feature | Android TV | Android Mobile |
|---------|-----------|----------------|
| Navegación | D-Pad (TVSeriesChapters) | Touch (normal buttons) |
| Reproductor | VLC o ExoPlayer | VLC |
| Capítulos UI | TVSeriesChapters.jsx | SeriesChapters.jsx |
| Operación | Sin mouse | Gestos + botones |

---

## 💡 Tips

1. **Debugging D-Pad**:
   ```javascript
   // Abre console (F12)
   // Verás logs: [TVSeriesChapters] Key: ArrowDown
   ```

2. **Forzar TV en Desktop**:
   ```javascript
   localStorage.setItem('FORCE_TV_MODE', 'true');
   location.reload();
   ```

3. **Progreso automático**:
   - Al cambiar capítulo, progreso se guarda
   - El repositor debería reflejar 0% en nuevo capítulo
   - Si vuelves a episodio anterior, muestra progreso guardado

---

## ✨ Próximo: Optimizaciones (Opcional)

- [ ] Preview de video al enfocarse en capítulo
- [ ] Autoplay del siguiente episodio al terminar
- [ ] Búsqueda rápida de capítulos (tecla de búsqueda)
- [ ] Mostrar duración estimada antes de reproducir

---

**Compatible con**: VLC Player en Android TV  
**Componente**: TVSeriesChapters.jsx + Watch.jsx  
**Estado**: ✅ Listo para compilar y usar  

