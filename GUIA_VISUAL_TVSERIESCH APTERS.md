# 🎮 Guía Visual - TVSeriesChapters D-Pad Navigation

## 📺 Interfaz Android TV

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELECCIONA UNA TEMPORADA Y EPISODIO            │
│      ← → para cambiar temporada | ↓ para ver episodios             │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────── TEMPORADAS ────────────────────────────┐
│                                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │    T1   │  │    T2   │  │    T3   │  │    T4   │  │    T5   │ │
│  │    ●    │  │         │  │         │  │         │  │         │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
│   (FOCUSED)      (normal)     (normal)     (normal)     (normal)   │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘

    ↓ (Presiona para ir a episodios)

┌───────────── EPISODIOS DE TEMPORADA 1 (8 episodios) ─────────────┐
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ E1 ⏱️ 45min                              ↑                   │  │
│  │ Pilot: El comienzo de todo                                   │  │
│  │ ███████████░░░░░░ 65% visto                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│   (FOCUSED - Resaltado en cyan brillante)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ E2 ⏱️ 48min                                                 │  │
│  │ El Descubrimiento                                           │  │
│  │ Sin ver                                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│   (seleccionado pero no en foco)                                   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ E3 ⏱️ 52min                              ↓                   │  │
│  │ Giro de Trama                                               │  │
│  │ Sin ver                                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│   (normal)                                                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ E4 ⏱️ 41min                  📺 REPRODUCIENDO                │  │
│  │ El Enfrentamiento Final                                     │  │
│  │ Ya visto completamente                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│   (actualmente reproduciendo)                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘
    Presiona ESC/BACK para volver
```

---

## 🎮 Control Remoto - Mapeo de Teclas

### En Zona de Temporadas (Selección inicial)

```
                        ↑
                        │
                        │ (intenta ir arriba en temporada)
                        │
            ← ─────────────────────────── →
            │                              │
      Anterior                       Siguiente
      Temporada                      Temporada
            │                              │
            │        ENTER                 │
            └─────► Ir a episodios ◄─────┘
```

### En Zona de Episodios

```
                        ↑
                        │
              Episodio Anterior
                        │
            ← ─────────────────────────────── →
            │                                   │
      Volver a             (sin efecto)         │
      Temporadas                                │
            │                                   │
            │            ENTER                  │
            │      (Reproducir episodio)        │
            │                                   │
                        ↓
                        │
              Episodio Siguiente
                        │
```

### Teclas Adicionales

| Tecla | Efecto |
|-------|--------|
| `ENTER` / `OK` | • En temporadas: ir a episodios<br>• En episodios: reproducir |
| `ESC` / `BACK` | • En temporadas: volver a página anterior<br>• En episodios: volver a temporadas |
| `VOLUMEN +` / `-` | Control de volumen del reproductor |
| `PLAY` / `PAUSE` | (reservado para cuando está reproduciendo) |

---

## 🎨 Estados Visuales

### 1. Normal (No enfocado)
```
┌─────────────────────────┐
│ E5 ⏱️ 45min             │
│ Título del Episodio     │
│ Sin ver                 │
└─────────────────────────┘
```
- Bordes blancos/grises
- Texto normal
- Sin brillo

### 2. Seleccionado (Hovering)
```
┌─────────────────────────┐
│ E5 ⏱️ 45min             │
│ Título del Episodio     │
│ ███░░░░░ 30% visto      │
└─────────────────────────┘
```
- Bordes ligeramente cyan
- Brillo suave

### 3. Enfocado (D-Pad activo) 🔥
```
┏━━━━━━━━━━━━━━━━━━━━━━━┓
┃ E5 ⏱️ 45min         ▶   ┃
┃ Título del Episodio     ┃
┃ ███░░░░░ 30% visto      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━┛
✨ Brillo cyan intenso ✨
```
- Bordes cyan brillantes
- Fondo resaltado
- Indicador ▶ a la derecha
- Sombra de glow

### 4. Reproduciendo Actualmente 📺
```
┏━━━━━━━━━━━━━━━━━━━━━━━┓
┃ E4 ⏱️ 41min  🔴📺 REPRO┃
┃ Título del Episodio     ┃
┃ Completado ✓            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━┛
```
- Bordes magenta/purple
- Badge rojo "REPRODUCIENDO"
- Animación de pulso

---

## 🔄 Flujo de Navegación

```
┌─────────────┐
│  Home / TV  │
│   Series    │
└──────┬──────┘
       │ Click en serie
       ▼
