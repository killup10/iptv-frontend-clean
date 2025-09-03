import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Loader } from "../components/Loader"; // Suponiendo que tienes un componente Loader

export function Catalogo({ type }) {
  const [contenido, setContenido] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchContenido = useCallback(async (currentPage) => {
    if (loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {
        limit: 50,
        page: currentPage,
        tipo: type,
        title: busqueda,
      };

      const res = await axios.get("https://iptv-backend-w6hf.onrender.com/api/videos", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const data = res.data;

      if (data.length > 0) {
        setContenido(prev => currentPage === 1 ? data : [...prev, ...data]);
        setPage(currentPage + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error al cargar el catálogo:", error);
    } finally {
      setLoading(false);
    }
  }, [type, busqueda, loading]);

  useEffect(() => {
    setContenido([]);
    setPage(1);
    setHasMore(true);
    fetchContenido(1);
  }, [type, busqueda]);

  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop < document.documentElement.offsetHeight - 100 || loading || !hasMore) {
      return;
    }
    fetchContenido(page);
  }, [loading, hasMore, page, fetchContenido]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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
      {loading && <Loader />}
      {!hasMore && <p className="text-center text-gray-500 mt-4">No hay más contenido para mostrar.</p>}
    </div>
  );
}

export default Catalogo;
