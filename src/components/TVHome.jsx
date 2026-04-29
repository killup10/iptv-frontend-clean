import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TVSearch from './TVSearch';
import './TVHome.css';
import {
  focusTVNav,
  getTVFocusZone,
  TV_FOCUS_CONTENT_EVENT,
  TV_FOCUS_ZONE_CONTENT,
} from '../utils/tvFocusZone.js';
import { fetchUserChannels } from '../utils/api.js';
import {
  getTVItemBackdrop,
  getTVItemDescription,
  getTVItemImage,
  getTVItemQualityBadges,
  getTVItemTitle,
  resolveTVItemType,
} from '../utils/tvContentUtils.js';
import { TV_OPEN_SEARCH_EVENT } from '../utils/tvSearchEvents.js';

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function TVHome({
  sections = [],
  onSelectItem,
  onAddToMyList,
}) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionItemIndexes, setSectionItemIndexes] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchChannels, setSearchChannels] = useState([]);
  const [focusMode, setFocusMode] = useState('hero');
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const sectionRefs = useRef([]);
  const itemRefs = useRef({});
  const hasUserNavigatedRef = useRef(false);
  const restoredFocusSignatureRef = useRef('');
  const location = useLocation();

  const allContent = useMemo(() => {
    const merged = [];
    const seen = new Set();

    const pushItem = (item, fallbackType) => {
      const itemId = item?._id || item?.id || `${fallbackType}-${getTVItemTitle(item)}`;
      if (!itemId || seen.has(itemId)) {
        return;
      }

      seen.add(itemId);
      merged.push({
        ...item,
        type: item?.type || item?.itemType || item?.tipo || fallbackType || 'movie',
      });
    };

    sections.forEach((section) => {
      section.items.forEach((item) => {
        pushItem(item, section.type || 'movie');
      });
    });

    searchChannels.forEach((channel) => {
      pushItem(channel, 'channel');
    });

    return merged;
  }, [searchChannels, sections]);

  const currentSection = sections[currentSectionIndex];
  const currentItemIndex = sectionItemIndexes[currentSectionIndex] || 0;
  const currentItem = currentSection?.items[currentItemIndex];
  const currentItemType = resolveTVItemType(currentItem, currentSection?.type || 'movie');

  const heroItems = useMemo(() => {
    const nonContinueSections = sections.filter((section) => (
      !normalizeLabel(section.title).includes('continuar')
    ));
    const preferredSection = nonContinueSections.find((section) => {
      const label = normalizeLabel(section.title);
      return label.includes('destacad') || label.includes('recien') || label.includes('popular');
    }) || nonContinueSections[0];

    if (preferredSection?.items?.length) {
      return preferredSection.items.slice(0, 6).map((item) => ({
        ...item,
        __heroType: resolveTVItemType(item, preferredSection.type || item.itemType || item.tipo || 'movie'),
        __heroSectionTitle: preferredSection.title,
      }));
    }

    const collected = [];
    const seen = new Set();

    const appendItem = (item, fallbackType, sectionTitle) => {
      if (!item) return;

      const itemId = item?._id || item?.id || `${sectionTitle}-${getTVItemTitle(item)}`;
      if (seen.has(itemId)) return;

      seen.add(itemId);
      collected.push({
        ...item,
        __heroType: resolveTVItemType(item, fallbackType || 'movie'),
        __heroSectionTitle: sectionTitle || 'Destacado',
      });
    };

    const appendSectionItems = (section, limit = 3) => {
      if (!section?.items?.length) return;

      section.items.slice(0, limit).forEach((item) => {
        appendItem(item, section.type || item.itemType || item.tipo || 'movie', section.title);
      });
    };

    if (collected.length < 5) {
      nonContinueSections.forEach((section) => {
        if (normalizeLabel(section.title).includes('continuar')) return;
        appendSectionItems(section, 2);
      });
    }

    if (collected.length === 0) {
      nonContinueSections.forEach((section) => appendSectionItems(section, 1));
    }

    return collected.slice(0, 6);
  }, [sections]);

  const spotlightItem = heroItems[heroIndex] || currentItem || sections[0]?.items?.[0] || null;
  const spotlightType = spotlightItem?.__heroType || resolveTVItemType(spotlightItem, currentSection?.type || 'movie');
  const spotlightBackdrop = getTVItemBackdrop(spotlightItem);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroItems.length]);

  useEffect(() => {
    if (showSearch || heroItems.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 6500);

    return () => window.clearInterval(intervalId);
  }, [heroItems.length, showSearch]);

  useEffect(() => {
    setSectionItemIndexes((prev) => {
      const next = { ...prev };
      let changed = false;

      sections.forEach((section, index) => {
        const maxIndex = Math.max((section.items?.length || 1) - 1, 0);
        const currentValue = prev[index] ?? 0;
        const clampedValue = Math.min(currentValue, maxIndex);

        if (clampedValue !== currentValue) {
          next[index] = clampedValue;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sections]);

  useEffect(() => {
    if (sections.length === 0) {
      return;
    }

    setCurrentSectionIndex((prev) => Math.max(0, Math.min(prev, sections.length - 1)));
  }, [sections.length]);

  useEffect(() => {
    const restoredSectionIndex = location.state?.focusedSectionIndex;
    const restoredItemIndex = location.state?.focusedItemIndex;

    if (!Number.isInteger(restoredSectionIndex) || restoredSectionIndex < 0 || restoredSectionIndex >= sections.length) {
      return;
    }

    const maxItemIndex = Math.max((sections[restoredSectionIndex]?.items?.length || 1) - 1, 0);
    const nextItemIndex = Number.isInteger(restoredItemIndex)
      ? Math.max(0, Math.min(restoredItemIndex, maxItemIndex))
      : 0;

    const restoreSignature = [
      location.key || 'default',
      restoredSectionIndex,
      nextItemIndex,
      sections.length,
    ].join(':');

    if (restoredFocusSignatureRef.current === restoreSignature) {
      return;
    }

    restoredFocusSignatureRef.current = restoreSignature;
    hasUserNavigatedRef.current = true;
    setFocusMode('content');
    setCurrentSectionIndex(restoredSectionIndex);
    setSectionItemIndexes((prev) => ({
      ...prev,
      [restoredSectionIndex]: nextItemIndex,
    }));
  }, [location.key, location.state?.focusedItemIndex, location.state?.focusedSectionIndex, sections]);

  useEffect(() => {
    if (location.state?.openSearch) {
      setShowSearch(true);
    }
  }, [location.state?.openSearch]);

  useEffect(() => {
    const handleOpenSearch = (event) => {
      if (event.detail?.scope === 'global') {
        return;
      }
      setShowSearch(true);
    };

    window.addEventListener(TV_OPEN_SEARCH_EVENT, handleOpenSearch);
    return () => window.removeEventListener(TV_OPEN_SEARCH_EVENT, handleOpenSearch);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadChannelsForSearch = async () => {
      try {
        const channels = await fetchUserChannels('Todos');
        if (!cancelled) {
          setSearchChannels(Array.isArray(channels) ? channels : []);
        }
      } catch {
        if (!cancelled) {
          setSearchChannels([]);
        }
      }
    };

    loadChannelsForSearch();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrentItemIndex = useCallback((updater) => {
    setSectionItemIndexes((prev) => {
      const previousIndex = prev[currentSectionIndex] ?? 0;
      const nextIndex = typeof updater === 'function' ? updater(previousIndex) : updater;

      return {
        ...prev,
        [currentSectionIndex]: nextIndex,
      };
    });
  }, [currentSectionIndex]);

  const scrollContainerToElement = useCallback((element, offset = 0) => {
    if (!element) {
      return;
    }

    const container = containerRef.current;
    if (container) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const nextTop = container.scrollTop + (elementRect.top - containerRect.top) - offset;

      container.scrollTo({
        top: Math.max(0, nextTop),
        behavior: 'auto',
      });
      return;
    }

    element.scrollIntoView({
      block: 'start',
      inline: 'nearest',
      behavior: 'auto',
    });
  }, []);

  const scrollItemHorizontally = useCallback((itemElement) => {
    if (!itemElement) {
      return;
    }

    const carousel = itemElement.parentElement;
    if (!carousel) {
      return;
    }

    const itemLeft = itemElement.offsetLeft;
    const itemWidth = itemElement.offsetWidth;
    const targetLeft = Math.max(0, itemLeft - ((carousel.clientWidth - itemWidth) / 2));

    carousel.scrollTo({
      left: targetLeft,
      behavior: 'auto',
    });
  }, []);

  const scrollCurrentContentIntoView = useCallback((sectionIndex = currentSectionIndex, itemIndex = currentItemIndex) => {
    const sectionRef = sectionRefs.current[sectionIndex];
    const itemRef = itemRefs.current[`${sectionIndex}-${itemIndex}`];

    if (sectionRef) {
      const topOffset = sectionIndex === 0 ? 18 : 24;
      scrollContainerToElement(sectionRef, topOffset);
    }

    if (itemRef) {
      scrollItemHorizontally(itemRef);
    }
  }, [currentItemIndex, currentSectionIndex, scrollContainerToElement, scrollItemHorizontally]);

  const focusHero = useCallback(() => {
    if (!spotlightItem) {
      focusTVNav();
      return;
    }

    setFocusMode('hero');

    window.requestAnimationFrame(() => {
      if (!heroRef.current) {
        return;
      }

      scrollContainerToElement(heroRef.current, 6);
    });
  }, [scrollContainerToElement, spotlightItem]);

  const focusCurrentContent = useCallback(() => {
    hasUserNavigatedRef.current = true;
    setFocusMode('content');

    window.requestAnimationFrame(() => {
      scrollCurrentContentIntoView();
      window.setTimeout(() => {
        scrollCurrentContentIntoView();
      }, 80);
    });
  }, [scrollCurrentContentIntoView]);

  const runItemAction = useCallback((_action, item = currentItem, sectionIndex = currentSectionIndex, itemIndex = null) => {
    if (!item) return;

    const resolvedItemIndex = itemIndex ?? currentItemIndex;

    onSelectItem?.(item, sectionIndex, resolvedItemIndex);
  }, [currentItem, currentItemIndex, currentSectionIndex, onSelectItem, sections]);

  const resolveAction = (event) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Enter':
      case 'ContextMenu':
      case 'Info':
      case 'KeyI':
      case '/':
      case 'Escape':
      case 'Backspace':
      case ' ':
        return event.key;
      case 'Select':
      case 'MediaPlayPause':
        return 'Enter';
      case 'GoBack':
      case 'BrowserBack':
        return 'Escape';
      default:
        break;
    }

    switch (event.keyCode) {
      case 19:
        return 'ArrowUp';
      case 20:
        return 'ArrowDown';
      case 21:
        return 'ArrowLeft';
      case 22:
        return 'ArrowRight';
      case 23:
      case 66:
      case 62:
        return 'Enter';
      case 4:
      case 8:
      case 27:
      case 111:
        return 'Escape';
      default:
        return null;
    }
  };

  const handleNavigation = useCallback((event) => {
    if (showSearch || getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
      return;
    }

    const key = resolveAction(event);
    if (!key) return;

    if (key === '/' || (event.key?.toLowerCase?.() === 's' && event.ctrlKey)) {
      event.preventDefault();
      setShowSearch(true);
      return;
    }

    if (!currentSection) return;

    if (focusMode === 'hero') {
      switch (key) {
        case 'ArrowUp':
          event.preventDefault();
          focusTVNav();
          break;
        case 'ArrowDown':
          event.preventDefault();
          focusCurrentContent();
          break;
        case 'ArrowLeft':
          if (heroItems.length > 1) {
            event.preventDefault();
            hasUserNavigatedRef.current = true;
            setHeroIndex((prev) => (prev > 0 ? prev - 1 : heroItems.length - 1));
          }
          break;
        case 'ArrowRight':
          if (heroItems.length > 1) {
            event.preventDefault();
            hasUserNavigatedRef.current = true;
            setHeroIndex((prev) => (prev + 1) % heroItems.length);
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          runItemAction('play', spotlightItem, null, null);
          break;
        default:
          break;
      }
      return;
    }

    if (focusMode === 'search') {
      switch (key) {
        case 'ArrowDown':
          event.preventDefault();
          focusCurrentContent();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          setShowSearch(true);
          break;
        default:
          break;
      }
      return;
    }

    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        hasUserNavigatedRef.current = true;
        if (currentSectionIndex === 0) {
          focusHero();
          return;
        }
        setCurrentSectionIndex((prev) => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        hasUserNavigatedRef.current = true;
        setFocusMode('content');
        setCurrentSectionIndex((prev) => Math.min(sections.length - 1, prev + 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        hasUserNavigatedRef.current = true;
        setFocusMode('content');
        setCurrentItemIndex((prev) => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        hasUserNavigatedRef.current = true;
        setFocusMode('content');
        setCurrentItemIndex((prev) => Math.min(currentSection.items.length - 1, prev + 1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentItem && onSelectItem) {
          runItemAction('play');
        }
        break;
      default:
        break;
    }
  }, [
    currentItem,
    currentSection,
    currentSectionIndex,
    focusCurrentContent,
    focusHero,
    focusMode,
    heroItems.length,
    onSelectItem,
    runItemAction,
    sections.length,
    setCurrentItemIndex,
    showSearch,
    spotlightItem,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [handleNavigation]);

  useEffect(() => {
    const handleFocusContent = () => {
      if (showSearch) {
        return;
      }

      if (!hasUserNavigatedRef.current && !Number.isInteger(location.state?.focusedSectionIndex)) {
        focusHero();
        return;
      }

      const selectedItemRef = itemRefs.current[`${currentSectionIndex}-${currentItemIndex}`];
      if (!selectedItemRef) return;

      setFocusMode('content');
      scrollCurrentContentIntoView();
    };

    window.addEventListener(TV_FOCUS_CONTENT_EVENT, handleFocusContent);
    return () => window.removeEventListener(TV_FOCUS_CONTENT_EVENT, handleFocusContent);
  }, [
    currentItemIndex,
    currentSectionIndex,
    focusHero,
    location.state?.focusedSectionIndex,
    scrollCurrentContentIntoView,
    showSearch,
  ]);

  useEffect(() => {
    if (focusMode !== 'content') {
      return;
    }

    if (!hasUserNavigatedRef.current && !Number.isInteger(location.state?.focusedSectionIndex)) {
      return;
    }

    scrollCurrentContentIntoView();
  }, [currentItemIndex, currentSectionIndex, focusMode, location.state?.focusedSectionIndex, scrollCurrentContentIntoView]);

  if (!sections || sections.length === 0) {
    return (
      <div className="tv-home-empty">
        <div className="tv-home-empty-copy">
          <strong>Inicio sin contenido</strong>
          <span>No se pudo cargar el catalogo en este momento.</span>
        </div>
      </div>
    );
  }

  const handleSearchSelect = (item) => {
    setShowSearch(false);
    if (onSelectItem) {
      onSelectItem(item, null, null);
    }
  };

  const activeSectionLabel = currentSection?.title || 'Catalogo';
  const activeItemLabel = currentItem ? getTVItemTitle(currentItem) : 'Explora con el control remoto';
  const spotlightSectionLabel = spotlightItem?.__heroSectionTitle || 'Destacado';

  return (
    <div ref={containerRef} className="tv-home-container">
      {showSearch && (
        <TVSearch
          allContent={allContent}
          title="Buscar en Inicio"
          placeholder="Buscar en los destacados de Inicio..."
          onSelectItem={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      <div className="tv-home-container-inner">
        {spotlightItem && (
          <section
            ref={heroRef}
            className={`tv-home-spotlight ${focusMode === 'hero' ? 'is-focused' : ''}`}
          >
            <div className="tv-home-spotlight-media" aria-hidden="true">
              <img
                src={spotlightBackdrop}
                alt=""
                className="tv-home-spotlight-backdrop-fill"
              />
              <img
                src={spotlightBackdrop}
                alt=""
                className="tv-home-spotlight-backdrop-fit"
              />
            </div>

            <div className="tv-home-spotlight-content">
              <div className="tv-home-spotlight-heading">
                <p className="tv-home-spotlight-label">{spotlightSectionLabel}</p>
                {spotlightItem?.hasNewEpisodes && (
                  <span className="tv-home-spotlight-episode-badge">Nuevos episodios</span>
                )}
              </div>
              <h1>{getTVItemTitle(spotlightItem)}</h1>

              <p className="tv-home-spotlight-description">
                {getTVItemDescription(spotlightItem) || 'Selecciona cualquier titulo con el control remoto para abrirlo al instante.'}
              </p>

            </div>

            <div className="tv-home-spotlight-side">
              <div className="tv-home-spotlight-poster">
                <img src={getTVItemImage(spotlightItem)} alt={getTVItemTitle(spotlightItem)} />
              </div>

              {heroItems.length > 1 && (
                <div className="tv-home-spotlight-indicators" aria-hidden="true">
                  {heroItems.map((item, index) => (
                    <span
                      key={`${getTVItemTitle(item)}-${index}`}
                      className={`tv-home-spotlight-dot ${index === heroIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <div className="tv-home-context-bar">
          <div className="tv-home-context-copy">
            <span className="tv-home-context-kicker">Seccion activa</span>
            <strong>{activeSectionLabel}</strong>
          </div>
          <div className="tv-home-context-copy align-right">
            <span className="tv-home-context-kicker">Elemento activo</span>
            <strong>{activeItemLabel}</strong>
          </div>
          <button
            type="button"
            className="tv-home-search-btn"
            onClick={() => setShowSearch(true)}
            aria-label="Buscar en Inicio"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span>Buscar aqui</span>
          </button>
        </div>

        <div className="tv-home-sections">
          {sections.map((section, sectionIndex) => {
            const isCurrentSection = focusMode === 'content' && sectionIndex === currentSectionIndex;
            const activeItemIndex = sectionItemIndexes[sectionIndex] || 0;

            return (
              <div
                key={`${section.title}-${sectionIndex}`}
                className={`tv-home-section ${isCurrentSection ? 'active' : ''}`}
                ref={(element) => {
                  sectionRefs.current[sectionIndex] = element;
                }}
              >
                <h2 className="section-title">{section.title}</h2>
                <div className="section-carousel">
                  {section.items.map((item, itemIndex) => {
                    const isSelected = isCurrentSection && itemIndex === activeItemIndex;
                    const key = `${sectionIndex}-${itemIndex}`;
                    const qualityBadges = getTVItemQualityBadges(item);

                    return (
                      <div
                        key={key}
                        data-item-key={key}
                        ref={(element) => {
                          itemRefs.current[key] = element;
                        }}
                        className={`carousel-item ${isSelected ? 'focused' : ''}`}
                      >
                        <div className="item-card">
                          <img
                            src={getTVItemImage(item)}
                            alt={getTVItemTitle(item)}
                            className="item-poster"
                          />
                          {item?.hasNewEpisodes && (
                            <div className="item-episode-badge">
                              NUEVOS EPISODIOS
                            </div>
                          )}
                          {qualityBadges.length > 0 && (
                            <div className="item-quality-badges">
                              {qualityBadges.map((badge) => (
                                <span key={`${key}-${badge}`} className="item-quality-badge">
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                          {isSelected && (
                            <div className="focus-overlay">
                              <div className="focus-ring" />
                            </div>
                          )}
                        </div>
                        <div className="item-meta">
                          <p className="item-name">{getTVItemTitle(item)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {currentItem && (
          <div className="tv-home-details">
            <div className="details-content">
              <h3>{getTVItemTitle(currentItem)}</h3>
              {getTVItemDescription(currentItem) && (
                <p className="details-description">{getTVItemDescription(currentItem)}</p>
              )}
              <div className="details-meta" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
