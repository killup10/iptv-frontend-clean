// src/pages/ContenidoAdmin.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../utils/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import VideoForm from "../components/VideoForm";

export default function ContenidoAdmin() {
  const { user } = useAuth();
  const [canal, setCanal] = useState({ name: "", url: "" });
  const [canales, setCanales] = useState([]);
  const [vods, setVods] = useState([]);
  const [selectedVods, setSelectedVods] = useState([]);
  const API = import.meta.env.VITE_API_URL;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  const cargarContenido = async () => {
    const [c, v] = await Promise.all([
      fetch(`${API}/api/m3u`).then((res) => res.json()),
      fetch(`${API}/api/videos?view=admin`).then((res) => res.json()),
    ]);
    setCanales(c || []);
    setVods(v.videos || []);
  };

  useEffect(() => {
    if (user?.role === "admin") cargarContenido();
  }, [user]);

  const handleVodSelect = (vodId) => {
    setSelectedVods((prev) =>
      prev.includes(vodId)
        ? prev.filter((id) => id !== vodId)
        : [...prev, vodId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedVods.length === 0) return;
    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar ${selectedVods.length} video(s)?`
      )
    )
      return;

    try {
      const res = await fetch(`${API}/api/videos/batch`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ videoIds: selectedVods }),
      });

      if (res.ok) {
        cargarContenido();
        setSelectedVods([]);
      } else {
        const errorData = await res.json();
        alert(`Error al eliminar: ${errorData.message}`);
      }
    } catch (error) {
      alert("Error de red al eliminar videos.");
    }
  };

  const handleNewEpisodesChange = async (vodId, currentStatus) => {
    try {
      const res = await fetch(`${API}/api/videos/${vodId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ hasNewEpisodes: !currentStatus }),
      });

      if (res.ok) {
        cargarContenido();
      } else {
        const errorData = await res.json();
        alert(`Error al actualizar: ${errorData.message}`);
      }
    } catch (error) {
      alert('Error de red al actualizar el video.');
    }
  };


  const agregarCanal = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/api/m3u/manual`, {
      method: "POST",
      headers,
      body: JSON.stringify(canal),
    });
    if (res.ok) {
      setCanal({ name: "", url: "" });
      cargarContenido();
    }
  };

  if (user?.role !== "admin") return <p>No autorizado</p>;

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Panel de Contenido</h1>

      {/* Formulario canal */}
      <form onSubmit={agregarCanal} className="space-y-2">
        <h2 className="text-xl font-semibold">Agregar canal M3U</h2>
        <Input
          placeholder="Nombre del canal"
          value={canal.name}
          onChange={(e) => setCanal({ ...canal, name: e.target.value })}
        />
        <Input
          placeholder="URL .m3u8"
          value={canal.url}
          onChange={(e) => setCanal({ ...canal, url: e.target.value })}
        />
        <Button type="submit">Agregar canal</Button>
      </form>

      {/* Formulario VOD: usa VideoForm */}
      <section>
        <VideoForm onSuccess={cargarContenido} />
      </section>

      {/* Listado de contenido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        <div>
          <h3 className="font-semibold text-lg">Canales Agregados</h3>
          <ul className="space-y-1">
            {canales.map((c, i) => (
              <li key={i} className="border p-2 rounded bg-white shadow">
                {c.name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg">VOD Agregados</h3>
            {selectedVods.length > 0 && (
              <Button onClick={handleDeleteSelected} variant="destructive">
                Eliminar ({selectedVods.length})
              </Button>
            )}
          </div>
          <ul className="space-y-1 max-h-96 overflow-y-auto">
            {vods.map((v) => (
              <li
                key={v._id}
                className="border p-2 rounded bg-white shadow flex items-center"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 mr-3"
                  checked={selectedVods.includes(v._id)}
                  onChange={() => handleVodSelect(v._id)}
                />
                <img
                  src={v.customThumbnail || v.thumbnail || v.tmdbThumbnail}
                  alt={v.title}
                  className="w-12 h-8 rounded object-cover mr-3"
                />
                <span className="truncate flex-grow">{v.title}</span>
                {v.tipo !== 'pelicula' && (
                  <div className="flex items-center ml-4">
                    <input
                      type="checkbox"
                      id={`new-episodes-${v._id}`}
                      className="w-4 h-4 mr-2"
                      checked={v.hasNewEpisodes || false}
                      onChange={() => handleNewEpisodesChange(v._id, v.hasNewEpisodes)}
                    />
                    <label htmlFor={`new-episodes-${v._id}`} className="text-sm">
                      NUEVOS EPISODIOS / NUEVA TEMPORADA
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
