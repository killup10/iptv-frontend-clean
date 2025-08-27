import React, { useState } from 'react';

const CONTENT_SECTIONS = [
  { id: 'movies', label: 'Películas' },
  { id: 'series', label: 'Series' },
  { id: 'series_kids', label: 'Series - ZONA KIDS' },
  { id: 'animes', label: 'Animes' },
  { id: 'documentaries', label: 'Documentales' },
  { id: 'doramas', label: 'Doramas' }
];

export default function BulkUploadForm() {
  const [selectedSection, setSelectedSection] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.m3u')) {
      setFile(selectedFile);
      setUploadResult(null);
    } else {
      alert('Por favor selecciona un archivo .m3u');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedSection) {
      alert('Por favor selecciona un archivo y una sección');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('section', selectedSection);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No estás autenticado');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/m3u/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setUploadResult({
          success: true,
          message: `Subida exitosa: ${result.added} elementos añadidos, ${result.duplicates} duplicados encontrados`
        });
      } else {
        throw new Error(result.message || 'Error al subir el archivo');
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Subida Masiva de Contenido</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sección
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          >
            <option value="">Selecciona una sección</option>
            {CONTENT_SECTIONS.map(section => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Archivo .m3u
          </label>
          <input
            type="file"
            accept=".m3u"
            onChange={handleFileChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isUploading || !file || !selectedSection}
          className={`w-full py-3 px-4 rounded-md text-white font-medium ${
            isUploading || !file || !selectedSection
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isUploading ? 'Subiendo...' : 'Subir Contenido'}
        </button>
      </form>

      {uploadResult && (
        <div className={`mt-4 p-4 rounded-md ${
          uploadResult.success ? 'bg-green-800/50 text-green-100' : 'bg-red-800/50 text-red-100'
        }`}>
          {uploadResult.message}
        </div>
      )}
    </div>
  );
}
