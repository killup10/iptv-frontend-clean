import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { CheckBadgeIcon, LockClosedIcon } from '@heroicons/react/24/solid';

const MovieSectionCard = ({
  section,
  onClick,
  moviesInSection = [],
  isLocked = false,
  lockHint = 'Necesitas un plan superior para abrir esta subseccion.',
}) => {
  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 1500,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    pauseOnHover: true,
  };

  const moviesWithThumbnails = moviesInSection.filter((m) => m.customThumbnail || m.thumbnail || m.logo);
  const hasMoviesToShow = moviesWithThumbnails.length > 0;

  const handleClick = () => {
    if (onClick) {
      onClick(section.key);
    }
  };

  const getPlanLabel = (planKey) => {
    switch (planKey) {
      case 'premium':
        return 'PREMIUM';
      case 'cinefilo':
        return 'CINEFILO';
      default:
        return '';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative aspect-[5/6] overflow-hidden rounded-[18px] border border-fuchsia-300/12 bg-[#090214] shadow-[0_16px_36px_rgba(46,16,101,0.28)] transition-all duration-300 sm:aspect-[2/3] sm:rounded-[24px] sm:shadow-[0_20px_48px_rgba(46,16,101,0.34)] ${isLocked ? 'cursor-pointer hover:-translate-y-0.5 hover:border-amber-200/26 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.16),0_24px_52px_rgba(88,28,135,0.24)]' : 'cursor-pointer hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-[0_0_0_1px_rgba(217,70,239,0.18),0_28px_60px_rgba(88,28,135,0.28)]'}`}
      title={isLocked ? lockHint : section.displayName}
    >
      {hasMoviesToShow ? (
        <Slider {...sliderSettings}>
          {moviesWithThumbnails.map((movie) => (
            <div key={movie.id || movie._id} className="relative aspect-[2/3] h-full w-full">
              <img
                src={movie.customThumbnail || movie.thumbnail || movie.logo}
                alt={`Poster de ${movie.title || movie.name}`}
                className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${isLocked ? 'brightness-[0.66] saturate-[0.72]' : ''}`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/placeholder-thumbnail.png';
                }}
              />
            </div>
          ))}
        </Slider>
      ) : (
        <img
          src={section.thumbnailSample || '/img/placeholder-thumbnail.png'}
          alt={`Contenido de ${section.displayName}`}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${isLocked ? 'brightness-[0.66] saturate-[0.72]' : ''}`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/img/placeholder-thumbnail.png';
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_38%),radial-gradient(circle_at_18%_0%,rgba(217,70,239,0.24),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(250,204,21,0.14),transparent_22%),linear-gradient(180deg,rgba(20,6,46,0.04),rgba(2,6,23,0.55))]" />
      {isLocked ? (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,4,20,0.18),rgba(2,6,23,0.56))]" />
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#090214]/95 via-[#1a0938]/74 to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-2.5 sm:p-5">
        <div className="rounded-[16px] border border-fuchsia-300/16 bg-[linear-gradient(135deg,rgba(58,16,95,0.8),rgba(25,8,50,0.74)_60%,rgba(7,10,25,0.8))] p-3 shadow-[0_16px_28px_rgba(88,28,135,0.22)] backdrop-blur-md sm:rounded-2xl sm:p-4 sm:shadow-[0_20px_36px_rgba(88,28,135,0.24)]">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-200/88 sm:mb-2 sm:text-[10px] sm:tracking-[0.28em]">
            Coleccion destacada
          </p>
          <h3 className="text-sm font-black leading-tight text-white sm:text-xl md:text-2xl">
            {section.displayName}
          </h3>
          {section.description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-300/90 sm:mt-2 sm:text-sm sm:leading-5">
              {section.description}
            </p>
          )}
        </div>
      </div>

      {isLocked ? (
        <>
          <div className="absolute right-2 top-2 rounded-full border border-red-400/35 bg-gradient-to-br from-red-950/88 to-fuchsia-950/72 p-1.5 text-white shadow-[0_14px_28px_rgba(127,29,29,0.35)] backdrop-blur-md sm:right-3 sm:top-3 sm:p-2" title={lockHint}>
            <LockClosedIcon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-[#090214]/96 via-[#1a0938]/82 to-transparent px-2.5 pb-2.5 pt-8 sm:px-4 sm:pb-4 sm:pt-10">
            <div className="rounded-[16px] border border-white/10 bg-black/20 p-2.5 backdrop-blur-sm sm:rounded-2xl sm:p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/90 sm:text-[10px] sm:tracking-[0.18em]">
                Bloqueado
              </p>
              <p className="mt-1 text-[11px] leading-4 text-white/75 sm:text-xs sm:leading-5">
                {lockHint}
              </p>
            </div>
          </div>
        </>
      ) : (
        section.requiresPlan && section.requiresPlan !== 'basico' && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-amber-200/30 bg-[linear-gradient(135deg,rgba(59,18,3,0.82),rgba(91,33,5,0.7),rgba(88,28,135,0.6))] px-2 py-1 text-[10px] font-bold text-amber-100 shadow-[0_12px_24px_rgba(120,53,15,0.28)] backdrop-blur-md sm:right-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-xs">
            <CheckBadgeIcon className="hidden h-4 w-4 sm:inline" />
            {getPlanLabel(section.requiresPlan)}
          </div>
        )
      )}
    </div>
  );
};

export default MovieSectionCard;
