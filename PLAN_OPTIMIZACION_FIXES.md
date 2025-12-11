# 📋 PLAN DE OPTIMIZACIÓN Y FIXES - PRIORIDADES

**Fecha:** Diciembre 10, 2025  
**Estado:** En Análisis  

---

## 🔴 PROBLEMA 1: Navbar Móvil - Estrellas Tapando Categorías

### Descripción
Cuando se abre el menú hamburguesa en móvil (3 líneas), las estrellas de las tarjetas aparecen **por encima** del menú desplegable, impidiendo ver las categorías.

### Causa
- El menú móvil tiene `z-50` en algunas partes, pero las tarjetas tienen elementos con `z-50` o `pointer-events` que interfieren
- Las estrellas están en `rating` label con `z-50` en `Card.jsx`

### Solución
**Aumentar z-index del mobile menu:**

```jsx
// App.jsx - Línea ~260
<div id="mobile-menu" className="md:hidden bg-black/95 backdrop-blur-sm border-t border-gray-700" style={{ zIndex: 9999 }}>
```

**Cambiar z-index de las estrellas en Card.jsx:**
```jsx
// Card.jsx - rating display
className="absolute top-2 left-2 bg-black/80 text-yellow-400 text-xs px-2 py-1 rounded-md font-semibold z-10 flex items-center gap-1 pointer-events-none"
```

### Archivos a Modificar
- ✏️ `src/App.jsx` - Aumentar z-index del mobile menu a 9999
- ✏️ `src/components/Card.jsx` - Reducir z-index de rating a z-10

---

## 🟠 PROBLEMA 2: Botones del Reproductor VLC - Faltan Funcionalidades

### Features Implementadas Actualmente
- ✅ Play/Pause
- ✅ Rewind 10s
- ✅ Forward 10s
- ✅ Audio/Subtítulos
- ✅ Aspect Ratio
- ✅ Channels (Episodios)

### Features a Agregar

#### 2.1 ⏱️ Botones +15/-15 segundos (EN LUGAR DE +10/-10)
**Ubicación:** Centro de controles (reemplazar 10s)  
**Spec:**
```
Rewind Button:  10s → 15s
Forward Button: 10s → 15s
```

**Archivos:**
- `android/app/src/main/java/play/teamg/store/VLCPlayerActivity.java`
- Buscar: `mediaPlayer.setTime(mediaPlayer.getTime() - 10000);`
- Cambiar a: `10000` → `15000`

---

#### 2.2 🔒 Botón Bloquear Pantalla (Screen Lock)
**Ubicación:** Esquina superior izquierda  
**Funcionalidad:**
- Estado: Bloqueado 🔒 / Desbloqueado 🔓
- Oculta controles cuando está bloqueado
- Ignora gestos cuando está bloqueado
- Persiste en SharedPreferences

**Spec Técnica:**
```java
private boolean isScreenLocked = false;
private ImageButton lockButton;

// Agregar botón al layout
<ImageButton
    android:id="@+id/lock_button"
    android:layout_width="48dp"
    android:layout_height="48dp"
    android:src="@drawable/ic_lock"
    android:layout_marginStart="8dp"
    />

// En VLCPlayerActivity
lockButton.setOnClickListener(v -> {
    toggleScreenLock();
});

private void toggleScreenLock() {
    isScreenLocked = !isScreenLocked;
    updateLockUI();
    if (isScreenLocked) {
        controlsContainer.setVisibility(View.GONE);
        Toast.makeText(this, "Pantalla Bloqueada", Toast.LENGTH_SHORT).show();
    } else {
        controlsContainer.setVisibility(View.VISIBLE);
        Toast.makeText(this, "Pantalla Desbloqueada", Toast.LENGTH_SHORT).show();
    }
}
```

---

#### 2.3 ⏭️ Botones Episodio Anterior/Siguiente
**Ubicación:** Extremos de los controles (antes de tracks/channels)  
**Funcionalidad:**
- Si hay episodio anterior → botón activo
- Si no hay → mostrar Toast "Primer episodio"
- Mismo para siguiente

