import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "../utils/storage.js";
import { stopActivePlayback } from "../utils/playbackControl.js";

const AuthContext = createContext(null);

function buildStoredUserPayload(rawUser) {
  if (!rawUser) {
    return null;
  }

  return {
    username: rawUser.username,
    role: rawUser.role,
    plan: rawUser.plan,
    expiresAt: rawUser.expiresAt || null,
  };
}

function buildUserState(rawUser, token) {
  const storedUser = buildStoredUserPayload(rawUser);
  if (!storedUser || !token) {
    return null;
  }

  return {
    ...storedUser,
    token,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const syncUserFromStorage = async () => {
      try {
        const storedUserString = await storage.getItem("user");
        const token = await storage.getItem("token");

        if (!storedUserString || !token) {
          setUser(null);
          return;
        }

        const storedUser = JSON.parse(storedUserString);
        setUser(buildUserState(storedUser, token));
      } catch (error) {
        console.error("AuthContext: Error sincronizando sesion desde storage:", error);
        await storage.removeItem("user");
        await storage.removeItem("token");
        setUser(null);
      }
    };

    const checkStoredSession = async () => {
      await syncUserFromStorage();
      setIsLoadingAuth(false);
    };

    const handleStorageChange = async (event) => {
      if (event.key === "user" || event.key === "token" || event.key === null) {
        await syncUserFromStorage();
      }
    };

    const handleAuthLogout = async (event) => {
      const reason = event?.detail?.reason || "401";
      await storage.removeItem("user");
      await storage.removeItem("token");
      await stopActivePlayback(reason);
      setUser(null);
    };

    checkStoredSession();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-logout", handleAuthLogout);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-logout", handleAuthLogout);
    };
  }, []);

  const login = async (credentials) => {
    try {
      const { login: loginService } = await import("../utils/AuthService.js");
      const userDataFromBackend = await loginService(credentials.username, credentials.password);

      if (!userDataFromBackend?.token || !userDataFromBackend?.user?.username) {
        throw new Error("Error de autenticacion: datos de respuesta invalidos");
      }

      const userToStore = buildStoredUserPayload(userDataFromBackend.user);

      await storage.setItem("token", userDataFromBackend.token);
      await storage.setItem("user", JSON.stringify(userToStore));

      const userForState = buildUserState(userDataFromBackend.user, userDataFromBackend.token);
      setUser(userForState);
      return userForState;
    } catch (error) {
      console.error("AuthContext: Error en login:", error);
      throw error;
    }
  };

  const logout = async (allDevices = false) => {
    try {
      const { logout: logoutService } = await import("../utils/AuthService.js");
      await logoutService(allDevices);
    } catch (error) {
      console.error("AuthContext: Error al llamar al servicio de logout:", error);
    } finally {
      await stopActivePlayback(allDevices ? "manual_all_devices" : "manual_logout");
      await storage.removeItem("user");
      await storage.removeItem("token");
      await storage.removeItem("deviceId");
      setUser(null);
    }
  };

  const registerUser = async (credentials) => {
    try {
      const { register: registerService } = await import("../utils/AuthService.js");
      const userDataFromBackend = await registerService(credentials.username, credentials.password);

      if (userDataFromBackend?.token && userDataFromBackend?.user?.username) {
        const userToStore = buildStoredUserPayload(userDataFromBackend.user);
        await storage.setItem("token", userDataFromBackend.token);
        await storage.setItem("user", JSON.stringify(userToStore));
        setUser(buildUserState(userDataFromBackend.user, userDataFromBackend.token));
      }

      return userDataFromBackend;
    } catch (error) {
      console.error("AuthContext: Error en registro:", error);
      throw error;
    }
  };

  const contextValue = {
    user,
    login,
    logout,
    register: registerUser,
    isLoadingAuth,
    isAuthenticated: !!user && !!user.token,
    token: user?.token,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}
