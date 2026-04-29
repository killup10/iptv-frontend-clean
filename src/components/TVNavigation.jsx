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

const CONTENT_CHILDREN = [
  { path: '/series', label: 'Series' },
  { path: '/animes', label: 'Animes' },
  { path: '/doramas', label: 'Doramas' },
  { path: '/novelas', label: 'Novelas' },
  { path: '/documentales', label: 'Documentales' },
];

export default function TVNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const itemRefs = useRef([]);
  const submenuRefs = useRef([]);

  const menuItems = useMemo(() => ([
    { key: 'home', path: '/', label: 'Inicio' },
    { key: 'live', path: '/live-tv', label: 'TV en vivo' },
    { key: 'movies', path: '/peliculas', label: 'Peliculas' },
    { key: 'content', label: 'Contenido', children: CONTENT_CHILDREN },
    { key: 'kids', path: '/kids', label: 'Zona Kids' },
    { key: 'collections', path: '/colecciones', label: 'Colecciones' },
    { key: 'my-list', path: '/mi-lista', label: 'Mi Lista' },
    { key: 'search', action: 'search', label: 'Buscar', iconOnly: true },
  ]), []);

  const activeState = useMemo(() => {
    const contentIndex = menuItems.findIndex((item) => item.key === 'content');
    const contentSubIndex = CONTENT_CHILDREN.findIndex((item) => item.path === location.pathname);

    if (contentSubIndex >= 0) {
      return { index: contentIndex, submenuIndex: contentSubIndex };
    }

    if (location.pathname.startsWith('/peliculas')) {
      return { index: menuItems.findIndex((item) => item.key === 'movies'), submenuIndex: -1 };
    }

    const exactIndex = menuItems.findIndex((item) => item.path === location.pathname);
    if (exactIndex >= 0) {
      return { index: exactIndex, submenuIndex: -1 };
    }

    if (location.pathname.startsWith('/watch')) {
      return { index: 0, submenuIndex: -1 };
    }

    return { index: 0, submenuIndex: -1 };
  }, [location.pathname, menuItems]);

  const [focusedIndex, setFocusedIndex] = useState(activeState.index);
  const [focusZone, setFocusZoneState] = useState(getTVFocusZone());
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [submenuIndex, setSubmenuIndex] = useState(activeState.submenuIndex >= 0 ? activeState.submenuIndex : 0);

  useEffect(() => {
    setFocusedIndex(activeState.index);
    if (activeState.submenuIndex >= 0) {
      setSubmenuIndex(activeState.submenuIndex);
    }
  }, [activeState]);

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
      setFocusedIndex(activeState.index);

      window.requestAnimationFrame(() => {
        const target = submenuOpen
          ? submenuRefs.current[submenuIndex]
          : itemRefs.current[submenuOpen ? focusedIndex : activeState.index];
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
  }, [activeState.index, focusedIndex, submenuIndex, submenuOpen]);

  useEffect(() => {
    setSubmenuOpen(false);
    if (activeState.submenuIndex >= 0) {
      setSubmenuIndex(activeState.submenuIndex);
    }
  }, [activeState.index, activeState.submenuIndex, location.pathname]);

  useEffect(() => {
    if (getTVFocusZone() !== TV_FOCUS_ZONE_NAV) return;

    const target = submenuOpen
      ? submenuRefs.current[submenuIndex]
      : itemRefs.current[focusedIndex];
    if (!target) return;

    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }, [focusedIndex, submenuIndex, submenuOpen]);

  const focusContentWithDelay = () => {
    window.setTimeout(() => {
      focusTVContent();
    }, 60);
  };

  const openContentMenu = () => {
    setSubmenuOpen(true);
    setFocusedIndex(menuItems.findIndex((item) => item.key === 'content'));
    setSubmenuIndex(activeState.submenuIndex >= 0 ? activeState.submenuIndex : 0);
  };

  const moveTopLevel = (direction) => {
    setSubmenuOpen(false);
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

    if (item.children?.length) {
      openContentMenu();
      return;
    }

    setSubmenuOpen(false);

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

  const activateSubmenuItem = (index) => {
    const item = CONTENT_CHILDREN[index];
    if (!item) return;

    setSubmenuIndex(index);
    setSubmenuOpen(false);
    navigate(item.path);
    focusContentWithDelay();
  };

  const handleKeyDown = (event) => {
    if (getTVFocusZone() !== TV_FOCUS_ZONE_NAV) return;

    if (submenuOpen) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          moveTopLevel(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveTopLevel(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (submenuIndex > 0) {
            setSubmenuIndex((prev) => prev - 1);
          } else {
            setSubmenuOpen(false);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (submenuIndex < CONTENT_CHILDREN.length - 1) {
            setSubmenuIndex((prev) => prev + 1);
          } else {
            setSubmenuOpen(false);
            focusTVContent();
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          activateSubmenuItem(submenuIndex);
          break;
        default:
          break;
      }
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        moveTopLevel(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveTopLevel(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (menuItems[focusedIndex]?.children?.length) {
          openContentMenu();
          return;
        }
        focusTVContent();
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

  return (
    <>
      <style>{`
        :root {
          --primary: 190 100% 50%;
          --secondary: 315 100% 60%;
        }

        .tv-nav-shell {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 80;
          padding: 10px 24px;
          background: linear-gradient(180deg, rgba(3, 6, 15, 0.96), rgba(3, 6, 15, 0.82));
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }

        .tv-nav-inner {
          max-width: 1800px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 18px;
          align-items: center;
        }

        .tv-nav-logo {
          width: 90px;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 16px rgba(34, 211, 238, 0.28)) drop-shadow(0 0 10px rgba(236, 72, 153, 0.18));
        }

        .tv-nav-list {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: flex-start;
          flex-wrap: nowrap;
          overflow: visible;
        }

        .tv-nav-slot {
          position: relative;
          flex-shrink: 0;
        }

        .tv-nav-item {
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 9px 14px;
          min-width: 0;
          background: transparent;
          color: rgba(226, 232, 240, 0.78);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease;
          outline: none;
          white-space: nowrap;
        }

        .tv-nav-item.search {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 46px;
          padding-inline: 12px;
        }

        .tv-nav-item.search svg {
          width: 18px;
          height: 18px;
        }

        .tv-nav-item.has-children {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .tv-nav-item.has-children svg {
          width: 14px;
          height: 14px;
        }

        .tv-nav-item.active {
          color: #ffb176;
          border-color: rgba(255, 177, 118, 0.18);
          background: rgba(20, 28, 44, 0.78);
        }

        .tv-nav-item.focused {
          color: #fff;
          border-color: rgba(34, 211, 238, 0.7);
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(15, 23, 42, 0.88));
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 0 0 2px rgba(12, 18, 32, 0.9), 0 0 20px rgba(34, 211, 238, 0.18);
        }

        .tv-nav-profile {
          justify-self: end;
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: flex-end;
          color: #cbd5e1;
        }

        .tv-nav-profile strong {
          color: #fff;
          font-size: 15px;
        }

        .tv-nav-profile span {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(34, 211, 238, 0.82);
        }

        .tv-nav-submenu {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          min-width: 240px;
          padding: 10px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(10, 16, 35, 0.98);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tv-nav-subitem {
          border: 1px solid transparent;
          border-radius: 14px;
          padding: 12px 14px;
          background: transparent;
          color: rgba(226, 232, 240, 0.8);
          text-align: left;
          font-size: 15px;
          font-weight: 700;
          outline: none;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease;
        }

        .tv-nav-subitem.active {
          color: #ffb176;
          background: rgba(20, 28, 44, 0.82);
          border-color: rgba(255, 177, 118, 0.18);
        }

        .tv-nav-subitem.focused {
          color: #fff;
          border-color: rgba(34, 211, 238, 0.7);
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(15, 23, 42, 0.94));
          box-shadow: 0 0 0 2px rgba(12, 18, 32, 0.92), 0 0 18px rgba(34, 211, 238, 0.18);
        }
      `}</style>

      <nav className="tv-nav-shell" aria-label="Navegacion TV principal">
        <div className="tv-nav-inner">
          <img
            src="/logo-teamg.png"
            alt="TeamG Play"
            className="tv-nav-logo"
          />

          <div className="tv-nav-list">
            {menuItems.map((item, index) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              const isActive = activeState.index === index;
              const isFocused = focusedIndex === index && focusZone === TV_FOCUS_ZONE_NAV && !submenuOpen;
              const submenuFocused = submenuOpen && focusedIndex === index;

              return (
                <div key={item.key || item.path || item.action} className="tv-nav-slot">
                  <button
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    type="button"
                    className={`tv-nav-item ${item.iconOnly ? 'search' : ''} ${hasChildren ? 'has-children' : ''} ${isActive ? 'active' : ''} ${(isFocused || submenuFocused) ? 'focused' : ''}`}
                    onFocus={() => {
                      setTVFocusZone(TV_FOCUS_ZONE_NAV);
                      setFocusedIndex(index);
                      if (!hasChildren) {
                        setSubmenuOpen(false);
                      }
                    }}
                    onClick={() => activateItem(index)}
                  >
                    {item.iconOnly ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5" />
                      </svg>
                    ) : (
                      <>
                        <span>{item.label}</span>
                        {hasChildren ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        ) : null}
                      </>
                    )}
                  </button>

                  {hasChildren && submenuOpen && focusedIndex === index ? (
                    <div className="tv-nav-submenu">
                      {item.children.map((child, childIndex) => {
                        const childActive = activeState.submenuIndex === childIndex;
                        const childFocused = submenuIndex === childIndex && focusZone === TV_FOCUS_ZONE_NAV;

                        return (
                          <button
                            key={child.path}
                            ref={(element) => {
                              submenuRefs.current[childIndex] = element;
                            }}
                            type="button"
                            className={`tv-nav-subitem ${childActive ? 'active' : ''} ${childFocused ? 'focused' : ''}`}
                            onFocus={() => {
                              setTVFocusZone(TV_FOCUS_ZONE_NAV);
                              setFocusedIndex(index);
                              setSubmenuOpen(true);
                              setSubmenuIndex(childIndex);
                            }}
                            onClick={() => activateSubmenuItem(childIndex)}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="tv-nav-profile">
            <strong>{user?.username || 'TeamG TV'}</strong>
            <span>Android TV</span>
          </div>
        </div>
      </nav>
    </>
  );
}
