import React from "react";
import { useParams } from "react-router-dom";
import { VideoPlayer } from "../components/VideoPlayer";

export const Player = () => {
  const { id } = useParams();

  // Simulamos una base de datos simple de películas usando enlaces de Dropbox
  const peliculas = {
    "1": {
      titulo: "Ejemplo Película 4K",
      url: "https://www.dropbox.com/s/ejemplo-pelicula-4k.mp4?dl=1"
    },
    "2": {
      titulo: "Otra Película 4K",
      url: "https://www.dropbox.com/s/otra-pelicula-4k.mp4?dl=1"
    }
  };

  const pelicula = peliculas[id];

  if (!pelicula) {
    return <div>Película no encontrada</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{pelicula.titulo}</h1>
      <VideoPlayer url={pelicula.url} support4K={true} />
    </div>
  );
};

// Añade esta línea para exportar por defecto
export default Player;