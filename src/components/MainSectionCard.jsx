// src/components/MainSectionCard.jsx
import React, { useState, useEffect } from 'react';
import { LockClosedIcon, CheckBadgeIcon } from '@heroicons/react/24/solid'; // CheckBadgeIcon es una sugerencia

const MainSectionCard = ({ section, onClick, userPlan, moviesInSection = [] }) => {
  const [currentThumbnail, setCurrentThumbnail] = useState(section.thumbnailSample || '/img/placeholder-thumbnail.png');
  
  useEffect(() => {
    let intervalId;
    if (moviesInSection && moviesInSection.length > 0) {
      // Inicializar con la primera película que tenga thumbnail
      const initialMovieWithThumb = moviesInSection.find(m => m.customThumbnail || m.thumbnail || m.logo);
      if (initialMovieWithThumb) {
        setCurrentThumbnail(initialMovieWithThumb.customThumbnail || initialMovieWithThumb.thumbnail || initialMovieWithThumb.logo);
      } else if (section.thumbnailSample) {
        setCurrentThumbnail(section.thumbnailSample);
      }

      if (moviesInSection.length > 1) { // Solo rotar si hay más de una película con thumbnail
        intervalId = setInterval(() => {
          const moviesWithThumbnails = moviesInSection.filter(m => m.customThumbnail || m.thumbnail || m.logo);
          if (moviesWithThumbnails.length > 0) {
            const randomIndex = Math.floor(Math.random() * moviesWithThumbnails.length);
            const newMovieThumbnail = moviesWithThumbnails[randomIndex]?.customThumbnail || moviesWithThumbnails[randomIndex]?.thumbnail || moviesWithThumbnails[randomIndex]?.logo;
            if (newMovieThumbnail) {
              setCurrentThumbnail(newMovieThumbnail);
            }
          }
        }, 4000); // Cambia cada 4 segundos
      }
    } else if (section.thumbnailSample) {
        setCurrentThumbnail(section.thumbnailSample);
    } else {
        setCurrentThumbnail('/img/placeholder-thumbnail.png');
    }
    return () => clearInterval(intervalId);
  }, [moviesInSection, section.thumbnailSample]);

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
      // Aquí podrías usar un modal o una notificación más elegante en lugar de alert
      alert(`Necesitas un plan '${section.requiresPlan}' o superior para acceder a "${section.displayName}". Tu plan actual es '${userPlan}'.`);
      // Ejemplo: navigate('/planes'); o similar
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
      className={`relative aspect-[16/9] sm:aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg 
                  cursor-pointer group hover:shadow-2xl transition-all duration-300 transform hover:scale-105
                  ${!hasAccess ? 'cursor-not-allowed' : ''}`}
      title={hasAccess ? section.displayName : `Requiere plan ${section.requiresPlan}`}
    >
      <img 
        src={currentThumbnail} 
        alt={`Contenido de ${section.displayName}`}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
      />
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

export default MainSectionCard;