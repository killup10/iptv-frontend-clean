import { useEffect } from 'react';
import { focusTVNav, getTVFocusZone, TV_FOCUS_ZONE_CONTENT } from '../utils/tvFocusZone.js';

/**
 * Hook para permitir salir de estados vacíos o de carga en Android TV
 * cuando no hay elementos enfocables en el DOM y el usuario presiona
 * las flechas o el botón de atrás.
 * 
 * @param {boolean} isActive - Si es true, el listener de teclado se activa
 */
export function useTVEmptyStateEscaper(isActive) {
  useEffect(() => {
    if (!isActive) return;

    const handleEmptyKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;

      const keysToNav = ['ArrowUp', 'ArrowLeft', 'Escape', 'Backspace', 'GoBack', 'BrowserBack'];
      const keyCodesToNav = [19, 21, 4, 8, 27, 111]; // Up, Left, Back, Esc

      if (keysToNav.includes(event.key) || keyCodesToNav.includes(event.keyCode)) {
        event.preventDefault();
        focusTVNav();
      }
    };

    window.addEventListener('keydown', handleEmptyKeyDown);
    return () => window.removeEventListener('keydown', handleEmptyKeyDown);
  }, [isActive]);
}
