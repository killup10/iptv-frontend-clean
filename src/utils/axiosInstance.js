import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';

const baseURL = isElectron ? 'http://localhost:3000' : 'https://iptv-backend-w6hf.onrender.com';

const axiosInstance = axios.create({
  baseURL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const { value: token } = await Preferences.get({ key: 'token' });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('axiosInstance: Token añadido a la cabecera de la petición.');
    } else {
      console.log('axiosInstance: No hay token en Preferences para añadir a la petición.');
    }

    let { value: deviceId } = await Preferences.get({ key: 'deviceId' });
    if (!deviceId) {
      const userAgent = navigator.userAgent;
      const now = Date.now();
      const randomStr = Math.random().toString(36).substring(2);
      deviceId = btoa(`${userAgent}-${now}-${randomStr}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
      await Preferences.set({ key: 'deviceId', value: deviceId });
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
      if (status === 401 || status === 403) {
        console.warn(`axiosInstance: Error ${status} detectado. Mensaje:`, data?.error || data?.message);
        console.log('axiosInstance: Deslogueando usuario debido a error de autenticación/autorización.');
        await Preferences.remove({ key: 'user' });
        await Preferences.remove({ key: 'token' });
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?session_expired=true';
        }
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
