import { useState, useEffect } from 'react';

/**
 * Hook que retrasa la actualización de un valor.
 * @param value El valor a retrasar (ej. el texto de un input).
 * @param delay El tiempo de retraso en milisegundos.
 * @returns El valor después del retraso.
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Crea un temporizador para actualizar el valor "debounced"
    // solo después de que el `delay` haya pasado sin que `value` cambie.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el temporizador si el `value` cambia (ej. el usuario sigue escribiendo)
    // o si el componente se desmonta.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se vuelve a ejecutar si `value` o `delay` cambian

  return debouncedValue;
}