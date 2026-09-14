/**
 * Resolutor canonico de teclas de control remoto / D-Pad para Android TV.
 *
 * Unifica lo que antes estaba duplicado (y divergente) en cada componente:
 * algunos solo miraban `event.key` (falla en WebView reales que mandan
 * `key: "Unidentified"`), otros solo `event.keyCode` (deprecated y distinto
 * segun IME/navegador). Este modulo mira ambos y devuelve un nombre canonico.
 *
 * Nombres canonicos: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' |
 * 'Enter' | 'Escape' | 'Backspace' | null
 *
 * - 'Enter' incluye OK del mando (keyCode 23/66/62), Space, Select y MediaPlayPause.
 * - 'Escape' incluye BACK del sistema (keyCode 4), Esc (27), 111, GoBack/BrowserBack.
 * - 'Backspace' (keyCode 8/46) se reporta aparte para que cada superficie
 *   decida: borrar texto si hay un input enfocado, o volver atras si no.
 */

export const TV_KEY_UP = 'ArrowUp';
export const TV_KEY_DOWN = 'ArrowDown';
export const TV_KEY_LEFT = 'ArrowLeft';
export const TV_KEY_RIGHT = 'ArrowRight';
export const TV_KEY_ENTER = 'Enter';
export const TV_KEY_ESCAPE = 'Escape';
export const TV_KEY_BACKSPACE = 'Backspace';

const ARROW_KEYS = [TV_KEY_UP, TV_KEY_DOWN, TV_KEY_LEFT, TV_KEY_RIGHT];

export function getTVKeyName(event) {
  if (!event) return null;

  const key = event.key;

  // 1. Nombre moderno conocido (navegadores desktop, emulador con teclado).
  if (typeof key === 'string' && key && key !== 'Unidentified') {
    if (key === ' ' || key === 'Spacebar' || key === 'Select' || key === 'MediaPlayPause') {
      return TV_KEY_ENTER;
    }
    if (key === 'GoBack' || key === 'BrowserBack') {
      return TV_KEY_ESCAPE;
    }
    if (key === 'Backspace' || key === 'Delete') {
      return TV_KEY_BACKSPACE;
    }
    if (
      key === TV_KEY_UP ||
      key === TV_KEY_DOWN ||
      key === TV_KEY_LEFT ||
      key === TV_KEY_RIGHT ||
      key === TV_KEY_ENTER ||
      key === TV_KEY_ESCAPE
    ) {
      return key;
    }
    // Tecla de texto u otra: se deja pasar como no-accion (typing, etc).
    if (key.length === 1) return null;
    return null;
  }

  // 2. WebView de Android TV / FireStick: keyCode es la fuente de verdad.
  switch (event.keyCode) {
    case 19:
      return TV_KEY_UP;
    case 20:
      return TV_KEY_DOWN;
    case 21:
      return TV_KEY_LEFT;
    case 22:
      return TV_KEY_RIGHT;
    case 23: // DPAD_CENTER
    case 62: // SPACE (algunos mandos)
    case 66: // ENTER
      return TV_KEY_ENTER;
    case 32: // Space legacy
    case 13: // Enter legacy
      return TV_KEY_ENTER;
    case 4: // BACK del sistema Android
    case 27: // Esc
    case 111: // Esc (algunos firmwares)
      return TV_KEY_ESCAPE;
    case 8: // Backspace
    case 46: // Delete
      return TV_KEY_BACKSPACE;
    default:
      return null;
  }
}

export function isTVArrowKey(keyName) {
  return ARROW_KEYS.includes(keyName);
}

/** true si hay que bloquear el scroll nativo para esa tecla. */
export function shouldBlockTVScroll(event, keyName) {
  const name = keyName || getTVKeyName(event);
  if (ARROW_KEYS.includes(name)) return true;
  // Space hace scroll nativo cuando no hay input enfocado.
  if (event && (event.key === ' ' || event.keyCode === 32) && !isEditableTVElement(document.activeElement)) {
    return true;
  }
  return false;
}

export function isEditableTVElement(element) {
  if (!element) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable === true
  );
}

/**
 * BACK del mando: Escape siempre; Backspace/Delete solo fuera de inputs.
 * Centraliza la regla que AppTV, Watch y Search implementaban cada uno
 * con una lista distinta de keyCodes.
 */
export function isTVBackKey(event, keyName) {
  const name = keyName || getTVKeyName(event);
  if (name === TV_KEY_ESCAPE) return true;
  if (name === TV_KEY_BACKSPACE && !isEditableTVElement(typeof document !== 'undefined' ? document.activeElement : null)) {
    return true;
  }
  return false;
}

/**
 * Navegacion espacial entre elementos que visualmente forman filas
 * (botones de accion del detalle, resultados del picker, etc).
 * Devuelve el indice del mejor candidato en la direccion indicada, o el
 * indice actual si no hay ninguno (borde). Evita hardcodear columnas cuando
 * el layout hace wrap segun el ancho de la TV.
 */
export function moveSpatialIndex(elements, currentIndex, direction) {
  const list = Array.isArray(elements) ? elements.filter(Boolean) : [];
  if (list.length === 0) return currentIndex;

  const current = list[currentIndex] || list[0];
  if (!current || typeof current.getBoundingClientRect !== 'function') {
    return currentIndex;
  }

  const rect = current.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let bestIndex = currentIndex;
  let bestScore = Infinity;

  list.forEach((element, index) => {
    if (index === currentIndex || typeof element.getBoundingClientRect !== 'function') return;
    const other = element.getBoundingClientRect();
    const ocx = other.left + other.width / 2;
    const ocy = other.top + other.height / 2;

    let primary = 0;
    let secondary = 0;
    if (direction === 'up') {
      primary = cy - ocy;
      secondary = Math.abs(ocx - cx);
      if (ocy >= cy - 4) return;
    } else if (direction === 'down') {
      primary = ocy - cy;
      secondary = Math.abs(ocx - cx);
      if (ocy <= cy + 4) return;
    } else if (direction === 'left') {
      primary = cx - ocx;
      secondary = Math.abs(ocy - cy);
      if (ocx >= cx - 4) return;
    } else if (direction === 'right') {
      primary = ocx - cx;
      secondary = Math.abs(ocy - cy);
      if (ocx <= cx + 4) return;
    } else {
      return;
    }

    if (primary <= 0) return;
    const score = primary * 3 + secondary;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}