**Spec Técnica:**
```java
<ImageButton
    android:id="@+id/prev_chapter_button"
    android:layout_width="48dp"
    android:layout_height="48dp"
    android:src="@drawable/ic_skip_previous"
    android:layout_marginEnd="8dp"
    />

<ImageButton
    android:id="@+id/next_chapter_button"
    android:layout_width="48dp"
    android:layout_height="48dp"
    android:src="@drawable/ic_skip_next"
    android:layout_marginStart="8dp"
    />

// En VLCPlayerActivity
prevChapterButton.setOnClickListener(v -> goToPreviousChapter());
nextChapterButton.setOnClickListener(v -> goToNextChapter());

private void goToPreviousChapter() {
    if (chapterUrls == null || chapterUrls.isEmpty()) {
        Toast.makeText(this, "Primer episodio", Toast.LENGTH_SHORT).show();
        return;
    }
    int index = chapterUrls.indexOf(currentVideoUrl);
    if (index > 0) {
        currentVideoUrl = chapterUrls.get(index - 1);
        releasePlayer();
        initializePlayer();
        Toast.makeText(this, "Episodio anterior", Toast.LENGTH_SHORT).show();
    }
}
```

---

#### 2.4 🎬 Botón Velocidad de Reproducción (Speed)
**Ubicación:** Próximo a aspect ratio  
**Opciones:** 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x

**Spec Técnica:**
```java
private float currentSpeed = 1.0f;
private String[] speedOptions = {"0.75x", "1.0x", "1.25x", "1.5x", "1.75x", "2.0x"};

speedButton.setOnClickListener(v -> {
    showSpeedDialog();
});

private void showSpeedDialog() {
    AlertDialog.Builder builder = new AlertDialog.Builder(this);
    builder.setTitle("Velocidad de reproducción");
    builder.setSingleChoiceItems(speedOptions, getSpeedIndex(), 
        (dialog, which) -> {
            currentSpeed = getSpeedValue(which);
            mediaPlayer.setRate(currentSpeed);
            dialog.dismiss();
        });
    builder.show();
}
```

---

#### 2.5 📺 Doble Tap para Desbloquear Pantalla
**Funcionalidad:**
- Si pantalla está bloqueada + doble tap → desbloquear
- Feedback visual: Toast + animación

**Spec Técnica:**
```java
@Override
public boolean onDoubleTap(MotionEvent e) {
    if (isScreenLocked) {
        toggleScreenLock();
        Toast.makeText(this, "🔓 Desbloqueado", Toast.LENGTH_SHORT).show();
        return true;
    }
    return false;
}
```

---

## 🟢 PROBLEMA 3: Optimización de Rendimiento

### Estado
Ya planificado en documento separado. Incluye:
- Lazy loading de rutas
- React.memo para componentes
- Aumento de caché
- Reducción de items iniciales

---

## 📊 ORDEN DE IMPLEMENTACIÓN (RECOMENDADO)

### **Fase 1 - CRÍTICA (Hoy)**
1. ✏️ Fijar z-index del navbar móvil → **5 minutos**
2. ✏️ Cambiar +10s a +15s en VLC → **5 minutos**

### **Fase 2 - IMPORTANTE (Mañana)**
3. ✏️ Agregar botón screen lock → **20 minutos**
4. ✏️ Agregar botones episodio anterior/siguiente → **15 minutos**

### **Fase 3 - NICE-TO-HAVE (Próxima semana)**
5. ✏️ Agregar speed selector → **25 minutos**
6. ✏️ Doble tap unlock → **10 minutos**

---

## 🚀 ESTIMACIÓN
- **Total Fase 1:** 10 minutos
- **Total Fase 1+2:** 50 minutos
- **Total Fase 1+2+3:** 85 minutos

---

## ✅ CHECKLIST DE EJECUCIÓN

### Fase 1
- [ ] Aumentar z-index en App.jsx mobile menu
- [ ] Reducir z-index rating a z-10 en Card.jsx
- [ ] Cambiar 10000ms a 15000ms en VLCPlayerActivity.java

### Fase 2
- [ ] Crear recurso drawable para icono lock
- [ ] Agregar ImageButton lock_button al layout XML
- [ ] Implementar toggleScreenLock() en VLCPlayerActivity
- [ ] Agregar botones prev/next chapter al layout
- [ ] Implementar goToPreviousChapter() y goToNextChapter()

### Fase 3
- [ ] Crear speed dialog
- [ ] Implementar speedButton listener
- [ ] Agregar onDoubleTap para unlock

---
