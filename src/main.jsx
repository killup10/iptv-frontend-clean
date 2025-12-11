// src/main.jsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import AppLayout from './App.jsx';
import './index.css';
// Cambiamos createBrowserRouter por createHashRouter para Electron
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy load de todas las páginas para mejorar performance
const Home = React.lazy(() => import('./pages/Home.jsx'));
const Register = React.lazy(() => import('./pages/Register.jsx'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel.jsx'));
const Watch = React.lazy(() => import('./pages/Watch.jsx'));
const LiveTVPage = React.lazy(() => import('./pages/LiveTVPage.jsx'));
const TVLiveTV = React.lazy(() => import('./pages/TVLiveTV.jsx'));
const MoviesPage = React.lazy(() => import('./pages/MoviesPage.jsx'));
const SeriesPage = React.lazy(() => import('./pages/SeriesPage.jsx'));
const Animes = React.lazy(() => import('./pages/Animes.jsx'));
const Documentales = React.lazy(() => import('./pages/Documentales.jsx'));
const Doramas = React.lazy(() => import('./pages/Doramas.jsx'));
const Novelas = React.lazy(() => import('./pages/Novelas.jsx'));
const Colecciones = React.lazy(() => import('./pages/Colecciones.jsx'));
const ZonaKids = React.lazy(() => import('./pages/ZonaKids.jsx'));
const BulkUploadPage = React.lazy(() => import('./pages/BulkUploadPage.jsx'));
const MyList = React.lazy(() => import('./pages/MyList.jsx'));
const TestPlayer = React.lazy(() => import('./pages/TestPlayer.jsx'));

import { isAndroidTV } from './utils/platformUtils.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Loading component para Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-black">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
      <p className="text-gray-400">Cargando...</p>
    </div>
  </div>
);

const router = createHashRouter([
  {
    path: "/", // En HashRouter, esto se traduce a la ruta base (ej. index.html#/)
    element: <AppLayout />,
    children: [
      { path: "login", element: <Suspense fallback={<PageLoader />}><Home /></Suspense> },
      { path: "register", element: <Suspense fallback={<PageLoader />}><Register /></Suspense> },
      { index: true, element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Home /></Suspense></ProtectedRoute> },
      {
        path: "admin",
        element: (
          <ProtectedRoute adminOnly={true}>
            <Suspense fallback={<PageLoader />}>
              <AdminPanel />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "watch/:itemType/:itemId",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Watch />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "live-tv",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              {isAndroidTV() ? <TVLiveTV /> : <LiveTVPage />}
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "peliculas",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MoviesPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "series",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SeriesPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "animes",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Animes />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "doramas",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Doramas />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "novelas",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Novelas />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "documentales",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Documentales />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "kids",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ZonaKids />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "colecciones",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Colecciones />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "mi-lista",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MyList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "bulk-upload",
        element: (
          <ProtectedRoute adminOnly={true}>
            <Suspense fallback={<PageLoader />}>
              <BulkUploadPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "test-player",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <TestPlayer />
            </Suspense>
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
