import React, { useState } from "react";
import axios from "axios";

export default function UploadManual() {
  const [form, setForm] = useState({
    title: "",
    url: "",
    tipo: "pelicula",
    thumbnail: "",
    group: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await axios.post("https://iptv-backend-w6hf.onrender.com/api/videos/upload-link", form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("✅ Video subido");
      console.log(res.data);
    } catch (err) {
      alert("❌ Error al subir");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-zinc-800 rounded-xl text-white max-w-md mx-auto">
      <h2 className="text-xl font-bold">Subir VOD Manual</h2>
      <input type="text" name="title" placeholder="Título" onChange={handleChange} className="w-full p-2 rounded bg-zinc-700" required />
      <input type="text" name="url" placeholder="URL (Dropbox o m3u)" onChange={handleChange} className="w-full p-2 rounded bg-zinc-700" required />
      <input type="text" name="thumbnail" placeholder="Thumbnail (opcional)" onChange={handleChange} className="w-full p-2 rounded bg-zinc-700" />
      <select name="tipo" onChange={handleChange} className="w-full p-2 rounded bg-zinc-700">
        <option value="pelicula">Película</option>
        <option value="serie">Serie</option>
        <option value="canal">Canal</option>
      </select>
      <input type="text" name="group" placeholder="Grupo o categoría" onChange={handleChange} className="w-full p-2 rounded bg-zinc-700" />
      <button className="bg-green-600 px-4 py-2 rounded">Subir</button>
    </form>
  );
}
