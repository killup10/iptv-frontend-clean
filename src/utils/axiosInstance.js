import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Función para determinar la URL base de la API
const getApiBaseUrl = () => {
  const webUrl = import.meta.env.VITE_API_URL || 'https://iptv-backend-w6hf.onrender.com';
  
  if (Capacitor.isNativePlatform()) {
    // Para Android, podrías necesitar una URL específica.
    // Si tu backend está en la misma máquina durante el desarrollo, usa 'http://10.0.2.2:PUERTO'.
    // Para producción, debe ser la URL de tu backend público.
    const nativeUrl = 'https://iptv-backend-w6hf.onrender.com';
    console.log(`Plataforma nativa detectada. Usando API URL: ${nativeUrl}`);
    return nativeUrl;
  }
  
  console.log(`Plataforma web detectada. Usando API URL: ${webUrl}`);
  return webUrl;
};

const API_BASE_URL = getApiBaseUrl();

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutos
  maxContentLength: 50 * 1024 * 1024,
  maxBodyLength: 50 * 1024 * 1024,
  headers: {
    'Content-Type': 'application/json'
  }
});

console.log('axiosInstance: Configurado con baseURL:', API_BASE_URL);

// Generar/obtener deviceId
const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    const userAgent = navigator.userAgent;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    deviceId = btoa(`${userAgent}-${timestamp}-${random}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("axiosInstance: Token añadido a la cabecera de la petición.");
    } else {
      console.log("axiosInstance: No hay token en localStorage para añadir a la petición.");
    }

    const deviceId = getDeviceId();
    config.headers['x-device-id'] = deviceId;
    console.log("axiosInstance: Device ID añadido a la cabecera de la petición:", deviceId);

    if (config.url?.includes('/upload-text') || config.url?.includes('/upload-m3u')) {
      config.timeout = 600000;
      console.log("axiosInstance: Timeout extendido a 10 minutos para carga de archivos.");
    }

    try {
      if (config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && config.headers['Content-Type']) {
          delete config.headers['Content-Type'];
        }
        console.log('axiosInstance: FormData detectado — eliminado Content-Type para permitir boundary automático.');
      }
    } catch (e) {
      // ignore
    }

    return config;
  },
  (error) => {
    console.error("axiosInstance: Error en la configuración de la petición:", error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("axiosInstance: Error en la respuesta del backend:", error.response || error.message);

    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?session_expired=true';
        }
      } else if (status === 403) {
        // mantener sesión
      }
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'La operación tardó demasiado tiempo. Por favor, intenta de nuevo o contacta al soporte si el problema persiste.';
    } else if (error.request) {
      console.error("axiosInstance: No se recibió respuesta del servidor:", error.request);
    } else {
      console.error('axiosInstance: Error al configurar la petición:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
