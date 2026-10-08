// src/main.jsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// Auto-recarga en caso de chunk obsoleto por nuevo despliegue
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Dynamic import chunk obsoleto o fallido. Recargando página automáticamente...');
    window.location.reload();
  });
}

import AppLayout from './App.jsx';
import './index.css';
// Cambiamos createBrowserRouter por createHashRouter para Electron
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy load de todas las páginas para mejorar performance
const Home = React.lazy(() => import('./pages/Home.jsx'));
const LandingPage = React.lazy(() => import('./pages/LandingPage.jsx'));
const Login = React.lazy(() => import('./pages/Login.jsx'));
const Register = React.lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword.jsx'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel.jsx'));
// Watch NO es lazy porque se usa constantemente desde búsqueda
import Watch from './pages/Watch.jsx';
const LiveTVPage = React.lazy(() => import('./pages/LiveTVPage.jsx'));
const TVLiveTV = React.lazy(() => import('./pages/TVLiveTV.jsx'));
const AppTV = React.lazy(() => import('./AppTV.jsx'));
const TVCatalogPage = React.lazy(() => import('./pages/TVCatalogPage.jsx'));
const TVSeriesPage = React.lazy(() => import('./pages/TVSeriesPage.jsx'));
const TVCollectionsPage = React.lazy(() => import('./pages/TVCollectionsPage.jsx'));
const TVMyListPage = React.lazy(() => import('./pages/TVMyListPage.jsx'));
const TVMoviesPage = React.lazy(() => import('./pages/TVMoviesPage.jsx'));
const TVKidsPage = React.lazy(() => import('./pages/TVKidsPage.jsx'));
const TVHalloweenPage = React.lazy(() => import('./pages/TVHalloweenPage.jsx'));
const TVMusicPage = React.lazy(() => import('./pages/TVMusicPage.jsx'));
const MoviesPage = React.lazy(() => import('./pages/MoviesPage.jsx'));
const SeriesPage = React.lazy(() => import('./pages/SeriesPage.jsx'));
const Animes = React.lazy(() => import('./pages/Animes.jsx'));
const Documentales = React.lazy(() => import('./pages/Documentales.jsx'));
const Doramas = React.lazy(() => import('./pages/Doramas.jsx'));
const Novelas = React.lazy(() => import('./pages/Novelas.jsx'));
const Colecciones = React.lazy(() => import('./pages/Colecciones.jsx'));
const ZonaKids = React.lazy(() => import('./pages/ZonaKids.jsx'));
const Halloween = React.lazy(() => import('./pages/Halloween.jsx'));
const BulkUploadPage = React.lazy(() => import('./pages/BulkUploadPage.jsx'));
const MyList = React.lazy(() => import('./pages/MyList.jsx'));
const Profiles = React.lazy(() => import('./pages/Profiles.jsx'));
const Settings = React.lazy(() => import('./pages/Settings.jsx'));
const RecienAgregados = React.lazy(() => import('./pages/RecienAgregados.jsx'));
const Pedidos = React.lazy(() => import('./pages/Pedidos.jsx'));
const Descargas = React.lazy(() => import('./pages/Descargas.jsx'));
const Music = React.lazy(() => import('./pages/Music.jsx'));
import { MusicProvider } from './context/MusicContext.jsx';


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

import { useAuth } from './context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

const RootRoute = () => {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return <PageLoader />;
  }
  if (user) {
    return <Navigate to="/home" replace />;
  }
  return <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>;
};

const router = createHashRouter([
  {
    path: "/", // En HashRouter, esto se traduce a la ruta base (ej. index.html#/)
    element: <AppLayout />,
    children: [
      { path: "login", element: <Suspense fallback={<PageLoader />}><Login /></Suspense> },
      { path: "register", element: <Suspense fallback={<PageLoader />}><Register /></Suspense> },
      { path: "forgot-password", element: <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense> },
      { index: true, element: <RootRoute /> },
      { path: "home", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Home /></Suspense></ProtectedRoute> },
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
            <Watch />
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
        path: "halloween",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Halloween />
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
        path: "pedidos",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Pedidos />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "offline",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Descargas />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "descargas",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Descargas />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "musica",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Music />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "music",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Music />
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
        path: "profiles",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Profiles />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "recien-agregados",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <RecienAgregados />
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

const tvRouter = createHashRouter([
  { path: "/login", element: <Suspense fallback={<PageLoader />}><Login /></Suspense> },
  { path: "/register", element: <Suspense fallback={<PageLoader />}><Register /></Suspense> },
  { path: "/forgot-password", element: <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense> },
  { path: "/profiles", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Profiles /></Suspense></ProtectedRoute> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <AppTV />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<PageLoader />}><Home /></Suspense> },
      { path: "home", element: <Navigate to="/" replace /> },
      { path: "tv", element: <Navigate to="/live-tv" replace /> },
      { path: "live-tv", element: <Suspense fallback={<PageLoader />}><TVLiveTV /></Suspense> },
      { path: "musica", element: <Suspense fallback={<PageLoader />}><TVMusicPage /></Suspense> },
      { path: "music", element: <Navigate to="/musica" replace /> },
      { path: "peliculas", element: <Suspense fallback={<PageLoader />}><TVMoviesPage /></Suspense> },
      { path: "peliculas/:sectionKey", element: <Suspense fallback={<PageLoader />}><TVMoviesPage /></Suspense> },
      { path: "series", element: <Suspense fallback={<PageLoader />}><TVSeriesPage /></Suspense> },
      { path: "animes", element: <Suspense fallback={<PageLoader />}><TVCatalogPage title="Animes" contentType="anime" fallbackWatchType="anime" /></Suspense> },
      { path: "doramas", element: <Suspense fallback={<PageLoader />}><TVCatalogPage title="Series Asiáticas" contentType="dorama" fallbackWatchType="dorama" /></Suspense> },
      { path: "novelas", element: <Suspense fallback={<PageLoader />}><TVCatalogPage title="Novelas" contentType="novela" fallbackWatchType="novela" /></Suspense> },
      { path: "documentales", element: <Suspense fallback={<PageLoader />}><TVCatalogPage title="Documentales" contentType="documental" fallbackWatchType="documental" /></Suspense> },
      { path: "kids", element: <Suspense fallback={<PageLoader />}><TVKidsPage /></Suspense> },
      { path: "halloween", element: <Suspense fallback={<PageLoader />}><TVHalloweenPage /></Suspense> },
      { path: "colecciones", element: <Suspense fallback={<PageLoader />}><TVCollectionsPage /></Suspense> },
      { path: "mi-lista", element: <Suspense fallback={<PageLoader />}><TVMyListPage /></Suspense> },
      { path: "watch/:itemType/:itemId", element: <Watch /> },
      { path: "settings", element: <Suspense fallback={<PageLoader />}><Settings /></Suspense> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

const activeRouter = isAndroidTV() ? tvRouter : router;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <MusicProvider>
          <RouterProvider router={activeRouter} />
        </MusicProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
