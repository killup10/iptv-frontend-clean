import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  focusTVContent,
  getTVFocusZone,
  setTVFocusZone,
  TV_FOCUS_NAV_EVENT,
  TV_FOCUS_ZONE_CHANGE_EVENT,
  TV_FOCUS_ZONE_NAV,
} from '../utils/tvFocusZone.js';
import { requestTVSearch } from '../utils/tvSearchEvents.js';

export default function TVNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const itemRefs = useRef([]);

  const menuItems = useMemo(() => ([
    { key: 'search', action: 'search', label: 'Buscar', icon: 'search' },
    { key: 'home', path: '/', label: 'Inicio', icon: 'home' },
    { key: 'live', path: '/live-tv', label: 'TV en vivo', icon: 'live' },
    { key: 'movies', path: '/peliculas', label: 'Películas', icon: 'movies' },
    { key: 'series', path: '/series', label: 'Series', icon: 'series' },
    { key: 'animes', path: '/animes', label: 'Animes', icon: 'animes' },
    { key: 'doramas', path: '/doramas', label: 'Doramas', icon: 'doramas' },
    { key: 'novelas', path: '/novelas', label: 'Novelas', icon: 'novelas' },
    { key: 'documentales', path: '/documentales', label: 'Documentales', icon: 'documentales' },
    { key: 'kids', path: '/kids', label: 'Zona Kids', icon: 'kids' },
    { key: 'collections', path: '/colecciones', label: 'Colecciones', icon: 'collections' },
    { key: 'my-list', path: '/mi-lista', label: 'Mi Lista', icon: 'my-list' },
  ]), []);

  const activeIndex = useMemo(() => {
    if (location.pathname === '/') {
      return menuItems.findIndex((item) => item.key === 'home');
    }
    const idx = menuItems.findIndex((item) => item.path && item.path !== '/' && location.pathname.startsWith(item.path));
    if (idx >= 0) {
      return idx;
    }
    return 1; // Default to Inicio
  }, [location.pathname, menuItems]);

  const [focusedIndex, setFocusedIndex] = useState(activeIndex);
  const [focusZone, setFocusZoneState] = useState(getTVFocusZone());

  useEffect(() => {
    setFocusedIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    const handleZoneChange = (event) => {
      setFocusZoneState(event.detail?.zone || getTVFocusZone());
    };

    window.addEventListener(TV_FOCUS_ZONE_CHANGE_EVENT, handleZoneChange);
    return () => window.removeEventListener(TV_FOCUS_ZONE_CHANGE_EVENT, handleZoneChange);
  }, []);

  useEffect(() => {
    const focusActiveItem = () => {
      setTVFocusZone(TV_FOCUS_ZONE_NAV);
      setFocusedIndex(activeIndex);

      window.requestAnimationFrame(() => {
        const target = itemRefs.current[activeIndex];
        if (!target) return;
        try {
          target.focus({ preventScroll: true });
        } catch {
          target.focus();
        }
      });
    };

    window.addEventListener(TV_FOCUS_NAV_EVENT, focusActiveItem);
    return () => window.removeEventListener(TV_FOCUS_NAV_EVENT, focusActiveItem);
  }, [activeIndex]);

  useEffect(() => {
    console.log('[TVNav] focusedIndex useEffect running. Zone:', getTVFocusZone(), 'Index:', focusedIndex);
    if (getTVFocusZone() !== TV_FOCUS_ZONE_NAV) return;

    const target = itemRefs.current[focusedIndex];
    if (!target) {
      console.warn('[TVNav] Target ref not found for index:', focusedIndex);
      return;
    }

    try {
      console.log('[TVNav] Focus target index:', focusedIndex, target);
      target.focus({ preventScroll: true });
    } catch (err) {
      console.warn('[TVNav] focus error:', err);
      target.focus();
    }

    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      console.warn('TVNav scrollIntoView error:', e);
    }
  }, [focusedIndex]);

  const focusContentWithDelay = () => {
    window.setTimeout(() => {
      focusTVContent();
    }, 80);
  };

  const moveFocus = (direction) => {
    setFocusedIndex((prev) => {
      if (direction < 0) {
        return prev > 0 ? prev - 1 : menuItems.length - 1;
      }
      return prev < menuItems.length - 1 ? prev + 1 : 0;
    });
  };

  const activateItem = (index) => {
    const item = menuItems[index];
    if (!item) return;

    setFocusedIndex(index);

    if (item.action === 'search') {
      requestTVSearch({
        scope: 'global',
        pathname: location.pathname,
      });
      return;
    }

    navigate(item.path);
    focusContentWithDelay();
  };

  const handleKeyDown = (event) => {
    console.log('[TVNav] keydown event. Zone:', getTVFocusZone(), 'key:', event.key, 'keyCode:', event.keyCode);
    if (getTVFocusZone() !== TV_FOCUS_ZONE_NAV) return;

    let key = event.key;
    if (event.keyCode === 19) key = 'ArrowUp';
    else if (event.keyCode === 20) key = 'ArrowDown';
    else if (event.keyCode === 21) key = 'ArrowLeft';
    else if (event.keyCode === 22) key = 'ArrowRight';
    else if (event.keyCode === 23 || event.keyCode === 66) key = 'Enter';

    console.log('[TVNav] Resolved key:', key);

    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusTVContent();
        break;
      case 'ArrowLeft':
        event.preventDefault(); // Left boundary, keep focus here
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        activateItem(focusedIndex);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderMenuIcon = (iconType) => {
    switch (iconType) {
      case 'search':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        );
      case 'home':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'live':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
            <polyline points="17 2 12 7 7 2" />
          </svg>
        );
      case 'movies':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        );
      case 'series':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="16" x2="12" y2="21" />
          </svg>
        );
      case 'animes':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
          </svg>
        );
      case 'doramas':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        );
      case 'novelas':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z" />
          </svg>
        );
      case 'documentales':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        );
      case 'kids':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        );
      case 'collections':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'my-list':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        );
      default:
        return null;
    }
  };

  const isExpanded = focusZone === TV_FOCUS_ZONE_NAV;

  return (
    <>
      <style>{`
        .tv-nav-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 80px;
          z-index: 100;
          background: rgba(4, 7, 18, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 16px 0;
          box-sizing: border-box;
          transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          will-change: width, box-shadow;
        }

        .tv-nav-sidebar.is-expanded {
          width: 260px;
          box-shadow: 15px 0 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(34, 211, 238, 0.12);
          border-right-color: rgba(34, 211, 238, 0.22);
        }

        .tv-nav-sidebar-header {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 14px;
          margin-bottom: 12px;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        .tv-nav-sidebar-logo {
          width: 40px;
          height: auto;
          flex-shrink: 0;
          filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.5));
        }

        .tv-nav-sidebar-title {
          font-size: 20px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #22d3ee, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          white-space: nowrap;
          opacity: 0;
          transform: translateX(-10px);
          transition: opacity 0.15s ease 0.05s, transform 0.15s ease 0.05s;
        }

        .tv-nav-sidebar.is-expanded .tv-nav-sidebar-title {
          opacity: 1;
          transform: translateX(0);
        }

        .tv-nav-sidebar-menu {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 14px;
          box-sizing: border-box;
          flex-grow: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .tv-nav-sidebar-menu::-webkit-scrollbar {
          display: none;
        }

        .tv-nav-sidebar-item {
          width: 100%;
          min-height: 38px;
          height: 38px;
          border: 1px solid transparent;
          border-radius: 14px;
          background: transparent;
          color: rgba(226, 232, 240, 0.72);
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 16px;
          box-sizing: border-box;
          outline: none;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          cursor: pointer;
          position: relative;
        }

        .tv-nav-sidebar-item-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.18s ease;
        }

        .tv-nav-sidebar-item-icon svg {
          width: 20px;
          height: 20px;
          stroke-width: 2.2;
        }

        .tv-nav-sidebar-item-label {
          font-size: 14px;
          font-weight: 700;
          opacity: 0;
          transform: translateX(-10px);
          transition: opacity 0.15s ease 0.05s, transform 0.15s ease 0.05s;
        }

        .tv-nav-sidebar.is-expanded .tv-nav-sidebar-item-label {
          opacity: 1;
          transform: translateX(0);
        }

        .tv-nav-sidebar-item.active {
          color: #ffb176;
          border-color: rgba(255, 177, 118, 0.16);
          background: rgba(255, 177, 118, 0.06);
        }

        .tv-nav-sidebar-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 4px;
          background: #ffb176;
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px rgba(255, 177, 118, 0.8);
        }

        .tv-nav-sidebar-item.focused {
          color: #fff;
          border-color: rgba(34, 211, 238, 0.78);
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.24), rgba(15, 23, 42, 0.94));
          box-shadow: 0 0 0 2px rgba(4, 7, 18, 0.92), 0 0 20px rgba(34, 211, 238, 0.24);
          transform: scale(1.02);
        }

        .tv-nav-sidebar-item.focused .tv-nav-sidebar-item-icon {
          transform: scale(1.1);
        }

        .tv-nav-sidebar-footer {
          width: 100%;
          padding: 12px 20px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          box-sizing: border-box;
          color: #cbd5e1;
        }

        .tv-nav-sidebar-footer strong {
          color: #fff;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .tv-nav-sidebar-footer span {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(34, 211, 238, 0.82);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .tv-nav-sidebar.is-expanded .tv-nav-sidebar-footer strong,
        .tv-nav-sidebar.is-expanded .tv-nav-sidebar-footer span {
          opacity: 1;
        }
      `}</style>

      <nav className={`tv-nav-sidebar ${isExpanded ? 'is-expanded' : ''}`} aria-label="Navegación lateral TV">
        <div className="tv-nav-sidebar-header">
          <img
            src="./logo-teamg.png"
            alt="TeamG Logo"
            className="tv-nav-sidebar-logo"
          />
          <span className="tv-nav-sidebar-title">TeamG Play</span>
        </div>

        <div className="tv-nav-sidebar-menu">
          {menuItems.map((item, index) => {
            const isActive = activeIndex === index;
            const isItemFocused = focusedIndex === index && focusZone === TV_FOCUS_ZONE_NAV;

            return (
              <button
                key={item.key || item.path || item.action}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                className={`tv-nav-sidebar-item ${isActive ? 'active' : ''} ${isItemFocused ? 'focused' : ''}`}
                onFocus={() => {
                  setTVFocusZone(TV_FOCUS_ZONE_NAV);
                  setFocusedIndex(index);
                }}
                onClick={() => activateItem(index)}
              >
                <div className="tv-nav-sidebar-item-icon">
                  {renderMenuIcon(item.icon)}
                </div>
                <span className="tv-nav-sidebar-item-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="tv-nav-sidebar-footer">
          <strong>{user?.username || 'TeamG TV'}</strong>
          <span>Android TV</span>
        </div>
      </nav>
    </>
  );
}
