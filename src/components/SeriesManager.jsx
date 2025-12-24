import { useState, useEffect } from "react";
import axios from "axios";
import { normalizeSearchText } from "../utils/searchUtils.js";

const SeriesManager = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSeries = async () => {
    try {
      // Fetch series
      const seriesResponse = await axios.get("/api/videos", {
        params: {
          view: 'admin',
          tipo: "serie",
          limit: 100
        }
      });
      
      // Fetch anime
      const animeResponse = await axios.get("/api/videos", {
        params: {
          view: 'admin',
          tipo: "anime",
          limit: 100
        }
      });
      
      // Combine both results
      const allSeries = [
        ...(seriesResponse.data.videos || []),
        ...(animeResponse.data.videos || [])
      ];
      
      setSeries(allSeries);
    } catch (err) {
      console.error("Error fetching series:", err);
      setError("Error al cargar las series");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const handleUpdateSeries = async (seriesData) => {
    try {
      await axios.put(`/api/videos/${seriesData._id}`, seriesData);
      setEditingSeries(null);
      fetchSeries();
    } catch (err) {
      console.error("Error updating series:", err);
      setError("Error al actualizar la serie");
    }
  };

  const filteredSeries = series.filter(serie => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    const normalizedTitle = normalizeSearchText(serie.title || '');
    return normalizedTitle.includes(normalizedSearch);
  });

  if (loading) return <div className="text-center p-4">Cargando series...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestionar Series</h2>
        <input
          type="text"
          placeholder="Buscar series..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700"
        />
      </div>

      <div className="grid gap-4">
        {filteredSeries.map((serie) => (
          <div key={serie._id} className="bg-gray-800 p-4 rounded-lg">
            {editingSeries?._id === serie._id ? (
              <SeriesEditor
                series={serie}
                onSave={handleUpdateSeries}
                onCancel={() => setEditingSeries(null)}
              />
            ) : (
              <SeriesPreview
                series={serie}
                onEdit={() => setEditingSeries(serie)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const SeriesPreview = ({ series, onEdit }) => (
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold">{series.title}</h3>
      <p className="text-sm text-gray-400">
        {series.tipo === 'anime' ? '🎌 Anime' : '📺 Serie'} • 
        {/* Modificado: Sumar capítulos de todas las temporadas */}
        {series.seasons ? series.seasons.reduce((acc, season) => acc + (season.chapters?.length || 0), 0) : 0} capítulos
      </p>
    </div>
    <button
      onClick={onEdit}
      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
    >
      Editar
    </button>
  </div>
);

const SeriesEditor = ({ series, onSave, onCancel }) => {
  const [editedSeries, setEditedSeries] = useState(series);

  // Modificado: Funciones para manejar temporadas y capítulos anidados
  const handleSeasonChange = (seasonIndex, field, value) => {
    const newSeasons = [...editedSeries.seasons];
    newSeasons[seasonIndex][field] = value;
    setEditedSeries({ ...editedSeries, seasons: newSeasons });
  };

  const handleAddSeason = () => {
    setEditedSeries({
      ...editedSeries,
      seasons: [
        ...editedSeries.seasons,
        { seasonNumber: editedSeries.seasons.length + 1, chapters: [{ title: "", url: "" }] }
      ]
    });
  };

  const handleRemoveSeason = (seasonIndex) => {
    const newSeasons = editedSeries.seasons.filter((_, i) => i !== seasonIndex);
    // Reajustar los números de temporada después de eliminar
    const adjustedSeasons = newSeasons.map((season, index) => ({
      ...season,
      seasonNumber: index + 1
    }));
    setEditedSeries({ ...editedSeries, seasons: adjustedSeasons });
  };

  const handleChapterChange = (seasonIndex, chapterIndex, field, value) => {
    const newSeasons = [...editedSeries.seasons];
    newSeasons[seasonIndex].chapters[chapterIndex][field] = value;
    setEditedSeries({ ...editedSeries, seasons: newSeasons });
  };

  const handleAddChapter = (seasonIndex) => {
    const newSeasons = [...editedSeries.seasons];
    newSeasons[seasonIndex].chapters.push({ title: `Capítulo ${newSeasons[seasonIndex].chapters.length + 1}`, url: "" });
    setEditedSeries({ ...editedSeries, seasons: newSeasons });
  };

  const handleRemoveChapter = (seasonIndex, chapterIndex) => {
    const newSeasons = [...editedSeries.seasons];
    newSeasons[seasonIndex].chapters = newSeasons[seasonIndex].chapters.filter((_, i) => i !== chapterIndex);
    setEditedSeries({ ...editedSeries, seasons: newSeasons });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          type="text"
          value={editedSeries.title}
          onChange={(e) => setEditedSeries({ ...editedSeries, title: e.target.value })}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600"
        />
        <select
          value={editedSeries.tipo}
          onChange={(e) => setEditedSeries({ ...editedSeries, tipo: e.target.value })}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600"
        >
          <option value="serie">📺 Serie</option>
          <option value="anime">🎌 Anime</option>
          <option value="dorama">🎭 Dorama</option>
          <option value="novela">📖 Novela</option>
          <option value="documental">🎥 Documental</option>
        </select>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Temporadas y Capítulos</h4>
        {(editedSeries.seasons || []).map((season, seasonIndex) => (
          <div key={seasonIndex} className="space-y-3 p-4 border border-gray-700 rounded-lg bg-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h5 className="text-lg font-medium">Temporada {season.seasonNumber}</h5>
              {editedSeries.seasons.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSeason(seasonIndex)}
                  className="text-red-500 hover:text-red-400 text-sm"
                >
                  Eliminar Temporada
                </button>
              )}
            </div>
            
            {(season.chapters || []).map((chapter, chapterIndex) => (
              <div key={chapterIndex} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={chapter.title}
                  onChange={(e) => handleChapterChange(seasonIndex, chapterIndex, "title", e.target.value)}
                  className="flex-1 p-2 rounded bg-gray-800 border border-gray-700"
                  placeholder="Título del capítulo"
                />
                <input
                  type="text"
                  value={chapter.url}
                  onChange={(e) => handleChapterChange(seasonIndex, chapterIndex, "url", e.target.value)}
                  className="flex-2 p-2 rounded bg-gray-800 border border-gray-700"
                  placeholder="URL del capítulo"
                />
                <button
                  onClick={() => handleRemoveChapter(seasonIndex, chapterIndex)}
                  className="text-red-500 hover:text-red-400 px-2"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddChapter(seasonIndex)}
              className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded mt-3"
            >
              + Agregar Capítulo a Temporada {season.seasonNumber}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddSeason}
          className="w-full p-2 bg-purple-600 hover:bg-purple-700 rounded"
        >
          + Agregar Nueva Temporada
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(editedSeries)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default SeriesManager;
