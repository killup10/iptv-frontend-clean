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

  useEffect(() => {
    // Sincroniza el estado de la temporada seleccionada con el prop que viene de la navegación.
    // Esto asegura que si se navega a un capítulo de una temporada específica, se muestre la temporada correcta.
    if (initialCurrentSeason !== undefined && initialCurrentSeason !== selectedSeasonIndex) {
      setSelectedSeasonIndex(initialCurrentSeason);
    }
  }, [initialCurrentSeason, selectedSeasonIndex]);


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
      <div className="bg-zinc-800 rounded-lg p-4 mt-4">
        <h3 className="text-xl font-semibold text-white mb-4">Capítulos</h3>
        <p className="text-gray-400">No hay temporadas ni capítulos disponibles para esta serie.</p>
      </div>
    );
  }

  console.log('[SeriesChapters] Renderizando capítulos:', {
    seasonsCount: seasons.length,
    selectedSeasonIndex,
    currentChapter,
    serieId
  });

  // Determinar si el capítulo actual es el que se está reproduciendo
  const isCurrentPlaying = (seasonIdx, chapterIdx) => {
    // Necesitas pasar la temporada actual desde el Watch.jsx a este componente
    // o inferirla del currentChapter si solo se pasa un índice global de capítulo
    // Por simplicidad, asumimos que currentChapter se refiere al índice dentro de la temporada actual.
    // Para una implementación más robusta, Watch.jsx debería pasar both currentSeasonIndex and currentChapterIndex.
    // Asumiendo que `currentSeason` en `watchProgress` indica la temporada que se está viendo
    return watchProgress?.lastSeason === seasonIdx && watchProgress?.lastChapter === chapterIdx;
  };


  return (
    <div className="bg-zinc-800 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">
          Temporadas ({seasons.length})
        </h3>
        {/* Selector de temporadas */}
        <select
          value={selectedSeasonIndex}
          onChange={(e) => setSelectedSeasonIndex(Number(e.target.value))}
          className="px-3 py-1 rounded bg-zinc-700 text-white border border-zinc-600"
        >
          {seasons.map((season, index) => (
            <option key={index} value={index}>
              Temporada {season.seasonNumber || (index + 1)}
            </option>
          ))}
        </select>
      </div>

      {currentSeason && (
        <>
          <h4 className="text-lg font-bold text-white mb-3">
            Capítulos de Temporada {currentSeason.seasonNumber || (selectedSeasonIndex + 1)} ({chaptersInSelectedSeason.length})
          </h4>
          {chaptersInSelectedSeason.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chaptersInSelectedSeason.map((chapter, index) => {
                // Validar que cada capítulo tenga los campos necesarios
                if (!chapter || !chapter.title || !chapter.url) {
                  console.warn('[SeriesChapters] Capítulo inválido en índice:', index, chapter);
                  return (
                    <div key={index} className="w-full text-left p-3 rounded bg-zinc-700 opacity-50">
                      <span className="text-gray-400">
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
                    className={`w-full text-left p-3 rounded transition-colors ${
                      isPlaying
                        ? 'bg-pink-600 text-white'
                        : 'bg-zinc-700 hover:bg-zinc-600 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="font-medium block">
                          Capítulo {index + 1}: {chapter.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {chapter.duration && (
                            <span className="text-xs text-gray-400">
                              Duración: {chapter.duration}
                            </span>
                          )}
                          {progressData?.seasons?.[selectedSeasonIndex]?.chapters?.[index]?.progress && (
                            <span className="text-xs text-green-400">
                              {Math.round(progressData.seasons[selectedSeasonIndex].chapters[index].progress * 100)}% visto
                            </span>
                          )}
                        </div>
                      </div>

                      {isPlaying && (
                        <span className="text-sm bg-pink-700 px-2 py-1 rounded ml-2 flex-shrink-0">
                          Reproduciendo
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 mt-8">
              No hay capítulos disponibles para esta temporada.
            </p>
          )}
        </>
      )}
      
      {/* Botón para continuar viendo desde el último capítulo (si hay progreso) */}
      {progressData?.lastSeason !== undefined && progressData?.lastChapter !== undefined && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <button
            onClick={() => handleChapterClick(progressData.lastSeason, progressData.lastChapter)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors relative overflow-hidden"
          >
            {progressData?.seasons?.[progressData.lastSeason]?.chapters?.[progressData.lastChapter]?.progress && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-green-500"
                style={{ width: `${progressData.seasons[progressData.lastSeason].chapters[progressData.lastChapter].progress * 100}%` }}
              />
            )}
            Continuar viendo - Temporada {seasons[progressData.lastSeason]?.seasonNumber || (progressData.lastSeason + 1)}, Capítulo {progressData.lastChapter + 1}
          </button>
        </div>
      )}
    </div>
  );
};

export default SeriesChapters;
