import axios from 'axios';
import { storage } from './storage.js';

const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';

// Prefer explicit env var (packs fine in Electron), otherwise fall back to cloud backend.
// Esto evita que la app de escritorio apunte a localhost cuando no hay backend local corriendo.
const baseURL =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL)) ||
  'https://iptv-backend-qhbr.onrender.com';

const axiosInstance = axios.create({
  baseURL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('axiosInstance: Token añadido a la cabecera de la petición.');
    } else {
      console.log('axiosInstance: No hay token en storage para añadir a la petición.');
    }

    let deviceId = await storage.getItem('deviceId');
    if (!deviceId) {
      const userAgent = navigator.userAgent;
      const now = Date.now();
      const randomStr = Math.random().toString(36).substring(2);
      deviceId = btoa(`${userAgent}-${now}-${randomStr}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
      await storage.setItem('deviceId', deviceId);
      console.log('axiosInstance: Nuevo Device ID generado y guardado:', deviceId);
    }
    config.headers['x-device-id'] = deviceId;
    console.log('axiosInstance: Device ID añadido a la cabecera de la petición:', deviceId);

    if (config.url && (config.url.includes('/upload-text') || config.url.includes('/upload-m3u'))) {
      config.timeout = 600000; // 10 minutes for uploads
      console.log('axiosInstance: Timeout extendido a 10 minutos para carga de archivos.');
    }
    return config;
  },
  (error) => {
    console.error('axiosInstance: Error en la configuración de la petición:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('axiosInstance: Error en la respuesta del backend:', error.response || error.message);
    if (error.response) {
      const { status, data } = error.response;
      
      // Solo desloguear en caso de 401 (No autenticado / Token expirado)
      // NO desloguear en 403 (Acceso denegado / Plan insuficiente) - dejar que el componente lo maneje
      if (status === 401) {
        console.warn(`axiosInstance: Error 401 detectado. Mensaje:`, data?.error || data?.message);
        console.log('axiosInstance: Deslogueando usuario debido a token inválido/expirado.');
        await storage.removeItem('user');
        await storage.removeItem('token');
        
        // Disparar evento personalizado para que AuthContext se entere inmediatamente
        window.dispatchEvent(new CustomEvent('auth-logout', { detail: { reason: '401' } }));
        
        if (!window.location.hash.includes('#/login')) {
          window.location.hash = '#/login?session_expired=true';
        }
      } else if (status === 403) {
        // 403: Acceso denegado (permisos insuficientes, plan insuficiente, etc.)
        // NO desloguear - el componente que hace la petición manejará el error
        console.warn(`axiosInstance: Error 403 detectado (Acceso denegado). Mensaje:`, data?.error || data?.message);
        console.log('axiosInstance: Usuario sigue autenticado, permitiendo que el componente maneje el error 403.');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('axiosInstance: La petición excedió el tiempo límite. Puede que necesites aumentar el timeout para esta operación.');
      error.message = 'La operación tardó demasiado tiempo. Por favor, intenta de nuevo o contacta al soporte si el problema persiste.';
    } else if (error.request) {
      console.error('axiosInstance: No se recibió respuesta del servidor:', error.request);
    } else {
      console.error('axiosInstance: Error al configurar la petición:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
