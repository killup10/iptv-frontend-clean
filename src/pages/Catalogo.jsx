import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export function Catalogo({ type }) {
  const [contenido, setContenido] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const fetchContenido = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://iptv-backend-qhbr.onrender.com/api/videos", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = res.data;
        const filtradoTipo = type ? data.filter(item => item.tipo === type) : data;

        // Filtrar por búsqueda
        const filtradoBusqueda = filtradoTipo.filter(item =>
          item.title?.toLowerCase().includes(busqueda.toLowerCase())
        );

        setContenido(filtradoBusqueda);
      } catch (error) {
        console.error("Error al cargar el catálogo:", error);
      }
    };

    fetchContenido();
  }, [type, busqueda]);

  if (!Array.isArray(contenido)) {
    return <p className="text-red-500">Error al cargar contenido.</p>;
  }

  return (
    <div className="p-4 text-white">
      <h1 className="text-3xl font-bold mb-4">Catálogo de Contenido</h1>

      <input
        type="text"
        placeholder="Buscar por título..."
        className="mb-4 p-2 w-full rounded bg-zinc-700 text-white"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {contenido.map((item) => (
          <Link to={`/watch/${item._id}`} key={item._id}>
            <div className="bg-zinc-800 rounded-xl overflow-hidden shadow-md hover:scale-105 transition">
              <img src={item.customThumbnail || item.thumbnail || item.logo || item.tmdbThumbnail || "https://via.placeholder.com/300x150?text=Video"} alt={item.title} className="w-full h-48 object-cover" />
              <div className="p-2">
                <h2 className="text-lg font-semibold">{item.title || item.titulo}</h2>
                <p className="text-sm text-gray-400">{item.group || item.tipo}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Catalogo;
