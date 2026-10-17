import React, { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import TVNavigation from "./components/TVNavigation.jsx";
import TVSearch from "./components/TVSearch.jsx";
import { fetchUserChannels, fetchUserMovies, fetchVideosByType } from "./utils/api.js";
import { TV_OPEN_SEARCH_EVENT } from "./utils/tvSearchEvents.js";
import { getTVItemId, resolveTVItemType, unwrapTVItems } from "./utils/tvContentUtils.js";
import { focusTVContent, focusTVNav, getTVFocusZone, setTVFocusZone, TV_FOCUS_ZONE_MODAL, TV_FOCUS_ZONE_NAV } from "./utils/tvFocusZone.js";
import { getTVKeyName, isTVBackKey } from "./utils/tvRemote.js";
import { getCachedTVSeriesItems, setCachedTVSeriesItems } from "./utils/tvBrowseCache.js";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import UpdateModal from "./components/UpdateModal.jsx";
import packageJson from "../package.json";
import axiosInstance from "./utils/axiosInstance.js";
import { useMusic } from "./context/MusicContext.jsx";

const HomeLivePlayer = Capacitor.isNativePlatform()
  ? registerPlugin("HomeLivePlayer")
  : null;

const HOME_BACK_ROUTES = new Set([
  '/live-tv',
  '/musica',
  '/peliculas',
  '/series',
  '/animes',
  '/doramas',
  '/novelas',
  '/documentales',
  '/kids',
  '/halloween',
  '/colecciones',
  '/mi-lista',
  '/settings',
]);

function normalizeGlobalSearchItems(items, fallbackType) {
  return unwrapTVItems(items)
    .filter(Boolean)
    .map((item) => ({
      ...item,
      type: item?.type || item?.itemType || item?.tipo || fallbackType,
      itemType: item?.itemType || item?.tipo || item?.type || fallbackType,
    }));
}

function AppTV() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isWatchPage = location.pathname.startsWith('/watch');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitModalFocusIndex, setExitModalFocusIndex] = useState(0); // 0 = Seguir viendo, 1 = Salir
  const { isPlaying, togglePlay } = useMusic();

  const closeExitConfirm = useCallback(() => {
    setShowExitConfirm(false);
    setExitModalFocusIndex(0);
    focusTVNav();
  }, []);

  const confirmExitApp = useCallback(async () => {
    setShowExitConfirm(false);
    try {
      if (HomeLivePlayer && typeof HomeLivePlayer.exitApp === "function") {
        await HomeLivePlayer.exitApp();
        return;
      }
      if (HomeLivePlayer && typeof HomeLivePlayer.stop === "function") {
        await HomeLivePlayer.stop();
      }
    } catch {}
    try {
      await CapacitorApp.exitApp();
    } catch {
      try {
        window.close();
      } catch {}
    }
  }, []);

  const isForcedTV = typeof window !== 'undefined' && (
    localStorage.getItem('FORCE_TV_MODE') === 'true' ||
    localStorage.getItem('FORCED_TV_MODE') === 'true' ||
    new URLSearchParams(window.location.search).get('tv') === 'true'
  );

  const handleExitTVMode = () => {
    localStorage.removeItem('FORCE_TV_MODE');
    localStorage.removeItem('FORCED_TV_MODE');
    window.location.reload();
  };

  useEffect(() => {
    document.body.classList.add('tv-interface');
    return () => {
      document.body.classList.remove('tv-interface');
    };
  }, []);

  useEffect(() => {
    if (isWatchPage && isPlaying) {
      togglePlay();
    }
  }, [isWatchPage, isPlaying, togglePlay]);
  
  const [updateInfo, setUpdateInfo] = useState({ isOpen: false, latestVersion: '', notes: '', downloadUrl: '', force: false });

  // Version checker for TV updates (checks tvUrl). <=1.5.8 forzado.
  useEffect(() => {
    const compareVer = (a, b) => {
      const pa = String(a||'0.0.0').split('.').map(Number);
      const pb = String(b||'0.0.0').split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        if ((pb[i]||0) > (pa[i]||0)) return -1;
        if ((pa[i]||0) > (pb[i]||0)) return 1;
      }
      return 0;
    };
    const checkUpdates = async () => {
      try {
        const response = await axiosInstance.get('/api/updates/check');
        const { version: latestVersion, minVersion, force: serverForce, tvUrl, notes } = response.data;
        
        const localVersion = packageJson.version || '1.5.6';
        const min = minVersion || '1.5.9';
        const isBlocked = compareVer(localVersion, min) < 0;
        const isNewer = compareVer(localVersion, latestVersion) < 0;

        if (isBlocked || serverForce) {
          setUpdateInfo({ isOpen: true, latestVersion, notes, downloadUrl: tvUrl, force: true });
        } else if (isNewer) {
          setUpdateInfo({
            isOpen: true,
            latestVersion,
            notes,
            downloadUrl: tvUrl,
            force: false
          });
        }
      } catch (err) {
        console.warn('[AppTV] Failed to check for updates:', err);
      }
    };

    const onForceUpdate = (e) => {
      const d = e?.detail || {};
      setUpdateInfo((prev) => ({
        isOpen: true,
        latestVersion: d.latestVersion || prev.latestVersion || '1.5.11',
        notes: d.error || prev.notes || 'Tu versión ya no es compatible. Actualiza para continuar.',
        downloadUrl: prev.downloadUrl || d.url || 'https://teamg.store/teamgplay2TV.apk',
        force: true,
      }));
    };
    window.addEventListener('teamg-update-required', onForceUpdate);
    
    const timer = setTimeout(checkUpdates, 3000);
    return () => { clearTimeout(timer); window.removeEventListener('teamg-update-required', onForceUpdate); };
  }, []);
  const [globalSearchItems, setGlobalSearchItems] = useState([]);
  const globalSearchLoadedRef = useRef(false);
  const globalSearchLoadingRef = useRef(false);

  const loadGlobalSearchIndex = useCallback(async () => {
    if (globalSearchLoadedRef.current || globalSearchLoadingRef.current) {
      return;
    }

    globalSearchLoadingRef.current = true;
    try {
      const results = await Promise.allSettled([
        fetchUserChannels('Todos'),
        fetchVideosByType('pelicula', 1, 500),
        fetchVideosByType('serie', 1, 500),
        fetchVideosByType('anime', 1, 500),
        fetchVideosByType('dorama', 1, 500),
        fetchVideosByType('novela', 1, 500),
        fetchVideosByType('documental', 1, 500),
        fetchVideosByType('halloween', 1, 500),
        fetchUserMovies(1, 500, 'CINE_2026'),
      ]);

      const [
        channelsResult,
        moviesResult,
        seriesResult,
        animesResult,
        doramasResult,
        novelasResult,
        documentalesResult,
        halloweenResult,
        cine2026Result,
      ] = results;

      const nextItems = [
        ...(channelsResult.status === 'fulfilled' ? normalizeGlobalSearchItems(channelsResult.value, 'channel') : []),
        ...(moviesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(moviesResult.value, 'movie') : []),
        ...(seriesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(seriesResult.value, 'serie') : []),
        ...(animesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(animesResult.value, 'anime') : []),
        ...(doramasResult.status === 'fulfilled' ? normalizeGlobalSearchItems(doramasResult.value, 'dorama') : []),
        ...(novelasResult.status === 'fulfilled' ? normalizeGlobalSearchItems(novelasResult.value, 'novela') : []),
        ...(documentalesResult.status === 'fulfilled' ? normalizeGlobalSearchItems(documentalesResult.value, 'documental') : []),
        ...(halloweenResult.status === 'fulfilled' ? normalizeGlobalSearchItems(halloweenResult.value, 'halloween') : []),
        ...(cine2026Result.status === 'fulfilled' ? normalizeGlobalSearchItems(cine2026Result.value, 'movie') : []),
      ];

      const uniqueItems = Array.from(new Map(
        nextItems.map((item) => [getTVItemId(item) || `${item.itemType}-${item.name || item.title}`, item])
      ).values());

      setGlobalSearchItems(uniqueItems);
      if (seriesResult.status === 'fulfilled' && !getCachedTVSeriesItems()?.length) {
        setCachedTVSeriesItems(normalizeGlobalSearchItems(seriesResult.value, 'serie'));
      }
      globalSearchLoadedRef.current = true;
    } catch (error) {
      console.warn('[AppTV] No se pudo cargar el indice global de busqueda:', error?.message || error);
    } finally {
      globalSearchLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user?.token || isWatchPage) {
      return undefined;
    }

    // Diferir la indexación global 2.5s para dar prioridad absoluta al video "AHORA EN VIVO" del Home
    const timer = window.setTimeout(() => {
      loadGlobalSearchIndex();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [isWatchPage, loadGlobalSearchIndex, user?.token]);

  useEffect(() => {
    const handleOpenGlobalSearch = (event) => {
      if (event.detail?.scope !== 'global') {
        return;
      }

      setShowGlobalSearch(true);
      loadGlobalSearchIndex();
    };

    window.addEventListener(TV_OPEN_SEARCH_EVENT, handleOpenGlobalSearch);
    return () => window.removeEventListener(TV_OPEN_SEARCH_EVENT, handleOpenGlobalSearch);
  }, [loadGlobalSearchIndex]);

  const handleGlobalSearchSelect = useCallback((item) => {
    const itemId = getTVItemId(item);
    if (!itemId) {
      return;
    }

    const itemType = resolveTVItemType(item, item?.itemType || item?.tipo || 'movie');
    const returnPath = location.pathname && location.pathname !== '/login'
      ? location.pathname
      : '/';
    const returnState = location.state ? { ...location.state } : undefined;
    setShowGlobalSearch(false);

    if (itemType === 'channel') {
      navigate(`/watch/channel/${itemId}`, {
        state: {
          from: returnPath,
          returnState,
          fromSection: 'tv',
          selectedCategory: item?.section || 'Todos',
          channelName: item?.name || item?.title || 'Canal',
        },
      });
      return;
    }

    navigate(`/watch/${itemType}/${itemId}`, {
      state: {
        from: returnPath,
        returnState,
      },
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!showExitConfirm) return undefined;

    const handleExitModalKeyDown = (e) => {
      const keyName = getTVKeyName(e);
      if (isTVBackKey(e)) {
        e.preventDefault();
        e.stopPropagation();
        closeExitConfirm();
        return;
      }
      if (keyName === 'ArrowLeft' || keyName === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setExitModalFocusIndex(0);
        return;
      }
      if (keyName === 'ArrowRight' || keyName === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setExitModalFocusIndex(1);
        return;
      }
      if (keyName === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (exitModalFocusIndex === 1) {
          confirmExitApp();
        } else {
          closeExitConfirm();
        }
      }
    };

    window.addEventListener('keydown', handleExitModalKeyDown, true);
    return () => window.removeEventListener('keydown', handleExitModalKeyDown, true);
  }, [closeExitConfirm, confirmExitApp, exitModalFocusIndex, showExitConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showExitConfirm || e.defaultPrevented || getTVFocusZone() === TV_FOCUS_ZONE_MODAL) {
        return;
      }

      if (isWatchPage) {
        return;
      }

      // BACK canonico: Escape/GoBack/keyCode 4/27/111, y Borrar fuera de inputs.
      const isBackNavigationKey = isTVBackKey(e);

      if (!isBackNavigationKey) {
        return;
      }

      e.preventDefault();

      if (showGlobalSearch) {
        setShowGlobalSearch(false);
        focusTVContent();
        return;
      }

      if (location.pathname === '/') {
        if (getTVFocusZone() === TV_FOCUS_ZONE_NAV) {
          setExitModalFocusIndex(0);
          setShowExitConfirm(true);
          setTVFocusZone(TV_FOCUS_ZONE_MODAL);
          return;
        }
        focusTVNav();
        return;
      }

      // Si el foco NO está en la barra lateral en cualquier sección, BACK enfoca la barra lateral
      if (getTVFocusZone() !== TV_FOCUS_ZONE_NAV) {
        focusTVNav();
        return;
      }

      // Si ya está en la barra lateral y presiona BACK, regresar a Home
      if (HOME_BACK_ROUTES.has(location.pathname) || location.pathname.startsWith('/peliculas/')) {
        navigate('/', { replace: true });
        return;
      }

      navigate('/', { replace: true });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWatchPage, location.pathname, navigate, showExitConfirm, showGlobalSearch]);

  useEffect(() => {
    if (isWatchPage) return undefined;

    const timer = window.setTimeout(() => {
      focusTVContent();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isWatchPage, location.pathname]);

  return (
    <>
      <style>{`
        :root {
          --primary: 190 100% 50%;
          --secondary: 315 100% 60%;
        }
        
        .tv-app-container {
          background:
            radial-gradient(circle at top left, rgba(34, 211, 238, 0.08), transparent 28%),
            radial-gradient(circle at top right, rgba(244, 63, 94, 0.08), transparent 24%),
          linear-gradient(180deg, #050816 0%, #0a1023 45%, #03060f 100%);
          min-height: 100vh;
          color: #fff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .tv-main-content {
          min-height: 100vh;
          padding-left: ${isWatchPage ? '0' : '80px'};
          padding-top: 0;
        }
        
        .tv-footer {
          border-top: 1px solid rgba(34, 211, 238, 0.1);
          padding: 6px 40px;
          font-size: 11px;
          color: #94a3b8;
          margin-left: ${isWatchPage ? '0' : '80px'};
        }
        
        .tv-interface {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>

      <div className="tv-app-container">
        {isForcedTV && !isWatchPage && (
          <button
            type="button"
            onClick={handleExitTVMode}
            className="fixed top-4 right-4 z-[999] flex items-center gap-2 bg-black/85 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 transition-all active:scale-95 cursor-pointer"
            title="Salir del Modo Android TV y volver a la versión móvil"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">Modo TV (Prueba)</span>
            <span className="bg-red-500/80 hover:bg-red-600 px-2 py-0.5 rounded-full text-[10px] text-white transition">
              Volver a Móvil ✕
            </span>
          </button>
        )}
        {!isWatchPage && <TVNavigation />}
        <main className="tv-main-content">
          <Outlet />
        </main>

        {showGlobalSearch && (
          <TVSearch
            allContent={globalSearchItems}
            title="Buscar en todo TeamG Play"
            placeholder="Busca canales, peliculas, series..."
            onSelectItem={handleGlobalSearchSelect}
            onClose={() => {
              setShowGlobalSearch(false);
              focusTVContent();
            }}
          />
        )}

        {showExitConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-6">
            <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-[#070b18] p-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.92)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-2xl">
                📺
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">
                ¿Deseas salir de TeamG Play?
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Puedes continuar disfrutando de la programación en vivo o cerrar la aplicación.
              </p>
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={closeExitConfirm}
                  onMouseEnter={() => setExitModalFocusIndex(0)}
                  className={`flex-1 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                    exitModalFocusIndex === 0
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white ring-4 ring-cyan-300/70 scale-105 shadow-[0_0_25px_rgba(34,211,238,0.5)]"
                      : "border border-white/15 bg-white/5 text-slate-300"
                  }`}
                >
                  Seguir viendo
                </button>
                <button
                  type="button"
                  onClick={confirmExitApp}
                  onMouseEnter={() => setExitModalFocusIndex(1)}
                  className={`flex-1 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                    exitModalFocusIndex === 1
                      ? "bg-gradient-to-r from-rose-600 to-red-600 text-white ring-4 ring-rose-400/70 scale-105 shadow-[0_0_25px_rgba(244,63,94,0.5)]"
                      : "border border-white/15 bg-white/5 text-slate-300"
                  }`}
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}

        {!isWatchPage && (
          <footer className="tv-footer">
            <div className="mx-auto flex max-w-[1800px] items-center justify-between">
              <p>TeamG Play TV</p>
              <p>{user?.username ? `Perfil: ${user.username}` : 'Control remoto listo'}</p>
            </div>
          </footer>
        )}
      </div>
      <UpdateModal
        isOpen={updateInfo.isOpen}
        latestVersion={updateInfo.latestVersion}
        notes={updateInfo.notes}
        downloadUrl={updateInfo.downloadUrl}
        force={updateInfo.force}
        onClose={() => {
          if (updateInfo.force) return;
          setUpdateInfo(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </>
  );
}

export default AppTV;
