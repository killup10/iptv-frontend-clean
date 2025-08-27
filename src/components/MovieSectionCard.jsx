// src/components/MovieSectionCard.jsx
import React from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { LockClosedIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';

const MovieSectionCard = ({ section, onClick, userPlan, moviesInSection = [] }) => {
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

  const moviesWithThumbnails = moviesInSection.filter(m => m.customThumbnail || m.thumbnail || m.logo);
  const hasMoviesToShow = moviesWithThumbnails.length > 0;

  const planHierarchy = {
    'basico': 1,
    'premium': 2,
    'cinefilo': 3
  };


  const userHasAccess = () => {
    if (!section.requiresPlan) return true; // Si no requiere plan, es accesible
    const requiredPlanLevel = planHierarchy[section.requiresPlan] || 0;
    const userPlanLevel = planHierarchy[userPlan] || 0;
    return userPlanLevel >= requiredPlanLevel;
  };

  const hasAccess = userHasAccess();

  const handleClick = () => {
    if (hasAccess) {
      onClick(section.key);
    } else {
      alert(`"${section.displayName}" está disponible para planes PREMIUM o CINÉFILO. Compra o actualiza tu membresía para acceder.`);
    }
  };

  const getPlanLabel = (planKey) => {
    switch(planKey) {
        case 'premium': return 'PREMIUM';
        case 'cinefilo': return 'CINÉFILO';
        default: return '';
    }
  }

  return (
    <div 
      onClick={handleClick}
      className={`relative aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden shadow-lg 
                  cursor-pointer group hover:shadow-2xl transition-all duration-300 transform hover:scale-105
                  ${!hasAccess ? 'cursor-not-allowed' : ''}`}
      title={hasAccess ? section.displayName : `Requiere plan ${section.requiresPlan}`}
    >
      {hasMoviesToShow ? (
        <Slider {...sliderSettings}>
          {moviesWithThumbnails.map((movie) => (
            <div key={movie.id || movie._id} className="relative aspect-[2/3] w-full h-full">
              <img
                src={movie.customThumbnail || movie.thumbnail || movie.logo}
                alt={`Poster de ${movie.title || movie.name}`}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
              />
            </div>
          ))}
        </Slider>
      ) : (
        <img 
          src={section.thumbnailSample || '/img/placeholder-thumbnail.png'} 
          alt={`Contenido de ${section.displayName}`}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
        />
      )}
      {/* Overlay para mejor legibilidad del texto y mostrar info */}

      <div className={`absolute inset-0 flex flex-col justify-end p-3 sm:p-4 md:p-5 
                      bg-gradient-to-t from-black/90 via-black/50 to-transparent`}>
        <h3 className="text-white text-lg sm:text-xl md:text-2xl font-bold drop-shadow-lg leading-tight">
          {section.displayName}
        </h3>
      </div>

      {/* Indicador de acceso/plan */}
      {!hasAccess ? (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-red-600 p-1.5 sm:p-2 rounded-full text-white shadow-md" title={`Requiere plan ${section.requiresPlan}`}>
          <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      ) : (
        section.requiresPlan && section.requiresPlan !== 'basico' && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-yellow-500 text-black px-2 py-1 text-xs sm:text-sm rounded-full font-bold shadow-md flex items-center">
            <CheckBadgeIcon className="h-4 w-4 mr-1 hidden sm:inline" /> 
            {getPlanLabel(section.requiresPlan)}
          </div>
        )
      )}
    </div>
  );
};

export default MovieSectionCard;
