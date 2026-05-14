import axios from 'axios';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { storage } from './storage.js';
import { getOrCreateDeviceId } from './deviceIdentity.js';
import { getPlatformName } from './platformUtils.js';

const AXIOS_VERBOSE =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_VERBOSE_AXIOS === 'true';
const ENABLE_NATIVE_HTTP_ADAPTER =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_USE_CAPACITOR_HTTP === 'true';

let lastErrorSignature = '';
let lastErrorLogAt = 0;

const debugLog = (...args) => {
  if (AXIOS_VERBOSE) {
    console.log(...args);
  }
};

const isNativePlatform = () => {
  try {
    return Boolean(
      Capacitor?.isNativePlatform &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform()
    );
  } catch {
    return false;
  }
};

const isElectronBridgeAvailable = () => {
  try {
    return Boolean(
      typeof window !== 'undefined' &&
      window.electronAPI &&
      typeof window.electronAPI.request === 'function'
    );
  } catch {
    return false;
  }
};

const isAbsoluteUrl = (value = '') => /^https?:\/\//i.test(String(value));

const buildRequestUrl = (config) => {
  const requestUrl = config?.url || '';
  const baseUrl = config?.baseURL || apiBaseURL;

  if (!requestUrl) {
    return baseUrl;
  }

  if (isAbsoluteUrl(requestUrl)) {
    return requestUrl;
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(requestUrl.replace(/^\//, ''), normalizedBaseUrl).toString();
};

const normalizeHeaders = (headers) => {
  if (!headers) {
    return {};
  }

  const source =
    typeof headers.toJSON === 'function'
      ? headers.toJSON()
      : headers;

  return Object.fromEntries(
    Object.entries(source)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
};

const createAxiosError = (message, code, config, response) => {
  if (typeof axios.AxiosError === 'function') {
    return new axios.AxiosError(message, code, config, null, response);
  }

  const fallbackError = new Error(message);
  fallbackError.code = code;
  fallbackError.config = config;
  fallbackError.request = null;
  fallbackError.response = response;
  fallbackError.isAxiosError = true;
  return fallbackError;
};

const nativeHttpAdapter = async (config) => {
  const method = String(config?.method || 'get').toUpperCase();

  try {
    const nativeResponse = await CapacitorHttp.request({
      url: buildRequestUrl(config),
      method,
      headers: normalizeHeaders(config?.headers),
      params: config?.params,
      data: config?.data,
      connectTimeout: config?.timeout,
      readTimeout: config?.timeout,
      responseType: config?.responseType === 'text' ? 'text' : 'json',
    });

    const response = {
      data: nativeResponse?.data,
      status: nativeResponse?.status ?? 200,
      statusText: '',
      headers: nativeResponse?.headers || {},
      config,
      request: null,
    };

    const validateStatus =
      config?.validateStatus ||
      ((status) => status >= 200 && status < 300);

    if (!response.status || validateStatus(response.status)) {
      return response;
    }

    throw createAxiosError(
      `Request failed with status code ${response.status}`,
      response.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
      config,
      response,
    );
  } catch (error) {
    if (error?.isAxiosError) {
      throw error;
    }

    const message = error?.message || 'Native HTTP request failed';
    throw createAxiosError(message, error?.code || 'ERR_NETWORK', config, error?.response);
  }
};

const electronHttpAdapter = async (config) => {
  try {
    const electronResponse = await window.electronAPI.request({
      url: buildRequestUrl(config),
      method: String(config?.method || 'get').toUpperCase(),
      headers: normalizeHeaders(config?.headers),
      params: config?.params,
      data: config?.data,
      timeout: config?.timeout,
      responseType: config?.responseType,
    });

    if (electronResponse?.__teamgHttpError) {
      throw createAxiosError(
        electronResponse.message || 'Electron HTTP request failed',
        electronResponse.code || 'ERR_NETWORK',
        config,
        electronResponse.response,
      );
    }

    const response = {
      data: electronResponse?.data,
      status: electronResponse?.status ?? 200,
      statusText: '',
      headers: electronResponse?.headers || {},
      config,
      request: null,
    };

    const validateStatus =
      config?.validateStatus ||
      ((status) => status >= 200 && status < 300);

    if (!response.status || validateStatus(response.status)) {
      return response;
    }

    throw createAxiosError(
      `Request failed with status code ${response.status}`,
      response.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
      config,
      response,
    );
  } catch (error) {
    if (error?.isAxiosError) {
      throw error;
    }

    const message = error?.message || 'Electron HTTP request failed';
    throw createAxiosError(message, error?.code || 'ERR_NETWORK', config, error?.response);
  }
};

const shouldLogError = (signature) => {
  const now = Date.now();
  if (signature === lastErrorSignature && now - lastErrorLogAt < 5000) {
    return false;
  }
  lastErrorSignature = signature;
  lastErrorLogAt = now;
  return true;
};

// Prefer explicit env var (packs fine in Electron), otherwise fall back to cloud backend.
// This avoids desktop app pointing to localhost when no local backend is running.
export const apiBaseURL =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL)) ||
  'https://api.teamg.store';

const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    if (isElectronBridgeAvailable()) {
      config.adapter = electronHttpAdapter;
    } else if (ENABLE_NATIVE_HTTP_ADAPTER && isNativePlatform()) {
      config.adapter = nativeHttpAdapter;
    }

    const clientType = getPlatformName();
    if (clientType && clientType !== 'web') {
      config.headers['x-teamg-client'] = clientType;
    } else if (config.headers['x-teamg-client']) {
      delete config.headers['x-teamg-client'];
    }

    const token = await storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      debugLog('axiosInstance: Authorization header added.');
    } else {
      debugLog('axiosInstance: No token found in storage.');
    }

    const deviceId = await getOrCreateDeviceId();
    config.headers['x-device-id'] = deviceId;
    debugLog('axiosInstance: x-device-id header added.', deviceId);

    if (config.url && (config.url.includes('/upload-text') || config.url.includes('/upload-m3u'))) {
      config.timeout = 600000; // 10 minutes for uploads
      debugLog('axiosInstance: Extended timeout for upload endpoint.');
    }

    return config;
  },
  (error) => {
    console.error('axiosInstance: Request setup error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status || error?.code || 'unknown';
    const url = error?.config?.url || 'unknown-url';
    const signature = `${status}:${url}:${error?.message || 'error'}`;

    if (shouldLogError(signature)) {
      console.error('axiosInstance: Backend response error:', {
        status,
        url,
        message: error?.message,
      });
    }

    if (error.response) {
      const { status: httpStatus, data } = error.response;

      // Logout only on 401 (invalid or expired token).
      if (httpStatus === 401) {
        if (shouldLogError(`auth401:${url}`)) {
          console.warn('axiosInstance: HTTP 401 detected, logging out user.');
        }
        await storage.removeItem('user');
        await storage.removeItem('token');

        window.dispatchEvent(new CustomEvent('auth-logout', { detail: { reason: data?.code || '401' } }));

        if (!window.location.hash.includes('#/login')) {
          window.location.hash = '#/login?session_expired=true';
        }
      } else if (httpStatus === 403) {
        // 403 should be handled by the calling component (plan/access control).
        if (shouldLogError(`auth403:${url}`)) {
          console.warn('axiosInstance: HTTP 403 detected (access denied).');
        }
      }
    } else if (error.code === 'ECONNABORTED') {
      if (shouldLogError(`timeout:${url}`)) {
        console.error('axiosInstance: Request timeout exceeded.');
      }
      error.message = 'La operacion tardo demasiado tiempo. Intenta de nuevo.';
    } else if (error.request) {
      if (shouldLogError(`norsp:${url}:${error?.message || 'network'}`)) {
        console.error('axiosInstance: No response from server:', {
          url,
          message: error?.message || 'network error',
        });
      }
    } else {
      if (shouldLogError(`cfg:${url}:${error?.message || 'request'}`)) {
        console.error('axiosInstance: Request config error:', error?.message);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
