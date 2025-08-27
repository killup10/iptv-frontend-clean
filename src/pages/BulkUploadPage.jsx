import React from 'react';
import { useAuth } from '../context/AuthContext';
import BulkUploadForm from '../components/BulkUploadForm';

export default function BulkUploadPage() {
  const { user } = useAuth();

  // Verificar si el usuario está autenticado y es admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-gray-400">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Subida Masiva de Contenido
          </h1>
          <p className="mt-2 text-gray-400">
            Sube archivos .m3u para agregar contenido masivamente
          </p>
        </div>

        <div className="mt-8">
          <BulkUploadForm />
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">Instrucciones:</h2>
          <div className="bg-gray-800 rounded-lg p-6 space-y-4 text-gray-300">
            <p>1. Selecciona la sección donde se agregará el contenido.</p>
            <p>2. Selecciona el archivo .m3u que contiene las URLs del contenido.</p>
            <p>3. El sistema verificará automáticamente si hay duplicados.</p>
            <p>4. Los elementos duplicados serán omitidos durante la importación.</p>
            <p>5. Al finalizar, verás un resumen con los resultados de la importación.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
