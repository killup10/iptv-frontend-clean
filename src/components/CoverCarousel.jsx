import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import {
  getTVItemBackdrop,
  getTVItemDescription,
  getTVItemTitle,
  getTVItemTrailerUrl,
  getTVItemYear,
  resolveTVItemType,
} from '../utils/tvContentUtils.js';

const HERO_IMAGE_FIELDS = [
  'bannerImage',
  'bannerUrl',
  'customBanner',
  'customBackdrop',
  'horizontalImage',
  'horizontalThumbnail',
  'heroBanner',
  'heroImage',
  'landscapeThumbnail',
  'backdropPath',
  'backdrop_path',
  'backdrop',
  'banner',
  'cover',
  'imagenHorizontal',
  'portadaHorizontal',
];

const TYPE_LABELS = {
  movie: 'Pelicula',
  serie: 'Serie',
  anime: 'Anime',
  dorama: 'Dorama',
  novela: 'Novela',
  documental: 'Documental',
  'zona kids': 'Zona Kids',
};

const hasAdminBannerImage = (item) => typeof item?.bannerImage === 'string' && item.bannerImage.trim().length > 0;

const hasDedicatedHeroImage = (item) => (
  HERO_IMAGE_FIELDS.some((field) => {
    const value = item?.[field];
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return Boolean(value);
  })
);

const isLikelyUrl = (value) => /^https?:\/\/\S+$/i.test(String(value || '').trim());

const getHeroDescription = (item, backdropImage) => {
  const candidates = [
    getTVItemDescription(item),
    item?.sinopsis,
    item?.overview,
    item?.plot,
    item?.descripcion,
    item?.description,
  ];

  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (!text || isLikelyUrl(text) || text === backdropImage) {
      continue;
    }
    return text;
  }

  return '';
};

const getRandomDisplayItems = (items, mobileMode = false) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  if (!mobileMode) {
    const count = Math.min(4, Math.max(3, Math.floor(items.length / 3)));
    return [...items].sort(() => Math.random() - 0.5).slice(0, count);
  }

  const adminBannerItems = items.filter(hasAdminBannerImage);
  const heroCandidates = items.filter(hasDedicatedHeroImage);
  const sourceItems = adminBannerItems.length > 0
    ? adminBannerItems
    : heroCandidates.length > 0
      ? heroCandidates
      : items;
  const desiredCount = Math.min(4, Math.max(3, Math.floor(sourceItems.length / 3)));
  const count = Math.min(sourceItems.length, Math.max(1, desiredCount));

  return [...sourceItems].sort(() => Math.random() - 0.5).slice(0, count);
};

