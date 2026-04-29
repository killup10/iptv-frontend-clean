import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPlayableUrl } from "@/utils/playerUtils.js";
import { maskUrl } from "@/utils/debugUtils.js";
import axiosInstance from "@/utils/axiosInstance.js";
import { getUserProgress, fetchChannelForPlayback, fetchUserChannels } from "@/utils/api.js";
import SeriesChapters from "@/components/SeriesChapters.jsx";
import VideoPlayer from "@/components/VideoPlayer.jsx";
import TrailerModal from "@/components/TrailerModal.jsx";
import { App as CapacitorApp } from '@capacitor/app';

import ContentAccessModal from '@/components/ContentAccessModal.jsx';
import DynamicTheme, { DynamicText, DynamicCard } from '@/components/DynamicTheme.jsx';
import SmartRecommendations from '@/components/SmartRecommendations.jsx';
import useGeminiContent from '@/hooks/useGeminiContent.js';
import useRecommendations from '@/hooks/useRecommendations.js';
import { backgroundPlaybackService } from '@/services/backgroundPlayback.js';
import { addItemToMyList } from '@/utils/myListUtils.js';
import { getPlayerType, isAndroidTV } from '@/utils/platformUtils.js';
import {
  getTVItemBackdrop,
  getTVItemDescription,
  getTVItemId,
  getTVItemImage,
  getTVItemRating,
  getTVItemTitle,
  getTVItemTrailerUrl,
  getTVItemYear,
  resolveTVItemType,
} from '@/utils/tvContentUtils.js';
import {
  focusTVContent,
  getTVFocusZone,
  TV_FOCUS_ZONE_CONTENT,
} from '@/utils/tvFocusZone.js';
import { normalizeSearchText } from '@/utils/searchUtils.js';

function resolveRemoteAction(event) {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Enter':
      return event.key;
    case ' ':
    case 'Spacebar':
    case 'Select':
    case 'MediaPlayPause':
      return 'Enter';
    case 'Escape':
    case 'GoBack':
    case 'BrowserBack':
      return 'close';
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
    case 62:
    case 66:
      return 'Enter';
    case 4:
    case 27:
    case 111:
      return 'close';
    default:
      return null;
  }
}

function getChannelStreamUrl(channel) {
  return (
    channel?.url ||
    channel?.streamUrl ||
    channel?.stream_url ||
    channel?.playbackUrl ||
    channel?.videoUrl ||
    ''
  );
}

function normalizeWatchChannel(channel, fallback = {}) {
  const merged = { ...fallback, ...channel };
  return {
    id: merged?._id || merged?.id || fallback?.id,
    name: merged?.name || merged?.title || fallback?.name || 'Canal',
    url: getChannelStreamUrl(merged) || fallback?.url || '',
    logo: merged?.logo || merged?.customThumbnail || merged?.thumbnail || fallback?.logo || '',
    section: merged?.section || fallback?.section || 'General'
  };
}

function formatSecondsLabel(totalSeconds) {
  const safeTotal = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getSafeSeasonNumber(season, seasonIndex = 0) {
  const seasonNumber = Number(season?.seasonNumber);
  return Number.isFinite(seasonNumber) && seasonNumber > 0 ? seasonNumber : (seasonIndex + 1);
}

function getSafeEpisodeNumber(chapter, chapterIndex = 0) {
  const episodeNumber = Number(chapter?.episodeNumber);
  return Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : (chapterIndex + 1);
}

function buildSeasonEpisodeLabel(seasonNumber, episodeNumber) {
  if (seasonNumber && episodeNumber) {
    return `T${seasonNumber} E${episodeNumber}`;
  }
  if (episodeNumber) {
    return `E${episodeNumber}`;
  }
  if (seasonNumber) {
    return `T${seasonNumber}`;
  }
  return '';
}

async function hydrateChannelsForPlayback(channels, options = {}) {
  const hydratedChannels = [...channels];
  const missingUrlIndexes = hydratedChannels
    .map((channel, index) => ({ channel, index }))
    .filter(({ channel }) => channel.id && !channel.url)
    .map(({ index }) => index);

  if (missingUrlIndexes.length === 0) {
    return hydratedChannels;
  }

  const preferredChannelId = options?.preferredChannelId ? String(options.preferredChannelId) : null;
  const preferredIndex = preferredChannelId
    ? hydratedChannels.findIndex((channel) => String(channel.id) === preferredChannelId)
    : -1;
  const prioritizedIndexes = [...missingUrlIndexes].sort((leftIndex, rightIndex) => {
    if (preferredIndex < 0) {
      return leftIndex - rightIndex;
    }

    return Math.abs(leftIndex - preferredIndex) - Math.abs(rightIndex - preferredIndex);
  });

  let cursor = 0;
  let completed = 0;
  const workerCount = Math.min(12, prioritizedIndexes.length);
  const emitProgress = () => {
    completed += 1;
    if (
      typeof options?.onProgress === 'function' &&
      (completed <= 6 || completed % 12 === 0 || completed === prioritizedIndexes.length)
    ) {
      options.onProgress([...hydratedChannels]);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < prioritizedIndexes.length) {
      const targetIndex = prioritizedIndexes[cursor];
      cursor += 1;

      const baseChannel = hydratedChannels[targetIndex];
      try {
        const detailedChannel = await fetchChannelForPlayback(baseChannel.id);
        hydratedChannels[targetIndex] = normalizeWatchChannel(detailedChannel, baseChannel);
      } catch (error) {
        console.warn('[Watch.jsx] No se pudo hidratar URL de canal:', baseChannel.name, error?.message || error);
      } finally {
        emitProgress();
      }
    }
  }));

  return hydratedChannels;
}

