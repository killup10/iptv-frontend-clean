// src/utils/AuthService.js
import axiosInstance from "./axiosInstance.js";

// Función para obtener el deviceId único para este dispositivo
const getDeviceId = () => {
  // Usar una combinación de userAgent y otros datos para crear un ID más único
  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`
  };
  
  // Crear un hash simple de la información del dispositivo
  const str = JSON.stringify(deviceInfo);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `device_${Math.abs(hash)}`;
};

export const login = async (username, password) => {
  const deviceId = getDeviceId();
  const loginPath = "/api/auth/login";
  console.log(`AuthService: Intentando login para ${username} en ${loginPath} (usando axiosInstance)`);
  try {
    const response = await axiosInstance.post(loginPath, {
      username,
      password,
      deviceId,
    });

    // Guardar el deviceId en localStorage para usarlo en logout
    localStorage.setItem('deviceId', deviceId);
    
    return response.data;
  } catch (error) {
    console.error("Error en AuthService - login:", error.response?.data || error.message);
    
    // Manejar específicamente el error de sesiones múltiples
    if (error.response?.status === 403 && error.response?.data?.error?.includes("Límite de dispositivos")) {
      throw new Error("Has alcanzado el límite de dispositivos conectados. Por favor, cierra sesión en otro dispositivo para continuar.");
    }
    
    // Asegurar que siempre se lance un Error con mensaje string
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Error desconocido en el servicio de login.";
    throw new Error(errorMessage);
  }
};

export const register = async (username, password) => {
  const registerPath = "/api/auth/register";
  console.log(`AuthService: Intentando registro para ${username} en ${registerPath}`);
  try {
    const response = await axiosInstance.post(registerPath, {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Error en AuthService - register:", error.response?.data || error.message);
    throw error.response?.data || new Error(error.message || "Error desconocido en el servicio de registro.");
  }
};

export const logout = async (allDevices = false) => {
  const logoutPath = "/api/auth/logout";
  try {
    const deviceId = allDevices ? null : localStorage.getItem('deviceId');
    await axiosInstance.post(logoutPath, { deviceId });
    
    // Limpiar el deviceId del localStorage
    localStorage.removeItem('deviceId');
    
    return true;
  } catch (error) {
    console.error("Error en AuthService - logout:", error.response?.data || error.message);
    throw error.response?.data || new Error(error.message || "Error al cerrar sesión.");
  }
};
