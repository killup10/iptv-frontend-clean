  // src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from '../utils/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const checkStoredSession = async () => {
      console.log("AuthContext: Verificando sesión almacenada...");
      try {
        const storedUserString = await storage.getItem('user');
        const token = await storage.getItem('token');

        if (storedUserString && token) {
          const storedUser = JSON.parse(storedUserString);
          setUser({
            username: storedUser.username,
            role: storedUser.role,
            plan: storedUser.plan,
            token: token
          });
          console.log("AuthContext: Sesión restaurada desde storage.", { user: storedUser, tokenLoaded: !!token });
        } else {
          console.log("AuthContext: No se encontró sesión almacenada.");
          setUser(null);
        }
      } catch (error) {
        console.error("AuthContext: Error al parsear datos de storage o token inválido", error);
        await storage.removeItem('user');
        await storage.removeItem('token');
        setUser(null);
      } finally {
        setIsLoadingAuth(false);
        console.log("AuthContext: Verificación inicial de auth completada.");
      }
    };

    checkStoredSession();
  }, []);

  const login = async (credentials) => {
    try {
      const { login: loginService } = await import('../utils/AuthService.js');
      const userDataFromBackend = await loginService(credentials.username, credentials.password);

      if (!userDataFromBackend?.token || !userDataFromBackend?.user?.username) {
        console.error("AuthContext: Datos de login incompletos desde el backend.", userDataFromBackend);
        throw new Error("Error de autenticación: datos de respuesta inválidos");
      }

      const userToStore = {
        username: userDataFromBackend.user.username,
        role: userDataFromBackend.user.role,
        plan: userDataFromBackend.user.plan,
      };

      await storage.setItem('token', userDataFromBackend.token);
      await storage.setItem('user', JSON.stringify(userToStore));

      const userForState = { ...userToStore, token: userDataFromBackend.token };
      setUser(userForState);
      console.log("AuthContext: Usuario logueado y estado establecido:", userForState);
      return userForState;
    } catch (error) {
      console.error("AuthContext: Error en el proceso de login:", error);
      throw error;
    }
  };

  const logout = async (allDevices = false) => {
    try {
      const { logout: logoutService } = await import('../utils/AuthService.js');
      await logoutService(allDevices);
    } catch (error) {
      console.error("AuthContext: Error al llamar al servicio de logout:", error);
    } finally {
      // Limpiar siempre el estado local independientemente del resultado del backend
      await storage.removeItem('user');
      await storage.removeItem('token');
      await storage.removeItem('deviceId');
      setUser(null);
      console.log("AuthContext: Usuario deslogueado y datos locales limpiados" + (allDevices ? " de todos los dispositivos." : "."));
    }
  };

  const registerUser = async (credentials) => {
    try {
      const { register: registerService } = await import('../utils/AuthService.js');
      const userDataFromBackend = await registerService(credentials.username, credentials.password);

      if (userDataFromBackend?.token && userDataFromBackend?.user?.username) {
        const userToStore = {
          username: userDataFromBackend.user.username,
          role: userDataFromBackend.user.role,
          plan: userDataFromBackend.user.plan,
        };
        await storage.setItem('token', userDataFromBackend.token);
        await storage.setItem('user', JSON.stringify(userToStore));
        setUser({ ...userToStore, token: userDataFromBackend.token });
        console.log("AuthContext: Usuario registrado y logueado automáticamente.", userDataFromBackend);
      } else {
        console.log("AuthContext: Usuario registrado, pero no se logueó automáticamente (no se recibió token).");
      }
      return userDataFromBackend;
    } catch (error) {
      console.error("AuthContext: Error en el proceso de registro:", error);
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
    token: user?.token
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