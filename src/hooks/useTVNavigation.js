import React, { useEffect, useRef, useState } from 'react';
import { isAndroidTV } from '../utils/platformUtils';

/**
 * Hook para manejar navegación en Android TV con D-Pad
 * Soporta:
 * - Teclas de dirección (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 * - Enter/OK para seleccionar
 * - Escape/Back para volver
 * - Keys de medios (MediaPlay, MediaPause, etc)
 */
export const useTVNavigation = (options = {}) => {
  const {
    onUp,
    onDown,
    onLeft,
    onRight,
    onEnter,
    onBack,
    onPlay,
    onPause,
    enabled = isAndroidTV(),
  } = options;

  const focusedElementRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Arrow keys
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUp?.();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onDown?.();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onLeft?.();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onRight?.();
      }
      // Enter/OK
      else if (e.key === 'Enter' || e.key === 'MediaPlayPause') {
        e.preventDefault();
        onEnter?.();
      }
      // Back/Escape
      else if (e.key === 'Escape' || e.key === 'MediaTrackPrevious') {
        e.preventDefault();
        onBack?.();
      }
      // Media keys
      else if (e.key === 'MediaPlay') {
        e.preventDefault();
        onPlay?.();
      } else if (e.key === 'MediaPause') {
        e.preventDefault();
        onPause?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onUp, onDown, onLeft, onRight, onEnter, onBack, onPlay, onPause]);

  /**
   * Maneja el enfoque visual en elementos navegables
   */
  const setFocusedElement = (element) => {
    if (focusedElementRef.current) {
      focusedElementRef.current.classList.remove('tv-focused');
    }
    if (element) {
      element.classList.add('tv-focused');
      focusedElementRef.current = element;
      // Scroll al elemento si es necesario
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return {
    setFocusedElement,
    focusedElementRef,
    isEnabled: enabled,
  };
};

/**
 * Hook para manejar grillas de elementos en TV (2D navigation)
 */
export const useTVGrid = (items = [], columns = 4) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const navigate = (direction) => {
    const rows = Math.ceil(items.length / columns);
    const row = Math.floor(currentIndex / columns);
    const col = currentIndex % columns;

    let newIndex = currentIndex;

    switch (direction) {
      case 'up':
        if (row > 0) {
          newIndex = (row - 1) * columns + col;
        }
        break;
      case 'down':
        if (row < rows - 1) {
          newIndex = (row + 1) * columns + col;
        }
        break;
      case 'left':
        if (col > 0) {
          newIndex = row * columns + (col - 1);
        }
        break;
      case 'right':
        if (col < columns - 1 && currentIndex < items.length - 1) {
          newIndex = row * columns + (col + 1);
        }
        break;
    }

    setCurrentIndex(Math.min(newIndex, items.length - 1));
  };

  return {
    currentIndex,
    setCurrentIndex,
    navigate,
    currentItem: items[currentIndex],
  };
};

export default useTVNavigation;
