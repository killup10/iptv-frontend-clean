import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTVItemTrailerUrl, resolveTVItemType } from '../utils/tvContentUtils.js';

const getResumeTime = (item) => {
  const watchProgress = item?.watchProgress || {};
  return Number(watchProgress.lastTime ?? watchProgress.progress ?? item?.progressTime ?? 0);
};

const getResumeDuration = (item) => {
  const watchProgress = item?.watchProgress || {};
  return Number(watchProgress.duration ?? item?.duration ?? 0);
};

const getProgressPercent = (item) => {
  const lastTime = getResumeTime(item);
  const duration = getResumeDuration(item);

  if (!Number.isFinite(lastTime) || !Number.isFinite(duration) || lastTime <= 0 || duration <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, (lastTime / duration) * 100));
};

const canContinueWatchingItem = (item) => {
  const watchProgress = item?.watchProgress || {};
  return (
    getResumeTime(item) > 0 ||
    Number.isFinite(Number(watchProgress.lastSeason)) ||
    Number.isFinite(Number(watchProgress.lastChapter))
  );
};

const buildContinueWatchingState = (item) => {
  const watchProgress = item?.watchProgress || {};
  const lastTime = getResumeTime(item);
  const lastSeason = Number(watchProgress.lastSeason);
  const lastChapter = Number(watchProgress.lastChapter);
  const hasSeasons = Array.isArray(item?.seasons) && item.seasons.length > 0;
  let seasonIndex = Number.isFinite(lastSeason) ? Math.max(0, Math.floor(lastSeason)) : undefined;
  let chapterIndex = Number.isFinite(lastChapter) ? Math.max(0, Math.floor(lastChapter)) : undefined;

  if (hasSeasons) {
    if (!Number.isFinite(seasonIndex) || seasonIndex < 0 || seasonIndex >= item.seasons.length) {
      seasonIndex = 0;
    }

    const chapters = item.seasons?.[seasonIndex]?.chapters;
    if (Array.isArray(chapters) && chapters.length > 0) {
      if (!Number.isFinite(chapterIndex) || chapterIndex < 0 || chapterIndex >= chapters.length) {
        chapterIndex = 0;
      }
    }
  }

  const navigationState = { continueWatching: true };

  if (Number.isFinite(lastTime) && lastTime > 0) {
    navigationState.startTime = Math.floor(lastTime);
  }

  if (hasSeasons && Number.isFinite(seasonIndex)) {
    navigationState.seasonIndex = seasonIndex;
  }

  if (hasSeasons && Number.isFinite(chapterIndex)) {
    navigationState.chapterIndex = chapterIndex;
  }

  return navigationState;
};

const cloneNavigationState = (value) => (
  value && typeof value === 'object' ? { ...value } : undefined
);

