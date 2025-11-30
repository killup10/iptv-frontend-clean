import { useState } from "react";
import axios from "axios";

const VideoForm = () => {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [url, setUrl] = useState("");
  const [tipo, setTipo] = useState("pelicula");
  const [subtipo, setSubtipo] = useState("serie");
  const [subcategoria, setSubcategoria] = useState("Netflix");
  const [customThumbnail, setCustomThumbnail] = useState("");
  const [mensaje, setMensaje] = useState("");
  // Modificado: Ahora 'seasons' es un array, cada elemento es una temporada con sus capítulos
  const [seasons, setSeasons] = useState([{ seasonNumber: 1, chapters: [{ title: "", url: "" }] }]);

  const handleAddSeason = () => {
    setSeasons([
      ...seasons,
      { seasonNumber: seasons.length + 1, chapters: [{ title: "", url: "" }] },
    ]);
  };

  const handleRemoveSeason = (seasonIndex) => {
    const newSeasons = seasons.filter((_, i) => i !== seasonIndex);
    // Reajustar los números de temporada después de eliminar
    const adjustedSeasons = newSeasons.map((season, index) => ({
      ...season,
      seasonNumber: index + 1
    }));
    setSeasons(adjustedSeasons);
  };

  const handleAddChapter = (seasonIndex) => {
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].chapters.push({ title: "", url: "" });
    setSeasons(newSeasons);
  };

  const handleChapterChange = (seasonIndex, chapterIndex, field, value) => {
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].chapters[chapterIndex][field] = value;
    setSeasons(newSeasons);
  };

  const handleRemoveChapter = (seasonIndex, chapterIndex) => {
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].chapters = newSeasons[seasonIndex].chapters.filter(
      (_, i) => i !== chapterIndex
    );
    setSeasons(newSeasons);
  };

  const handleMoveChapterUp = (seasonIndex, chapterIndex) => {
    if (chapterIndex <= 0) return;
    const newSeasons = JSON.parse(JSON.stringify(seasons));
    const chapters = newSeasons[seasonIndex].chapters;
    const tmp = chapters[chapterIndex - 1];
    chapters[chapterIndex - 1] = chapters[chapterIndex];
    chapters[chapterIndex] = tmp;
    setSeasons(newSeasons);
  };

  const handleMoveChapterDown = (seasonIndex, chapterIndex) => {
    const newSeasons = JSON.parse(JSON.stringify(seasons));
    const chapters = newSeasons[seasonIndex].chapters;
    if (chapterIndex >= chapters.length - 1) return;
    const tmp = chapters[chapterIndex + 1];
    chapters[chapterIndex + 1] = chapters[chapterIndex];
    chapters[chapterIndex] = tmp;
    setSeasons(newSeasons);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const videoData = {
        titulo,
        descripcion,
        url,
        tipo,
        customThumbnail,
      };

      if (tipo === "serie") {
        // Modificado: Enviar la estructura de temporadas
        videoData.seasons = seasons;
        videoData.subtipo = subtipo;
        videoData.subcategoria = subcategoria;
        // Puedes mantener o ajustar watchProgress según necesites a nivel de serie o capítulo
        videoData.watchProgress = {
          lastSeason: 0, // Nuevo campo para la última temporada vista
          lastChapter: 0,
          lastTime: 0,
          completed: false,
        };
      }

      const res = await axios.post("/api/videos", videoData);

      setMensaje("✅ Video creado correctamente");
      setTitulo("");
      setDescripcion("");
      setUrl("");
      setTipo("pelicula");
      setSubtipo("serie");
      setSubcategoria("Netflix");
      setCustomThumbnail("");
      // Reiniciar el estado de temporadas
      setSeasons([{ seasonNumber: 1, chapters: [{ title: "", url: "" }] }]);
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al crear el video");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-900 text-white rounded-xl max-w-xl mx-auto">
      <h2 className="text-xl font-bold">🎬 Nuevo Video</h2>

      <input
        type="text"
        placeholder="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        required
      />

      <textarea
        placeholder="Descripción (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
      />

      {tipo === "pelicula" ? (
        <input
          type="url"
          placeholder="URL (Dropbox o m3u8)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          required={tipo === "pelicula"}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold">Temporadas y Capítulos</h3>
          {seasons.map((season, seasonIndex) => (
            <div key={seasonIndex} className="space-y-3 p-4 border border-gray-700 rounded-lg bg-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium">Temporada {season.seasonNumber}</h4>
                {seasons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSeason(seasonIndex)}
                    className="text-red-500 hover:text-red-400 text-sm"
                  >
                    Eliminar Temporada
                  </button>
                )}
              </div>
              
              {season.chapters.map((chapter, chapterIndex) => (
                <div key={chapterIndex} className="space-y-2 p-3 border border-gray-700 rounded bg-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Capítulo {chapterIndex + 1}</span>
                    {season.chapters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChapter(seasonIndex, chapterIndex)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Título del capítulo"
                    value={chapter.title}
                    onChange={(e) => handleChapterChange(seasonIndex, chapterIndex, "title", e.target.value)}
                    className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                    required
                  />
                  <input
                    type="url"
                    placeholder="URL del capítulo"
                    value={chapter.url}
                    onChange={(e) => handleChapterChange(seasonIndex, chapterIndex, "url", e.target.value)}
                    className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                    required
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => handleMoveChapterUp(seasonIndex, chapterIndex)} className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">Subir</button>
                    <button type="button" onClick={() => handleMoveChapterDown(seasonIndex, chapterIndex)} className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">Bajar</button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => handleAddChapter(seasonIndex)}
                className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-white mt-3"
              >
                + Agregar Capítulo a Temporada {season.seasonNumber}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddSeason}
            className="w-full p-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
          >
            + Agregar Nueva Temporada
          </button>
        </div>
      )}

      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
      >
        <option value="pelicula">🎬 Película</option>
        <option value="serie">📺 Serie/Anime/Dorama</option>
      </select>

      {tipo === "serie" && (
        <>
          <select
            value={subtipo}
            onChange={(e) => setSubtipo(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          >
            <option value="serie">📺 Serie</option>
            <option value="anime">🎌 Anime</option>
            <option value="dorama">🎭 Dorama</option>
            <option value="novela">📖 Novela</option>
            <option value="documental">🎥 Documental</option>
          </select>

          <select
            value={subcategoria}
            onChange={(e) => setSubcategoria(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          >
            <option value="Netflix">Netflix</option>
            <option value="Prime Video">Prime Video</option>
            <option value="Disney">Disney</option>
            <option value="Apple TV">Apple TV</option>
            <option value="HBO Max">HBO Max</option>
            <option value="Hulu y Otros">Hulu y Otros</option>
            <option value="Retro">Retro</option>
            <option value="Animadas">Animadas</option>
          </select>
        </>
      )}

      <input
        type="url"
        placeholder="Miniatura personalizada (opcional)"
        value={customThumbnail}
        onChange={(e) => setCustomThumbnail(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
      />
      <p className="text-xs text-gray-400">Si no colocas una miniatura, se usará la de TMDB automáticamente.</p>

      <button type="submit" className="bg-pink-600 hover:bg-pink-700 w-full py-2 rounded text-white font-bold">
        Crear Video
      </button>

      {mensaje && <p className="text-sm text-center mt-2">{mensaje}</p>}
    </form>
  );
};

export default VideoForm;
