// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppLayout from './App.jsx';
import './index.css';
// Cambiamos createBrowserRouter por createHashRouter para Electron
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Importar Páginas
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Watch from './pages/Watch.jsx'; // Página de reproducción
import LiveTVPage from './pages/LiveTVPage.jsx';
import MoviesPage from './pages/MoviesPage.jsx';
import SeriesPage from './pages/SeriesPage.jsx';
import Animes from './pages/Animes.jsx';
import Documentales from './pages/Documentales.jsx';
import Doramas from './pages/Doramas.jsx';
import Novelas from './pages/Novelas.jsx';
import Colecciones from './pages/Colecciones.jsx';
import ZonaKids from './pages/ZonaKids.jsx';
import BulkUploadPage from './pages/BulkUploadPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import TestPlayer from './pages/TestPlayer.jsx';
// import NotFoundPage from './pages/NotFoundPage.jsx'; // Descomenta si tienes una página 404 personalizada

// Usamos createHashRouter en lugar de createBrowserRouter
// Esto es más adecuado para aplicaciones Electron cargadas con file://
// ya que no requiere configuración del lado del servidor para manejar rutas.
const router = createHashRouter([
  {
    path: "/", // En HashRouter, esto se traduce a la ruta base (ej. index.html#/)
    element: <AppLayout />,
    children: [
      { path: "login", element: <Home /> },
      { path: "register", element: <Register /> },
      { index: true, element: <ProtectedRoute><Home /></ProtectedRoute> },
      {
        path: "admin",
        element: (
          <ProtectedRoute adminOnly={true}>
            <AdminPanel />
          </ProtectedRoute>
        ),
      },
      {
        path: "watch/:itemType/:itemId",
        element: (
          <ProtectedRoute>
            <Watch />
          </ProtectedRoute>
        ),
      },
            {
        path: "live-tv",
        element: (
          <ProtectedRoute>
            <LiveTVPage />
          </ProtectedRoute>
        ),
      },,
      {
        path: "peliculas",
        element: (
          <ProtectedRoute>
            <MoviesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "series",
        element: (
          <ProtectedRoute>
            <SeriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "animes",
        element: (
          <ProtectedRoute>
            <Animes />
          </ProtectedRoute>
        ),
      },
      {
        path: "doramas",
        element: (
          <ProtectedRoute>
            <Doramas />
          </ProtectedRoute>
        ),
      },
      {
        path: "novelas",
        element: (
          <ProtectedRoute>
            <Novelas />
          </ProtectedRoute>
        ),
      },
      {
        path: "documentales",
        element: (
          <ProtectedRoute>
            <Documentales />
          </ProtectedRoute>
        ),
      },
      {
        path: "kids",
        element: (
          <ProtectedRoute>
            <ZonaKids />
          </ProtectedRoute>
        ),
      },
      {
        path: "colecciones",
        element: (
          <ProtectedRoute>
            <Colecciones />
          </ProtectedRoute>
        ),
      },
      {
        path: "bulk-upload",
        element: (
          <ProtectedRoute adminOnly={true}>
            <BulkUploadPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "test-player",
        element: (
          <ProtectedRoute>
            <TestPlayer />
          </ProtectedRoute>
        ),
      },
      // Ruta catch-all para 404 (opcional, pero recomendada)
      // Asegúrate de que esta sea la última ruta dentro de los children de AppLayout
      // { path: "*", element: <NotFoundPage /> }, // Descomenta si tienes NotFoundPage
    ],
  },
  // Puedes tener otras rutas de nivel superior aquí si es necesario,
  // aunque generalmente con AppLayout como raíz es suficiente.
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);