export default function useVodDetailOverlay({
  checkContentAccess,
  getNavigationState,
} = {}) {
  const navigate = useNavigate();
  const [vodDetail, setVodDetail] = useState(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState('');

  const openTrailer = useCallback((trailerUrl, onCloseCallback) => {
    if (!trailerUrl) {
      return;
    }

    setCurrentTrailerUrl(trailerUrl);
    setShowTrailerModal(true);

    if (typeof onCloseCallback === 'function') {
      window.__lastTrailerOnClose = onCloseCallback;
    }
  }, []);

  const closeTrailer = useCallback(() => {
    setShowTrailerModal(false);
    setCurrentTrailerUrl('');

    try {
      const callback = window.__lastTrailerOnClose;
      if (typeof callback === 'function') {
        callback();
      }
    } catch (error) {
      console.warn('[useVodDetailOverlay] Error calling trailer close callback', error);
    } finally {
      window.__lastTrailerOnClose = null;
    }
  }, []);

  const getBaseNavigationState = useCallback((item, itemType) => {
    if (typeof getNavigationState === 'function') {
      return cloneNavigationState(getNavigationState(item, itemType));
    }

    return cloneNavigationState(getNavigationState);
  }, [getNavigationState]);

  const navigateToItem = useCallback((item, itemType, extraState = null) => {
    if (!item) {
      return;
    }

    const fallbackType = itemType === 'continue-watching'
      ? (item?.itemType || item?.tipo || 'movie')
      : (itemType || item?.itemType || item?.tipo || 'movie');
    const resolvedType = resolveTVItemType(item, fallbackType);
    const normalizedItem = {
      ...item,
      itemType: resolvedType,
    };
    const itemId = normalizedItem._id || normalizedItem.id;

    if (!itemId) {
      console.error('[useVodDetailOverlay] No se puede navegar a un item sin ID valido.', normalizedItem);
      return;
    }

    let navigationState = getBaseNavigationState(normalizedItem, resolvedType) || {};

    if (extraState && typeof extraState === 'object') {
      navigationState = {
        ...navigationState,
        ...extraState,
      };
    }

    if (itemType === 'continue-watching') {
      navigationState = {
        ...navigationState,
        ...buildContinueWatchingState(normalizedItem),
      };

      try {
        localStorage.setItem(`continueWatching_${itemId}`, JSON.stringify({
          ...navigationState,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.warn('[useVodDetailOverlay] No se pudo guardar continueWatching en cache:', error);
      }
    }

    const path = `/watch/${resolvedType}/${itemId}`;
    const finalNavigationState = Object.keys(navigationState).length > 0 ? navigationState : undefined;
    const runNavigation = () => navigate(path, finalNavigationState ? { state: finalNavigationState } : undefined);

    if (typeof checkContentAccess === 'function') {
      checkContentAccess(normalizedItem, runNavigation);
      return;
    }

    runNavigation();
  }, [checkContentAccess, getBaseNavigationState, navigate]);

  const openVodDetail = useCallback((item, itemType) => {
    if (!item) {
      return;
    }

    const fallbackType = itemType === 'continue-watching'
      ? (item?.itemType || item?.tipo || 'movie')
      : (itemType || item?.itemType || item?.tipo || 'movie');
    const resolvedType = resolveTVItemType(item, fallbackType);
    const normalizedItem = {
      ...item,
      itemType: resolvedType,
    };

    if (resolvedType === 'channel') {
      navigateToItem(normalizedItem, resolvedType);
      return;
    }

    setVodDetail({
      item: normalizedItem,
      itemType: resolvedType,
    });
  }, [navigateToItem]);

  const closeVodDetail = useCallback(() => {
    setVodDetail(null);
  }, []);

  const handleContinueFromDetail = useCallback((detailItem) => {
    const item = detailItem || vodDetail?.item;
    if (!item) {
      return;
    }

    navigateToItem(item, 'continue-watching');
  }, [navigateToItem, vodDetail?.item]);

  const handlePlayFromDetail = useCallback((selection) => {
    const item = selection?.item || vodDetail?.item;
    if (!item) {
      return;
    }

    const hasEpisodeSelection = Number.isInteger(selection?.seasonIndex) && Number.isInteger(selection?.chapterIndex);
    navigateToItem(
      item,
      vodDetail?.itemType || item?.itemType || item?.tipo || 'movie',
      hasEpisodeSelection
        ? {
            seasonIndex: selection.seasonIndex,
            chapterIndex: selection.chapterIndex,
            continueWatching: false,
          }
        : null,
    );
  }, [navigateToItem, vodDetail?.item, vodDetail?.itemType]);

  const detailProgressPercent = useMemo(() => (
    vodDetail?.item ? getProgressPercent(vodDetail.item) : null
  ), [vodDetail?.item]);

  const detailCanContinue = useMemo(() => (
    vodDetail?.item ? canContinueWatchingItem(vodDetail.item) : false
  ), [vodDetail?.item]);

  const detailTrailerUrl = useMemo(() => (
    vodDetail?.item ? getTVItemTrailerUrl(vodDetail.item) : ''
  ), [vodDetail?.item]);

  return {
    vodDetail,
    setVodDetail,
    openVodDetail,
    closeVodDetail,
    navigateToItem,
    showTrailerModal,
    currentTrailerUrl,
    openTrailer,
    closeTrailer,
    detailProgressPercent,
    detailCanContinue,
    detailTrailerUrl,
    handleContinueFromDetail,
    handlePlayFromDetail,
  };
}
