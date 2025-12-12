import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SeriesChapters = ({ seasons, serieId, currentChapter, watchProgress, currentSeason: initialCurrentSeason }) => {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState(watchProgress || {});
  // Estado para la temporada seleccionada
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(initialCurrentSeason || 0);

  // Asegurarse de que seasons es un array y tiene contenido
  const validSeasons = Array.isArray(seasons) && seasons.length > 0;
  const currentSeason = validSeasons ? seasons[selectedSeasonIndex] : null;
  const chaptersInSelectedSeason = currentSeason ? currentSeason.chapters : [];

  // 🔧 FIX: Sincronizar temporada seleccionada cuando cambia initialCurrentSeason
  // Este efecto SIEMPRE debe actualizar cuando initialCurrentSeason cambia, incluso en Electron
  useEffect(() => {
    if (initialCurrentSeason !== undefined && typeof initialCurrentSeason === 'number') {
      console.log('[SeriesChapters] FIX: Actualizando temporada seleccionada:', { 
        initialCurrentSeason, 
        currentSelected: selectedSeasonIndex,
        willUpdate: initialCurrentSeason !== selectedSeasonIndex
      });
      setSelectedSeasonIndex(initialCurrentSeason);
    }
  }, [initialCurrentSeason]); // ✅ Dependencia SOLO en initialCurrentSeason


  console.log("[SeriesChapters] Props recibidos:", {
    seasons,
    serieId,
    currentChapter,
    watchProgress,
    seasonsIsArray: Array.isArray(seasons),
    seasonsLength: seasons?.length,
    selectedSeasonIndex,
    currentSeason: currentSeason?.seasonNumber,
  });

  const handleChapterClick = async (seasonIdx, chapterIdx) => {
    console.log("[SeriesChapters] Navegando a capítulo:", {
      serieId,
      seasonIndex: seasonIdx,
      chapterIndex: chapterIdx,
      chapterTitle: seasons[seasonIdx]?.chapters[chapterIdx]?.title
    });
    
    // Detener MPV antes de navegar si estamos en Electron
    if (typeof window !== 'undefined' && window.electronMPV) {
      try {
        console.log('[SeriesChapters] Deteniendo MPV antes de cambiar capítulo...');
        await window.electronMPV.stop();
        // Pequeña pausa para asegurar que MPV se haya cerrado
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error('[SeriesChapters] Error al detener MPV:', err);
      }
    }
    
    navigate(`/watch/serie/${serieId}`, {
      state: { seasonIndex: seasonIdx, chapterIndex: chapterIdx }
    });
  };

  // Validar que seasons sea un array válido
  if (!validSeasons) {
    console.log('[SeriesChapters] No hay temporadas válidas:', {
      seasons,
      isArray: Array.isArray(seasons),
      length: seasons?.length
    });
    return (
      <div className="description-gradient p-6 rounded-xl shadow-glow-secondary backdrop-blur-sm relative z-10">
        <h3 className="text-2xl font-bold text-primary text-glow-primary mb-4 flex items-center">
          <span className="w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-full mr-3"></span>
          Capítulos
        </h3>
        <p className="text-muted-foreground" style={{ color: 'hsl(var(--muted-foreground))' }}>
          No hay temporadas ni capítulos disponibles para esta serie.
        </p>
      </div>
    );
  }

  console.log('[SeriesChapters] Renderizando capítulos:', {
    seasonsCount: seasons.length,
    selectedSeasonIndex,
    currentChapter,
    serieId
  });

  const isCurrentPlaying = (seasonIdx, chapterIdx) => {
    return seasonIdx === selectedSeasonIndex && chapterIdx === currentChapter;
  };


  return (
    <div className="relative z-10">
      <style>{`
        .chapter-button {
          background: linear-gradient(135deg, 
            hsl(var(--card-background) / 0.8) 0%, 
            hsl(var(--card-background) / 0.6) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          backdrop-filter: blur(8px);
        }
        .chapter-button:hover {
          background: linear-gradient(135deg, 
            hsl(var(--primary) / 0.2) 0%, 
            hsl(var(--secondary) / 0.2) 100%);
          border: 1px solid hsl(var(--primary) / 0.4);
          box-shadow: 0 0 15px hsl(var(--primary) / 0.3);
        }
        .chapter-button.playing {
          background: linear-gradient(135deg, 
            hsl(var(--secondary) / 0.8) 0%, 
            hsl(var(--primary) / 0.8) 100%);
          border: 1px solid hsl(var(--secondary) / 0.6);
          box-shadow: 0 0 20px hsl(var(--secondary) / 0.5);
        }
        .season-selector {
          background: hsl(var(--card-background) / 0.9);
          border: 1px solid hsl(var(--primary) / 0.3);
          color: hsl(var(--foreground));
        }
        .season-selector:focus {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 10px hsl(var(--primary) / 0.5);
        }
      `}</style>
      
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-xl font-bold text-primary text-glow-primary">
          Temporadas ({seasons.length})
        </h4>
        {/* Selector de temporadas */}
        <select
          value={selectedSeasonIndex}
          onChange={(e) => setSelectedSeasonIndex(Number(e.target.value))}
          className="season-selector px-4 py-2 rounded-lg transition-all duration-300"
        >
          {seasons.map((season, index) => (
            <option key={index} value={index} style={{ backgroundColor: 'hsl(var(--card-background))' }}>
              Temporada {season.seasonNumber || (index + 1)}
            </option>
          ))}
        </select>
      </div>

      {currentSeason && (
        <>
          <h5 className="text-lg font-semibold text-secondary text-glow-secondary mb-4">
            Capítulos de Temporada {currentSeason.seasonNumber || (selectedSeasonIndex + 1)} ({chaptersInSelectedSeason.length})
          </h5>
          {chaptersInSelectedSeason.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {chaptersInSelectedSeason.map((chapter, index) => {
                // Validar que cada capítulo tenga los campos necesarios
                if (!chapter || !chapter.title || !chapter.url) {
                  console.warn('[SeriesChapters] Capítulo inválido en índice:', index, chapter);
                  return (
                    <div key={index} className="w-full text-left p-4 rounded-lg chapter-button opacity-50 cursor-not-allowed">
                      <span className="text-muted-foreground" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Capítulo {index + 1}: Datos incompletos
                      </span>
                    </div>
                  );
                }

                const isPlaying = isCurrentPlaying(selectedSeasonIndex, index);

                return (
                  <button
                    key={index}
                    onClick={() => handleChapterClick(selectedSeasonIndex, index)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleChapterClick(selectedSeasonIndex, index);
                    }}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] ${
                      isPlaying ? 'chapter-button playing' : 'chapter-button'
                    }`}
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="font-semibold block text-foreground" style={{ color: 'hsl(var(--foreground))' }}>
                          Capítulo {index + 1}: {chapter.title}
                        </span>
                        <div className="flex items-center gap-3 mt-2">
                          {chapter.duration && (
                            <span className="text-xs text-muted-foreground" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              ⏱️ {chapter.duration}
                            </span>
                          )}
                          {progressData?.seasons?.[selectedSeasonIndex]?.chapters?.[index]?.progress && (
                            <span className="text-xs text-primary font-medium">
                              📊 {Math.round(progressData.seasons[selectedSeasonIndex].chapters[index].progress * 100)}% visto
                            </span>
                          )}
                        </div>
                      </div>

                      {isPlaying && (
                        <span className="text-sm px-3 py-1 rounded-full ml-3 flex-shrink-0 font-medium text-glow-secondary"
                              style={{ 
                                backgroundColor: 'hsl(var(--secondary) / 0.3)',
                                color: 'hsl(var(--secondary))',
                                border: '1px solid hsl(var(--secondary) / 0.5)'
                              }}>
                          ▶️ Reproduciendo
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground mt-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
              No hay capítulos disponibles para esta temporada.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default SeriesChapters;
