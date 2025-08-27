import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

function SubirM3U() {
  const [file, setFile] = useState(null);
  const [section, setSection] = useState(""); // Nueva variable para la sección
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [status, setStatus] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [m3uFilesList, setM3uFilesList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [isLoadingProcess, setIsLoadingProcess] = useState(false);

  const { user } = useAuth() || {};
  const token = user?.token || localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "https://iptv-backend-w6hf.onrender.com";

  const fetchM3UFiles = async () => {
    if (!token) return;
    setIsLoadingList(true);
    try {
      const res = await axios.get(`${API_URL}/api/m3u/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setM3uFilesList(res.data.files || []);
    } catch (error) {
      console.error("Error al cargar lista de M3U:", error);
      setStatus("❌ Error al cargar lista de archivos M3U");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchM3UFiles();
  }, [token]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadedFileName(null);
    setStatus("");
    setProcessingStatus("");
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setStatus("Selecciona un archivo .m3u");
    if (!section) return setStatus("Selecciona una sección para el contenido");
    if (!token) return setStatus("❌ No autenticado. Por favor, inicia sesión.");

    const formData = new FormData();
    formData.append("m3uFile", file);
    formData.append("section", section); // Añadir la sección al formulario

    setIsLoadingUpload(true);
    setStatus("Subiendo archivo...");
    setUploadedFileName(null);
    setProcessingStatus("");

    try {
      const res = await axios.post(
        `${API_URL}/api/m3u/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setUploadedFileName(res.data.filename);
      setStatus(`✅ Archivo "${res.data.filename}" subido correctamente en la sección ${section}.`);
      fetchM3UFiles();
    } catch (error) {
      setStatus("❌ Error al subir archivo M3U.");
      console.error("Error en handleUploadSubmit:", error.response ? error.response.data : error.message);
      setUploadedFileName(null);
    } finally {
      setIsLoadingUpload(false);
    }
  };

  const handleProcessM3U = async (filenameToProcess) => {
    if (!filenameToProcess) return setProcessingStatus("No hay archivo seleccionado para procesar.");
    if (!token) return setProcessingStatus("❌ No autenticado. Por favor, inicia sesión.");

    setIsLoadingProcess(true);
    setProcessingStatus(`Procesando "${filenameToProcess}"...`);
    try {
      const res = await axios.get(
        `${API_URL}/api/m3u/process/${encodeURIComponent(filenameToProcess)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProcessingStatus(`✅ "${filenameToProcess}" procesado: ${res.data.message}. Canales añadidos: ${res.data.channelsAdded || 0}.`);
      setUploadedFileName(null);
    } catch (error) {
      setProcessingStatus(`❌ Error al procesar "${filenameToProcess}".`);
      console.error("Error en handleProcessM3U:", error.response ? error.response.data : error.message);
    } finally {
      setIsLoadingProcess(false);
    }
  };

  return (
    <div className="p-4 text-white min-h-screen bg-gray-900">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center text-red-500">Administrar Archivos M3U</h2>

        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          <h3 className="text-xl font-semibold mb-4">Subir Nuevo Archivo M3U</h3>
          <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
            {/* Selector de sección */}
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="bg-zinc-700 text-white p-3 rounded border border-zinc-600"
              required
            >
              <option value="">Selecciona una sección</option>
              <option value="movies">Películas</option>
              <option value="series">Series</option>
              <option value="kids">ZONA KIDS</option>
              <option value="tv">TV en vivo</option>
            </select>

            <input
              type="file"
              accept=".m3u,.m3u8"
              onChange={handleFileChange}
              className="bg-zinc-700 text-white p-3 rounded border border-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600"
            />
            <button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold transition duration-150 ease-in-out disabled:opacity-50"
              disabled={isLoadingUpload || !file || !section}
            >
              {isLoadingUpload ? "Subiendo..." : "Subir Archivo"}
            </button>
          </form>
          {status && <p className={`mt-4 text-sm ${status.startsWith("❌") ? 'text-red-400' : 'text-green-400'}`}>{status}</p>}

          {uploadedFileName && !isLoadingUpload && (
            <div className="mt-4">
              <button
                onClick={() => handleProcessM3U(uploadedFileName)}
                className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition duration-150 ease-in-out disabled:opacity-50"
                disabled={isLoadingProcess}
              >
                {isLoadingProcess ? `Procesando ${uploadedFileName}...` : `Procesar Contenido de "${uploadedFileName}"`}
              </button>
            </div>
          )}
          {processingStatus && <p className={`mt-4 text-sm ${processingStatus.startsWith("❌") ? 'text-red-400' : 'text-green-400'}`}>{processingStatus}</p>}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold mb-4">Archivos M3U Subidos</h3>
          {isLoadingList ? <p>Cargando lista de archivos...</p> : (
            m3uFilesList.length > 0 ? (
              <ul className="space-y-3">
                {m3uFilesList.map((m3u) => (
                  <li key={m3u._id || m3u.id || m3u.filename} className="flex justify-between items-center bg-zinc-700 p-3 rounded">
                    <span className="text-gray-300">
                      {m3u.filename}
                      {m3u.section && <span className="ml-2 text-xs bg-red-500 px-2 py-1 rounded">{m3u.section}</span>}
                    </span>
                    <button
                      onClick={() => handleProcessM3U(m3u.filename)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-semibold transition duration-150 ease-in-out disabled:opacity-50"
                      disabled={isLoadingProcess && uploadedFileName === m3u.filename}
                    >
                      {isLoadingProcess && uploadedFileName === m3u.filename ? "Procesando..." : "Procesar"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No hay archivos M3U subidos o no se pudieron cargar.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default SubirM3U;
