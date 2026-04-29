import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Film, Play, Plus, Star, X } from 'lucide-react';
import {
  getTVItemBackdrop,
  getTVItemDescription,
  getTVItemGenre,
  getTVItemImage,
  getTVItemQualityBadges,
  getTVItemRating,
  getTVItemSeasons,
  getTVItemTitle,
  getTVItemTrailerUrl,
  getTVItemYear,
  resolveTVItemType,
} from '../utils/tvContentUtils.js';
import { fetchVideoById } from '../utils/api.js';

const TYPE_LABELS = {
  movie: 'Pelicula',
  serie: 'Serie',
  anime: 'Anime',
  dorama: 'Dorama',
  novela: 'Novela',
  documental: 'Documental',
  'zona kids': 'Zona Kids',
};

const getSafeSeasonNumber = (season, seasonIndex = 0) => {
  const seasonNumber = Number(
    season?.seasonNumber ??
    season?.temporada ??
    season?.season ??
    season?.number ??
    season?.numero,
  );
  return Number.isFinite(seasonNumber) && seasonNumber > 0 ? seasonNumber : (seasonIndex + 1);
};

const getSafeEpisodeNumber = (chapter, chapterIndex = 0) => {
  const episodeNumber = Number(
    chapter?.episodeNumber ??
    chapter?.chapterNumber ??
    chapter?.numero ??
    chapter?.numeroCapitulo ??
    chapter?.capitulo ??
    chapter?.episode ??
    chapter?.number,
  );
  return Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : (chapterIndex + 1);
};

const buildSeasonEpisodeLabel = (seasonNumber, episodeNumber) => {
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
};

const getFirstValidChapterIndex = (chapters) => {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return 0;
  }

  const firstValidChapterIndex = chapters.findIndex(Boolean);
  return firstValidChapterIndex >= 0 ? firstValidChapterIndex : 0;
};

const getSafeSelectedSeasonIndex = (seasons, preferredIndex = 0) => {
  if (!Array.isArray(seasons) || seasons.length === 0) {
    return 0;
  }

  if (Number.isInteger(preferredIndex) && preferredIndex >= 0 && preferredIndex < seasons.length) {
    return preferredIndex;
  }

  return 0;
};

const getSafeSelectedEpisodeIndex = (chapters, preferredIndex = 0) => {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return 0;
  }

  if (Number.isInteger(preferredIndex) && preferredIndex >= 0 && preferredIndex < chapters.length && chapters[preferredIndex]) {
    return preferredIndex;
  }

  return getFirstValidChapterIndex(chapters);
};

const getResumeTime = (item) => {
  const watchProgress = item?.watchProgress || {};
  return Number(watchProgress.lastTime ?? watchProgress.progress ?? item?.progressTime ?? 0);
};

const getResumeDuration = (item) => {
  const watchProgress = item?.watchProgress || {};
  return Number(watchProgress.duration ?? item?.duration ?? 0);
};

const getDerivedProgressPercent = (item) => {
  const lastTime = getResumeTime(item);
  const duration = getResumeDuration(item);

  if (!Number.isFinite(lastTime) || !Number.isFinite(duration) || lastTime <= 0 || duration <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, (lastTime / duration) * 100));
};

const getCanContinueState = (item) => {
  const watchProgress = item?.watchProgress || {};
  return (
    getResumeTime(item) > 0 ||
    Number.isFinite(Number(watchProgress.lastSeason)) ||
    Number.isFinite(Number(watchProgress.lastChapter))
  );
};

