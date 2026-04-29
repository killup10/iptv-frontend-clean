import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppTV from './AppTV.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Watch from './pages/Watch.jsx';
import TVLiveTV from './pages/TVLiveTV.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import TVCatalogPage from './pages/TVCatalogPage.jsx';
import TVSeriesPage from './pages/TVSeriesPage.jsx';
import TVCollectionsPage from './pages/TVCollectionsPage.jsx';
import TVMyListPage from './pages/TVMyListPage.jsx';
import TVMoviesPage from './pages/TVMoviesPage.jsx';
import TVKidsPage from './pages/TVKidsPage.jsx';
import './index.css';

function TVApp() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <AppTV />
              </ProtectedRoute>
            )}
          >
            <Route index element={<Home />} />
            <Route path="tv" element={<Navigate to="/live-tv" replace />} />
            <Route path="live-tv" element={<TVLiveTV />} />
            <Route
              path="peliculas"
              element={<TVMoviesPage />}
            />
            <Route
              path="peliculas/:sectionKey"
              element={<TVMoviesPage />}
            />
            <Route
              path="series"
              element={<TVSeriesPage />}
            />
            <Route
              path="animes"
              element={<TVCatalogPage title="Animes" contentType="anime" fallbackWatchType="anime" />}
            />
            <Route
              path="doramas"
              element={<TVCatalogPage title="Doramas" contentType="dorama" fallbackWatchType="dorama" />}
            />
            <Route
              path="novelas"
              element={<TVCatalogPage title="Novelas" contentType="novela" fallbackWatchType="novela" />}
            />
            <Route
              path="documentales"
              element={<TVCatalogPage title="Documentales" contentType="documental" fallbackWatchType="documental" />}
            />
            <Route
              path="kids"
              element={<TVKidsPage />}
            />
            <Route
              path="colecciones"
              element={<TVCollectionsPage />}
            />
            <Route
              path="mi-lista"
              element={<TVMyListPage />}
            />
            <Route path="watch/:itemType/:itemId" element={<Watch />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <TVApp />
    </ErrorBoundary>
  </React.StrictMode>
);
