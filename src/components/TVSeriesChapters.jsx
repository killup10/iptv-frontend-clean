import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTVFocusZone, TV_FOCUS_ZONE_CONTENT, focusTVNav } from '../utils/tvFocusZone';
import '../styles/TVSeriesChapters.css';

/**
 * Componente TVSeriesChapters optimizado para Android TV
 * - Navegación completa con D-Pad (Arrow Keys)
 * - Selección con Enter/OK
 * - Enfoque visual claro
 * - Accesible para control remoto
 */
export default function TVSeriesChapters({ 
  seasons = [], 
  serieId, 
  currentChapter = 0,
  currentSeason = 0,
  onSelectChapter,
  watchProgress = {},
  onRequestFocusUp,
  isFocused = false,
  onBack
}) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  
  // Estado de navegación
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(currentSeason || 0);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(currentChapter || 0);
  const [focusZone, setFocusZone] = useState('seasons'); // 'seasons' | 'chapters'
  
  // Referencias para enfoque
  const seasonButtonsRef = useRef([]);
  const chapterButtonsRef = useRef([]);

  const currentSeason_ = seasons[selectedSeasonIdx];
  const chaptersInSeason = currentSeason_?.chapters || [];

  // Validaciones
  const hasSeasons = Array.isArray(seasons) && seasons.length > 0;
  const hasChapters = Array.isArray(chaptersInSeason) && chaptersInSeason.length > 0;

  // Manejo de teclas - D-Pad Navigation
  const handleKeyDown = useCallback((e) => {
    if (!isFocused) return;
    
    const key = e.key;
    
    // Si no estamos enfocados en la zona de contenido de TV, ignorar
    if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;

    switch (key) {
      case 'ArrowUp':
        if (focusZone === 'chapters') {
          e.preventDefault();
          if (selectedChapterIdx > 0) {
            setSelectedChapterIdx(prev => prev - 1);
          } else {
            setFocusZone('seasons');
          }
        } else if (focusZone === 'seasons') {
          // Si damos arriba en la zona de temporadas, devolvemos el foco al padre (botones de acción)
          e.preventDefault();
          onRequestFocusUp?.();
        }
        break;

      case 'ArrowDown':
        if (focusZone === 'chapters' && hasChapters) {
          e.preventDefault();
          setSelectedChapterIdx(prev => Math.min(chaptersInSeason.length - 1, prev + 1));
        } else if (focusZone === 'seasons' && hasChapters) {
          e.preventDefault();
          setFocusZone('chapters');
        }
        break;

      case 'ArrowLeft':
        if (focusZone === 'seasons' && hasSeasons) {
          if (selectedSeasonIdx > 0) {
            e.preventDefault();
            setSelectedSeasonIdx(prev => prev - 1);
            setSelectedChapterIdx(0);
          } else {
            // Ir al menú lateral
            e.preventDefault();
            focusTVNav();
          }
        } else if (focusZone === 'chapters') {
          e.preventDefault();
          setFocusZone('seasons');
        }
        break;

      case 'ArrowRight':
        if (focusZone === 'seasons' && hasSeasons) {
          if (selectedSeasonIdx < seasons.length - 1) {
            e.preventDefault();
            setSelectedSeasonIdx(prev => prev + 1);
            setSelectedChapterIdx(0);
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (focusZone === 'seasons' && hasChapters) {
          setFocusZone('chapters');
        } else if (focusZone === 'chapters' && hasChapters) {
          onSelectChapter?.(selectedSeasonIdx, selectedChapterIdx);
        }
        break;

      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        if (focusZone === 'chapters') {
          setFocusZone('seasons');
        } else {
          if (typeof onBack === 'function') {
            onBack();
          }
        }
        break;

      default:
        break;
    }
  }, [focusZone, selectedSeasonIdx, selectedChapterIdx, chaptersInSeason.length, seasons.length, hasSeasons, hasChapters, onRequestFocusUp, onSelectChapter]);

  // Agregar listener cuando el componente monta
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Enfocar contenedor para recibir eventos
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Actualizar enfoque visual cuando cambia el índice
  useEffect(() => {
    if (focusZone === 'seasons' && seasonButtonsRef.current[selectedSeasonIdx]) {
      seasonButtonsRef.current[selectedSeasonIdx].focus();
    } else if (focusZone === 'chapters' && chapterButtonsRef.current[selectedChapterIdx]) {
      chapterButtonsRef.current[selectedChapterIdx].focus();
    }
  }, [focusZone, selectedSeasonIdx, selectedChapterIdx]);

  const handleChapterSelect = async (seasonIdx, chapterIdx) => {
    const chapter = chaptersInSeason[chapterIdx];
    
    if (!chapter) {
      console.warn('[TVSeriesChapters] Capítulo inválido');
      return;
    }

    console.log('[TVSeriesChapters] Seleccionando capítulo:', {
      serieId,
      seasonIndex: seasonIdx,
      chapterIndex: chapterIdx,
      title: chapter.title
    });

    // Detener reproducción en VLC si está corriendo (Android TV)
    if (typeof window !== 'undefined' && window.VideoPlayerPlugin) {
      try {
        console.log('[TVSeriesChapters] Deteniendo VLC...');
        await Promise.race([
          window.VideoPlayerPlugin.stopVideo?.(),
          new Promise(resolve => setTimeout(resolve, 400))
        ]).catch(() => {});
      } catch (err) {
        console.error('[TVSeriesChapters] Error al detener VLC:', err);
      }
    }

    // Llamar callback si existe
    if (typeof onSelectChapter === 'function') {
      onSelectChapter(seasonIdx, chapterIdx);
      return;
    }

    // Si no hay callback, navegar
    navigate(`/watch/serie/${serieId}`, {
      replace: true,
      state: { seasonIndex: seasonIdx, chapterIndex: chapterIdx, continueWatching: false }
    });
  };

  if (!hasSeasons) {
    return (
      <div className="tv-series-chapters-error">
        <p>No hay temporadas disponibles para esta serie</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="tv-series-chapters-container"
      tabIndex={0}
    >
      {/* Información */}
      <div className="tsc-info">
        <h3 className="tsc-title">Selecciona una temporada y episodio</h3>
        <p className="tsc-hint">
          {focusZone === 'seasons' 
            ? '← → para cambiar temporada | ↓ para ver episodios'
            : '↑ ↓ para navegar episodios | ← volver a temporadas | ENTER para reproducir'}
        </p>
      </div>

      {/* Selector de Temporadas */}
      <div className="tsc-seasons-section">
        <h4 className="tsc-section-title">Temporadas</h4>
        <div className="tsc-seasons-grid">
          {seasons.map((season, idx) => {
            const isSelected = selectedSeasonIdx === idx;
            const isFocused = focusZone === 'seasons' && isSelected;

            return (
              <button
                key={idx}
                ref={el => seasonButtonsRef.current[idx] = el}
                onClick={() => {
                  setSelectedSeasonIdx(idx);
                  setSelectedChapterIdx(0);
                  setFocusZone('seasons');
                }}
                className={`tsc-season-button ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
              >
                <span className="tsc-season-number">T{season.seasonNumber || (idx + 1)}</span>
                {isFocused && <span className="tsc-focus-indicator">●</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de Capítulos */}
      {hasChapters && (
        <div className="tsc-chapters-section">
          <h4 className="tsc-section-title">
            Episodios de Temporada {currentSeason_?.seasonNumber || (selectedSeasonIdx + 1)}
          </h4>
          <div className="tsc-chapters-container">
            {chaptersInSeason.map((chapter, idx) => {
              const isSelected = selectedChapterIdx === idx;
              const isFocused = focusZone === 'chapters' && isSelected;
              const isPlaying = idx === currentChapter && selectedSeasonIdx === currentSeason;
              const progress = watchProgress?.seasons?.[selectedSeasonIdx]?.chapters?.[idx]?.progress;

              return (
                <button
                  key={idx}
                  ref={el => chapterButtonsRef.current[idx] = el}
                  onClick={() => {
                    setSelectedChapterIdx(idx);
                    setFocusZone('chapters');
                    // Auto-select on click
                    handleChapterSelect(selectedSeasonIdx, idx);
                  }}
                  className={`tsc-chapter-button ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''} ${isPlaying ? 'playing' : ''}`}
                >
                  <div className="tsc-chapter-content">
                    <div className="tsc-chapter-header">
                      <span className="tsc-chapter-number">E{chapter.episodeNumber || (idx + 1)}</span>
                      {chapter.duration && (
                        <span className="tsc-chapter-duration">⏱️ {chapter.duration}</span>
                      )}
                    </div>
                    <p className="tsc-chapter-title">{chapter.title || `Episodio ${idx + 1}`}</p>
                    {progress && (
                      <div className="tsc-chapter-progress">
                        <div className="tsc-progress-bar">
                          <div className="tsc-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
                        </div>
                        <span className="tsc-progress-text">{Math.round(progress * 100)}% visto</span>
                      </div>
                    )}
                  </div>
                  {isFocused && <span className="tsc-focus-indicator">▶</span>}
                  {isPlaying && <span className="tsc-playing-indicator">📺 REPRODUCIENDO</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón de ayuda */}
      <div className="tsc-help">
        <p>Presiona ESC/BACK para volver</p>
      </div>
    </div>
  );
}