┌──────────────────────┐
│ Watch.jsx - Detalle  │
│ (Título + Descripción) │
└──────┬───────────────┘
       │ Android TV: isTVMode === true
       ▼
┌──────────────────────────────────────────┐
│   TVSeriesChapters                       │
│   └─ D-Pad Navigation Completa           │
│   ├─ Selecciona Temporada                │
│   ├─ Selecciona Episodio                 │
│   └─ Presiona ENTER para reproducir      │
└──────┬───────────────────────────────────┘
       │ onSelectChapter() → handleChapterSelect()
       ▼
┌──────────────────────────────────────────┐
│   VideoPlayer                            │
│   └─ Reproduce el episodio seleccionado  │
└──────────────────────────────────────────┘
```

---

## 📱 Diferencias por Plataforma

### 🖥️ Desktop/Web
```
Watch → Componente UI tradicional
↓
Botones pequeños (mouse/touch)
↓
Scroll y hover
↓
VideoPlayer
```

### 📺 Android TV
```
Watch → TVSeriesChapters
↓
Botones grandes y navegables (D-Pad)
↓
Arrow Keys + Enter
↓
VideoPlayer (ExoPlayer nativo)
```

---

## 🎯 Casos de Uso

### Caso 1: Ver primer episodio
1. Navegar a serie con D-Pad
2. Presionar ENTER → Va a temporadas
3. Temporada 1 ya seleccionada
4. Presionar ENTER → Va a episodios
5. Episodio 1 ya seleccionado
6. Presionar ENTER → Comienza reproducción

### Caso 2: Cambiar temporada
1. En TVSeriesChapters, enfoque en Temporada 1
2. Presionar → (Arrow Right)
3. Enfoque cambia a Temporada 2
4. Lista de episodios actualiza
5. Episodio 1 de T2 se selecciona
6. Presionar ENTER → Reproducir

### Caso 3: Continuar viendo
1. Abrir serie que se estaba viendo
2. TVSeriesChapters muestra progreso
3. Episodio 4 tiene badge "REPRODUCIENDO"
4. Navegar a ese episodio
5. Presionar ENTER → Continúa desde donde estaba

---

## ✨ Efectos Visuales

### Animación de Enfoque (pulse)
```
Estado Normal → Resaltado → Normal → Resaltado → ...
(0.6s cada ciclo)
```

### Animación Reproduciendo (bounce)
```
Normal ↑ Arriba ↓ Normal ↑ Arriba ↓ Normal
(respecto a su posición original)
```

### Transición Escalado
- Componente normal: `scale(1)`
- Componente enfocado: `scale(1.05)` (5% más grande)
- Suave en `0.3s`

---

## 🐛 Troubleshooting Visual

| Problema | Causa | Solución |
|----------|-------|----------|
| Botones no se resaltan | Navegación no activa | Presionar teclas 🔑 (no mouse) |
| Enfoque desaparece | Component desmontado | Recargar página |
| Colores pálidos | CSS no cargado | Verificar build (npm run build:tv) |
| No responde a D-Pad | Detecte en Web no Android TV | Forzar: `localStorage.setItem('FORCE_TV_MODE', 'true')` |

---

**Versión**: 1.0  
**Última actualización**: 2025-12-04  
**Plataforma**: Android TV / WebView  