export function Watch() {
  const { itemType, itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isTVMode = isAndroidTV();
  const playerType = getPlayerType();
  const activeNativePlayerType = isTVMode
    ? (itemType === 'channel' ? 'android-exoplayer' : 'android-vlc')
    : playerType;
  const isTvNativePlayerAvailable = false;
  const isBrowserPlaybackBlocked = playerType === 'web';

  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [bounds, setBounds] = useState(null);
  const [currentChapterInfo, setCurrentChapterInfo] = useState(null);
  const [channelList, setChannelList] = useState([]);
  const [channelListReady, setChannelListReady] = useState(itemType !== 'channel');
  const [currentChannelIndex, setCurrentChannelIndex] = useState(-1);
  const [isReloadingChannel, setIsReloadingChannel] = useState(false);
  const [channelPlaybackIssue, setChannelPlaybackIssue] = useState(null);
  const [channelPlaybackDismissed, setChannelPlaybackDismissed] = useState(false);
  const [isChannelPickerOpen, setIsChannelPickerOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [focusedChannelControlIndex, setFocusedChannelControlIndex] = useState(0);
  const [focusedChannelPickerIndex, setFocusedChannelPickerIndex] = useState(0);
  const [focusedVodActionIndex, setFocusedVodActionIndex] = useState(0);
  const [focusedVodDetailSection, setFocusedVodDetailSection] = useState('actions');
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [focusedSeasonIndex, setFocusedSeasonIndex] = useState(0);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState(0);
  const [focusedRecommendationIndex, setFocusedRecommendationIndex] = useState(0);
  const [vodPlaybackRequested, setVodPlaybackRequested] = useState(() => itemType === 'channel' || !isTVMode);
  const [isAddingToMyList, setIsAddingToMyList] = useState(false);
  const [myListFeedback, setMyListFeedback] = useState({ type: '', message: '' });
  const [activeTrailerUrl, setActiveTrailerUrl] = useState('');
  
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalData, setAccessModalData] = useState(null);

  const videoAreaRef = useRef(null);
  const channelControlRefs = useRef([]);
  const channelPickerInputRef = useRef(null);
  const channelPickerCloseButtonRef = useRef(null);
  const channelPickerItemRefs = useRef([]);
  const vodActionRefs = useRef([]);
  const seasonOptionRefs = useRef([]);
  const episodeOptionRefs = useRef([]);
  const recommendationRefs = useRef([]);
  const tvHeroSectionRef = useRef(null);
  const tvHeroFocusRef = useRef(null);
  const vodActionsSectionRef = useRef(null);
  const tvSeasonsSectionRef = useRef(null);
  const tvSeasonsRailRef = useRef(null);
  const tvEpisodesSectionRef = useRef(null);
  const tvEpisodesRailRef = useRef(null);
  const tvRecommendationsSectionRef = useRef(null);
  const tvRecommendationsRailRef = useRef(null);
  const hasInitializedTvVodFocusRef = useRef(false);
  const TV_TOP_SCROLL_OFFSET = 28;
  const selectedSeasonEpisodeCount = Array.isArray(itemData?.seasons?.[selectedSeasonIndex]?.chapters)
    ? itemData.seasons[selectedSeasonIndex].chapters.filter(Boolean).length
    : 0;

  const focusElementWithoutScroll = useCallback((element) => {
    if (!element) {
      return;
    }

    const previousX = window.scrollX;
    const previousY = window.scrollY;

    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
      window.scrollTo({
        left: previousX,
        top: previousY,
        behavior: 'auto',
      });
    }
  }, []);

  const scrollPageTo = useCallback((top) => {
    const safeTop = Math.max(0, Math.floor(Number(top) || 0));
    const scrollTargets = [
      document.scrollingElement,
      document.documentElement,
      document.body,
    ].filter(Boolean);

    scrollTargets.forEach((target) => {
      if (typeof target.scrollTo === 'function') {
        target.scrollTo({
          top: safeTop,
          behavior: 'auto',
        });
      } else {
        target.scrollTop = safeTop;
      }
    });

    window.scrollTo({
      top: safeTop,
      behavior: 'auto',
    });
  }, []);

  const getTvScrollTop = useCallback(() => {
    return Math.max(
      Number(document.scrollingElement?.scrollTop) || 0,
      Number(document.documentElement?.scrollTop) || 0,
      Number(document.body?.scrollTop) || 0,
      Number(window.scrollY) || 0,
      Number(window.pageYOffset) || 0,
    );
  }, []);

  const ensureTvElementVisible = useCallback((target, options = {}) => {
    const element = target?.current || target;
    if (!element) {
      return;
    }

    const viewportHeight = Math.max(
      Number(window.innerHeight) || 0,
      Number(document.documentElement?.clientHeight) || 0,
      1,
    );
    const rect = element.getBoundingClientRect();
    const topMargin = Math.max(0, Number(options.topMargin ?? TV_TOP_SCROLL_OFFSET));
    const bottomMargin = Math.max(topMargin, Number(options.bottomMargin ?? 128));
    const currentTop = getTvScrollTop();

    if (rect.top < topMargin) {
      scrollPageTo(currentTop + rect.top - topMargin);
      return;
    }

    const maxVisibleBottom = viewportHeight - bottomMargin;
    if (rect.bottom > maxVisibleBottom) {
      scrollPageTo(currentTop + rect.bottom - maxVisibleBottom);
    }
  }, [TV_TOP_SCROLL_OFFSET, getTvScrollTop, scrollPageTo]);

  const ensureTvRailItemVisible = useCallback((containerTarget, itemTarget, options = {}) => {
    const container = containerTarget?.current || containerTarget;
    const item = itemTarget?.current || itemTarget;
    if (!container || !item || typeof container.scrollTo !== 'function') {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const leftPadding = Math.max(0, Number(options.leftPadding ?? 28));
    const rightPadding = Math.max(leftPadding, Number(options.rightPadding ?? 44));

    if (itemRect.left < containerRect.left + leftPadding) {
      container.scrollTo({
        left: Math.max(0, container.scrollLeft - ((containerRect.left + leftPadding) - itemRect.left)),
        behavior: 'auto',
      });
      return;
    }

    if (itemRect.right > containerRect.right - rightPadding) {
      container.scrollTo({
        left: Math.max(0, container.scrollLeft + (itemRect.right - (containerRect.right - rightPadding))),
        behavior: 'auto',
      });
    }
  }, []);

  const focusChannelPickerInput = useCallback(() => {
    setFocusedChannelPickerIndex(-1);
    window.requestAnimationFrame(() => {
      focusElementWithoutScroll(channelPickerInputRef.current);
    });
  }, [focusElementWithoutScroll]);

  const focusChannelPickerCloseButton = useCallback(() => {
    setFocusedChannelPickerIndex(-1);
    window.requestAnimationFrame(() => {
      focusElementWithoutScroll(channelPickerCloseButtonRef.current);
    });
  }, [focusElementWithoutScroll]);

  const focusChannelControl = useCallback((index) => {
    const maxIndex = Math.max(0, channelControlRefs.current.filter(Boolean).length - 1);
    const safeIndex = Math.max(0, Math.min(maxIndex, Number(index) || 0));
    setFocusedChannelControlIndex(safeIndex);

    window.requestAnimationFrame(() => {
      const targetButton = channelControlRefs.current[safeIndex];
      if (!targetButton) return;

      focusElementWithoutScroll(targetButton);
    });
  }, [focusElementWithoutScroll]);

  const focusVodHero = useCallback(() => {
    setFocusedVodDetailSection('hero');

    window.requestAnimationFrame(() => {
      const heroElement = tvHeroFocusRef.current || tvHeroSectionRef.current;
      ensureTvElementVisible(tvHeroSectionRef.current, {
        topMargin: TV_TOP_SCROLL_OFFSET,
        bottomMargin: 120,
      });
      focusElementWithoutScroll(heroElement);
    });
  }, [TV_TOP_SCROLL_OFFSET, ensureTvElementVisible, focusElementWithoutScroll]);

  const focusVodAction = useCallback((index) => {
    const maxIndex = Math.max(0, vodActionRefs.current.filter(Boolean).length - 1);
    const safeIndex = Math.max(0, Math.min(maxIndex, Number(index) || 0));
    setFocusedVodDetailSection('actions');
    setFocusedVodActionIndex(safeIndex);

    window.requestAnimationFrame(() => {
      const targetButton = vodActionRefs.current[safeIndex];
      if (!targetButton) return;

      ensureTvElementVisible(vodActionsSectionRef.current || tvHeroSectionRef.current, {
        topMargin: TV_TOP_SCROLL_OFFSET + 8,
        bottomMargin: 210,
      });
      focusElementWithoutScroll(targetButton);
    });
  }, [TV_TOP_SCROLL_OFFSET, ensureTvElementVisible, focusElementWithoutScroll]);

  const focusTvSeason = useCallback((index) => {
    const maxIndex = Math.max(0, (itemData?.seasons?.length || 0) - 1);
    const safeIndex = Math.max(0, Math.min(maxIndex, Number(index) || 0));
    setFocusedVodDetailSection('seasons');
    setSelectedSeasonIndex(safeIndex);
    setFocusedSeasonIndex(safeIndex);

    window.requestAnimationFrame(() => {
      const targetButton = seasonOptionRefs.current[safeIndex];
      if (!targetButton) return;

      ensureTvElementVisible(tvSeasonsSectionRef.current, {
        topMargin: TV_TOP_SCROLL_OFFSET + 20,
        bottomMargin: 220,
      });
      focusElementWithoutScroll(targetButton);

      ensureTvRailItemVisible(tvSeasonsRailRef.current, targetButton, {
        leftPadding: 24,
        rightPadding: 52,
      });
    });
  }, [TV_TOP_SCROLL_OFFSET, ensureTvElementVisible, ensureTvRailItemVisible, focusElementWithoutScroll, itemData?.seasons?.length]);

  const focusTvEpisode = useCallback((index) => {
    const maxIndex = Math.max(0, selectedSeasonEpisodes.length - 1);
    const safeIndex = Math.max(0, Math.min(maxIndex, Number(index) || 0));
    setFocusedVodDetailSection('episodes');
    setFocusedEpisodeIndex(safeIndex);

    window.requestAnimationFrame(() => {
      const targetButton = episodeOptionRefs.current[safeIndex];
      if (!targetButton) return;

      ensureTvElementVisible(tvEpisodesSectionRef.current, {
        topMargin: TV_TOP_SCROLL_OFFSET + 20,
        bottomMargin: 220,
      });
      focusElementWithoutScroll(targetButton);

      ensureTvRailItemVisible(tvEpisodesRailRef.current, targetButton, {
        leftPadding: 24,
        rightPadding: 64,
      });
    });
  }, [TV_TOP_SCROLL_OFFSET, ensureTvElementVisible, ensureTvRailItemVisible, focusElementWithoutScroll, selectedSeasonEpisodeCount]);

  const focusTvRecommendation = useCallback((index) => {
    const maxIndex = Math.max(0, recommendationRefs.current.filter(Boolean).length - 1);
    const safeIndex = Math.max(0, Math.min(maxIndex, Number(index) || 0));
    setFocusedVodDetailSection('recommendations');
    setFocusedRecommendationIndex(safeIndex);

    window.requestAnimationFrame(() => {
      const targetButton = recommendationRefs.current[safeIndex];
      if (!targetButton) return;

      ensureTvElementVisible(tvRecommendationsSectionRef.current, {
        topMargin: TV_TOP_SCROLL_OFFSET + 20,
        bottomMargin: 160,
      });
      focusElementWithoutScroll(targetButton);

      ensureTvRailItemVisible(tvRecommendationsRailRef.current, targetButton, {
        leftPadding: 20,
        rightPadding: 44,
      });
    });
  }, [TV_TOP_SCROLL_OFFSET, ensureTvElementVisible, ensureTvRailItemVisible, focusElementWithoutScroll]);
  
  // 🔧 FIX ELECTRON: Recuperar state desde localStorage si es necesario (HashRouter puede perderlo)
  const [isContinueWatching, setIsContinueWatching] = useState(location.state?.continueWatching === true);
  const [startTimeFromState, setStartTimeFromState] = useState(location.state?.startTime || 0);
  const [continueWatchingState, setContinueWatchingState] = useState(
    location.state?.continueWatching ? location.state : null
  );
  
  useEffect(() => {
    if (location.state?.continueWatching) {
      // Guardar el state en localStorage como fallback para Electron
      const cacheKey = `continueWatching_${itemId}`;
      const navigationCache = {
        continueWatching: location.state.continueWatching,
        startTime: location.state.startTime,
        seasonIndex: location.state.seasonIndex,
        chapterIndex: location.state.chapterIndex,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem(cacheKey, JSON.stringify(navigationCache));
        console.log('[Watch] ✅ Estado "Continuar viendo" guardado en localStorage:', navigationCache);
      } catch (e) {
        console.error('[Watch] Error guardando en localStorage:', e);
      }
      setContinueWatchingState(location.state);
      setIsContinueWatching(true);
      setStartTimeFromState(location.state.startTime || 0);
    } else {
      // Intentar recuperar desde localStorage si el state se perdió
      const cacheKey = `continueWatching_${itemId}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          // Solo usar si es reciente (menos de 5 minutos)
          if (Date.now() - data.timestamp < 5 * 60 * 1000) {
            console.log('[Watch] ✅ Estado recuperado desde localStorage:', data);
            setIsContinueWatching(true);
            setStartTimeFromState(data.startTime || 0);
            setContinueWatchingState(data);
            // No borrar de localStorage aún, por si el usuario hace back/forward
          }
        }
      } catch (e) {
        console.error('[Watch] Error recuperando de localStorage:', e);
      }
    }
  }, [itemId, location.state]);

  const [startTime, setStartTime] = useState(startTimeFromState);
  const [reloadKey, setReloadKey] = useState(0);
  
  useEffect(() => {
    if (startTimeFromState > 0 && startTimeFromState !== startTime) {
      setStartTime(startTimeFromState);
    }
  }, [startTimeFromState, startTime]);
  const [useTrial, setUseTrial] = useState(() => {
    try {
      const key = `useTrial:${itemId}`;
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        return true;
      }
    } catch (err) {
      console.warn('[Watch.jsx] No se pudo leer useTrial desde localStorage:', err);
    }
    return location.state?.useTrial === true;
  });

  useEffect(() => {
    if (!isTVMode || itemType === 'channel') {
      setVodPlaybackRequested(true);
      return;
    }

    setVodPlaybackRequested(false);
  }, [isTVMode, itemId, itemType]);

  const isUnmountingRef = useRef(false);
  const isNavigatingAwayRef = useRef(false); // 🔥 NUEVO: Ref para detectar navegación
  const currentTimeRef = useRef(0);
  const playbackStartTsRef = useRef(null);
  const initialProgressSavedRef = useRef(false); // 🔥 NUEVO: Evitar duplicados
  const suppressMpvClosedRef = useRef(false);
  const nextEpisodeNavigationRef = useRef({ key: null, ts: 0 });
  const latestWatchParamsRef = useRef({ itemType, itemId });
  latestWatchParamsRef.current = { itemType, itemId };

  const filteredChannelList = useMemo(() => {
    const normalizedSearch = normalizeSearchText(channelSearch);
    if (!normalizedSearch) return channelList;
    return channelList.filter((channel) => (
      normalizeSearchText(channel.name || '').includes(normalizedSearch)
    ));
  }, [channelList, channelSearch]);

  const cachedWatchProgress = useMemo(() => {
    if (!itemId || itemType === 'channel') {
      return null;
    }

    try {
      const raw = localStorage.getItem(`videoProgress_${itemId}`);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const normalizeNumber = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
          return undefined;
        }
        return Math.floor(numericValue);
      };

      return {
        progress: normalizeNumber(parsed.progress),
        lastTime: normalizeNumber(parsed.lastTime ?? parsed.progress),
        lastSeason: normalizeNumber(parsed.lastSeason),
        lastChapter: normalizeNumber(parsed.lastChapter),
      };
    } catch (err) {
      console.warn('[Watch.jsx] No se pudo leer cache local de progreso:', err);
      return null;
    }
  }, [itemId, itemType]);

  const effectiveWatchProgress = useMemo(() => {
    const sourceProgress = itemData?.watchProgress;
    if (!sourceProgress && !cachedWatchProgress) {
      return null;
    }

    const normalizeNumber = (value) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return undefined;
      }
      return Math.floor(numericValue);
    };

    const pickNumber = (...values) => {
      for (const value of values) {
        const normalizedValue = normalizeNumber(value);
        if (normalizedValue !== undefined) {
          return normalizedValue;
        }
      }
      return undefined;
    };

    const progress = pickNumber(
      sourceProgress?.progress,
      sourceProgress?.lastTime,
      cachedWatchProgress?.progress,
      cachedWatchProgress?.lastTime,
    );
    const lastTime = pickNumber(
      sourceProgress?.lastTime,
      sourceProgress?.progress,
      cachedWatchProgress?.lastTime,
      cachedWatchProgress?.progress,
    );

    return {
      ...(cachedWatchProgress || {}),
      ...(sourceProgress || {}),
      progress,
      lastTime,
      lastSeason: pickNumber(sourceProgress?.lastSeason, cachedWatchProgress?.lastSeason),
      lastChapter: pickNumber(sourceProgress?.lastChapter, cachedWatchProgress?.lastChapter),
    };
  }, [cachedWatchProgress, itemData?.watchProgress]);

  const focusChannelPickerItem = useCallback((index, options = {}) => {
    const { syncState = true } = options;
    if (filteredChannelList.length === 0) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(filteredChannelList.length - 1, Number(index) || 0));
    if (syncState) {
      setFocusedChannelPickerIndex(safeIndex);
    }

    window.requestAnimationFrame(() => {
      const targetButton = channelPickerItemRefs.current[safeIndex];
      if (!targetButton) {
        return;
      }

      focusElementWithoutScroll(targetButton);

      targetButton.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
      });
    });
  }, [filteredChannelList.length, focusElementWithoutScroll]);

  const channelsForNativePlayback = useMemo(() => {
    const seen = new Set();
    const nextChannels = [];

    const appendChannel = (channel, fallback = {}) => {
      const normalizedChannel = normalizeWatchChannel(channel, fallback);
      if (!normalizedChannel.id || !normalizedChannel.name || !normalizedChannel.url) {
        return;
      }

      const channelKey = String(normalizedChannel.id);
      if (seen.has(channelKey)) {
        return;
      }

      seen.add(channelKey);
      nextChannels.push(normalizedChannel);
    };

    if (itemType === 'channel' && itemData?.id && itemData?.url) {
      appendChannel(itemData, {
        id: itemId,
        name: itemData.name || location.state?.channelName || 'Canal actual',
        url: itemData.url,
        section: itemData.section || location.state?.selectedCategory || 'General',
      });
    }

    channelList.forEach((channel) => appendChannel(channel));
    return nextChannels;
  }, [channelList, itemData, itemId, itemType, location.state?.channelName, location.state?.selectedCategory]);

  const tvTrailerUrl = itemType === 'channel' ? '' : getTVItemTrailerUrl(itemData);
  const resumeSeconds = Math.max(
    0,
    Math.floor(Number(effectiveWatchProgress?.lastTime ?? effectiveWatchProgress?.progress ?? startTime ?? startTimeFromState ?? 0))
  );
  const canContinue = Number.isFinite(resumeSeconds) && resumeSeconds > 0;
  const shouldAutoplay = itemType === 'channel'
    ? !channelPlaybackDismissed
    : (!isTVMode || vodPlaybackRequested);
  const isTVVodDetailScreen = isTVMode && itemType !== 'channel' && !vodPlaybackRequested;
  const isSeriesContent = itemType !== 'channel' && Array.isArray(itemData?.seasons) && itemData.seasons.length > 0;
  const tvItemTitle = getTVItemTitle(itemData);
  const tvItemDescription = getTVItemDescription(itemData);
  const tvBackdropImage = getTVItemBackdrop(itemData);
  const tvDetailHeroImage = tvBackdropImage || itemData?.backdrop || itemData?.poster || itemData?.thumbnail || './fondo.png';
  const tvItemYear = getTVItemYear(itemData);
  const tvItemRating = getTVItemRating(itemData);
  const nativePlayerMetaLine = useMemo(() => {
    const rawGenres = Array.isArray(itemData?.genres)
      ? itemData.genres
      : typeof itemData?.genres === 'string'
        ? itemData.genres.split(',').map((value) => value.trim()).filter(Boolean)
        : [];

    const infoParts = [
      tvItemYear,
      itemType === 'channel' ? 'En vivo' : null,
      rawGenres.length > 0 ? rawGenres.slice(0, 3).join(', ') : null,
      tvItemRating ? `IMDb ${tvItemRating}` : null,
    ].filter(Boolean);

    return infoParts.join('   •   ');
  }, [itemData?.genres, itemType, tvItemRating, tvItemYear]);

  const continueEpisodeInfo = useMemo(() => {
    if (!isSeriesContent) {
      return null;
    }

    const progress = effectiveWatchProgress || {};
    const seasonIndex = Number(progress?.lastSeason);
    const chapterIndex = Number(progress?.lastChapter);

    if (!Number.isInteger(seasonIndex) || !Number.isInteger(chapterIndex) || seasonIndex < 0 || chapterIndex < 0) {
      return null;
    }

    const season = itemData?.seasons?.[seasonIndex];
    const chapter = season?.chapters?.[chapterIndex];
    if (!season || !chapter) {
      return null;
    }

    return {
      seasonIndex,
      chapterIndex,
      seasonNumber: getSafeSeasonNumber(season, seasonIndex),
      episodeNumber: getSafeEpisodeNumber(chapter, chapterIndex),
      chapterTitle: String(chapter?.title || '').trim(),
    };
  }, [effectiveWatchProgress, isSeriesContent, itemData]);

  const selectedSeason = useMemo(() => {
    if (!isSeriesContent) {
      return null;
    }

    return itemData?.seasons?.[selectedSeasonIndex] || itemData?.seasons?.[0] || null;
  }, [isSeriesContent, itemData, selectedSeasonIndex]);

  const selectedSeasonNumber = selectedSeason ? getSafeSeasonNumber(selectedSeason, selectedSeasonIndex) : 0;
  const selectedSeasonEpisodes = useMemo(() => {
    if (!selectedSeason) {
      return [];
    }

    return Array.isArray(selectedSeason?.chapters) ? selectedSeason.chapters.filter(Boolean) : [];
  }, [selectedSeason]);

  const totalSeasonCount = Array.isArray(itemData?.seasons) ? itemData.seasons.length : 0;
  const totalEpisodeCount = useMemo(() => (
    Array.isArray(itemData?.seasons)
      ? itemData.seasons.reduce((acc, season) => acc + (Array.isArray(season?.chapters) ? season.chapters.length : 0), 0)
      : 0
  ), [itemData?.seasons]);

  const currentEpisodeMeta = useMemo(() => {
    if (!isSeriesContent || !currentChapterInfo) {
      return null;
    }

    const season = itemData?.seasons?.[currentChapterInfo.seasonIndex];
    const chapter = season?.chapters?.[currentChapterInfo.chapterIndex];
    if (!season || !chapter) {
      return null;
    }

    return {
      seasonIndex: currentChapterInfo.seasonIndex,
      chapterIndex: currentChapterInfo.chapterIndex,
      seasonNumber: getSafeSeasonNumber(season, currentChapterInfo.seasonIndex),
      episodeNumber: getSafeEpisodeNumber(chapter, currentChapterInfo.chapterIndex),
      title: String(chapter?.title || '').trim(),
    };
  }, [currentChapterInfo, isSeriesContent, itemData]);

  const selectedEpisodeMeta = useMemo(() => {
    if (!isSeriesContent || selectedSeasonEpisodes.length === 0) {
      return null;
    }

    const safeIndex = Math.max(0, Math.min(selectedSeasonEpisodes.length - 1, Number(focusedEpisodeIndex) || 0));
    const chapter = selectedSeasonEpisodes[safeIndex];
    if (!chapter) {
      return null;
    }

    return {
      seasonIndex: selectedSeasonIndex,
      chapterIndex: safeIndex,
      seasonNumber: selectedSeasonNumber,
      episodeNumber: getSafeEpisodeNumber(chapter, safeIndex),
      title: String(chapter?.title || '').trim(),
      duration: String(chapter?.duration || '').trim(),
    };
  }, [focusedEpisodeIndex, isSeriesContent, selectedSeasonEpisodes, selectedSeasonIndex, selectedSeasonNumber]);

  const continueButtonLabel = useMemo(() => {
    if (!canContinue) {
      return '';
    }

    const resumeEpisodeMeta = continueEpisodeInfo || currentEpisodeMeta || selectedEpisodeMeta;
    if (resumeEpisodeMeta && isSeriesContent) {
      return `Continuar ${buildSeasonEpisodeLabel(
        resumeEpisodeMeta.seasonNumber,
        resumeEpisodeMeta.episodeNumber,
      )}`;
    }

    return `Continuar ${formatSecondsLabel(resumeSeconds)}`;
  }, [canContinue, continueEpisodeInfo, currentEpisodeMeta, isSeriesContent, resumeSeconds, selectedEpisodeMeta]);

  const continueCaption = useMemo(() => {
    if (!canContinue) {
      return '';
    }

    const resumeEpisodeMeta = continueEpisodeInfo || currentEpisodeMeta || selectedEpisodeMeta;
    if (resumeEpisodeMeta && isSeriesContent) {
      const pieces = [
        `Continuar desde ${buildSeasonEpisodeLabel(resumeEpisodeMeta.seasonNumber, resumeEpisodeMeta.episodeNumber)}`,
        formatSecondsLabel(resumeSeconds),
      ];
      if (resumeEpisodeMeta.chapterTitle) {
        pieces.push(resumeEpisodeMeta.chapterTitle);
      } else if (resumeEpisodeMeta.title) {
        pieces.push(resumeEpisodeMeta.title);
      }
      return pieces.join(' · ');
    }

    return `Continuar desde ${formatSecondsLabel(resumeSeconds)}`;
  }, [canContinue, continueEpisodeInfo, currentEpisodeMeta, isSeriesContent, resumeSeconds, selectedEpisodeMeta]);

  // Construye un título legible para MPV (canal/película/serie + episodio cuando aplique)
  const buildMpvDisplayTitle = () => {
    const baseTitle = (
      itemData?.name ||
      itemData?.title ||
      location.state?.title ||
      location.state?.name ||
      'TeamG Play'
    ).toString().trim();

    if (!baseTitle) return 'TeamG Play';

    const isSeriesContent = itemData?.tipo !== 'pelicula' && itemData?.tipo !== 'movie' && itemType !== 'channel';
    if (!isSeriesContent) return baseTitle;

    const seasonIndex = currentChapterInfo?.seasonIndex;
    const chapterIndex = currentChapterInfo?.chapterIndex;
    const season = itemData?.seasons?.[currentChapterInfo?.seasonIndex];
    const chapter = season?.chapters?.[currentChapterInfo?.chapterIndex];
    let chapterTitle = (chapter?.title || '').toString().trim();

    const seasonNumberFromData = Number(season?.seasonNumber);
    const chapterNumberFromData = Number(chapter?.episodeNumber);
    const seasonNumber = Number.isFinite(seasonNumberFromData) && seasonNumberFromData > 0
      ? seasonNumberFromData
      : (Number.isFinite(seasonIndex) ? seasonIndex + 1 : null);
    const chapterNumber = Number.isFinite(chapterNumberFromData) && chapterNumberFromData > 0
      ? chapterNumberFromData
      : (Number.isFinite(chapterIndex) ? chapterIndex + 1 : null);

    if (chapterTitle) {
      chapterTitle = chapterTitle
        .replace(/^T(?:emporada)?\s*\d+\s*E(?:pisodio)?\s*\d+\s*[-:]\s*/i, '')
        .replace(/^S(?:eason)?\s*\d+\s*E(?:pisode)?\s*\d+\s*[-:]\s*/i, '')
        .replace(/^\d+\s*x\s*\d+\s*[-:]\s*/i, '')
        .trim();
    }

    const episodeLabel = (seasonNumber && chapterNumber)
      ? `T${seasonNumber} E${chapterNumber}`
      : (chapterNumber ? `E${chapterNumber}` : (seasonNumber ? `T${seasonNumber}` : ''));

    if (episodeLabel && chapterTitle) return `${baseTitle} - ${episodeLabel} - ${chapterTitle}`;
    if (episodeLabel) return `${baseTitle} - ${episodeLabel}`;
    if (chapterTitle) return `${baseTitle} - ${chapterTitle}`;
    return baseTitle;
  };

  const { visualTheme } = useGeminiContent(
    isTVMode ? null : itemData?.name,
    isTVMode ? null : itemData?.releaseYear,
    isTVMode ? null : (Array.isArray(itemData?.genres) ? itemData.genres.join(', ') : itemData?.genres),
    isTVMode ? null : itemData?.description
  );

  // Hook para recomendaciones inteligentes del backend
  const {
    recommendations: smartRecommendations,
    loading: smartRecommendationsLoading,
    error: smartRecommendationsError,
    retry: retrySmartRecommendations,
  } = useRecommendations(itemType === 'channel' ? null : itemId, 'similar');

  // 1) Fetch de detalles del contenido
  useEffect(() => {
    const fetchItemDetails = async () => {
      if (!itemId || !itemType) {
        setError("Falta información para cargar el contenido.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let endpoint = "";
        if (itemType === "channel") {
          endpoint = `/api/channels/id/${itemId}`;
        } else if (["movie", "serie", "series", "pelicula", "anime", "dorama", "novela", "documental", "zona kids"].includes(itemType)) {
          endpoint = `/api/videos/${itemId}${useTrial ? '?useTrial=true' : ''}`;
        } else {
          setError(`Tipo de contenido "${itemType}" no reconocido.`);
          setLoading(false);
          return;
        }
        const response = await axiosInstance.get(endpoint);
        console.log(`[Watch.jsx] fetchItemDetails - response for endpoint ${endpoint}:`, response.status, response.data);
        const data = response.data;
        if (!data) {
          throw new Error("No se recibieron datos del backend.");
        }
        const normalizedGenres = Array.isArray(data.genres)
          ? data.genres
          : (typeof data.genres === 'string'
            ? data.genres.split(',').map((genre) => genre.trim()).filter(Boolean)
            : []);
        const normalizedData = {
          id: data._id || data.id,
          name: data.name || data.title || data.titulo || "Sin título",
          url: data.url,
          thumbnail: data.customThumbnail || data.thumbnail || data.poster || data.image || data.logo || '',
          poster: data.poster || data.customPoster || data.portada || data.customThumbnail || data.thumbnail || data.image || '',
          backdrop:
            data.bannerImage ||
            data.bannerUrl ||
            data.customBanner ||
            data.customBackdrop ||
            data.horizontalImage ||
            data.horizontalThumbnail ||
            data.heroBanner ||
            data.heroImage ||
            data.landscapeThumbnail ||
            data.backdropPath ||
            data.backdrop_path ||
            data.backdrop ||
            data.banner ||
            data.cover ||
            data.imagenHorizontal ||
            data.portadaHorizontal ||
            data.customThumbnail ||
            data.thumbnail ||
            data.poster ||
            data.image ||
            '',
          customThumbnail: data.customThumbnail || '',
          trailerUrl: data.trailerUrl || data.trailer_url || data.urlTrailer || data.trailer || '',
          description: data.description || data.descripcion || "",
          releaseYear: data.releaseYear || data.year || '',
          genres: normalizedGenres,
          genre: data.genre || data.section || '',
          rating: data.rating || data.tmdbRating || data.vote_average || '',
          tipo: data.tipo || itemType,
          section: data.section || null,
          seasons: data.seasons || [],
          chapters: (data.seasons || []).flatMap(season => season.chapters || []),
          watchProgress: data.watchProgress || null,
          webPlaybackBlocked: data.webPlaybackBlocked === true,
          webPlaybackMessage: data.webPlaybackMessage || ''
        };

        if (import.meta.env.DEV) {
          console.log("[Watch.jsx] Datos normalizados:", normalizedData);
        }
        setItemData(normalizedData);
      } catch (err) {
        if (err.response?.status === 401) {
          // Sesión expirada o no autorizado
          setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente para acceder a este contenido.');
          setTimeout(() => {
            navigate('/login', { state: { from: location.pathname } });
          }, 2000);
        } else if (err.response?.status === 403) {
          const errorData = err.response.data || {};
          setAccessModalData({
            title: errorData.title || location.state?.title || location.state?.name || 'Contenido Premium',
            error: errorData.error || 'Acceso denegado',
            message: errorData.message || 'Tu plan actual no permite acceder a este contenido.',
            currentPlan: errorData.currentPlan || 'gplay',
            requiredPlans: errorData.requiredPlans || ['premium'],
            upgradeMessage: errorData.upgradeMessage || 'Actualiza tu plan para acceder a todo el contenido premium.',
            trialMessage: errorData.trialMessage,
            trialMinutesRemaining: errorData.trialMinutesRemaining || 0,
            trialUsedToday: errorData.trialUsedToday || 0,
            itemId: itemId,
            itemType: itemType
          });
          setShowAccessModal(true);
        } else {
          setError(`No se pudo cargar el contenido. ${err.response?.data?.error || err.message || "Error desconocido."}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchItemDetails();
  }, [itemId, itemType, reloadKey, useTrial]);

  // Cargar catálogo de canales para permitir cambio directo (canal anterior/siguiente)
  useEffect(() => {
    if (itemType !== 'channel' || isBrowserPlaybackBlocked) {
      setChannelList([]);
      setCurrentChannelIndex(-1);
      setChannelListReady(true);
      return;
    }

    let cancelled = false;
    const loadChannels = async () => {
      try {
        setChannelListReady(false);
        const response = await fetchUserChannels('Todos');
        if (cancelled) return;
        const rawChannels = Array.isArray(response)
          ? response
          : (Array.isArray(response?.channels) ? response.channels : []);

        const normalizedChannels = rawChannels
          .map((channel) => normalizeWatchChannel(channel))
          .filter((channel) => channel.id);

        setChannelList(normalizedChannels);
        setChannelListReady(true);

        const hydratedChannels = await hydrateChannelsForPlayback(normalizedChannels, {
          preferredChannelId: itemId,
          onProgress: (partialChannels) => {
            if (!cancelled) {
              setChannelList(partialChannels);
            }
          },
        });
        if (cancelled) return;
        setChannelList(hydratedChannels);
      } catch (err) {
        if (!cancelled) {
          console.warn('[Watch.jsx] No se pudo cargar lista de canales para zapping:', err?.message || err);
          setChannelList([]);
          setChannelListReady(true);
        }
      }
    };

    loadChannels();

    return () => {
      cancelled = true;
    };
  }, [isBrowserPlaybackBlocked, itemType]);

  useEffect(() => {
    if (itemType !== 'channel') {
      setCurrentChannelIndex(-1);
      return;
    }
    const index = channelList.findIndex((channel) => String(channel.id) === String(itemId));
    setCurrentChannelIndex(index);
  }, [itemType, channelList, itemId]);

  useEffect(() => {
    setChannelPlaybackDismissed(false);
  }, [itemType, itemId, reloadKey]);

  useEffect(() => {
    if (!isChannelPickerOpen) {
      return;
    }

    const currentFilteredIndex = filteredChannelList.findIndex((channel) => (
      String(channel.id) === String(itemId)
    ));

    setFocusedChannelPickerIndex(currentFilteredIndex >= 0 ? currentFilteredIndex : 0);
  }, [filteredChannelList, isChannelPickerOpen, itemId]);

  useEffect(() => {
    if (!isChannelPickerOpen) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      focusChannelPickerInput();
    }, 60);

    return () => window.clearTimeout(timer);
  }, [focusChannelPickerInput, isChannelPickerOpen]);

  useEffect(() => {
    if (!isChannelPickerOpen || filteredChannelList.length === 0) {
      return;
    }

    if (
      document.activeElement === channelPickerInputRef.current ||
      document.activeElement === channelPickerCloseButtonRef.current
    ) {
      return;
    }

    focusChannelPickerItem(focusedChannelPickerIndex, { syncState: false });
  }, [focusChannelPickerItem, focusedChannelPickerIndex, filteredChannelList.length, isChannelPickerOpen]);

  const handleChannelControlsKeyDown = (event) => {
    if (itemType !== 'channel' || isChannelPickerOpen) {
      return;
    }

    const action = resolveRemoteAction(event);
    if (!action) {
      return;
    }

    switch (action) {
      case 'ArrowLeft':
        event.preventDefault();
        event.stopPropagation();
        focusChannelControl(focusedChannelControlIndex - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        event.stopPropagation();
        focusChannelControl(focusedChannelControlIndex + 1);
        break;
      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (focusedChannelControlIndex === 0 && channelList.length > 0) {
          openChannelPicker();
        } else if (focusedChannelControlIndex === 1 && !isReloadingChannel) {
          handleReloadChannel();
        }
        break;
      default:
        break;
    }
  };

  const handleAddCurrentItemToMyList = useCallback(async () => {
    if (itemType === 'channel' || !itemData || isAddingToMyList) {
      return;
    }

    setIsAddingToMyList(true);

    try {
      const result = await addItemToMyList(itemData);
      setMyListFeedback({
        type: result.status === 'duplicate' ? 'info' : 'success',
        message: result.status === 'duplicate'
          ? `"${itemData.name || itemData.title || 'Contenido'}" ya estaba en Mi Lista.`
          : `"${itemData.name || itemData.title || 'Contenido'}" agregado a Mi Lista.`,
      });
    } catch (err) {
      setMyListFeedback({
        type: 'error',
        message: err?.message || 'No se pudo agregar a Mi Lista.',
      });
    } finally {
      setIsAddingToMyList(false);
    }
  }, [isAddingToMyList, itemData, itemType]);

  const handleStartVodPlayback = useCallback(() => {
    if (itemType === 'channel') return;
    setIsContinueWatching(false);
    setContinueWatchingState(null);
    setStartTime(0);
    if (isSeriesContent) {
      const targetSeasonIndex = Math.max(0, Math.min((itemData?.seasons?.length || 1) - 1, selectedSeasonIndex || 0));
      const targetSeason = itemData?.seasons?.[targetSeasonIndex];
      const targetEpisodeIndex = Math.max(0, Math.min((targetSeason?.chapters?.length || 1) - 1, focusedEpisodeIndex || 0));
      setCurrentChapterInfo({ seasonIndex: targetSeasonIndex, chapterIndex: targetEpisodeIndex });
    } else {
      setCurrentChapterInfo(null);
    }
    setVodPlaybackRequested(true);
  }, [focusedEpisodeIndex, isSeriesContent, itemData?.seasons, itemType, selectedSeasonIndex]);

  const handleContinueVodPlayback = useCallback(() => {
    if (itemType === 'channel' || !itemData) return;
    const watchProgress = effectiveWatchProgress || itemData.watchProgress || {};
    const resumeSeconds = Math.max(
      0,
      Math.floor(Number(watchProgress.lastTime ?? watchProgress.progress ?? startTime ?? startTimeFromState ?? 0))
    );

    if (!Number.isFinite(resumeSeconds) || resumeSeconds <= 0) {
      handleStartVodPlayback();
      return;
    }

    const resumeState = {
      continueWatching: true,
      startTime: resumeSeconds,
    };

    if (Number.isFinite(Number(watchProgress.lastSeason))) {
      resumeState.seasonIndex = Number(watchProgress.lastSeason);
    }
    if (Number.isFinite(Number(watchProgress.lastChapter))) {
      resumeState.chapterIndex = Number(watchProgress.lastChapter);
    }

    setContinueWatchingState(resumeState);
    setIsContinueWatching(true);
    setStartTime(resumeSeconds);
    if (Number.isFinite(Number(resumeState.seasonIndex)) && Number.isFinite(Number(resumeState.chapterIndex))) {
      setCurrentChapterInfo({
        seasonIndex: Number(resumeState.seasonIndex),
        chapterIndex: Number(resumeState.chapterIndex),
      });
    } else {
      setCurrentChapterInfo(null);
    }
    setVodPlaybackRequested(true);
  }, [effectiveWatchProgress, handleStartVodPlayback, itemData, itemType, startTime, startTimeFromState]);

  const handleOpenTrailer = useCallback(() => {
    if (!itemData || itemType === 'channel') return;
    const trailerUrl = getTVItemTrailerUrl(itemData);
    if (trailerUrl) {
      setActiveTrailerUrl(trailerUrl);
    }
  }, [itemData, itemType]);

  const vodActionItems = useMemo(() => {
    if (itemType === 'channel') {
      return [];
    }

    const actions = [];

    if (canContinue) {
      actions.push({
        key: 'continue',
        label: continueButtonLabel,
        onSelect: handleContinueVodPlayback,
        className: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-300',
      });
    }

    actions.push({
      key: 'play',
      label: 'Reproducir',
      onSelect: handleStartVodPlayback,
      className: 'bg-cyan-600 text-white hover:bg-cyan-500 focus:ring-cyan-300',
    });

    if (tvTrailerUrl) {
      actions.push({
        key: 'trailer',
        label: 'Trailer',
        onSelect: handleOpenTrailer,
        className: 'bg-amber-600 text-white hover:bg-amber-500 focus:ring-amber-300',
      });
    }

    actions.push({
      key: 'my-list',
      label: isAddingToMyList ? 'Guardando...' : 'Agregar a Mi Lista',
      onSelect: handleAddCurrentItemToMyList,
      disabled: isAddingToMyList,
      className: isAddingToMyList
        ? 'cursor-wait bg-rose-500/60 text-white focus:ring-rose-300'
        : 'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-300',
    });

    return actions;
  }, [
    canContinue,
    handleAddCurrentItemToMyList,
    handleContinueVodPlayback,
    handleOpenTrailer,
    handleStartVodPlayback,
    isAddingToMyList,
    itemType,
    tvTrailerUrl,
    continueButtonLabel,
  ]);

  const continueActionItem = useMemo(
    () => vodActionItems.find((action) => action.key === 'continue') || null,
    [vodActionItems],
  );

  const secondaryVodActionItems = useMemo(
    () => vodActionItems.filter((action) => action.key !== 'continue'),
    [vodActionItems],
  );

  const tvRecommendationItems = useMemo(() => {
    if (!Array.isArray(smartRecommendations)) {
      return [];
    }

    return smartRecommendations
      .filter(Boolean)
      .filter((recommendation) => String(getTVItemId(recommendation) || '') !== String(itemId))
      .slice(0, 8);
  }, [itemId, smartRecommendations]);

  const hasTvRecommendations = tvRecommendationItems.length > 0;

  const handleSelectRecommendedItem = useCallback((recommendation) => {
    const recommendationId = getTVItemId(recommendation);
    if (!recommendationId) {
      return;
    }

    const recommendationType = resolveTVItemType(
      recommendation,
      recommendation?.itemType || recommendation?.tipo || 'movie',
    );

    navigate(`/watch/${recommendationType}/${recommendationId}`, {
      state: {
        ...(location.state?.from ? { from: location.state.from } : { from: location.pathname }),
        ...(location.state?.returnState ? { returnState: location.state.returnState } : {}),
        ...(location.state?.fromSection ? { fromSection: location.state.fromSection } : {}),
        ...(location.state?.selectedCategory ? { selectedCategory: location.state.selectedCategory } : {}),
        ...(location.state?.searchTerm ? { searchTerm: location.state.searchTerm } : {}),
      },
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!isTVMode || itemType === 'channel') {
      return undefined;
    }

    if (!myListFeedback.message) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMyListFeedback({ type: '', message: '' });
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [isTVMode, itemType, myListFeedback.message]);

  useEffect(() => {
    setFocusedVodActionIndex(0);
    setFocusedVodDetailSection('actions');
    setSelectedSeasonIndex(0);
    setFocusedSeasonIndex(0);
    setFocusedEpisodeIndex(0);
    setFocusedRecommendationIndex(0);
    vodActionRefs.current = [];
    seasonOptionRefs.current = [];
    episodeOptionRefs.current = [];
    recommendationRefs.current = [];
    setMyListFeedback({ type: '', message: '' });
    setIsAddingToMyList(false);
  }, [itemId, itemType]);

  useEffect(() => {
    if (!isSeriesContent) {
      return;
    }

    const preferredSeasonIndex = Number.isInteger(currentChapterInfo?.seasonIndex)
      ? currentChapterInfo.seasonIndex
      : (Number.isInteger(continueEpisodeInfo?.seasonIndex) ? continueEpisodeInfo.seasonIndex : 0);
    const safeSeasonIndex = Math.max(0, Math.min((itemData?.seasons?.length || 1) - 1, preferredSeasonIndex));

    setSelectedSeasonIndex(safeSeasonIndex);
    setFocusedSeasonIndex(safeSeasonIndex);
  }, [continueEpisodeInfo?.seasonIndex, currentChapterInfo?.seasonIndex, isSeriesContent, itemData?.seasons?.length]);

  useEffect(() => {
    if (!isSeriesContent) {
      return;
    }

    const preferredEpisodeIndex = currentChapterInfo?.seasonIndex === selectedSeasonIndex
      ? currentChapterInfo?.chapterIndex
      : (continueEpisodeInfo?.seasonIndex === selectedSeasonIndex ? continueEpisodeInfo?.chapterIndex : 0);
    const safeEpisodeIndex = Math.max(0, Math.min(selectedSeasonEpisodes.length - 1, Number(preferredEpisodeIndex) || 0));
    setFocusedEpisodeIndex(safeEpisodeIndex);
  }, [
    continueEpisodeInfo?.chapterIndex,
    continueEpisodeInfo?.seasonIndex,
    currentChapterInfo?.chapterIndex,
    currentChapterInfo?.seasonIndex,
    isSeriesContent,
    selectedSeasonEpisodes.length,
    selectedSeasonIndex,
  ]);

  useEffect(() => {
    if (!isTVVodDetailScreen) {
      hasInitializedTvVodFocusRef.current = false;
      return;
    }

    hasInitializedTvVodFocusRef.current = false;
  }, [isTVVodDetailScreen, itemId, itemType, vodPlaybackRequested]);

  useEffect(() => {
    if (!isTVVodDetailScreen || showAccessModal || activeTrailerUrl || vodActionItems.length === 0) {
      return undefined;
    }
    if (hasInitializedTvVodFocusRef.current) {
      return undefined;
    }

    hasInitializedTvVodFocusRef.current = true;

    const timer = window.setTimeout(() => {
      focusTVContent();
      if (focusedVodDetailSection === 'hero') {
        focusVodHero();
        return;
      }
      if (focusedVodDetailSection === 'episodes' && selectedSeasonEpisodes.length > 0) {
        focusTvEpisode(Math.min(focusedEpisodeIndex, selectedSeasonEpisodes.length - 1));
        return;
      }
      if (focusedVodDetailSection === 'seasons' && isSeriesContent) {
        focusTvSeason(Math.min(focusedSeasonIndex, Math.max(0, (itemData?.seasons?.length || 1) - 1)));
        return;
      }
      if (focusedVodDetailSection === 'recommendations' && hasTvRecommendations) {
        focusTvRecommendation(Math.min(focusedRecommendationIndex, tvRecommendationItems.length - 1));
        return;
      }
      focusVodAction(Math.min(focusedVodActionIndex, vodActionItems.length - 1));
    }, 90);

    return () => window.clearTimeout(timer);
  }, [
    activeTrailerUrl,
    focusTvEpisode,
    focusTvSeason,
    focusVodHero,
    focusVodAction,
    focusTvRecommendation,
    hasTvRecommendations,
    isSeriesContent,
    isTVVodDetailScreen,
    itemId,
    itemData?.seasons?.length,
    selectedSeasonEpisodes.length,
    showAccessModal,
    tvRecommendationItems.length,
    vodActionItems.length,
  ]);

  useEffect(() => {
    if (!isTVVodDetailScreen || showAccessModal) {
      return undefined;
    }

    const handleVodActionKeyCapture = (event) => {
      if (isChannelPickerOpen || activeTrailerUrl || getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
        return;
      }

      const action = resolveRemoteAction(event);
      if (!action) {
        return;
      }

      if (vodActionItems.length === 0) {
        return;
      }

      if (focusedVodDetailSection === 'hero') {
        if (action === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          focusVodAction(focusedVodActionIndex);
          return;
        }

        if (action === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          focusVodHero();
          return;
        }

        return;
      }

      if (focusedVodDetailSection === 'episodes' && selectedSeasonEpisodes.length > 0) {
        if (action === 'ArrowLeft') {
          event.preventDefault();
          event.stopPropagation();
          focusTvEpisode(focusedEpisodeIndex - 1);
          return;
        }

        if (action === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          focusTvEpisode(focusedEpisodeIndex + 1);
          return;
        }

        if (action === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          focusTvSeason(focusedSeasonIndex);
          return;
        }

        if (action === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          if (hasTvRecommendations) {
            focusTvRecommendation(focusedRecommendationIndex);
            return;
          }
          focusTvEpisode(focusedEpisodeIndex);
          return;
        }

        if (action === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          handleChapterSelect(selectedSeasonIndex, focusedEpisodeIndex);
          return;
        }

        return;
      }

      if (focusedVodDetailSection === 'seasons' && isSeriesContent) {
        if (action === 'ArrowLeft') {
          event.preventDefault();
          event.stopPropagation();
          focusTvSeason(focusedSeasonIndex - 1);
          return;
        }

        if (action === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          focusTvSeason(focusedSeasonIndex + 1);
          return;
        }

        if (action === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          focusVodHero();
          return;
        }

        if (action === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          if (selectedSeasonEpisodes.length > 0) {
            focusTvEpisode(focusedEpisodeIndex);
            return;
          }
          if (hasTvRecommendations) {
            focusTvRecommendation(focusedRecommendationIndex);
            return;
          }
          focusTvSeason(focusedSeasonIndex);
          return;
        }

        if (action === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          if (selectedSeasonEpisodes.length > 0) {
            focusTvEpisode(focusedEpisodeIndex);
          }
          return;
        }

        return;
      }

      if (focusedVodDetailSection === 'recommendations' && hasTvRecommendations) {
        if (action === 'ArrowLeft') {
          event.preventDefault();
          event.stopPropagation();
          focusTvRecommendation(focusedRecommendationIndex - 1);
          return;
        }

        if (action === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          focusTvRecommendation(focusedRecommendationIndex + 1);
          return;
        }

        if (action === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          if (isSeriesContent && selectedSeasonEpisodes.length > 0) {
            focusTvEpisode(focusedEpisodeIndex);
            return;
          }
          if (isSeriesContent) {
            focusTvSeason(focusedSeasonIndex);
            return;
          }
          focusVodAction(focusedVodActionIndex);
          return;
        }

        if (action === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          focusTvRecommendation(focusedRecommendationIndex);
          return;
        }

        if (action === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          handleSelectRecommendedItem(tvRecommendationItems[focusedRecommendationIndex]);
          return;
        }

        return;
      }

      if (action === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        focusVodAction(focusedVodActionIndex - 1);
        return;
      }

      if (action === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        focusVodAction(focusedVodActionIndex + 1);
        return;
      }

      if (action === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        focusVodHero();
        return;
      }

      if (action === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        if (isSeriesContent) {
          focusTvSeason(focusedSeasonIndex);
          return;
        }
        if (hasTvRecommendations) {
          focusTvRecommendation(focusedRecommendationIndex);
          return;
        }
        focusVodAction(focusedVodActionIndex);
        return;
      }

      if (action === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        vodActionItems[focusedVodActionIndex]?.onSelect?.();
        return;
      }
    };

    window.addEventListener('keydown', handleVodActionKeyCapture, true);
    return () => window.removeEventListener('keydown', handleVodActionKeyCapture, true);
  }, [
    activeTrailerUrl,
    focusedEpisodeIndex,
    focusedRecommendationIndex,
    focusedSeasonIndex,
    focusedVodDetailSection,
    focusTvEpisode,
    focusTvSeason,
    focusVodHero,
    focusVodAction,
    focusTvRecommendation,
    focusedVodActionIndex,
    handleSelectRecommendedItem,
    hasTvRecommendations,
    isChannelPickerOpen,
    isSeriesContent,
    isTVVodDetailScreen,
    selectedSeasonEpisodes.length,
    selectedSeasonIndex,
    showAccessModal,
    tvRecommendationItems,
    vodActionItems,
  ]);

  // Cargar progreso guardado
  // 🔥 OPTIMIZADO: Usar caché local primero, background fetch después
  useEffect(() => {
    if (startTimeFromState > 0 || !itemId || itemType === 'channel') return;
    
    const loadSavedProgress = async () => {
      const applyRecoveredProgress = (rawProgress, sourceLabel) => {
        const progress = Math.max(0, Math.floor(Number(rawProgress) || 0));
        if (!Number.isFinite(progress) || progress <= 0) return false;

        // Evita que un progreso tardio reinicie MPV mientras ya esta reproduciendo.
        if (playbackStartTsRef.current || currentTimeRef.current > 0) {
          console.log('[Watch.jsx] Ignorando progreso recuperado porque MPV ya inicio:', {
            source: sourceLabel,
            progress,
            currentTime: currentTimeRef.current
          });
          return false;
        }

        setStartTime(prev => (prev > 0 ? prev : progress));
        return true;
      };

      try {
        // Intentar caché primero
        const cacheKey = `videoProgress_${itemId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          const cachedProgress = data.progress ?? data.lastTime ?? 0;
          if (applyRecoveredProgress(cachedProgress, 'cache')) {
            console.log(`[Watch.jsx] ⚡ Progreso cargado desde caché: ${cachedProgress}s`);
            return; // No esperar al servidor
          }
        }

        // Fetch del servidor en background
        const progressData = await getUserProgress();
        const videoProgress = progressData.find(p => p.video?._id === itemId);
        const progressSeconds = videoProgress?.progress ?? videoProgress?.lastTime ?? 0;
        if (applyRecoveredProgress(progressSeconds, 'server')) {
          console.log(`[Watch.jsx] Progreso cargado del servidor para ${itemId}: ${progressSeconds}`);
          // Actualizar caché
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              progress: progressSeconds,
              lastTime: videoProgress?.lastTime ?? progressSeconds,
              lastSeason: videoProgress?.lastSeason,
              lastChapter: videoProgress?.lastChapter,
            }));
          } catch (e) {
            console.error('[Watch.jsx] Error actualizando caché:', e);
          }
        }
      } catch (err) {
        console.error('[Watch.jsx] Error cargando progreso:', err);
      }
    };
    
    loadSavedProgress();
  }, [itemId, itemType, startTimeFromState]);

  // Guardar progreso inicial cuando se carga el video (para que aparezca en "Continuar Viendo")
  // 🔥 OPTIMIZADO: Guardar INMEDIATAMENTE sin esperar getUserProgress()
  useEffect(() => {
    if (!itemData || !itemId || itemType === 'channel' || initialProgressSavedRef.current) return;
    const existingProgress = effectiveWatchProgress?.progress ?? effectiveWatchProgress?.lastTime ?? 0;
    const isSeries = itemData.tipo !== 'pelicula' && itemData.tipo !== 'movie';

    if (isContinueWatching || (Number.isFinite(existingProgress) && existingProgress > 0)) return;
    if (isSeries && !currentChapterInfo) return;

    const saveInitialProgress = async () => {
      try {
        console.log(`[Watch.jsx] 🚀 Guardando progreso inicial INMEDIATAMENTE para ${itemId}`);
        console.log(`[Watch.jsx] 📊 Item data:`, itemData?.nombre || itemData?.title);
        
        const progressPayload = {
          lastTime: 1,
          progress: 1,
          lastSeason: currentChapterInfo?.seasonIndex ?? 0,
          lastChapter: currentChapterInfo?.chapterIndex ?? 0,
          completed: false,
          totalDuration: 0,
        };
        
        console.log(`[Watch.jsx] 📋 Payload a enviar:`, progressPayload);
        
        const response = await axiosInstance.put(`/api/videos/${itemId}/progress`, progressPayload);
        
        initialProgressSavedRef.current = true;
        try {
          localStorage.setItem(`videoProgress_${itemId}`, JSON.stringify(progressPayload));
        } catch (e) {
          console.warn('[Watch.jsx] No se pudo guardar cache local de progreso inicial:', e);
        }
        console.log(`[Watch.jsx] ✅ Progreso inicial guardado INMEDIATAMENTE. Respuesta:`, response.data);
      } catch (err) {
        console.error('[Watch.jsx] ❌ Error guardando progreso inicial:', err?.response?.data || err.message);
        // Reintentar una sola vez después de 1 segundo
        setTimeout(() => {
          if (!initialProgressSavedRef.current) {
            console.log('[Watch.jsx] 🔄 Reintentando guardar progreso inicial...');
            saveInitialProgress();
          }
        }, 1000);
      }
    };

    saveInitialProgress();
  }, [currentChapterInfo, effectiveWatchProgress?.lastTime, effectiveWatchProgress?.progress, itemData, itemId, itemType, isContinueWatching]);

  // Determinar capítulo actual
  useEffect(() => {
    if (!itemData) return;
    
    if (itemData.tipo === 'pelicula' || itemData.tipo === 'movie' || itemType === 'channel') {
      console.log('[Watch] Contenido tipo película/canal, no se requiere currentChapterInfo');
      return;
    }

    // Si ya hay un capítulo seleccionado manualmente, no sobrescribirlo con estado viejo.
    if (currentChapterInfo && !isContinueWatching) {
      return;
    }

    let seasonIdx = 0;
    let chapterIdx = 0;
    let foundChapter = false;

    console.log('[Watch] 🔍 Iniciando búsqueda de capítulo con:', {
      hasSeasons: !!itemData.seasons,
      seasonsLength: itemData.seasons?.length,
      locationState: location.state,
      isContinueWatching,
      watchProgress: itemData.watchProgress
    });

    // 🔥 NUEVO: Prioridad 1 - Chequear si vino desde SeriesChapters (seasonIndex/chapterIndex directo)
    const stateForChapters = (location.state?.seasonIndex !== undefined && location.state?.chapterIndex !== undefined)
      ? location.state
      : continueWatchingState;

    let seasonIndexFromState = stateForChapters?.seasonIndex;
    let chapterIndexFromState = stateForChapters?.chapterIndex;
    
    if (seasonIndexFromState !== undefined && chapterIndexFromState !== undefined) {
      seasonIdx = seasonIndexFromState;
      chapterIdx = chapterIndexFromState;
      if (itemData.seasons?.[seasonIdx]?.chapters?.[chapterIdx]) {
        console.log('[Watch] ✅ Capítulo seleccionado desde SeriesChapters:', { seasonIdx, chapterIdx });
        foundChapter = true;
      }
    }

    // Prioridad 2 - Continuar viendo desde state
    if (!foundChapter && stateForChapters?.continueWatching && seasonIndexFromState !== undefined && chapterIndexFromState !== undefined) {
      seasonIdx = seasonIndexFromState;
      chapterIdx = chapterIndexFromState;
      if (itemData.seasons?.[seasonIdx]?.chapters?.[chapterIdx]) {
        console.log('[Watch] ✅ Cargando desde estado de navegación (continuar viendo):', { seasonIdx, chapterIdx });
        foundChapter = true;
        if (stateForChapters?.startTime !== undefined) {
          setStartTime(stateForChapters.startTime);
        }
      }
    }

    // Prioridad 3 - Desde watchProgress
    if (!foundChapter && isContinueWatching && effectiveWatchProgress) {
      console.log('[Watch] Intentando cargar desde watchProgress:', effectiveWatchProgress);
      const wp = effectiveWatchProgress;
      
      if (typeof wp.lastSeason === 'number' && typeof wp.lastChapter === 'number' && wp.lastSeason >= 0 && wp.lastChapter >= 0) {
        const targetSeason = itemData.seasons[wp.lastSeason];
        if (targetSeason?.chapters?.[wp.lastChapter]) {
          seasonIdx = wp.lastSeason;
          chapterIdx = wp.lastChapter;
          const resumeTime = wp.lastTime ?? wp.progress ?? 0;
          setStartTime(resumeTime);
          console.log('[Watch] ✅ Cargando último episodio visto:', { seasonIdx, chapterIdx, startTime: wp.progress });
          foundChapter = true;
        }
      }
    }

    // Prioridad 4 - Fallback al primer capítulo
    if (!foundChapter) {
      if (itemData.seasons?.[0]?.chapters?.[0]) {
        seasonIdx = 0;
        chapterIdx = 0;
        console.log('[Watch] ✅ Usando fallback: primer capítulo de primera temporada');
        foundChapter = true;
      }
    }
    
    if (foundChapter) {
      console.log('[Watch] 🎬 Estableciendo currentChapterInfo:', { seasonIndex: seasonIdx, chapterIndex: chapterIdx });
      setCurrentChapterInfo({ seasonIndex: seasonIdx, chapterIndex: chapterIdx });
    } else {
      console.error('[Watch] ❌ No se encontró ningún capítulo válido para reproducir');
      setError('No se encontró ningún capítulo válido para reproducir');
    }
  }, [continueWatchingState, effectiveWatchProgress, isContinueWatching, itemData, itemId, itemType, location.state?.chapterIndex, location.state?.continueWatching, location.state?.seasonIndex]);

  // 2) Calcular URL reproducible
  useEffect(() => {
    console.log('[Watch.jsx] INICIANDO CÁLCULO DE URL. Data:', { itemData, currentChapterInfo, loading });

    if (!itemData) {
      console.log('[Watch.jsx] CÁLCULO DETENIDO: No hay itemData.');
      return;
    }
    if (loading) {
      console.log('[Watch.jsx] CÁLCULO DETENIDO: loading es true.');
      return;
    }

    if (isBrowserPlaybackBlocked || itemData.webPlaybackBlocked) {
      console.log('[Watch.jsx] CALCULO DETENIDO: reproduccion web bloqueada.');
      setVideoUrl("");
      setError(null);
      return;
    }

    const shouldAutoPlay = itemType === 'channel' || !isTVMode || vodPlaybackRequested;
    if (!shouldAutoPlay) {
      console.log('[Watch.jsx] CÁLCULO DETENIDO: Esperando acción del usuario en TV (VOD).');
      return;
    }

    let urlToPlay = null;
    const hasChapters = (itemData.chapters && itemData.chapters.length > 0) || (itemData.seasons && itemData.seasons.length > 0);

    if (hasChapters) {
      console.log('[Watch.jsx] Es una serie. Verificando currentChapterInfo.');
      if (currentChapterInfo) {
        const season = itemData.seasons?.[currentChapterInfo.seasonIndex];
        const chapter = season?.chapters?.[currentChapterInfo.chapterIndex];
        console.log('[Watch.jsx] Info de capítulo:', { season, chapter });
        if (chapter?.url) {
          urlToPlay = chapter.url;
          console.log(`[Watch.jsx] URL de capítulo encontrada: ${maskUrl(urlToPlay)}`);
        } else {
          console.error('[Watch.jsx] ERROR: El capítulo no tiene URL.');
          setError('El capítulo seleccionado no tiene una URL válida.');
          return;
        }
      } else {
        console.log('[Watch.jsx] ESPERANDO currentChapterInfo para la serie.');
        // We do nothing and wait for the chapter effect to run
        return;
      }
    } else {
      console.log('[Watch.jsx] No es una serie. Verificando itemData.url.');
      if (itemData.url) {
        urlToPlay = itemData.url;
        console.log(`[Watch.jsx] URL de película/contenido encontrada: ${maskUrl(urlToPlay)}`);
      } else {
        console.error('[Watch.jsx] ERROR: El contenido no tiene URL.');
        setError(`No se encontró una fuente de video para "${itemData.name}".`);
        return;
      }
    }

    if (urlToPlay) {
      console.log(`[Watch.jsx] Procesando URL con getPlayableUrl: ${maskUrl(urlToPlay)}`);
      const finalUrl = getPlayableUrl({ ...itemData, url: urlToPlay }, null);
      console.log(`[Watch.jsx] URL final obtenida: ${maskUrl(finalUrl)}`);
      
      if (finalUrl) {
        setVideoUrl(finalUrl);
      } else {
        console.error('[Watch.jsx] ERROR: getPlayableUrl devolvió una URL vacía.');
        setError('No se pudo procesar la URL del video para la reproducción.');
      }
    } else {
        // This case should not be reached due to the returns above, but as a safeguard:
        console.error('[Watch.jsx] ERROR INESPERADO: No se pudo determinar ninguna URL para reproducir.');
        setError('Error inesperado al intentar obtener el video.');
    }

  }, [currentChapterInfo, isBrowserPlaybackBlocked, itemData, itemType, loading, shouldAutoplay]);

  useEffect(() => {
    if (itemType === 'channel') {
      setChannelPlaybackIssue(null);
      setChannelSearch('');
      setIsChannelPickerOpen(false);
    }
  }, [itemType, itemId, videoUrl]);

  // 3) Medir bounds
  useEffect(() => {
    if (videoUrl && videoAreaRef.current) {
      const rect = videoAreaRef.current.getBoundingClientRect();
      setBounds({
        x: Math.floor(rect.left),
        y: Math.floor(rect.top),
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    }
  }, [videoUrl]);

  // 4) Iniciar MPV (solo Electron)
  useEffect(() => {
    const isElectronEnv = typeof window !== "undefined" && window.electronMPV;

    // --- INICIO DE DEPURACIÓN ---
    console.log('--- DEBUG: ESTADO ANTES DE REPRODUCIR ---');
    console.log({
      isElectronEnv,
      videoUrl,
      bounds,
      startTime,
      itemData,
      currentChapterInfo
    });
    // --- FIN DE DEPURACIÓN ---

    if (!videoUrl || !bounds || !isElectronEnv) {
      if (isElectronEnv) {
        console.log('--- DEBUG: Omitiendo MPV. Razón:', { hasVideoUrl: !!videoUrl, hasBounds: !!bounds });
      }
      return;
    }

    const initializeMPV = async (retryCount = 0) => {
      suppressMpvClosedRef.current = true;
      try {
        console.log('[Watch.jsx] Deteniendo MPV anterior antes de iniciar nuevo...');
        await window.electronMPV.stop();
        await new Promise(resolve => setTimeout(resolve, itemType === 'channel' ? 220 : 700));
        
        console.log(`--- DEBUG: Intentando reproducir con MPV... URL: ${maskUrl(videoUrl)}`);
        const mpvTitle = buildMpvDisplayTitle();
        const result = await window.electronMPV.play(videoUrl, bounds, {
          startTime,
          title: mpvTitle,
          videoId: itemData?.id || itemId
        });
        console.log('--- DEBUG: Resultado de window.electronMPV.play ---', result);

        if (!result.success) {
          throw new Error(result.error || 'Error desconocido al iniciar MPV');
        }

        setError(null);
        setChannelPlaybackIssue(null);
        playbackStartTsRef.current = Date.now();
      } catch (err) {
        console.error('[Watch.jsx] Error al iniciar MPV:', err);
        
        if (err.message.includes('código: 1') && retryCount < 2) {
          console.log(`[Watch.jsx] Reintentando reproducción (intento ${retryCount + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return initializeMPV(retryCount + 1);
        }
        
        setError(`Error al iniciar el reproductor: ${err.message}`);
        if (itemType === 'channel') {
          setChannelPlaybackIssue('La señal del canal no se pudo iniciar. Usa "Recargar canal".');
        }
      } finally {
        setTimeout(() => {
          suppressMpvClosedRef.current = false;
        }, 1200);
      }
    };

    initializeMPV();

    const handleMpvError = (event, message) => {
      console.error('[Watch.jsx] MPV Error:', message);
      setError(`Error del reproductor: ${message}`);
      if (itemType === 'channel') {
        setChannelPlaybackIssue('La señal del canal tuvo un error. Usa "Recargar canal".');
      }
    };

    const handleTimePos = (event, time) => {
      const t = Number(time);
      if (Number.isFinite(t) && t > 0) {
        currentTimeRef.current = t;
      }
    };

    const handleMpvClosed = (event, data = {}) => {
      if (suppressMpvClosedRef.current) {
        return;
      }
      if (itemType !== 'channel') {
        return;
      }
      if (isUnmountingRef.current || isNavigatingAwayRef.current) {
        return;
      }

      const closeCode = data?.code;
      const detail = Number.isFinite(closeCode)
        ? ` (código ${closeCode})`
        : '';
      setChannelPlaybackIssue(`La señal del canal se detuvo${detail}. Usa "Recargar canal".`);
    };
    
    if (window.electronAPI) {
      window.electronAPI.on('mpv-error', handleMpvError);
      window.electronAPI.on('mpv-time-pos', handleTimePos);
      window.electronAPI.on('mpv-closed', handleMpvClosed);
    }

    return () => {
      if (window.electronMPV) {
        suppressMpvClosedRef.current = true;
        window.electronMPV.stop().catch(err => {
          console.error('[Watch.jsx] Error al detener MPV en cleanup:', err);
        });
        setTimeout(() => {
          suppressMpvClosedRef.current = false;
        }, 1200);
      }
      playbackStartTsRef.current = null;
      if (window.electronAPI) {
        window.electronAPI.removeListener('mpv-error', handleMpvError);
        window.electronAPI.removeListener('mpv-time-pos', handleTimePos);
        window.electronAPI.removeListener('mpv-closed', handleMpvClosed);
      }
    };
  }, [videoUrl, bounds, startTime, itemType, itemId, itemData?.id]);

  // 5) Sincronización de bounds
  useEffect(() => {
    const isElectronEnv = typeof window !== "undefined" && window.electronMPV;
    if (!bounds || !isElectronEnv) return;

    const removeListener = window.electronMPV.onRequestVideoBoundsSync(() => {
      if (videoAreaRef.current) {
        const r = videoAreaRef.current.getBoundingClientRect();
        window.electronMPV.updateBounds({
          x: Math.floor(r.left),
          y: Math.floor(r.top),
          width: Math.floor(r.width),
          height: Math.floor(r.height),
        });
      }
    });

    return () => {
      removeListener();
    };
  }, [bounds]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      console.log('[Watch.jsx] Watch.jsx se está desmontando - limpieza AGRESIVA...');
      isUnmountingRef.current = true;
      
      if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
        try {
          backgroundPlaybackService.stopPlayback();
        } catch (err) {
          console.warn('[Watch.jsx] Cleanup: Error deteniendo backgroundPlayback:', err);
        }
      }

      if (window.VideoPlayerPlugin) {
        try {
          if (typeof window.VideoPlayerPlugin.stopVideo === 'function') {
            window.VideoPlayerPlugin.stopVideo();
          }
        } catch (err) {
          console.warn('[Watch.jsx] Cleanup: Error intento 1:', err);
        }
      }

      try {
        if (videoAreaRef.current) {
          const videoElements = videoAreaRef.current.querySelectorAll('video');
          videoElements.forEach(video => {
            try {
              video.pause();
              video.removeAttribute('src');
              video.load();
            } catch {
              // Ignorar errores de limpieza de elementos HTML5 ya desmontados.
            }
          });
        }
      } catch (err) {
        console.warn('[Watch.jsx] Cleanup: Error limpiando videos HTML5:', err);
      }
    };
  }, []);

  const stopPlaybackSafely = useCallback(() => {
    try {
      if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
        backgroundPlaybackService.stopPlayback().catch(err => {
          console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo backgroundPlayback:', err);
        });
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error en backgroundPlayback:', err);
    }

    try {
      if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.stopVideo === 'function') {
        window.VideoPlayerPlugin.stopVideo().catch(err => {
          console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo VLC plugin:', err);
        });
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error en VideoPlayerPlugin:', err);
    }
  }, []);

  const resolveBackDestination = useCallback(() => {
    const fromLocation = location.state?.from;
    const fromSection = location.state?.fromSection;
    const returnState = location.state?.returnState;

    console.log('[Watch.jsx] fromSection:', fromSection, 'fromLocation:', fromLocation, 'returnState:', returnState);

    if (fromLocation) {
      return {
        to: fromLocation,
        options: returnState ? { state: returnState } : undefined,
      };
    }

    if (fromSection === 'tv') {
      const selectedCategory = location.state?.selectedCategory || 'Todos';
      const searchTerm = location.state?.searchTerm || '';

      console.log('[Watch.jsx] Navegando a /live-tv con estado:', { selectedCategory, searchTerm });
      return {
        to: '/live-tv',
        options: {
          state: {
            selectedCategory,
            searchTerm,
          },
        },
      };
    }

    if (fromSection === 'movies' || fromSection === 'peliculas') {
      const sectionKey = location.state?.sectionKey;
      const genre = location.state?.genre || 'Todas';
      const searchTerm = location.state?.searchTerm || '';

      if (sectionKey) {
        return {
          to: '/peliculas',
          options: {
            state: {
              selectedMainSectionKey: sectionKey,
              selectedGenre: genre,
              searchTerm,
            },
          },
        };
      }

      return { to: '/peliculas' };
    }

    if (fromSection === 'series') {
      return { to: '/series' };
    }

    console.log('[Watch.jsx] No fromSection o fromLocation, navegando a home');
    return { to: '/' };
  }, [location.state]);

  const handleBackNavigation = () => {
    if (activeTrailerUrl) {
      setActiveTrailerUrl('');
      return;
    }

    if (isChannelPickerOpen) {
      closeChannelPicker();
      return;
    }
    console.log('[Watch.jsx] handleBackNavigation: Iniciando navegación hacia atrás');
    isUnmountingRef.current = true;
    isNavigatingAwayRef.current = true;
    
    // Detener VLC y background playback de forma asincrónica (sin esperar)
    try {
      if (backgroundPlaybackService && typeof backgroundPlaybackService.stopPlayback === 'function') {
        backgroundPlaybackService.stopPlayback().catch(err => {
          console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo backgroundPlayback:', err);
        });
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error en backgroundPlayback:', err);
    }

    try {
      if (window.VideoPlayerPlugin && typeof window.VideoPlayerPlugin.stopVideo === 'function') {
        window.VideoPlayerPlugin.stopVideo().catch(err => {
          console.warn('[Watch.jsx] handleBackNavigation: Error deteniendo VLC plugin:', err);
        });
      }
    } catch (err) {
      console.warn('[Watch.jsx] handleBackNavigation: Error en VideoPlayerPlugin:', err);
    }

    const fromLocation = location.state?.from;
    const fromSection = location.state?.fromSection;
    const returnState = location.state?.returnState;
    
    console.log('[Watch.jsx] fromSection:', fromSection, 'fromLocation:', fromLocation, 'returnState:', returnState);
    
    if (fromLocation) {
      navigate(fromLocation, returnState ? { state: returnState } : undefined);
    } else if (fromSection === 'tv') {
      // Regresar a TV en vivo con categoría restaurada
      const selectedCategory = location.state?.selectedCategory || 'Todos';
      const searchTerm = location.state?.searchTerm || '';
      
      console.log('[Watch.jsx] Navegando a /live-tv con estado:', { selectedCategory, searchTerm });
      navigate('/live-tv', { 
        replace: true,
        state: { 
          selectedCategory,
          searchTerm
        } 
      });
    } else if (fromSection === 'movies' || fromSection === 'peliculas') {
      // Regresar a películas con filtros restaurados
      const sectionKey = location.state?.sectionKey;
      const genre = location.state?.genre || 'Todas';
      const searchTerm = location.state?.searchTerm || '';
      
      if (sectionKey) {
        navigate('/peliculas', { 
          state: { 
            selectedMainSectionKey: sectionKey,
            selectedGenre: genre,
            searchTerm
          } 
        });
      } else {
        navigate('/peliculas');
      }
    } else if (fromSection === 'series') {
      navigate('/series');
    } else {
      console.log('[Watch.jsx] No fromSection o fromLocation, navegando a home');
      navigate('/');
    }
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setAccessModalData(null);
    handleBackNavigation();
  };

  // 🔥 NUEVO: Manejar el botón atrás del dispositivo en Watch.jsx
  // 🔥 IMPORTANTE: Usar ref para evitar reconfiguraciones cuando cambia location.state
  const handleBackNavigationRef = useRef(handleBackNavigation);
  
  useEffect(() => {
    handleBackNavigationRef.current = handleBackNavigation;
  }, [handleBackNavigation]);

  useEffect(() => {
    let handleRef = null;
    let unsub = null;

    const setupBackButton = async () => {
      try {
        if (CapacitorApp.addListener) {
          const handle = await CapacitorApp.addListener('backButton', () => {
            console.log('[Watch.jsx] 🔥 Back button presionado en Watch - navegando hacia atrás');
            handleBackNavigationRef.current();
          });
          handleRef = handle;
          if (handle && typeof handle.remove === 'function') {
            unsub = () => handle.remove();
          } else if (typeof handle === 'function') {
            unsub = handle;
          }
        }
      } catch (err) {
        console.warn('[Watch.jsx] Error al configurar backButton listener:', err);
      }
    };

    setupBackButton();

    return () => {
      try {
        if (typeof unsub === 'function') {
          unsub();
        } else if (handleRef && typeof handleRef.remove === 'function') {
          handleRef.remove();
        }
      } catch (err) {
        console.warn('[Watch.jsx] Error removiendo backButton listener:', err);
      }
    };
  }, []); // ✅ Dependencias vacías - se configura una sola vez

  const handleNextEpisode = (seasonIndex, chapterIndex) => {
    const latestParams = latestWatchParamsRef.current;
    if (latestParams?.itemType !== itemType || latestParams?.itemId !== itemId) {
      console.log('[Watch.jsx] handleNextEpisode ignorado (stale):', {
        expected: { itemType, itemId },
        latest: latestParams
      });
      return;
    }
    if (isUnmountingRef.current || isNavigatingAwayRef.current) {
      console.log('[Watch.jsx] handleNextEpisode ignorado (navegando/desmontando):', {
        isUnmounting: isUnmountingRef.current,
        isNavigatingAway: isNavigatingAwayRef.current
      });
      return;
    }

    const targetKey = `${seasonIndex}:${chapterIndex}`;
    const now = Date.now();
    if (
      nextEpisodeNavigationRef.current.key === targetKey &&
      now - nextEpisodeNavigationRef.current.ts < 2500
    ) {
      console.log('[Watch.jsx] handleNextEpisode duplicado ignorado:', targetKey);
      return;
    }
    nextEpisodeNavigationRef.current = { key: targetKey, ts: now };
    navigate(`/watch/${itemType}/${itemId}`, {
      replace: true,
      state: { seasonIndex, chapterIndex, continueWatching: true }
    });
  };

  function persistManualEpisodeSelection(seasonIndex, chapterIndex) {
    if (!itemId || itemType === 'channel') return;

    // Guardado inmediato para que Continuar viendo respete el capitulo elegido,
    // incluso si el usuario sale antes del siguiente guardado periodico.
    const progressPayload = {
      lastSeason: seasonIndex,
      lastChapter: chapterIndex,
      lastTime: 6,
      completed: false
    };

    axiosInstance.put(`/api/videos/${itemId}/progress`, progressPayload)
      .then(() => {
        setItemData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            watchProgress: {
              ...(prev.watchProgress || {}),
              ...progressPayload
            }
          };
        });
        try {
          localStorage.setItem(`videoProgress_${itemId}`, JSON.stringify(progressPayload));
        } catch (e) {
          console.warn('[Watch.jsx] No se pudo actualizar cache local de progreso:', e);
        }
      })
      .catch((err) => {
        console.warn('[Watch.jsx] No se pudo guardar progreso al seleccionar capitulo:', err?.message || err);
      });
  }

  function handleChapterSelect(seasonIndex, chapterIndex) {
    const season = itemData?.seasons?.[seasonIndex];
    const chapter = season?.chapters?.[chapterIndex];

    if (!chapter) {
      console.warn('[Watch.jsx] handleChapterSelect: capitulo invalido', { seasonIndex, chapterIndex });
      return;
    }
    persistManualEpisodeSelection(seasonIndex, chapterIndex);
    setIsContinueWatching(false);
    setContinueWatchingState(null);
    setStartTime(0);
    setVideoUrl('');
    setCurrentChapterInfo({ seasonIndex, chapterIndex });
    setVodPlaybackRequested(true);
  }

  const handleReturnToChannelList = useCallback(() => {
    console.log('[Watch.jsx] Retornando a lista de canales');
    isUnmountingRef.current = true;
    isNavigatingAwayRef.current = true;

    const selectedCategory = location.state?.selectedCategory || 'Todos';
    const searchTerm = location.state?.searchTerm || '';

    navigate('/live-tv', {
      replace: true,
      state: {
        selectedCategory,
        searchTerm,
        selectedChannelIndex: currentChannelIndex >= 0 ? currentChannelIndex : 0,
      },
    });

    window.setTimeout(() => {
      stopPlaybackSafely();
    }, 0);
  }, [currentChannelIndex, location.state, navigate, stopPlaybackSafely]);

  const handleNativePlayerClosed = useCallback((data = {}) => {
    if (itemType !== 'channel') {
      return;
    }
    if (isUnmountingRef.current || isNavigatingAwayRef.current) {
      return;
    }

    const reason = typeof data?.reason === 'string' ? data.reason : '';
    if (reason !== 'user_back' && reason !== 'back') {
      return;
    }

    console.log('[Watch.jsx] Player nativo cerrado manualmente para canal en vivo:', reason);
    setChannelPlaybackDismissed(true);
    setVideoUrl('');
    setChannelPlaybackIssue('La reproduccion se cerró. Usa "Cambiar canal" o "Recargar canal".');
    setIsChannelPickerOpen(false);
    setChannelSearch('');
    setFocusedChannelControlIndex(0);
  }, [itemType]);

  const openChannelPicker = useCallback(() => {
    const currentFilteredIndex = filteredChannelList.findIndex((channel) => (
      String(channel.id) === String(itemId)
    ));
    setFocusedChannelPickerIndex(currentFilteredIndex >= 0 ? currentFilteredIndex : 0);
    setIsChannelPickerOpen(true);
  }, [filteredChannelList, itemId]);

  const closeChannelPicker = useCallback((nextControlIndex = 0) => {
    setIsChannelPickerOpen(false);
    setChannelSearch('');
    setFocusedChannelPickerIndex(-1);
    window.setTimeout(() => {
      focusTVContent();
      focusChannelControl(nextControlIndex);
    }, 40);
  }, [focusChannelControl]);

  const handleChannelPickerKeyDown = (event) => {
    if (!isChannelPickerOpen) {
      return;
    }

    const action = resolveRemoteAction(event);
    if (!action) {
      return;
    }

    if (action === 'close') {
      event.preventDefault();
      closeChannelPicker();
      return;
    }

    const inputIsActive = document.activeElement === channelPickerInputRef.current;
    const closeButtonIsActive = document.activeElement === channelPickerCloseButtonRef.current;
    if (inputIsActive) {
      if (action === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        closeChannelPicker(0);
        return;
      }

      if (action === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        focusChannelPickerCloseButton();
        return;
      }

      if (action === 'Enter' && !isTVMode) {
        event.preventDefault();
        event.stopPropagation();
        channelPickerInputRef.current?.blur();
        return;
      }

      if ((action === 'ArrowDown' || (action === 'Enter' && isTVMode)) && filteredChannelList.length > 0) {
        event.preventDefault();
        window.setTimeout(() => {
          focusChannelPickerItem(Math.max(0, focusedChannelPickerIndex));
        }, 0);
      }
      return;
    }

    if (closeButtonIsActive) {
      if (action === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        focusChannelPickerInput();
        return;
      }

      if (action === 'ArrowDown' && filteredChannelList.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        focusChannelPickerItem(Math.max(0, focusedChannelPickerIndex));
        return;
      }

      if (action === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        closeChannelPicker(1);
        return;
      }

      if (action === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        closeChannelPicker(0);
        return;
      }

      if (action === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        closeChannelPicker(0);
      }
      return;
    }

    if (filteredChannelList.length === 0) {
      return;
    }

    switch (action) {
      case 'ArrowLeft':
        event.preventDefault();
        event.stopPropagation();
        closeChannelPicker(0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        event.stopPropagation();
        closeChannelPicker(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (focusedChannelPickerIndex <= 0) {
          focusChannelPickerInput();
          return;
        }
        focusChannelPickerItem(focusedChannelPickerIndex - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusChannelPickerItem(focusedChannelPickerIndex + 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const selectedChannel = filteredChannelList[focusedChannelPickerIndex];
        if (selectedChannel) {
          handleSelectChannel(selectedChannel);
        }
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    if (!isChannelPickerOpen) {
      return undefined;
    }

    const handleChannelPickerKeyCapture = (event) => {
      const targetIsInsidePicker =
        event.target === channelPickerInputRef.current ||
        Boolean(event.target?.closest?.('[data-channel-picker="true"]'));

      if (!targetIsInsidePicker && getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
        return;
      }

      handleChannelPickerKeyDown(event);
    };

    window.addEventListener('keydown', handleChannelPickerKeyCapture, true);
    return () => window.removeEventListener('keydown', handleChannelPickerKeyCapture, true);
  }, [handleChannelPickerKeyDown, isChannelPickerOpen]);

  const handleReloadChannel = async () => {
    if (itemType !== 'channel' || isReloadingChannel) return;

    setIsReloadingChannel(true);
    setChannelPlaybackDismissed(false);
    setChannelPlaybackIssue(null);
    setError(null);
    suppressMpvClosedRef.current = true;

    try {
      if (window.electronMPV && videoUrl && bounds) {
        await window.electronMPV.stop().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 350));

        const result = await window.electronMPV.play(videoUrl, bounds, {
          startTime: 0,
          title: buildMpvDisplayTitle(),
          videoId: itemData?.id || itemId
        });

        if (!result?.success) {
          throw new Error(result?.error || 'Fallo al recargar MPV');
        }
        playbackStartTsRef.current = Date.now();
      } else {
        setReloadKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('[Watch.jsx] Error recargando canal:', err);
      setError(`No se pudo recargar el canal: ${err.message}`);
      setChannelPlaybackIssue('No se pudo restablecer la señal. Intenta nuevamente.');
    } finally {
      setIsReloadingChannel(false);
      setTimeout(() => {
        suppressMpvClosedRef.current = false;
      }, 1200);
    }
  };

  useEffect(() => {
    if (itemType !== 'channel' || isChannelPickerOpen || showAccessModal) {
      return undefined;
    }

    focusTVContent();
    const timer = window.setTimeout(() => {
      focusChannelControl(focusedChannelControlIndex);
    }, 90);

    return () => window.clearTimeout(timer);
  }, [activeNativePlayerType, channelPlaybackDismissed, focusChannelControl, isChannelPickerOpen, itemId, itemType, showAccessModal]);

  useEffect(() => {
    if (itemType !== 'channel') {
      return undefined;
    }

    const handleChannelControlKeyCapture = (event) => {
      if (isChannelPickerOpen || showAccessModal) {
        return;
      }

      const action = resolveRemoteAction(event);
      if (!action) {
        return;
      }

      const activeElement = document.activeElement;
      const activeControlIndex = channelControlRefs.current.findIndex((element) => element === activeElement);
      const controlsHaveDomFocus =
        activeControlIndex >= 0 ||
        Boolean(activeElement?.closest?.('[data-channel-controls="true"]'));
      const shouldHandleControls =
        controlsHaveDomFocus ||
        getTVFocusZone() === TV_FOCUS_ZONE_CONTENT;

      if (!shouldHandleControls) {
        return;
      }

      if (action === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        focusChannelControl((activeControlIndex >= 0 ? activeControlIndex : focusedChannelControlIndex) - 1);
        return;
      }

      if (action === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        focusChannelControl((activeControlIndex >= 0 ? activeControlIndex : focusedChannelControlIndex) + 1);
        return;
      }

      if (action !== 'Enter') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const controlIndex = activeControlIndex >= 0 ? activeControlIndex : focusedChannelControlIndex;
      if (controlIndex === 0 && channelList.length > 0) {
        openChannelPicker();
      } else if (controlIndex === 1 && !isReloadingChannel) {
        handleReloadChannel();
      }
    };

    window.addEventListener('keydown', handleChannelControlKeyCapture, true);
    return () => window.removeEventListener('keydown', handleChannelControlKeyCapture, true);
  }, [
    channelList.length,
    focusChannelControl,
    focusedChannelControlIndex,
    isChannelPickerOpen,
    isReloadingChannel,
    itemType,
    openChannelPicker,
    showAccessModal,
  ]);

  const handleSelectChannel = (targetChannel) => {
    if (itemType !== 'channel') return;
    if (!targetChannel?.id) {
      return;
    }

    if (String(targetChannel.id) === String(itemId)) {
      closeChannelPicker();
      return;
    }

    suppressMpvClosedRef.current = true;
    setTimeout(() => {
      suppressMpvClosedRef.current = false;
    }, 1200);

    setChannelPlaybackIssue(null);
    setChannelPlaybackDismissed(false);
    setError(null);
    setLoading(true);
    setVideoUrl('');
    setItemData(null);
    setIsChannelPickerOpen(false);
    setChannelSearch('');

    const nextState = {
      ...(location.state || {}),
      channelName: targetChannel.name,
      selectedCategory: location.state?.selectedCategory || targetChannel.section || 'Todos',
      returnState: {
        ...(location.state?.returnState || {}),
        selectedCategory: location.state?.selectedCategory || targetChannel.section || 'Todos',
        selectedChannelIndex: channelList.findIndex((channel) => String(channel.id) === String(targetChannel.id)),
      },
      continueWatching: false,
      startTime: 0
    };
    delete nextState.seasonIndex;
    delete nextState.chapterIndex;

    navigate(`/watch/channel/${targetChannel.id}`, {
      replace: true,
      state: nextState
    });
  };

  const handleProceedWithTrial = () => {
    if (accessModalData?.trialMinutesRemaining > 0) {
      setShowAccessModal(false);
      setAccessModalData(null);
      setUseTrial(true);
      setReloadKey((prev) => prev + 1);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (showAccessModal) {
    return (
      <div className="bg-zinc-900 min-h-screen flex flex-col pt-16">
        <div className="container mx-auto px-2 sm:px-4 py-4 flex-grow flex flex-col">
          <div className="mb-4 flex items-center justify-between w-full max-w-screen-xl mx-auto">
            <button
              onClick={handleBackNavigation}
              className="text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm transition-colors"
            >
              ← Volver
            </button>
          </div>
          <div className="flex-grow flex items-center justify-center text-gray-300">
            {/* El modal se encargará de mostrar el detalle del error de acceso */}
          </div>
        </div>

        <ContentAccessModal
          isOpen={showAccessModal}
          onClose={closeAccessModal}
          data={accessModalData}
          onProceedWithTrial={handleProceedWithTrial}
        />
      </div>
    );
  }

  const showError = error && (
    <div className="w-full max-w-screen-xl mx-auto mb-4">
      <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-4 rounded-lg">
        <div className="whitespace-pre-wrap">{error}</div>
        {!error.includes('plan') && (
          <button
            onClick={() => {
              setError(null);
              setChannelPlaybackIssue(null);
              if (window.electronMPV && videoUrl && bounds) {
                suppressMpvClosedRef.current = true;
                window.electronMPV.stop()
                  .then(() => new Promise(resolve => setTimeout(resolve, itemType === 'channel' ? 220 : 700)))
                  .then(() => window.electronMPV.play(videoUrl, bounds, {
                    startTime,
                    title: buildMpvDisplayTitle(),
                    videoId: itemData?.id || itemId
                  }))
                  .then((result) => {
                    if (!result?.success) {
                      throw new Error(result?.error || 'Fallo al reintentar reproducción');
                    }
                  })
                  .catch(err => {
                    console.error('[Watch.jsx] Error al reintentar reproducción:', err);
                    setError(`Error al reintentar: ${err.message}`);
                  })
                  .finally(() => {
                    setTimeout(() => {
                      suppressMpvClosedRef.current = false;
                    }, 1200);
                  });
              } else if (itemType === 'channel') {
                handleReloadChannel();
              }
            }}
            className="mt-3 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );

  if (!itemData)
    return (
      <div className="text-white p-10 text-center min-h-screen bg-black pt-20">
        Información del contenido no disponible.
        <button
          onClick={handleBackNavigation}
          className="block mx-auto mt-4 bg-gray-700 px-3 py-1 rounded"
        >
          Volver
        </button>
      </div>
    );

  const hasValidContent = itemData.url || (itemData.chapters && itemData.chapters.length > 0);
  
  if (!hasValidContent)
    return (
      <div className="text-white p-10 text-center min-h-screen bg-black pt-20">
        No hay contenido disponible para reproducir.
        <div className="mt-4 text-sm text-gray-400">
          Debug info: URL={itemData.url || 'null'}, Chapters={itemData.chapters?.length || 0}
        </div>
        <button
          onClick={handleBackNavigation}
          className="block mx-auto mt-4 bg-gray-700 px-3 py-1 rounded"
        >
          Volver
        </button>
      </div>
    );

  const backgroundImage = tvBackdropImage || itemData?.poster || itemData?.thumbnail || './fondo.png';

  return (
    <DynamicTheme 
      theme={visualTheme} 
      className="min-h-screen flex flex-col pt-16 relative"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: 'brightness(0.3) blur(1px)'
        }}
      />
      
      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 flex-grow flex flex-col">
        {showError}
        
        <div className={`mb-4 flex items-center justify-between w-full max-w-screen-xl mx-auto ${isTVMode ? 'hidden' : ''}`}>
          <button
            onClick={handleBackNavigation}
            tabIndex={isTVMode ? -1 : undefined}
            className="px-4 py-2 rounded-md text-sm transition-all duration-300 border backdrop-blur-sm"
            style={{
              backgroundColor: visualTheme ? `${visualTheme.gradientStart}90` : 'rgba(31, 41, 55, 0.9)',
              color: visualTheme?.textColor || '#ffffff',
              borderColor: visualTheme ? `${visualTheme.primaryColor}50` : 'rgba(59, 130, 246, 0.5)',
              boxShadow: visualTheme ? `0 4px 15px ${visualTheme.primaryColor}20` : '0 4px 15px rgba(59, 130, 246, 0.2)'
            }}
          >
            ← Volver
          </button>
        </div>

        <div className="flex-grow flex flex-col items-center">
          <div className="w-full max-w-screen-xl">
            {isTVVodDetailScreen ? (
              <div className="mx-auto mb-6 w-full max-w-5xl space-y-4">
                <section
                  ref={(element) => {
                    tvHeroSectionRef.current = element;
                    tvHeroFocusRef.current = element;
                  }}
                  tabIndex={isTVMode ? 0 : -1}
                  onFocus={(event) => {
                    if (event.target !== event.currentTarget) {
                      return;
                    }
                    setFocusedVodDetailSection('hero');
                  }}
                  className={`overflow-hidden rounded-[28px] border bg-slate-950/84 shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl focus:outline-none ${
                    focusedVodDetailSection === 'hero'
                      ? 'border-cyan-300 ring-2 ring-cyan-300/90 ring-offset-2 ring-offset-slate-950'
                      : 'border-white/10'
                  }`}
                >
                  <div className="relative h-[290px] overflow-hidden bg-black sm:h-[340px]">
                    <img
                      src={tvDetailHeroImage}
                      alt={tvItemTitle}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.38)_45%,rgba(2,6,23,0.96)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                      <div className="mb-4 flex flex-wrap gap-2">
                        {isSeriesContent ? (
                          <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                            {totalSeasonCount} {totalSeasonCount === 1 ? 'Temporada' : 'Temporadas'}
                          </span>
                        ) : null}
                        {isSeriesContent && totalEpisodeCount > 0 ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                            {totalEpisodeCount} Episodios
                          </span>
                        ) : null}
                        {tvItemYear ? (
                          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100">
                            {tvItemYear}
                          </span>
                        ) : null}
                        {tvItemRating ? (
                          <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                            IMDb {tvItemRating}
                          </span>
                        ) : null}
                      </div>
                      <h1 className="max-w-4xl text-2xl font-black text-white sm:text-4xl">
                        {tvItemTitle}
                      </h1>
                      {isSeriesContent && currentEpisodeMeta ? (
                        <p className="mt-3 max-w-4xl text-sm font-medium text-slate-200/90 sm:text-[15px]">
                          {buildSeasonEpisodeLabel(currentEpisodeMeta.seasonNumber, currentEpisodeMeta.episodeNumber)}
                          {currentEpisodeMeta.title ? ` · ${currentEpisodeMeta.title}` : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                    {tvItemDescription ? (
                      <p
                        className="max-w-4xl text-sm leading-6 text-slate-200/95 sm:text-[15px]"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {tvItemDescription}
                      </p>
                    ) : null}

                    {isSeriesContent && selectedEpisodeMeta ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                              Episodio Seleccionado
                            </p>
                            <p className="mt-1 text-base font-semibold text-white">
                              {buildSeasonEpisodeLabel(selectedEpisodeMeta.seasonNumber, selectedEpisodeMeta.episodeNumber)}
                              {selectedEpisodeMeta.title ? ` · ${selectedEpisodeMeta.title}` : ''}
                            </p>
                          </div>
                          {selectedEpisodeMeta.duration ? (
                            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-medium text-slate-200">
                              {selectedEpisodeMeta.duration}
                            </span>
                          ) : null}
                        </div>
                        {continueActionItem ? (
                          <div className="mt-4 space-y-2">
                            <button
                              ref={(element) => {
                                vodActionRefs.current[0] = element;
                              }}
                              type="button"
                              onClick={continueActionItem.onSelect}
                              onFocus={() => {
                                setFocusedVodDetailSection('actions');
                                setFocusedVodActionIndex(0);
                              }}
                              disabled={continueActionItem.disabled}
                              className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 ${continueActionItem.className} ${
                                focusedVodDetailSection === 'actions' && focusedVodActionIndex === 0
                                  ? 'scale-[1.02] ring-2 ring-white/80 ring-offset-2 ring-offset-slate-950'
                                  : ''
                              }`}
                            >
                              {continueActionItem.label}
                            </button>
                            {continueCaption ? (
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
                                {continueCaption}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div ref={vodActionsSectionRef} className="flex flex-wrap gap-3">
                      {secondaryVodActionItems.map((action, index) => {
                        const actionIndex = continueActionItem ? index + 1 : index;

                        return (
                        <button
                          key={action.key}
                          ref={(element) => {
                            vodActionRefs.current[actionIndex] = element;
                          }}
                          type="button"
                          onClick={action.onSelect}
                          onFocus={() => {
                            setFocusedVodDetailSection('actions');
                            setFocusedVodActionIndex(actionIndex);
                          }}
                          disabled={action.disabled}
                          className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 ${action.className} ${
                            focusedVodDetailSection === 'actions' && focusedVodActionIndex === actionIndex
                              ? 'scale-[1.02] ring-2 ring-white/80 ring-offset-2 ring-offset-slate-950'
                              : ''
                          }`}
                        >
                          {action.label}
                        </button>
                        );
                      })}
                    </div>

                    {myListFeedback.message ? (
                      <div
                        className={`rounded-xl px-4 py-3 text-sm ${
                          myListFeedback.type === 'error'
                            ? 'border border-red-400/40 bg-red-500/10 text-red-200'
                            : myListFeedback.type === 'info'
                              ? 'border border-amber-400/40 bg-amber-500/10 text-amber-200'
                              : 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                        }`}
                      >
                        {myListFeedback.message}
                      </div>
                    ) : null}
                  </div>
                </section>

                {isSeriesContent ? (
                  <section
                    ref={tvSeasonsSectionRef}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/74 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-bold uppercase tracking-[0.16em] text-white/90">
                          Temporadas
                        </h2>
                        <p className="mt-1 text-sm text-slate-300/80">
                          {totalSeasonCount} {totalSeasonCount === 1 ? 'temporada disponible' : 'temporadas disponibles'}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                        T{selectedSeasonNumber}
                      </span>
                    </div>

                    <div ref={tvSeasonsRailRef} className="flex gap-3 overflow-x-auto pb-2">
                      {itemData.seasons.map((season, index) => {
                        const isSeasonFocused =
                          focusedVodDetailSection === 'seasons' && focusedSeasonIndex === index;
                        const episodeCount = Array.isArray(season?.chapters) ? season.chapters.length : 0;
                        const seasonNumber = getSafeSeasonNumber(season, index);

                        return (
                          <button
                            key={`${seasonNumber}-${index}`}
                            ref={(element) => {
                              seasonOptionRefs.current[index] = element;
                            }}
                            type="button"
                            onClick={() => {
                              setSelectedSeasonIndex(index);
                              setFocusedSeasonIndex(index);
                              setFocusedEpisodeIndex(0);
                            }}
                            onFocus={() => {
                              setFocusedVodDetailSection('seasons');
                              setSelectedSeasonIndex(index);
                              setFocusedSeasonIndex(index);
                            }}
                            className={`min-w-[200px] rounded-2xl border px-4 py-4 text-left transition-all duration-150 focus:outline-none ${
                              isSeasonFocused
                                ? 'border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_2px_rgba(103,232,249,0.85)]'
                                : 'border-white/10 bg-white/[0.04]'
                            }`}
                          >
                            <p className="text-sm font-semibold text-white">Temporada {seasonNumber}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-300/75">
                              {episodeCount} {episodeCount === 1 ? 'episodio' : 'episodios'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {isSeriesContent ? (
                  <section
                    ref={tvEpisodesSectionRef}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/74 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-bold uppercase tracking-[0.16em] text-white/90">
                          Episodios
                        </h2>
                        <p className="mt-1 text-sm text-slate-300/80">
                          Temporada {selectedSeasonNumber} · {selectedSeasonEpisodes.length} {selectedSeasonEpisodes.length === 1 ? 'episodio' : 'episodios'}
                        </p>
                      </div>
                    </div>

                    {selectedSeasonEpisodes.length > 0 ? (
                      <div ref={tvEpisodesRailRef} className="flex gap-4 overflow-x-auto pb-2">
                        {selectedSeasonEpisodes.map((episode, index) => {
                          const episodeNumber = getSafeEpisodeNumber(episode, index);
                          const isEpisodeFocused =
                            focusedVodDetailSection === 'episodes' && focusedEpisodeIndex === index;
                          const isEpisodePlaying =
                            currentChapterInfo?.seasonIndex === selectedSeasonIndex &&
                            currentChapterInfo?.chapterIndex === index;

                          return (
                            <button
                              key={`${selectedSeasonNumber}-${episodeNumber}-${index}`}
                              ref={(element) => {
                                episodeOptionRefs.current[index] = element;
                              }}
                              type="button"
                              onClick={() => handleChapterSelect(selectedSeasonIndex, index)}
                              onFocus={() => {
                                setFocusedVodDetailSection('episodes');
                                setFocusedEpisodeIndex(index);
                              }}
                              className={`w-[260px] min-w-[260px] rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none ${
                                isEpisodeFocused
                                  ? 'border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_2px_rgba(103,232,249,0.85)]'
                                  : isEpisodePlaying
                                    ? 'border-emerald-300/60 bg-emerald-400/10'
                                    : 'border-white/10 bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                                    {buildSeasonEpisodeLabel(selectedSeasonNumber, episodeNumber)}
                                  </p>
                                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">
                                    {episode?.title || `Episodio ${episodeNumber}`}
                                  </p>
                                </div>
                                {isEpisodePlaying ? (
                                  <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                                    Actual
                                  </span>
                                ) : null}
                              </div>
                              {episode?.duration ? (
                                <p className="mt-3 text-xs text-slate-300/75">{episode.duration}</p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300/75">
                        No hay episodios disponibles para esta temporada.
                      </div>
                    )}
                  </section>
                ) : null}

                <section
                  ref={tvRecommendationsSectionRef}
                  className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/70 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold uppercase tracking-[0.16em] text-white/90">
                        Sugerencias Similares
                      </h2>
                      <p className="mt-1 text-sm text-slate-300/80">
                        {smartRecommendationsLoading
                          ? 'Buscando recomendaciones...'
                          : hasTvRecommendations
                            ? `${tvRecommendationItems.length} opciones para seguir viendo`
                            : smartRecommendationsError
                              ? 'No se pudieron cargar sugerencias.'
                              : 'Sin sugerencias por ahora.'}
                      </p>
                    </div>
                    {smartRecommendationsError && !hasTvRecommendations ? (
                      <button
                        type="button"
                        onClick={retrySmartRecommendations}
                        className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                      >
                        Reintentar
                      </button>
                    ) : null}
                  </div>

                  {hasTvRecommendations ? (
                    <div ref={tvRecommendationsRailRef} className="flex gap-4 overflow-x-auto pb-2">
                      {tvRecommendationItems.map((recommendation, index) => {
                        const recommendationTitle = getTVItemTitle(recommendation);
                        const recommendationType = resolveTVItemType(recommendation, 'movie');
                        const recommendationFocused =
                          focusedVodDetailSection === 'recommendations' && index === focusedRecommendationIndex;

                        return (
                          <button
                            key={getTVItemId(recommendation) || `${recommendationTitle}-${index}`}
                            ref={(element) => {
                              recommendationRefs.current[index] = element;
                            }}
                            type="button"
                            onClick={() => handleSelectRecommendedItem(recommendation)}
                            onFocus={() => {
                              setFocusedVodDetailSection('recommendations');
                              setFocusedRecommendationIndex(index);
                            }}
                            className={`group w-[220px] min-w-[220px] overflow-hidden rounded-2xl border bg-slate-900/90 text-left transition-all duration-150 focus:outline-none ${
                              recommendationFocused
                                ? 'border-cyan-300 shadow-[0_0_0_2px_rgba(103,232,249,0.95)]'
                                : 'border-white/10 hover:border-white/30'
                            }`}
                          >
                            <div className="aspect-video overflow-hidden bg-black">
                              <img
                                src={getTVItemImage(recommendation)}
                                alt={recommendationTitle}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                              />
                            </div>
                            <div className="space-y-2 px-3 py-3">
                              <p className="line-clamp-2 text-sm font-semibold text-white">
                                {recommendationTitle}
                              </p>
                              <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-300/70">
                                <span>{recommendationType.replace('-', ' ')}</span>
                                {recommendation.releaseYear ? (
                                  <span>{recommendation.releaseYear}</span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : smartRecommendationsLoading ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-4 text-sm text-cyan-100/90">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                      Preparando sugerencias...
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300/75">
                      Todavia no hay sugerencias similares para este contenido.
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <>
            <div className="text-center sm:text-left mb-6">
              <h1 className="text-4xl sm:text-5xl font-black mb-4">
                <DynamicText theme={visualTheme} glow={true}>
                  {itemData.name}
                </DynamicText>
              </h1>
              
              <div className="flex flex-wrap gap-3 mb-4 justify-center sm:justify-start">
                {itemData.releaseYear && (
                  <span 
                    className="px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm"
                    style={{
                      backgroundColor: visualTheme ? `${visualTheme.primaryColor}20` : 'rgba(59, 130, 246, 0.2)',
                      color: visualTheme?.primaryColor || '#3b82f6',
                      border: `1px solid ${visualTheme?.primaryColor || '#3b82f6'}40`
                    }}
                  >
                    📅 {itemData.releaseYear}
                  </span>
                )}
                {itemData.genres && (
                  <span 
                    className="px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm"
                    style={{
                      backgroundColor: visualTheme ? `${visualTheme.secondaryColor}20` : 'rgba(236, 72, 153, 0.2)',
                      color: visualTheme?.secondaryColor || '#ec4899',
                      border: `1px solid ${visualTheme?.secondaryColor || '#ec4899'}40`
                    }}
                  >
                    🎭 {Array.isArray(itemData.genres) ? itemData.genres.join(', ') : itemData.genres}
                  </span>
                )}
              </div>
            </div>
            
            <div
              ref={videoAreaRef}
              className="w-full max-w-5xl mx-auto mb-8 rounded-2xl overflow-hidden"
              style={{ 
                position: "relative", 
                aspectRatio: "16/9",
                boxShadow: visualTheme ? `0 0 40px ${visualTheme.primaryColor}30` : '0 0 40px rgba(59, 130, 246, 0.3)'
              }}
            >
              {videoUrl || isBrowserPlaybackBlocked ? (
                <VideoPlayer 
                  key={`${itemData.id}-${currentChapterInfo?.seasonIndex}-${currentChapterInfo?.chapterIndex}-${activeNativePlayerType}`}
                  url={videoUrl || ''}
                  itemId={itemData.id}
                  startTime={startTime}
                  initialAutoplay={shouldAutoplay}
                  title={itemData.name}
                  metaLine={nativePlayerMetaLine}
                  seasons={itemData.seasons}
                  currentChapterInfo={currentChapterInfo}
                  onNextEpisode={itemData.tipo !== 'pelicula' && itemData.tipo !== 'movie' && itemData.tipo !== 'channel' ? handleNextEpisode : undefined}
                  isUnmountingRef={isUnmountingRef}
                  isNavigatingAwayRef={isNavigatingAwayRef}
                  onReturnToChannelList={itemType === 'channel' ? handleReturnToChannelList : undefined}
                  onNativePlayerClosed={itemType === 'channel' ? handleNativePlayerClosed : undefined}
                  disableProgressTracking={itemType === 'channel'}
                  channels={channelsForNativePlayback}
                  isLiveTV={itemType === 'channel'}
                  contentType={itemType === 'channel' ? 'channel' : itemData.tipo}
                  nativePlayerType={activeNativePlayerType}
                  webPlaybackMessage={itemData.webPlaybackMessage}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-black rounded-2xl">
                  <div className="text-center">
                        <DynamicText theme={visualTheme} glow={true}>
                          <span className="text-lg font-medium">
                            {itemType === 'channel' && channelPlaybackDismissed
                              ? 'Canal detenido. Usa los controles de abajo.'
                              : itemType === 'channel' && !channelListReady
                                ? 'Preparando canales...'
                                : 'Cargando video...'}
                          </span>
                        </DynamicText>
                      </div>
                </div>
              )}
            </div>

              </>
            )}

            {itemType === 'channel' && !isBrowserPlaybackBlocked && (
              <div className="w-full max-w-5xl mx-auto mb-8">
                <div
                  data-channel-controls="true"
                  className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-black/45 px-4 py-3 backdrop-blur-sm"
                  onKeyDown={handleChannelControlsKeyDown}
                >
                  <button
                    ref={(element) => {
                      channelControlRefs.current[0] = element;
                    }}
                    data-channel-control-index="0"
                    onClick={openChannelPicker}
                    onFocus={() => setFocusedChannelControlIndex(0)}
                    disabled={channelList.length === 0}
                    className={`px-4 py-2 rounded-md text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-black ${
                      focusedChannelControlIndex === 0 ? 'ring-2 ring-indigo-300 ring-offset-2 ring-offset-black' : ''
                    }`}
                  >
                    Seleccionar canal
                  </button>
                  <button
                    ref={(element) => {
                      channelControlRefs.current[1] = element;
                    }}
                    data-channel-control-index="1"
                    onClick={handleReloadChannel}
                    onFocus={() => setFocusedChannelControlIndex(1)}
                    disabled={isReloadingChannel}
                    className={`px-4 py-2 rounded-md text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-black ${
                      focusedChannelControlIndex === 1 ? 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-black' : ''
                    }`}
                  >
                    {isReloadingChannel ? 'Recargando...' : 'Recargar canal'}
                  </button>
                  <span className="text-xs text-gray-300">
                    {currentChannelIndex >= 0 && channelList.length > 0
                      ? `Canal ${currentChannelIndex + 1} de ${channelList.length}: ${itemData?.name || ''}`
                      : 'Canal actual'}
                  </span>
                </div>
                {channelPlaybackIssue && (
                  <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 text-center">
                    {channelPlaybackIssue}
                  </div>
                )}
                {isChannelPickerOpen && (
                  <div
                    data-channel-picker="true"
                    className="mt-3 rounded-xl border border-indigo-400/30 bg-black/85 p-3 backdrop-blur-md"
                    onKeyDown={handleChannelPickerKeyDown}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        ref={channelPickerInputRef}
                        type="text"
                        value={channelSearch}
                        onChange={(e) => setChannelSearch(e.target.value)}
                        onKeyDown={handleChannelPickerKeyDown}
                        onFocus={() => setFocusedChannelPickerIndex(-1)}
                        placeholder="Buscar canal..."
                        className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                      />
                      <button
                        ref={channelPickerCloseButtonRef}
                        onClick={() => closeChannelPicker(0)}
                        tabIndex={isTVMode ? -1 : undefined}
                        onFocus={() => setFocusedChannelPickerIndex(-1)}
                        className="px-3 py-2 rounded-md text-sm bg-zinc-800 hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                      {filteredChannelList.length > 0 ? (
                        filteredChannelList.map((channel, index) => {
                          const isCurrent = String(channel.id) === String(itemId);
                          const isFocused = index === focusedChannelPickerIndex;
                          return (
                            <button
                              key={String(channel.id)}
                              ref={(element) => {
                                channelPickerItemRefs.current[index] = element;
                              }}
                              onClick={() => handleSelectChannel(channel)}
                              onFocus={() => setFocusedChannelPickerIndex(index)}
                              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                                isCurrent
                                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                                  : isFocused
                                    ? 'bg-indigo-500/25 border border-indigo-300/70 text-white'
                                    : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100'
                              }`}
                            >
                              {channel.name}
                              {isCurrent ? ' (actual)' : ''}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-sm text-zinc-300 px-2 py-4 text-center">
                          No se encontraron canales.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {!isTVVodDetailScreen && (
            <div className="space-y-8 w-full max-w-screen-xl">
            {(
              itemData.tipo !== 'pelicula' &&
              itemData.tipo !== 'movie' &&
              itemData.tipo !== 'channel' &&
              ( (itemData.seasons && itemData.seasons.length > 0) || (itemData.chapters && itemData.chapters.length > 0) )
            ) && (
              <DynamicCard theme={visualTheme} className="p-6 rounded-xl" glow={true}>
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <span 
                    className="w-1 h-8 rounded-full mr-3"
                    style={{
                      background: visualTheme 
                        ? `linear-gradient(to bottom, ${visualTheme.primaryColor}, ${visualTheme.secondaryColor})`
                        : 'linear-gradient(to bottom, #3b82f6, #ec4899)'
                    }}
                  ></span>
                  <DynamicText theme={visualTheme} glow={true}>
                    Episodios
                  </DynamicText>
                </h3>
                {currentChapterInfo && <SeriesChapters
                  seasons={itemData.seasons}
                  serieId={itemData.id}
                  currentChapter={currentChapterInfo.chapterIndex}
                  watchProgress={itemData.watchProgress}
                  currentSeason={currentChapterInfo.seasonIndex}
                  onSelectChapter={handleChapterSelect}
                />}
              </DynamicCard>
            )}

            {itemData.description && (
              <DynamicCard theme={visualTheme} className="p-6 rounded-xl" glow={true}>
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <span 
                    className="w-1 h-8 rounded-full mr-3"
                    style={{
                      background: visualTheme 
                        ? `linear-gradient(to bottom, ${visualTheme.primaryColor}, ${visualTheme.secondaryColor})`
                        : 'linear-gradient(to bottom, #3b82f6, #ec4899)'
                    }}
                  ></span>
                  <DynamicText theme={visualTheme} glow={true}>
                    Descripción
                  </DynamicText>
                </h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap" 
                     style={{ color: visualTheme?.textColor || '#ffffff' }}>
                    {itemData.description}
                  </p>
                </div>
              </DynamicCard>
            )}

            {/* Recomendaciones inteligentes basadas en similitud */}
            {!isTVMode ? (
              <SmartRecommendations
              recommendations={smartRecommendations}
              theme={visualTheme}
              loading={smartRecommendationsLoading}
              error={smartRecommendationsError}
              onRetry={retrySmartRecommendations}
              title="También te podría gustar"
              maxItems={6}
              />
            ) : null}
            </div>
          )}
        </div>
      </div>

      {activeTrailerUrl ? (
        <TrailerModal
          trailerUrl={activeTrailerUrl}
          onClose={() => setActiveTrailerUrl('')}
        />
      ) : null}

      <ContentAccessModal
        isOpen={showAccessModal}
        onClose={closeAccessModal}
        data={accessModalData}
        onProceedWithTrial={handleProceedWithTrial}
      />
    </DynamicTheme>
  );
}

export default Watch;
