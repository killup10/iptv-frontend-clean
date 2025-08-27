// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx"; // Ajusta la ruta si es necesario

export default function PrivateRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  // Si no hay usuario o token, redirige a login guardando la ruta actual
  if (!user || !user.token) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Si tus tokens expiran y quieres validar exp, puedes descomentar esto:
  /*
  const isTokenExpired = () => {
    try {
      const payload = JSON.parse(atob(user.token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };
  if (isTokenExpired()) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }
  */

  return children;
}