export default function CoverCarousel({
  items = [],
  onItemClick,
  onTrailerClick,
  interval = 5000,
  mobileMode = false,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayItems, setDisplayItems] = useState([]);

  useEffect(() => {
    if (items && items.length > 0) {
      setDisplayItems(getRandomDisplayItems(items, mobileMode));
      setCurrentIndex(0);
      return;
    }

    setDisplayItems([]);
    setCurrentIndex(0);
  }, [items, mobileMode]);

  useEffect(() => {
    if (displayItems.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, interval);

    return () => clearInterval(timer);
  }, [displayItems, interval]);

  if (displayItems.length === 0) {
    return null;
  }

  const currentItem = displayItems[currentIndex];
  const resolvedType = resolveTVItemType(currentItem, currentItem?.tipo || currentItem?.itemType || 'movie');
  const typeLabel = TYPE_LABELS[resolvedType] || 'Contenido';

  const mobileCoverUrl = getTVItemBackdrop(currentItem);
  const mobileYear = getTVItemYear(currentItem);
  const mobileTitle = getTVItemTitle(currentItem);
  const mobileDescription = getHeroDescription(currentItem, mobileCoverUrl);
  const trailerUrl = getTVItemTrailerUrl(currentItem);

  const bannerUrl = currentItem?.bannerImage && currentItem.bannerImage.trim() ? currentItem.bannerImage : null;
  const verticalUrl = currentItem?.customThumbnail && currentItem.customThumbnail.trim() ? currentItem.customThumbnail : null;
  const desktopCoverUrl = bannerUrl || verticalUrl || currentItem?.thumbnail || currentItem?.portada || mobileCoverUrl || '';
  const desktopYear = currentItem?.releaseYear || mobileYear || '';
  const desktopTitle = currentItem?.title || currentItem?.name || mobileTitle || 'Sin titulo';

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  };

  if (mobileMode) {
    return (
      <div className="w-full">
        <style>{`
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(1.04);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-slide-in-left {
            animation: slideInLeft 0.8s ease-out forwards;
          }
          .animate-slide-in-up {
            animation: slideInUp 0.8s ease-out forwards;
            animation-delay: 0.2s;
          }
          .animate-scale-in {
            animation: scaleIn 0.9s ease-out forwards;
          }
        `}</style>

        <div className="relative overflow-hidden">
          <div className="relative h-[35vh] min-h-[255px] max-h-[360px]">
            <img
              src={mobileCoverUrl}
              alt={mobileTitle}
              className="absolute inset-0 h-full w-full animate-scale-in object-cover"
              style={{
                objectPosition: 'center center',
                transition: 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                filter: 'brightness(0.9) saturate(1.08)',
              }}
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(217,70,239,0.12),transparent_24%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,18,0.08)_0%,rgba(4,7,18,0.06)_30%,rgba(4,7,18,0.52)_72%,rgba(4,7,18,0.92)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,1,18,0.16)_0%,rgba(7,1,18,0)_46%,rgba(7,1,18,0.22)_100%)]" />

            <div className="relative flex h-full items-center px-3 sm:px-4">
              <button
                onClick={handlePrev}
                className="absolute left-2 z-20 rounded-full border border-fuchsia-300/20 bg-gradient-to-br from-violet-950/90 via-fuchsia-950/70 to-slate-950/85 p-2 text-white shadow-[0_14px_30px_rgba(88,28,135,0.3)] backdrop-blur-md"
                aria-label="Previous item"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
                <div className="max-w-[78%]">
                  <p className="animate-slide-in-left mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/90">
                    Seleccion destacada
                  </p>

                  <h1 className="animate-slide-in-left break-words text-[1.9rem] font-black leading-[1.05] text-white drop-shadow-[0_0_18px_rgba(217,70,239,0.2)]">
                    {mobileTitle}
                  </h1>

                  <div className="animate-slide-in-left mt-2 flex flex-wrap items-center gap-2" style={{ animationDelay: '0.1s' }}>
                    {mobileYear && (
                      <span className="rounded-full border border-amber-200/26 bg-amber-300/12 px-3 py-1 text-xs font-semibold text-amber-100">
                        {mobileYear}
                      </span>
                    )}
                    <span className="rounded-full border border-fuchsia-300/22 bg-fuchsia-400/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-pink-100">
                      {typeLabel}
                    </span>
                  </div>

                  {mobileDescription && (
                    <p className="animate-slide-in-up mt-2 line-clamp-2 max-w-md text-xs leading-5 text-slate-100/88">
                      {mobileDescription}
                    </p>
                  )}

                  <div className="animate-slide-in-up flex flex-wrap gap-2 pt-3">
                    <button
                      onClick={() => onItemClick?.(currentItem, resolvedType)}
                      className="flex items-center gap-2 rounded-xl border border-amber-200/35 bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-[0_16px_34px_rgba(250,204,21,0.28)]"
                    >
                      <Play className="h-4 w-4 fill-slate-950" />
                      VER AHORA
                    </button>

                    {trailerUrl && (
                      <button
                        onClick={() => onTrailerClick?.(currentItem, trailerUrl)}
                        className="rounded-xl border border-fuchsia-300/24 bg-gradient-to-r from-violet-950/88 via-fuchsia-950/72 to-slate-950/78 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md"
                      >
                        Ver trailer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="absolute right-2 z-20 rounded-full border border-fuchsia-300/20 bg-gradient-to-br from-violet-950/90 via-fuchsia-950/70 to-slate-950/85 p-2 text-white shadow-[0_14px_30px_rgba(88,28,135,0.3)] backdrop-blur-md"
                aria-label="Next item"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2 py-2">
          {displayItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300'
                  : 'w-2 bg-white/30'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-0 md:px-4 lg:px-6">
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(1.05);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.8s ease-out forwards;
        }
        .animate-slide-in-up {
          animation: slideInUp 0.8s ease-out forwards;
          animation-delay: 0.2s;
        }
        .animate-scale-in {
          animation: scaleIn 0.9s ease-out forwards;
        }
      `}</style>

      <div className="relative overflow-hidden md:rounded-[34px] md:border md:border-fuchsia-300/18 md:shadow-[0_0_0_1px_rgba(217,70,239,0.18),0_28px_90px_rgba(46,16,101,0.34)]">
        <div className="relative min-h-[360px] md:aspect-[21/9]">
          <img
            src={desktopCoverUrl}
            alt={desktopTitle}
            className="absolute inset-0 h-full w-full animate-scale-in object-cover"
            style={{
              objectPosition: 'center center',
              transition: 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              filter: 'brightness(0.92) saturate(1.06)',
            }}
          />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(217,70,239,0.18),transparent_26%),radial-gradient(circle_at_82%_14%,rgba(34,211,238,0.12),transparent_22%),linear-gradient(90deg,rgba(5,8,22,0.72)_0%,rgba(5,8,22,0.26)_38%,rgba(5,8,22,0.08)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#090214]/18 via-transparent to-[#070112]/28" />

          <div className="relative flex h-full items-center px-4 sm:px-6 md:px-8 lg:px-10">
            <button
              onClick={handlePrev}
              className="absolute left-3 z-20 rounded-full border border-fuchsia-300/20 bg-gradient-to-br from-violet-950/90 via-fuchsia-950/70 to-slate-950/85 p-2 text-white shadow-[0_14px_30px_rgba(88,28,135,0.3)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200/40 hover:shadow-[0_16px_34px_rgba(250,204,21,0.18)] sm:left-5 sm:p-3"
              aria-label="Previous item"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className="absolute bottom-10 left-6 z-10 max-w-[520px] md:left-10 lg:left-12">
              <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(41,9,69,0.9),rgba(27,10,49,0.86)_58%,rgba(11,15,34,0.82))] px-6 py-5 shadow-[0_24px_48px_rgba(5,8,22,0.42)] backdrop-blur-md md:px-7 md:py-6">
                <p className="animate-slide-in-left mb-3 text-[11px] font-semibold uppercase tracking-[0.34em] text-amber-200/92">
                  Seleccion destacada
                </p>

                <h1 className="animate-slide-in-left line-clamp-2 break-words text-4xl font-black leading-[0.98] text-white md:text-5xl">
                  {desktopTitle}
                </h1>

                <div className="animate-slide-in-left mt-4 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.1s' }}>
                  {desktopYear && (
                    <span className="rounded-full border border-white/55 px-4 py-1.5 text-base font-semibold text-white">
                      {desktopYear}
                    </span>
                  )}
                  <span className="rounded-full border border-white/55 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                    {typeLabel}
                  </span>
                </div>

                {mobileDescription && (
                  <p className="animate-slide-in-up mt-5 line-clamp-3 max-w-[420px] text-lg leading-8 text-white/92">
                    {mobileDescription}
                  </p>
                )}

                <div className="animate-slide-in-up mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => onItemClick?.(currentItem, currentItem?.tipo || resolvedType || 'movie')}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 px-6 py-4 text-xl font-black text-slate-950 shadow-[0_16px_34px_rgba(250,204,21,0.26)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(250,204,21,0.34)]"
                  >
                    <Play className="h-5 w-5 fill-slate-950" />
                    VER AHORA
                  </button>

                  {trailerUrl && (
                    <button
                      onClick={() => onTrailerClick?.(currentItem, trailerUrl)}
                      className="rounded-2xl border border-white/45 bg-white/10 px-6 py-4 text-xl font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/16"
                    >
                      Ver trailer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="absolute right-3 z-20 rounded-full border border-fuchsia-300/20 bg-gradient-to-br from-violet-950/90 via-fuchsia-950/70 to-slate-950/85 p-2 text-white shadow-[0_14px_30px_rgba(88,28,135,0.3)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200/40 hover:shadow-[0_16px_34px_rgba(250,204,21,0.18)] sm:right-5 sm:p-3"
              aria-label="Next item"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-fuchsia-300/18 bg-[linear-gradient(135deg,rgba(46,16,101,0.68),rgba(15,10,35,0.78))] px-3 py-2 shadow-[0_12px_30px_rgba(88,28,135,0.28)] backdrop-blur-md md:bottom-5 md:right-5">
              {displayItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300'
                      : 'w-2 bg-white/35 hover:bg-fuchsia-200/65'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
