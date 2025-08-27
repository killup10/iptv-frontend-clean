// src/utils/axiosInstance.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://iptv-backend-w6hf.onrender.com';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // Aumentado a 5 minutos para manejar operaciones largas
  maxContentLength: 50 * 1024 * 1024, // 50MB límite de respuesta
  maxBodyLength: 50 * 1024 * 1024, // 50MB límite de petición
  headers: {
    'Content-Type': 'application/json'
  }
});

console.log('axiosInstance: Configurado con baseURL:', API_BASE_URL);

// Función para generar o obtener un device ID único
const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    // Generar un ID único basado en características del navegador y timestamp
    const userAgent = navigator.userAgent;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    deviceId = btoa(`${userAgent}-${timestamp}-${random}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

// --- Interceptor de Petición (Request) ---
// Se ejecuta ANTES de que cada petición sea enviada.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Si tenemos un token, lo añadimos a la cabecera Authorization
      config.headers.Authorization = `Bearer ${token}`;
      console.log("axiosInstance: Token añadido a la cabecera de la petición.");
    } else {
      console.log("axiosInstance: No hay token en localStorage para añadir a la petición.");
    }
    
    // Agregar device ID header requerido por el backend
    const deviceId = getDeviceId();
    config.headers['x-device-id'] = deviceId;
    console.log("axiosInstance: Device ID añadido a la cabecera de la petición:", deviceId);
    
    // Ajustar timeout para peticiones específicas que pueden tomar más tiempo
    if (config.url?.includes('/upload-text') || config.url?.includes('/upload-m3u')) {
      config.timeout = 600000; // 10 minutos para uploads
      console.log("axiosInstance: Timeout extendido a 10 minutos para carga de archivos.");
    }

    // Si el body es un FormData, BORRAR la cabecera Content-Type para
    // que el navegador añada automáticamente el boundary multipart/form-data.
    // De lo contrario el header por defecto ('application/json') evita que
    // el servidor reconozca el archivo y `req.file` queda undefined.
    try {
      if (config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && config.headers['Content-Type']) {
          delete config.headers['Content-Type'];
        }
        console.log('axiosInstance: FormData detectado — eliminado Content-Type para permitir boundary automático.');
      }
    } catch (e) {
      // En entornos donde FormData no está definido o falla la comprobación,
      // no hacemos nada crítico.
    }
    
    return config; // Continúa con la petición
  },
  (error) => {
    // Manejar errores de configuración de la petición
    console.error("axiosInstance: Error en la configuración de la petición:", error);
    return Promise.reject(error);
  }
);

// --- Interceptor de Respuesta (Response) ---
// Se ejecuta DESPUÉS de recibir una respuesta del backend.
axiosInstance.interceptors.response.use(
  (response) => {
    // Cualquier código de estado que este dentro del rango de 2xx
    // hace que esta función se active. Simplemente devolvemos la respuesta.
    return response;
  },
  (error) => {
    // Cualquier código de estado que caiga fuera del rango de 2xx
    // hace que esta función se active.
    console.error("axiosInstance: Error en la respuesta del backend:", error.response || error.message);

    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      const { status, data } = error.response;

      if (status === 401) {
        // 401 (No Autorizado) indica que el token no es válido o ha expirado
        console.warn(`axiosInstance: Error ${status} detectado. Mensaje:`, data?.error || data?.message);
        console.log("axiosInstance: Deslogueando usuario debido a error de autenticación.");

        // Limpiar el estado de autenticación
        localStorage.removeItem("user");
        localStorage.removeItem("token");

        // Redirigir a la página de login
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?session_expired=true';
        }
      } else if (status === 403) {
        // 403 (Prohibido) - NUNCA desloguear automáticamente
        // Los errores 403 son de permisos/planes, no de autenticación
        console.warn(`axiosInstance: Error ${status} detectado. Mensaje:`, data?.error || data?.message);
        console.log("axiosInstance: Error 403 - manteniendo sesión activa. El componente manejará el error.");
        // NO desloguear - dejar que el componente maneje el mensaje amigable
      }
    } else if (error.code === 'ECONNABORTED') {
      // Manejar específicamente errores de timeout
      console.error("axiosInstance: La petición excedió el tiempo límite. Puede que necesites aumentar el timeout para esta operación.");
      error.message = 'La operación tardó demasiado tiempo. Por favor, intenta de nuevo o contacta al soporte si el problema persiste.';
    } else if (error.request) {
      // La petición se hizo pero no se recibió respuesta (ej. problema de red)
      console.error("axiosInstance: No se recibió respuesta del servidor:", error.request);
    } else {
      // Algo sucedió al configurar la petición que provocó un error
      console.error('axiosInstance: Error al configurar la petición:', error.message);
    }

    // Importante: re-lanzar el error para que la lógica del .catch()
    // en el lugar donde se hizo la llamada original (ej. en AuthService o api.js)
    // también pueda manejarlo si es necesario (mostrar un mensaje al usuario, etc.).
    return Promise.reject(error);
  }
);

export default axiosInstance;