import { Capacitor, CapacitorHttp } from "@capacitor/core";
import axiosInstance, { apiBaseURL } from "./axiosInstance.js";
import { storage } from "./storage.js";
import { getOrCreateDeviceId } from "./deviceIdentity.js";

export const login = async (username, password) => {
  const deviceId = await getOrCreateDeviceId();
  const loginPath = "/api/auth/login";

  try {
    const requestPayload = { username, password, deviceId };
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
    if (error.response?.status === 403 && error.response?.data?.error?.includes("Limite de dispositivos")) {
      throw new Error("Has alcanzado el limite de dispositivos conectados. Cierra sesion en otro dispositivo para continuar.");
    }

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Error desconocido en el servicio de login.";

    throw new Error(errorMessage);
  }
};

export const register = async (username, password) => {
  const registerPath = "/api/auth/register";
  try {
    const response = await axiosInstance.post(registerPath, { username, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error(error.message || "Error desconocido en el servicio de registro.");
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
