// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
// Asume que tienes estas funciones definidas en tu api.js
// import { loginUser as apiLoginUser, registerUser as apiRegisterUser } from '../utils/api'; 

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Para saber si se está verificando la sesión inicial

  useEffect(() => {
    console.log("AuthContext: Verificando sesión almacenada...");
    try {
      const storedUserString = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUserString && token) {
        const storedUser = JSON.parse(storedUserString);
        // Reconstruye el estado del usuario asegurando que todos los campos necesarios estén presentes
        setUser({
          username: storedUser.username,
          role: storedUser.role,
          plan: storedUser.plan, // Asegúrate que el plan se carga
          token: token // Añade el token al estado del usuario
        });
        console.log("AuthContext: Sesión restaurada desde localStorage.", { user: storedUser, tokenLoaded: !!token });
      } else {
        console.log("AuthContext: No se encontró sesión almacenada.");
        setUser(null); 
      }
    } catch (error) {
      console.error("AuthContext: Error al parsear datos de localStorage o token inválido", error);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
      console.log("AuthContext: Verificación inicial de auth completada.");
    }
  }, []);

  const login = async (credentials) => {
    try {
      const { login: loginService } = await import('../utils/AuthService.js');
      const userDataFromBackend = await loginService(credentials.username, credentials.password);

      if (!userDataFromBackend?.token || !userDataFromBackend?.user?.username) {
        console.error(
          "AuthContext: Datos de login incompletos desde el backend.",
          userDataFromBackend
        );
        throw new Error("Error de autenticación: datos de respuesta inválidos");
      }

      const userToStoreInLocalStorage = {
        username: userDataFromBackend.user.username,
        role: userDataFromBackend.user.role,
        plan: userDataFromBackend.user.plan,
      };

      // Guardar datos en localStorage
      localStorage.setItem("token", userDataFromBackend.token);
      localStorage.setItem("user", JSON.stringify(userToStoreInLocalStorage));

      const userForState = {
        ...userToStoreInLocalStorage,
        token: userDataFromBackend.token,
      };
      setUser(userForState);
      console.log("AuthContext: Usuario logueado y estado establecido:", userForState);
      return userForState;
    } catch (error) {
      console.error("AuthContext: Error en el proceso de login:", error);
      // Re-lanzamos el error para que el componente que llama a login (Home.jsx) pueda manejarlo
      throw error;
    }
  };

  const logout = async (allDevices = false) => {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { logout: logoutService } = await import('../utils/AuthService.js');
      await logoutService(allDevices);
      
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("deviceId");
      setUser(null);
      console.log("AuthContext: Usuario deslogueado" + (allDevices ? " de todos los dispositivos." : "."));
    } catch (error) {
      console.error("AuthContext: Error al cerrar sesión:", error);
      // Aún así, limpiar el estado local
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("deviceId");
      setUser(null);
    }
  };

  const registerUser = async (credentials) => {
    try {
      const { register: registerService } = await import('../utils/AuthService.js');
      const userDataFromBackend = await registerService(credentials.username, credentials.password);

      // Opcional: Loguear al usuario automáticamente después del registro exitoso
      // Si el backend devuelve un token y datos de usuario, puedes loguearlo directamente
      if (userDataFromBackend?.token && userDataFromBackend?.user?.username) {
        const userToStoreInLocalStorage = {
          username: userDataFromBackend.user.username,
          role: userDataFromBackend.user.role,
          plan: userDataFromBackend.user.plan,
        };
        localStorage.setItem("token", userDataFromBackend.token);
        localStorage.setItem("user", JSON.stringify(userToStoreInLocalStorage));
        setUser({ ...userToStoreInLocalStorage, token: userDataFromBackend.token });
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
    user, // user ahora contendrá { username, role, plan, token } o null
    login,
    logout,
    register: registerUser, // Exponer la función de registro
    isLoadingAuth,
    isAuthenticated: !!user && !!user.token, // Una forma más robusta de verificar autenticación
    token: user?.token // Acceso directo al token si es necesario fuera del contexto
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