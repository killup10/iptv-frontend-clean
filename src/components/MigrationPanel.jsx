import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

const MigrationPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/api/admin/migration/stats');
      setStats(response.data);
    } catch (err) {
      setError('Error al cargar estadísticas: ' + err.message);
      console.error('Error loading migration stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeMigration = async () => {
    if (!window.confirm('¿Estás seguro de que quieres ejecutar la migración? Esta operación no se puede deshacer.')) {
      return;
    }

    try {
      setMigrating(true);
      setError(null);
      setResult(null);
      
      const response = await axiosInstance.post('/api/admin/migration/execute');
      setResult(response.data);
      
      // Recargar estadísticas después de la migración
      await loadStats();
    } catch (err) {
      setError('Error durante la migración: ' + (err.response?.data?.message || err.message));
      console.error('Migration error:', err);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔄 Migración de Películas a Series
        </h2>
        <p className="text-gray-600">
          Esta herramienta convierte automáticamente las películas individuales que siguen el formato 
          "1x11 Título del episodio" en series agrupadas con capítulos organizados por temporadas.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Migración Completada</h3>
              <div className="mt-2 text-sm text-green-700">
                <p><strong>Entradas procesadas:</strong> {result.totalProcessed}</p>
                <p><strong>Series creadas/actualizadas:</strong> {result.seriesCreated}</p>
                <p><strong>Películas eliminadas:</strong> {result.moviesDeleted}</p>
                {result.seriesDetails && result.seriesDetails.length > 0 && (
                  <div className="mt-2">
                    <p><strong>Series procesadas:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      {result.seriesDetails.slice(0, 10).map((series, index) => (
                        <li key={index}>{series}</li>
                      ))}
                      {result.seriesDetails.length > 10 && (
                        <li>... y {result.seriesDetails.length - 10} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Estadísticas Actuales</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalMovieChapters}</div>
              <div className="text-sm text-blue-800">Películas que parecen capítulos</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.totalSeries}</div>
              <div className="text-sm text-green-800">Series detectadas</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {stats.seriesDetails.reduce((total, series) => total + series.totalSeasons, 0)}
              </div>
              <div className="text-sm text-purple-800">Temporadas totales</div>
            </div>
          </div>

          {stats.totalMovieChapters > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Series detectadas para migración:</h4>
              <div className="max-h-64 overflow-y-auto">
                {stats.seriesDetails.map((series, index) => (
                  <div key={index} className="mb-2 p-3 bg-white rounded border">
                    <div className="font-medium text-gray-900">{series.name}</div>
                    <div className="text-sm text-gray-600">
                      {series.totalChapters} capítulos en {series.totalSeasons} temporada(s)
                      {series.seasons.length > 0 && (
                        <span className="ml-2">
                          (Temporadas: {series.seasons.join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={loadStats}
          disabled={loading || migrating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cargando...' : '🔄 Actualizar Estadísticas'}
        </button>

        {stats && stats.totalMovieChapters > 0 && (
          <button
            onClick={executeMigration}
            disabled={migrating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Migrando...
              </span>
            ) : (
              '🚀 Ejecutar Migración'
            )}
          </button>
        )}
      </div>

      {stats && stats.totalMovieChapters === 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">
            ✅ No se encontraron películas que necesiten migración. 
            Todas las series ya están correctamente organizadas.
          </p>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Advertencias Importantes:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Esta operación eliminará las entradas de películas individuales</li>
          <li>• Se recomienda hacer un backup de la base de datos antes de ejecutar</li>
          <li>• La migración puede tomar varios minutos dependiendo del número de entradas</li>
          <li>• Una vez ejecutada, la operación no se puede deshacer</li>
        </ul>
      </div>
    </div>
  );
};

export default MigrationPanel;