export default function MobileVodDetailModal({
  isOpen = false,
  item,
  itemType = 'movie',
  canContinue = false,
  progressPercent = null,
  onClose,
  onContinue,
  onPlay,
  onAddToMyList,
  onTrailer,
}) {
  const [detailItem, setDetailItem] = useState(item);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);
  const [isSavingToMyList, setIsSavingToMyList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [myListFeedback, setMyListFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeCurrentOverlay = () => onClose?.();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.__mobileVodDetailOpen = true;
    window.__mobileVodDetailClose = closeCurrentOverlay;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeCurrentOverlay();
      }
    };

    const handleBackButton = (event) => {
      event?.preventDefault?.();
      closeCurrentOverlay();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('backbutton', handleBackButton);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('backbutton', handleBackButton);
      if (window.__mobileVodDetailClose === closeCurrentOverlay) {
        window.__mobileVodDetailClose = null;
        window.__mobileVodDetailOpen = false;
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setDetailItem(item || null);
  }, [item]);

  useEffect(() => {
    if (!isOpen || !item) {
      return undefined;
    }

    const itemId = item?._id || item?.id;
    if (!itemId) {
      return undefined;
    }

    let isCancelled = false;

    const loadFullDetail = async () => {
      setIsLoadingDetail(true);

      try {
        const fetchedItem = await fetchVideoById(itemId);
        if (isCancelled || !fetchedItem) {
          return;
        }

        setDetailItem((currentItem) => ({
          ...(currentItem || item),
          ...fetchedItem,
          watchProgress: currentItem?.watchProgress || item?.watchProgress || fetchedItem?.watchProgress,
          progressTime: currentItem?.progressTime ?? item?.progressTime ?? fetchedItem?.progressTime,
          duration: currentItem?.duration ?? item?.duration ?? fetchedItem?.duration,
        }));
      } catch (error) {
        console.warn('[MobileVodDetailModal] No se pudo cargar el detalle completo del VOD.', error);
      } finally {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      }
    };

    loadFullDetail();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, item]);

  const modalItem = detailItem || item;
  const resolvedType = resolveTVItemType(modalItem, itemType);
  const episodicSeasons = useMemo(() => getTVItemSeasons(modalItem), [modalItem]);
  const hasEpisodesContent = resolvedType !== 'channel' && episodicSeasons.length > 0;

  useEffect(() => {
    if (!isOpen || !modalItem) {
      return;
    }

    const safeSeasonIndex = getSafeSelectedSeasonIndex(episodicSeasons, Number(modalItem?.watchProgress?.lastSeason));
    const safeSeason = episodicSeasons?.[safeSeasonIndex];
    const safeEpisodeIndex = getSafeSelectedEpisodeIndex(
      safeSeason?.chapters,
      Number(modalItem?.watchProgress?.lastChapter),
    );

    setSelectedSeasonIndex(safeSeasonIndex);
    setSelectedEpisodeIndex(safeEpisodeIndex);
    setIsSavingToMyList(false);
    setMyListFeedback({ type: '', message: '' });
  }, [episodicSeasons, hasEpisodesContent, isOpen, modalItem]);

  useEffect(() => {
    if (!hasEpisodesContent) {
      return;
    }

    const selectedSeason = episodicSeasons?.[selectedSeasonIndex];
    const safeEpisodeIndex = getSafeSelectedEpisodeIndex(selectedSeason?.chapters, selectedEpisodeIndex);
    if (safeEpisodeIndex !== selectedEpisodeIndex) {
      setSelectedEpisodeIndex(safeEpisodeIndex);
    }
  }, [episodicSeasons, hasEpisodesContent, selectedEpisodeIndex, selectedSeasonIndex]);

  useEffect(() => {
    if (!myListFeedback.message) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMyListFeedback({ type: '', message: '' });
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [myListFeedback.message]);

  if (!isOpen || !modalItem) {
    return null;
  }

  const title = getTVItemTitle(modalItem);
  const description = getTVItemDescription(modalItem);
  const backdropImage = getTVItemBackdrop(modalItem);
  const posterImage = getTVItemImage(modalItem);
  const rating = getTVItemRating(modalItem);
  const year = getTVItemYear(modalItem);
  const genre = getTVItemGenre(modalItem);
  const qualityBadges = getTVItemQualityBadges(modalItem).slice(0, 2);
  const trailerUrl = getTVItemTrailerUrl(modalItem);
  const hasTrailer = Boolean(trailerUrl && onTrailer);
  const watchProgress = modalItem?.watchProgress || {};
  const lastSeason = Number(watchProgress.lastSeason);
  const lastChapter = Number(watchProgress.lastChapter);
  const derivedProgressPercent = getDerivedProgressPercent(modalItem);
  const effectiveProgressPercent = Number.isFinite(progressPercent) ? progressPercent : derivedProgressPercent;
  const effectiveCanContinue = Boolean(canContinue || getCanContinueState(modalItem));
  const totalSeasonCount = hasEpisodesContent ? episodicSeasons.length : 0;
  const totalEpisodeCount = hasEpisodesContent
    ? episodicSeasons.reduce((accumulator, season) => accumulator + (Array.isArray(season?.chapters) ? season.chapters.filter(Boolean).length : 0), 0)
    : 0;
  const selectedSeason = hasEpisodesContent ? episodicSeasons[selectedSeasonIndex] : null;
  const selectedSeasonEpisodes = Array.isArray(selectedSeason?.chapters) ? selectedSeason.chapters : [];
  const selectedEpisode = selectedSeasonEpisodes[selectedEpisodeIndex] || null;
  const selectedSeasonNumber = hasEpisodesContent ? getSafeSeasonNumber(selectedSeason, selectedSeasonIndex) : null;
  const selectedEpisodeNumber = hasEpisodesContent ? getSafeEpisodeNumber(selectedEpisode, selectedEpisodeIndex) : null;
  const selectedEpisodeLabel = buildSeasonEpisodeLabel(selectedSeasonNumber, selectedEpisodeNumber);

  const continueBadges = [];
  if (Number.isFinite(lastSeason)) {
    continueBadges.push(`T${Math.max(1, lastSeason + 1)}`);
  }
  if (Number.isFinite(lastChapter)) {
    continueBadges.push(`E${Math.max(1, lastChapter + 1)}`);
  }
  if (Number.isFinite(effectiveProgressPercent)) {
    continueBadges.push(`${Math.round(effectiveProgressPercent)}% visto`);
  }

  const metaBadges = [
    TYPE_LABELS[resolvedType] || 'VOD',
    year,
    genre,
    rating ? `TMDb ${rating}` : '',
    ...qualityBadges,
  ].filter(Boolean).slice(0, 6);

  const detailStats = [
    hasEpisodesContent ? { label: 'Temporadas', value: String(totalSeasonCount) } : null,
    hasEpisodesContent ? { label: 'Episodios', value: String(totalEpisodeCount) } : null,
    genre ? { label: 'Genero', value: genre } : null,
    rating ? { label: 'TMDb', value: rating } : null,
    qualityBadges.length > 0 ? { label: 'Calidad', value: qualityBadges.join(' / ') } : null,
  ].filter(Boolean);

  const currentEpisodeSummary = hasEpisodesContent && selectedEpisode
    ? {
        label: selectedEpisodeLabel,
        title: selectedEpisode?.title || selectedEpisode?.name || `Episodio ${selectedEpisodeNumber}`,
        duration: selectedEpisode?.duration || selectedEpisode?.runtime || '',
      }
    : null;

  const myListFeedbackClasses = myListFeedback.type === 'error'
    ? 'border-red-400/40 bg-red-500/12 text-red-100'
    : myListFeedback.type === 'info'
      ? 'border-amber-300/35 bg-amber-400/12 text-amber-50'
      : 'border-emerald-400/30 bg-emerald-500/12 text-emerald-50';

  const handleAddToMyListClick = async () => {
    if (!onAddToMyList || isSavingToMyList) {
      return;
    }

    setIsSavingToMyList(true);

    try {
      const result = await onAddToMyList(modalItem);
      setMyListFeedback({
        type: result?.status === 'duplicate' ? 'info' : 'success',
        message: result?.status === 'duplicate'
          ? 'Ya estaba en tu lista'
          : 'Agregado a mi lista',
      });
    } catch (error) {
      setMyListFeedback({
        type: 'error',
        message: error?.message || 'No se pudo agregar a mi lista',
      });
    } finally {
      setIsSavingToMyList(false);
    }
  };

  const handlePlaySelection = () => {
    if (!onPlay) {
      return;
    }

    if (hasEpisodesContent) {
      onPlay({
        item: modalItem,
        seasonIndex: selectedSeasonIndex,
        chapterIndex: selectedEpisodeIndex,
      });
      return;
    }

    onPlay({ item: modalItem });
  };

  return (
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full px-4 py-5 sm:px-6">
          <section className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-fuchsia-300/14 bg-[#050816] shadow-[0_28px_90px_rgba(2,6,23,0.78)]">
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={backdropImage}
                alt={title}
                className="h-full w-full object-cover opacity-28 blur-[3px] scale-105"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(217,70,239,0.24),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(34,211,238,0.18),transparent_24%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#090214]/48 via-[#050816]/92 to-[#030712]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/90 to-[#050816]/72" />
            </div>

            <div className="relative z-10 flex items-center justify-between border-b border-white/8 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-sm"
                aria-label="Cerrar detalle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative z-10 flex flex-1 flex-col px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
              <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                <div className="mx-auto w-[160px] md:mx-0 md:w-full">
                  <div className="overflow-hidden rounded-[28px] border border-white/12 shadow-[0_24px_48px_rgba(2,6,23,0.58)]">
                    <img
                      src={posterImage}
                      alt={title}
                      className="aspect-[2/3] w-full object-cover"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-300/18 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
                      Detalle VOD
                    </span>
                    {rating && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/18 bg-amber-300/12 px-3 py-1 text-xs font-semibold text-amber-100">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        TMDb {rating}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
                    {title}
                  </h2>

                  {metaBadges.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {metaBadges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-slate-100"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  {detailStats.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {detailStats.map((detail) => (
                        <div
                          key={`${detail.label}-${detail.value}`}
                          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
                            {detail.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-5 text-white">
                            {detail.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {description && (
                    <p className="mt-5 text-sm leading-7 text-slate-200/84 sm:text-[15px]">
                      {description}
                    </p>
                  )}

                  {currentEpisodeSummary && (
                    <div className="mt-5 rounded-[22px] border border-cyan-300/14 bg-cyan-400/[0.07] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/78">
                        Episodio seleccionado
                      </p>
                      <p className="mt-2 text-base font-bold text-white">
                        {currentEpisodeSummary.label}
                        {currentEpisodeSummary.title ? ` / ${currentEpisodeSummary.title}` : ''}
                      </p>
                      {currentEpisodeSummary.duration ? (
                        <p className="mt-1 text-sm text-slate-300/82">
                          {currentEpisodeSummary.duration}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {effectiveCanContinue && (
                    <div className="mt-6 rounded-[24px] border border-cyan-300/12 bg-slate-950/34 p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/84">
                        <span>Continuar viendo</span>
                        {continueBadges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-full border border-cyan-300/10 bg-cyan-400/10 px-2.5 py-1 text-[10px] text-cyan-50"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-900/90">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400"
                          style={{ width: `${Math.max(0, Math.min(100, effectiveProgressPercent || 0))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                {isLoadingDetail ? (
                  <div className="mb-4 rounded-[18px] border border-cyan-300/14 bg-cyan-400/[0.06] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                    Actualizando detalles del contenido...
                  </div>
                ) : null}

                {myListFeedback.message ? (
                  <div className={`mb-4 rounded-[18px] border px-4 py-3 text-sm font-semibold ${myListFeedbackClasses}`}>
                    {myListFeedback.message}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {effectiveCanContinue && (
                    <button
                      type="button"
                      onClick={() => onContinue?.(modalItem)}
                      className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-amber-200/28 bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 px-5 py-4 text-base font-black text-slate-950 shadow-[0_16px_34px_rgba(250,204,21,0.22)]"
                    >
                      <Clock3 className="h-5 w-5" />
                      Continuar viendo
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePlaySelection}
                    disabled={hasEpisodesContent && !selectedEpisode}
                    className={`inline-flex items-center justify-center gap-2 rounded-[22px] border px-5 py-4 text-base font-black shadow-[0_16px_34px_rgba(34,211,238,0.22)] ${
                      hasEpisodesContent && !selectedEpisode
                        ? 'cursor-not-allowed border-white/10 bg-slate-800/70 text-slate-400 shadow-none'
                        : 'border-cyan-300/30 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950'
                    }`}
                  >
                    <Play className="h-5 w-5 fill-current" />
                    {hasEpisodesContent ? 'Ver episodio' : 'Ver'}
                  </button>

                  <button
                    type="button"
                    onClick={() => hasTrailer && onTrailer?.()}
                    disabled={!hasTrailer}
                    className={`inline-flex items-center justify-center gap-2 rounded-[22px] border px-5 py-4 text-base font-bold backdrop-blur-sm ${
                      hasTrailer
                        ? 'border-white/12 bg-slate-900/56 text-white'
                        : 'cursor-not-allowed border-white/10 bg-slate-900/36 text-slate-400'
                    }`}
                  >
                    <Film className="h-5 w-5" />
                    {hasTrailer ? 'Ver trailer' : 'Trailer no disponible'}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddToMyListClick}
                    disabled={isSavingToMyList}
                    className={`inline-flex items-center justify-center gap-2 rounded-[22px] border px-5 py-4 text-base font-bold backdrop-blur-sm ${
                      isSavingToMyList
                        ? 'cursor-wait border-fuchsia-300/12 bg-fuchsia-950/24 text-slate-300'
                        : 'border-fuchsia-300/18 bg-fuchsia-950/42 text-white'
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    {isSavingToMyList ? 'Guardando...' : 'Agregar a mi lista'}
                  </button>
                </div>
              </div>

              {hasEpisodesContent && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-slate-950/42 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/92">
                          Temporadas
                        </h3>
                        <p className="mt-1 text-xs text-slate-300/74">
                          {totalSeasonCount} disponibles
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-300/16 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                        T{selectedSeasonNumber}
                      </span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {episodicSeasons.map((season, index) => {
                        const seasonNumber = getSafeSeasonNumber(season, index);
                        const isSelected = index === selectedSeasonIndex;
                        const chapterCount = Array.isArray(season?.chapters) ? season.chapters.filter(Boolean).length : 0;

                        return (
                          <button
                            key={`${seasonNumber}-${index}`}
                            type="button"
                            onClick={() => {
                              setSelectedSeasonIndex(index);
                              setSelectedEpisodeIndex(getSafeSelectedEpisodeIndex(season?.chapters, 0));
                            }}
                            className={`min-w-[128px] rounded-[18px] border px-4 py-3 text-left transition-all duration-200 ${
                              isSelected
                                ? 'border-cyan-300 bg-cyan-400/12 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.32)]'
                                : 'border-white/10 bg-white/[0.04] text-slate-200'
                            }`}
                          >
                            <p className="text-sm font-bold">Temporada {seasonNumber}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-300/72">
                              {chapterCount} {chapterCount === 1 ? 'episodio' : 'episodios'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-slate-950/42 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/92">
                          Episodios
                        </h3>
                        <p className="mt-1 text-xs text-slate-300/74">
                          Temporada {selectedSeasonNumber} / {selectedSeasonEpisodes.filter(Boolean).length} disponibles
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {selectedSeasonEpisodes.map((episode, index) => {
                        if (!episode) {
                          return null;
                        }

                        const episodeNumber = getSafeEpisodeNumber(episode, index);
                        const episodeLabel = buildSeasonEpisodeLabel(selectedSeasonNumber, episodeNumber);
                        const isSelected = index === selectedEpisodeIndex;

                        return (
                          <button
                            key={`${selectedSeasonNumber}-${episodeNumber}-${index}`}
                            type="button"
                            onClick={() => setSelectedEpisodeIndex(index)}
                            className={`w-full rounded-[18px] border px-4 py-3 text-left transition-all duration-200 ${
                              isSelected
                                ? 'border-cyan-300 bg-cyan-400/12 shadow-[0_0_0_1px_rgba(103,232,249,0.32)]'
                                : 'border-white/10 bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                                  {episodeLabel}
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-white">
                                  {episode?.title || episode?.name || `Episodio ${episodeNumber}`}
                                </p>
                                {episode?.duration ? (
                                  <p className="mt-1 text-xs text-slate-300/72">
                                    {episode.duration}
                                  </p>
                                ) : null}
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
