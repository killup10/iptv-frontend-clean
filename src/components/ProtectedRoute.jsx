// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // Asegúrate que la ruta a tu AuthContext sea correcta

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isLoadingAuth } = useAuth(); // Asumimos que tu AuthContext expone 'user' y 'isLoadingAuth'
  const location = useLocation();

  // Si aún está cargando la información de autenticación, muestra un loader
  // Esto evita redirigir a login prematuramente si la sesión se está restaurando.
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Si no hay usuario (no está logueado), redirigir a la página de login
  // Se guarda la 'location' actual para que después del login se pueda redirigir de vuelta.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si la ruta es solo para administradores y el usuario no es admin, redirigir
  if (adminOnly && user.role !== 'admin') {
    // Podrías redirigir a una página de "Acceso Denegado" o simplemente al Home
    console.warn("Acceso de administrador denegado para el usuario:", user.username);
    return <Navigate to="/" replace />; 
  }

  // Si todas las condiciones se cumplen, renderizar el contenido protegido (los children)
  return children;
};

export default ProtectedRoute;