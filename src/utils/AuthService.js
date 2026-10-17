import { Capacitor, CapacitorHttp } from "@capacitor/core";
import axiosInstance, { apiBaseURL, APP_VERSION } from "./axiosInstance.js";
import { storage } from "./storage.js";
import { getOrCreateDeviceId } from "./deviceIdentity.js";
import { getPlatformName } from "./platformUtils.js";

export const login = async (username, password, unlinkDeviceId = null) => {
  const deviceId = await getOrCreateDeviceId();
  const loginPath = "/api/auth/login";

  try {
    const requestPayload = {
      username,
      password,
      deviceId,
      ...(unlinkDeviceId ? { unlinkDeviceId } : {}),
    };
    let response;

    try {
      response = await axiosInstance.post(loginPath, requestPayload);
    } catch (axiosError) {
      const shouldTryNativeFallback =
        Capacitor.isNativePlatform() &&
        (!axiosError.response || axiosError.code === "ECONNABORTED" || /network error/i.test(axiosError.message || ""));

      if (!shouldTryNativeFallback) {
        throw axiosError;
      }

      response = await CapacitorHttp.post({
        url: `${apiBaseURL}${loginPath}`,
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
          "x-app-version": APP_VERSION,
          "x-teamg-client": getPlatformName() || "tv",
        },
        data: requestPayload,
        connectTimeout: 20000,
        readTimeout: 20000,
      });
    }

    const status = response?.status ?? 200;
    const responseData = response?.data ?? response;

    if (status >= 400) {
      const nativeError = new Error(
        responseData?.error || responseData?.message || "Error desconocido en el servicio de login."
      );
      nativeError.response = { status, data: responseData };
      throw nativeError;
    }

    await storage.setItem("deviceId", deviceId);
    return responseData;
  } catch (error) {
    if (error.response?.status === 403 && (
      error.response?.data?.code === "DEVICE_LIMIT_REACHED" ||
      error.response?.data?.error?.includes("Limite de dispositivos") ||
      error.response?.data?.error?.includes("Límite de dispositivos")
    )) {
      const deviceError = new Error(error.response?.data?.error || "Has alcanzado el límite de dispositivos conectados.");
      deviceError.response = error.response;
      throw deviceError;
    }

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Error desconocido en el servicio de login.";

    const formattedError = new Error(errorMessage);
    if (error.response) {
      formattedError.response = error.response;
    }
    throw formattedError;
  }
};

export const loginWithCode = async (code) => {
  const deviceId = await getOrCreateDeviceId();
  const loginCodePath = "/api/auth/login-code";

  try {
    const requestPayload = {
      code: String(code || "").trim().toUpperCase(),
      deviceId,
    };
    let response;

    try {
      response = await axiosInstance.post(loginCodePath, requestPayload);
    } catch (axiosError) {
      const shouldTryNativeFallback =
        Capacitor.isNativePlatform() &&
        (!axiosError.response || axiosError.code === "ECONNABORTED" || /network error/i.test(axiosError.message || ""));

      if (!shouldTryNativeFallback) {
        throw axiosError;
      }

      response = await CapacitorHttp.post({
        url: `${apiBaseURL}${loginCodePath}`,
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
          "x-app-version": APP_VERSION,
          "x-teamg-client": getPlatformName() || "tv",
        },
        data: requestPayload,
        connectTimeout: 20000,
        readTimeout: 20000,
      });
    }

    const status = response?.status ?? 200;
    const responseData = response?.data ?? response;

    if (status >= 400) {
      const nativeError = new Error(
        responseData?.error || responseData?.message || "Código de activación inválido."
      );
      nativeError.response = { status, data: responseData };
      throw nativeError;
    }

    await storage.setItem("deviceId", deviceId);
    return responseData;
  } catch (error) {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Error al activar con código.";

    const formattedError = new Error(errorMessage);
    if (error.response) {
      formattedError.response = error.response;
    }
    throw formattedError;
  }
};

export const requestDeviceCode = async () => {
  const deviceId = await getOrCreateDeviceId();
  const deviceType = getPlatformName() || "web";
  const requestPath = "/api/auth/device-code/request";

  try {
    const payload = { deviceId, deviceType };
    let response;
    try {
      response = await axiosInstance.post(requestPath, payload);
    } catch (axiosError) {
      if (Capacitor.isNativePlatform()) {
        response = await CapacitorHttp.post({
          url: `${apiBaseURL}${requestPath}`,
          headers: {
            "Content-Type": "application/json",
            "x-device-id": deviceId,
            "x-app-version": APP_VERSION,
            "x-teamg-client": deviceType,
          },
          data: payload,
          connectTimeout: 15000,
          readTimeout: 15000,
        });
      } else {
        throw axiosError;
      }
    }

    const data = response?.data ?? response;
    await storage.setItem("deviceId", deviceId);
    return data;
  } catch (error) {
    console.error("Error al solicitar código de dispositivo:", error);
    throw error.response?.data || new Error(error.message || "Error al solicitar código de activación.");
  }
};

export const checkDeviceCode = async (code) => {
  const deviceId = await getOrCreateDeviceId();
  const checkPath = `/api/auth/device-code/check?code=${encodeURIComponent(code)}&deviceId=${encodeURIComponent(deviceId)}`;

  try {
    let response;
    try {
      response = await axiosInstance.get(checkPath);
    } catch (axiosError) {
      if (Capacitor.isNativePlatform()) {
        response = await CapacitorHttp.get({
          url: `${apiBaseURL}${checkPath}`,
          headers: {
            "x-device-id": deviceId,
            "x-app-version": APP_VERSION,
            "x-teamg-client": getPlatformName() || "web",
          },
          connectTimeout: 10000,
          readTimeout: 10000,
        });
      } else {
        throw axiosError;
      }
    }

    const data = response?.data ?? response;
    return data;
  } catch (error) {
    return { status: "pending" };
  }
};


export const register = async (username, password) => {
  const registerPath = "/api/auth/register";
  try {
    const response = await axiosInstance.post(registerPath, { username, password });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (error.response?.status === 409 ? "El nombre de usuario ya está en uso." : null) ||
      error.message ||
      "Error desconocido en el servicio de registro.";
    const registrationError = new Error(message);
    if (error.response) {
      registrationError.response = error.response;
    }
    throw registrationError;
  }
};

export const logout = async (allDevices = false) => {
  const logoutPath = "/api/auth/logout";
  try {
    const deviceId = allDevices ? null : await storage.getItem("deviceId");
    await axiosInstance.post(logoutPath, { deviceId });
    await storage.removeItem("deviceId");
    return true;
  } catch (error) {
    throw error.response?.data || new Error(error.message || "Error al cerrar sesion.");
  }
};
