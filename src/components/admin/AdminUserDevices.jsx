// components/admin/AdminUserDevices.jsx MEJORADO

import React, { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useAuth } from "@/context/AuthContext";

// Componente Button personalizado
const Button = ({ children, className, disabled, isLoading, onClick, ...props }) => (
  <button
    {...props}
    onClick={onClick}
    disabled={disabled || isLoading}
    className={`font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
      className || ""
    } ${
      disabled || isLoading
        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
        : "hover:opacity-90"
    }`}
  >
    {isLoading ? (
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ) : null}
    {children}
  </button>
);

export default function AdminUserDevices({ userId, username }) {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [showInactive, setShowInactive] = useState(false);
  const [deviceStats, setDeviceStats] = useState({ total: 0, active: 0 });

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchDevices = async (includeInactive = false) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      clearMessages();
      
      const params = includeInactive ? { includeInactive: 'true' } : {};
      const res = await axiosInstance.get(`/api/devices/admin/${userId}`, { params });
      
      // Manejar la nueva estructura de respuesta
      if (res.data.devices) {
        setDevices(res.data.devices);
        setDeviceStats({
          total: res.data.total || 0,
          active: res.data.active || 0
        });
      } else {
        // Compatibilidad con respuesta anterior
        setDevices(res.data);
        setDeviceStats({
          total: res.data.length,
          active: res.data.filter(d => d.isActive).length
        });
      }
      
      console.log(`Dispositivos cargados para ${username}:`, res.data);
    } catch (err) {
      console.error("Error al obtener dispositivos:", err);
      const errorMsg = err.response?.data?.error || "Error al obtener dispositivos.";
      setError(errorMsg);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (deviceId) => {
    if (!deviceId) return;
    
    try {
      setActionLoading(prev => ({ ...prev, [deviceId]: true }));
      clearMessages();
      
      console.log(`Desactivando dispositivo: userId=${userId}, deviceId=${deviceId}`);
      
      const res = await axiosInstance.delete(`/api/devices/admin/${userId}/${deviceId}`);
      
      setSuccess(res.data.message || "Dispositivo desactivado correctamente.");
      
      // Recargar la lista de dispositivos
      await fetchDevices(showInactive);
      
    } catch (err) {
      console.error("Error al desactivar dispositivo:", err);
      const errorMsg = err.response?.data?.error || "No se pudo desactivar el dispositivo.";
      setError(errorMsg);
    } finally {
      setActionLoading(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const handleDeactivateAll = async () => {
    if (!window.confirm(`¿Estás seguro de que quieres desactivar TODOS los dispositivos de ${username}?`)) {
      return;
    }
    
    try {
      setActionLoading(prev => ({ ...prev, 'all': true }));
      clearMessages();
      
      const res = await axiosInstance.delete(`/api/devices/admin/${userId}/devices`);
      
      setSuccess(res.data.message || "Todos los dispositivos han sido desactivados.");
      
      // Recargar la lista de dispositivos
      await fetchDevices(showInactive);
      
    } catch (err) {
      console.error("Error al desactivar todos los dispositivos:", err);
      const errorMsg = err.response?.data?.error || "No se pudieron desactivar los dispositivos.";
      setError(errorMsg);
    } finally {
      setActionLoading(prev => ({ ...prev, 'all': false }));
    }
  };

  const formatLastSeen = (lastSeen) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceInfo = (device) => {
    const userAgent = device.userAgent || '';
    let deviceType = 'Desconocido';
    let browser = '';

    // Detectar tipo de dispositivo
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      deviceType = '📱 Móvil';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      deviceType = '📱 Tablet';
    } else {
      deviceType = '💻 PC/Web';
    }

    // Detectar navegador
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return { deviceType, browser };
  };

  useEffect(() => {
    if (user?.role === "admin" && userId) {
      fetchDevices(showInactive);
    }
  }, [userId, showInactive, user?.role]);

  // Auto-limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (!user?.role === "admin") {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-red-500">
            Dispositivos de {username}
          </h3>
          <p className="text-sm text-gray-400">
            Activos: {deviceStats.active} | Total: {deviceStats.total}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowInactive(!showInactive)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
          >
            {showInactive ? "Solo Activos" : "Ver Todos"}
          </Button>
          {deviceStats.active > 0 && (
            <Button
              onClick={handleDeactivateAll}
              isLoading={actionLoading['all']}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1"
            >
              Desactivar Todos
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded mb-4 text-sm">
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-200 px-3 py-2 rounded mb-4 text-sm">
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span className="ml-2 text-gray-300">Cargando dispositivos...</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">
            {showInactive 
              ? "Este usuario no tiene dispositivos registrados." 
              : "Este usuario no tiene dispositivos activos."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device, index) => {
            const { deviceType, browser } = getDeviceInfo(device);
            const isActive = device.isActive;
            
            return (
              <div
                key={device.deviceId || index}
                className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg border ${
                  isActive 
                    ? "bg-gray-700 border-gray-600" 
                    : "bg-gray-800 border-gray-700 opacity-60"
                }`}
              >
                <div className="flex-grow mb-2 sm:mb-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm">{deviceType}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      isActive 
                        ? "bg-green-700 text-green-100" 
                        : "bg-gray-600 text-gray-300"
                    }`}>
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  
                  <p className="font-mono text-xs text-red-400 mb-1">
                    ID: {device.deviceId}
                  </p>
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>📅 {formatLastSeen(device.lastSeen)}</p>
                    {browser && <p>🌐 {browser}</p>}
                    {device.ip && <p>🌍 IP: {device.ip}</p>}
                  </div>
                </div>
                
                {isActive && (
                  <Button
                    onClick={() => handleDeactivate(device.deviceId)}
                    isLoading={actionLoading[device.deviceId]}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs px-3 py-1 w-full sm:w-auto"
                  >
                    {actionLoading[device.deviceId] ? "Desactivando..." : "Desactivar"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-700">
        <Button
          onClick={() => fetchDevices(showInactive)}
          disabled={loading}
          className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1"
        >
          🔄 Actualizar Lista
        </Button>
      </div>
    </div>
  );
}
