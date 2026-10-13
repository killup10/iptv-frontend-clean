import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TVSearch from './TVSearch';
import './TVHome.css';
import {
  focusTVNav,
  focusTVContent,
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
import { getTVKeyName } from '../utils/tvRemote.js';
import useHomeLivePlayer, { supportsHomeLivePlayer } from '../hooks/useHomeLivePlayer.js';
import { formatGuideTime, getProgramProgress } from '../utils/epgCache.js';
import { selectHomeLiveChannels } from '../utils/homeLiveChannels.js';

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const HomeCard = React.memo(function HomeCard({ item, itemKey, selected, itemRefs }) {
  const badges = getTVItemQualityBadges(item);
  return (
    <div data-item-key={itemKey} tabIndex={-1} role="button" aria-label={getTVItemTitle(item)}
      ref={element => { itemRefs.current[itemKey] = element; }}
      className={`carousel-item ${selected ? 'focused' : ''}`}>
      <div className="item-card">
        <img src={getTVItemImage(item)} alt={getTVItemTitle(item)} className="item-poster" loading="lazy" decoding="async" />
        {item?.hasNewEpisodes && <div className="item-episode-badge">NUEVOS EPISODIOS</div>}
        {badges.length > 0 && <div className="item-quality-badges">{badges.map(badge => <span key={badge} className="item-quality-badge">{badge}</span>)}</div>}
        {selected && <div className="focus-overlay"><div className="focus-ring" /></div>}
      </div>
      <div className="item-meta"><p className="item-name">{getTVItemTitle(item)}</p>
        {item.__homeLive && <><p className="tv-live-program">{item.epg || item.currentProgram || 'En directo'}</p>
          <p className="tv-live-time">{item.epgStart && item.epgStop ? `${formatGuideTime(item.epgStart)} – ${formatGuideTime(item.epgStop)}` : 'En directo'}</p>
          <progress className="tv-live-progress" max="1" value={getProgramProgress(item.epgStart, item.epgStop)} />
        </>}
      </div>
    </div>
  );
});

export default function TVHome({
  sections: catalogSections = [],
  onSelectItem,
  onAddToMyList,
}) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionItemIndexes, setSectionItemIndexes] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchChannels, setSearchChannels] = useState([]);
  const nativeLive = supportsHomeLivePlayer();
  const [focusMode, setFocusMode] = useState(nativeLive ? 'content' : 'hero');
  const [liveIndex, setLiveIndex] = useState(0);
  const [epgTick, setEpgTick] = useState(0);
  const liveChannels = useMemo(() => selectHomeLiveChannels(searchChannels)
    .map(channel => ({ ...channel, title: channel.name || channel.title, __homeLive: true, itemType: 'channel' })), [searchChannels]);
  const liveMode = nativeLive && liveChannels.length > 0;
  const sections = useMemo(() => liveMode
    ? [{ title: '🔴 Ahora en vivo', type: 'channel', items: liveChannels }, ...catalogSections.filter(section => section.type !== 'channel')]
    : catalogSections, [liveMode, liveChannels, catalogSections]);
  const activeLiveChannel = liveChannels[Math.min(liveIndex, liveChannels.length - 1)];
  const livePlayer = useHomeLivePlayer(activeLiveChannel, liveMode);
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const sectionRefs = useRef([]);
  const itemRefs = useRef({});
  const hasUserNavigatedRef = useRef(false);
  const restoredFocusSignatureRef = useRef('');
  const location = useLocation();

  useEffect(() => {
    if (liveMode && !Number.isInteger(location.state?.focusedSectionIndex)) {
      hasUserNavigatedRef.current = true;
      setCurrentSectionIndex(0);
      setFocusMode('content');
      const timer = setTimeout(() => focusTVContent(), 0);
      return () => clearTimeout(timer);
    }
  }, [liveMode]);

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

  useEffect(() => {
    if (liveMode && focusMode === 'content' && currentSectionIndex === 0) setLiveIndex(currentItemIndex);
  }, [liveMode, focusMode, currentSectionIndex, currentItemIndex]);

  useEffect(() => {
    if (!liveMode) return undefined;
    const timer = setInterval(() => setEpgTick(value => value + 1), 60000);
    return () => clearInterval(timer);
  }, [liveMode]);

  useEffect(() => {
    if (!nativeLive || epgTick === 0) return;
    let cancelled = false;
    fetchUserChannels('Todos').then(channels => { if (!cancelled) setSearchChannels(Array.isArray(channels) ? channels : []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [nativeLive, epgTick]);

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
    if (liveMode || showSearch || focusMode !== 'hero' || heroItems.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 6500);

    return () => window.clearInterval(intervalId);
  }, [heroItems.length, showSearch, focusMode, liveMode]);

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
    const originalIndex = location.state?.focusedSectionIndex;
    const restoredSectionIndex = liveMode && Number.isInteger(originalIndex)
      ? sections.indexOf(catalogSections[originalIndex]) : originalIndex;
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
  }, [location.key, location.state?.focusedItemIndex, location.state?.focusedSectionIndex, sections, catalogSections, liveMode]);

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

    const itemRect = itemElement.getBoundingClientRect();
    const carouselRect = carousel.getBoundingClientRect();
    const padding = 12;
    let targetLeft = carousel.scrollLeft;
    if (itemRect.left < carouselRect.left + padding) {
      targetLeft += itemRect.left - carouselRect.left - padding;
    } else if (itemRect.right > carouselRect.right - padding) {
      targetLeft += itemRect.right - carouselRect.right + padding;
    } else {
      return;
    }

    carousel.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'auto',
    });
  }, []);

  const scrollSectionVertically = useCallback((sectionIndex = currentSectionIndex) => {
    if (liveMode && sectionIndex === 0 && containerRef.current) {
      containerRef.current.scrollTop = 0;
      return;
    }
    const sectionRef = sectionRefs.current[sectionIndex];
    if (!sectionRef) {
      return;
    }

    // Margen amplio: el titulo de seccion queda totalmente visible con aire
    // arriba. Antes (18/24px) quedaba pegado al borde y se cortaba.
    scrollContainerToElement(sectionRef, 96);
  }, [scrollContainerToElement, liveMode]);

  const scrollCurrentContentIntoView = useCallback((sectionIndex = currentSectionIndex, itemIndex = currentItemIndex) => {
    scrollSectionVertically(sectionIndex);

    const itemRef = itemRefs.current[`${sectionIndex}-${itemIndex}`];
    if (itemRef) {
      scrollItemHorizontally(itemRef);
    }
  }, [currentItemIndex, currentSectionIndex, scrollItemHorizontally, scrollSectionVertically]);

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

      // Foco DOM real: sin esto el hero no es alcanzable por lectores ni
      // muestra foco del sistema; antes solo hacia scroll.
      try {
        heroRef.current.focus({ preventScroll: true });
      } catch {
        try {
          heroRef.current.focus();
        } catch {}
      }
      scrollContainerToElement(heroRef.current, 6);
    });
  }, [scrollContainerToElement, spotlightItem]);

  const focusCurrentContent = useCallback(() => {
    hasUserNavigatedRef.current = true;
    setFocusMode('content');

  }, []);

  const runItemAction = useCallback((_action, item = currentItem, sectionIndex = currentSectionIndex, itemIndex = null) => {
    if (!item) return;

    if (liveMode && item.__homeLive) {
      livePlayer.enterFullscreen(item);
      return;
    }

    const resolvedItemIndex = itemIndex ?? currentItemIndex;

    const originalSectionIndex = liveMode && sectionIndex != null ? catalogSections.indexOf(sections[sectionIndex]) : sectionIndex;
    onSelectItem?.(item, originalSectionIndex, resolvedItemIndex);
  }, [currentItem, currentItemIndex, currentSectionIndex, onSelectItem, liveMode, livePlayer.enterFullscreen, catalogSections, sections]);

  const resolveAction = (event) => {
    const name = getTVKeyName(event);
    switch (name) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Enter':
      case 'Escape':
        return name;
      case 'Backspace':
        // Borrar fuera de inputs = volver (lo gestiona AppTV).
        return 'Escape';
      default:
        break;
    }

    // Atajos con tecla fisica: info, "/" y Ctrl+S abren detalles/busqueda.
    if (event.key === 'ContextMenu' || event.key === 'Info' || event.key === 'KeyI' || event.key === '/') {
      return event.key;
    }
    return null;
  };

  const navRef = useRef({});
  navRef.current = {
    showSearch,
    focusMode,
    currentSectionIndex,
    currentItemIndex,
    currentSection,
    currentItem,
    spotlightItem,
    heroIndex,
    heroItems,
    sections,
    onSelectItem,
  };

  const handleNavigation = useCallback((event) => {
    const {
      showSearch: curSearch,
      focusMode: curFocusMode,
      currentSectionIndex: curSecIdx,
      currentItemIndex: curItemIdx,
      currentSection: curSection,
      currentItem: curItem,
      spotlightItem: curSpotlight,
      heroItems: curHeroItems,
      sections: curSections,
    } = navRef.current;

    if (curSearch || getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
      return;
    }

    const key = resolveAction(event);
    if (!key) return;

    if (key === '/' || (event.key?.toLowerCase?.() === 's' && event.ctrlKey)) {
      event.preventDefault();
      setShowSearch(true);
      return;
    }

    if (!curSection) return;

    if (curFocusMode === 'hero') {
      switch (key) {
        case 'ArrowUp':
          event.preventDefault();
          // Subir al sidebar en lugar de quedarse atrapado en el hero.
          focusTVNav();
          break;
        case 'ArrowDown':
          event.preventDefault();
          focusCurrentContent();
          break;
        case 'ArrowLeft':
          if (curHeroItems?.length > 1) {
            event.preventDefault();
            hasUserNavigatedRef.current = true;
            setHeroIndex((prev) => (prev > 0 ? prev - 1 : curHeroItems.length - 1));
          }
          break;
        case 'ArrowRight':
          if (curHeroItems?.length > 1) {
            event.preventDefault();
            hasUserNavigatedRef.current = true;
            setHeroIndex((prev) => (prev + 1) % curHeroItems.length);
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          runItemAction('play', curSpotlight, null, null);
          break;
        default:
          break;
      }
      return;
    }

    if (curFocusMode === 'search') {
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
        if (curSecIdx === 0) {
          if (liveMode) { focusTVNav(); return; }
          focusHero();
          return;
        }
        setCurrentSectionIndex((prev) => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        hasUserNavigatedRef.current = true;
        setFocusMode('content');
        setCurrentSectionIndex((prev) => Math.min(curSections.length - 1, prev + 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        hasUserNavigatedRef.current = true;
        if (curItemIdx > 0) {
          setFocusMode('content');
          setCurrentItemIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        // Borde izquierdo de la fila: ir al sidebar (lo pide el mando).
        focusTVNav();
        break;
      case 'ArrowRight':
        event.preventDefault();
        hasUserNavigatedRef.current = true;
        setFocusMode('content');
        setCurrentItemIndex((prev) => Math.min((curSection.items?.length || 1) - 1, prev + 1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (curItem) {
          runItemAction('play', curItem, curSecIdx, curItemIdx);
        }
        break;
      default:
        break;
    }
  }, [focusCurrentContent, focusHero, runItemAction, setCurrentItemIndex, liveMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [handleNavigation]);

  useEffect(() => {
    const handleFocusContent = () => {
      if (showSearch) {
        return;
      }

      if (!liveMode && !hasUserNavigatedRef.current && !Number.isInteger(location.state?.focusedSectionIndex)) {
        focusHero();
        return;
      }

      const selectedItemRef = itemRefs.current[`${currentSectionIndex}-${currentItemIndex}`];
      if (!selectedItemRef) return;

      setFocusMode('content');
      selectedItemRef.focus({ preventScroll: true });
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
    liveMode,
  ]);

  useEffect(() => {
    if (focusMode !== 'content') {
      return;
    }

    if (!hasUserNavigatedRef.current && !Number.isInteger(location.state?.focusedSectionIndex)) {
      return;
    }

    // Solo scroll vertical al cambiar de seccion: antes cada movimiento
    // horizontal re-disparaba el scroll vertical y todo "se descuadraba".
    scrollSectionVertically(currentSectionIndex);
  }, [currentSectionIndex, focusMode, location.state?.focusedSectionIndex, scrollSectionVertically]);

  useEffect(() => {
    if (focusMode !== 'content') {
      return;
    }

    if (!hasUserNavigatedRef.current && !Number.isInteger(location.state?.focusedSectionIndex)) {
      return;
    }

    // Movimiento dentro de la fila: scroll horizontal + correccion vertical
    // minima si el item quedo cortado (ej. hero redimensionado tras el scroll).
    const itemRef = itemRefs.current[`${currentSectionIndex}-${currentItemIndex}`];
    if (!itemRef) {
      return;
    }
    if (getTVFocusZone() === TV_FOCUS_ZONE_CONTENT && !showSearch) {
      itemRef.focus({ preventScroll: true });
    }
    scrollItemHorizontally(itemRef);

    const container = containerRef.current;
    if (container) {
      const itemRect = itemRef.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (itemRect.bottom > containerRect.bottom) {
        container.scrollTop += itemRect.bottom - containerRect.bottom + 12;
      } else if (itemRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - itemRect.top + 12;
      }
    }
  }, [currentItemIndex, currentSectionIndex, focusMode, location.state?.focusedSectionIndex, scrollItemHorizontally, showSearch]);

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
    <div ref={containerRef} className={`tv-home-container ${liveMode ? 'tv-home-with-live' : ''}`}>
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
        {liveMode && <section className="tv-live-hero" aria-label="Canal en directo">
          <p className="tv-live-label">EN VIVO · {getTVItemTitle(activeLiveChannel)}</p>
          <h1>{activeLiveChannel?.epg || activeLiveChannel?.currentProgram || getTVItemTitle(activeLiveChannel)}</h1>
          <p>{activeLiveChannel?.epgDesc || ''}</p>
          <p className="tv-live-time">{activeLiveChannel?.epgStart && activeLiveChannel?.epgStop ? `${formatGuideTime(activeLiveChannel.epgStart)} – ${formatGuideTime(activeLiveChannel.epgStop)}` : 'En directo'}</p>
          <p className="tv-live-status" role="status">{livePlayer.state === 'error' ? 'No se pudo reproducir. Pulsa OK para reintentar o elige otro canal.' : livePlayer.state === 'loading' ? 'Sintonizando…' : 'OK · Pantalla completa'}</p>
        </section>}
        {!liveMode && spotlightItem && (
          <section
            ref={heroRef}
            tabIndex={-1}
            aria-label={`Destacado: ${getTVItemTitle(spotlightItem)}`}
            className={`tv-home-spotlight ${focusMode === 'hero' ? 'is-focused' : ''}`}
          >
            <div className="tv-home-spotlight-media" aria-hidden="true">
              <img
                key={`backdrop-fill-${spotlightItem?.id || spotlightItem?._id || heroIndex}`}
                src={spotlightBackdrop}
                alt=""
                className="tv-home-spotlight-backdrop-fill animate-fadeIn"
                loading="eager"
                fetchPriority="high"
                decoding="async"
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
                <img
                  src={getTVItemImage(spotlightItem)}
                  alt={getTVItemTitle(spotlightItem)}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
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
                className={`tv-home-section ${section.type === 'channel' && liveMode ? 'tv-live-row' : ''} ${isCurrentSection ? 'active' : ''}`}
                ref={(element) => {
                  sectionRefs.current[sectionIndex] = element;
                }}
              >
                <h2 className="section-title">{section.title}</h2>
                <div className="section-carousel">
                  {section.items.map((item, itemIndex) => {
                    const isSelected = isCurrentSection && itemIndex === activeItemIndex;
                    const key = `${sectionIndex}-${itemIndex}`;
                    return <HomeCard key={item?._id || item?.id || key} item={item} itemKey={key} selected={isSelected} itemRefs={itemRefs} />;
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
