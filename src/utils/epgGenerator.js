// src/utils/epgGenerator.js

/**
 * Generates a stable daily program guide (EPG) for any channel name.
 * Uses a seeded pseudo-random generator so the schedule remains exactly
 * the same for a channel throughout the calendar day.
 */

const PROGRAM_POOL = {
  sports: [
    { title: "Transmisión en Directo", desc: "Cobertura y eventos deportivos de la jornada en vivo." },
    { title: "Programación Deportiva", desc: "Resumen de noticias deportivas, análisis y jugadas destacadas." },
    { title: "Fútbol en Vivo", desc: "Transmisión en directo del encuentro programado." },
    { title: "Espacio Polideportivo", desc: "Cobertura de disciplinas, competencias y torneos internacionales." },
    { title: "Resumen Deportivo", desc: "Lo más destacado del deporte internacional y análisis de la fecha." },
  ],
  news: [
    { title: "Noticiero en Vivo", desc: "Información de actualidad, noticias nacionales e internacionales." },
    { title: "Edición Central", desc: "Resumen informativo con los hechos más relevantes del día." },
    { title: "Avance Informativo", desc: "Transmisión de noticias de último minuto y reportajes." },
    { title: "Entrevistas y Análisis", desc: "Actualidad política, económica y debate informativo." },
  ],
  movies: [
    { title: "Cine Estelar", desc: "Película destacada en la programación." },
    { title: "Espacio de Cine", desc: "Largometraje seleccionado para toda la familia." },
    { title: "Cine en Casa", desc: "Producción cinematográfica destacada." },
    { title: "Noche de Película", desc: "Función de cine en emisión regular." },
  ],
  kids: [
    { title: "Espacio Infantil", desc: "Programación y series animadas para el público infantil." },
    { title: "Animación en Directo", desc: "Aventuras animadas para toda la familia." },
    { title: "Zona Infantil", desc: "Dibujos animados y series para los más jóvenes." },
  ],
  anime: [
    { title: "Animación Oriental", desc: "Episodios y series de animación japonesa en emisión." },
    { title: "Especial de Anime", desc: "Historias y aventuras animadas." },
  ],
  series: [
    { title: "Serie en Emisión", desc: "Capítulo de la serie programada en la franja habitual." },
    { title: "Capítulo Estelar", desc: "Episodio de estreno o repetición estelar." },
    { title: "Maratón de Series", desc: "Emisión continua de episodios seleccionados." },
  ],
  general: [
    { title: "Transmisión en Vivo", desc: "Programación habitual en directo de la señal." },
    { title: "Espacio de Variedades", desc: "Contenido de entretenimiento y actualidad general." },
    { title: "Programación Habitual", desc: "Señal en directo disponible para sintonizar." },
  ],
};

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getPeruTimeComponents(d = new Date()) {
  const peruTime = new Date(d.getTime() - 5 * 3600 * 1000);
  return {
    year: peruTime.getUTCFullYear(),
    month: peruTime.getUTCMonth(),
    date: peruTime.getUTCDate(),
    hours: peruTime.getUTCHours(),
    minutes: peruTime.getUTCMinutes(),
  };
}

function getPeruDayBounds(d = new Date()) {
  const { year, month, date } = getPeruTimeComponents(d);
  // 00:00:00.000 in UTC-5 corresponds to 05:00:00.000 UTC
  const startOfDay = new Date(Date.UTC(year, month, date, 5, 0, 0, 0));
  // 23:59:59.999 in UTC-5 corresponds to next day 04:59:59.999 UTC
  const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000 - 1);
  return { startOfDay, endOfDay, year, month, date };
}

function getSeed(channelName, channelId, date) {
  const cleanName = String(channelName || '').toLowerCase().trim();
  const cleanId = String(channelId || '').trim();
  const { year, month, date: day } = getPeruTimeComponents(date);
  const str = `${cleanName}-${cleanId}-${year}-${month}-${day}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getCategoryFromChannelName(name) {
  const lowercaseName = String(name || '').toLowerCase();
  
  if (
    lowercaseName.includes("sport") ||
    lowercaseName.includes("deporte") ||
    lowercaseName.includes("espn") ||
    lowercaseName.includes("fox") ||
    lowercaseName.includes("directv") ||
    lowercaseName.includes("bein") ||
    lowercaseName.includes("golf") ||
    lowercaseName.includes("f1") ||
    lowercaseName.includes("ufc") ||
    lowercaseName.includes("combate") ||
    lowercaseName.includes("tnt sports") ||
    lowercaseName.includes("win sports")
  ) {
    return "sports";
  }
  
  if (
    lowercaseName.includes("news") ||
    lowercaseName.includes("notic") ||
    lowercaseName.includes("cnn") ||
    lowercaseName.includes("24h") ||
    lowercaseName.includes("prensa") ||
    lowercaseName.includes("chv") ||
    lowercaseName.includes("mega") ||
    lowercaseName.includes("tvn") ||
    lowercaseName.includes("c13") ||
    lowercaseName.includes("chilevision") ||
    lowercaseName.includes("canal 13") ||
    lowercaseName.includes("caracol") ||
    lowercaseName.includes("rcn")
  ) {
    return "news";
  }
  
  if (
    lowercaseName.includes("movie") ||
    lowercaseName.includes("cine") ||
    lowercaseName.includes("hbo") ||
    lowercaseName.includes("star") ||
    lowercaseName.includes("cinecanal") ||
    lowercaseName.includes("tnt") ||
    lowercaseName.includes("space") ||
    lowercaseName.includes("axn") ||
    lowercaseName.includes("cinema") ||
    lowercaseName.includes("multiplex") ||
    lowercaseName.includes("golden") ||
    lowercaseName.includes("fx")
  ) {
    return "movies";
  }
  
  if (
    lowercaseName.includes("kids") ||
    lowercaseName.includes("disney") ||
    lowercaseName.includes("nick") ||
    lowercaseName.includes("cartoon") ||
    lowercaseName.includes("discovery kids") ||
    lowercaseName.includes("anim") ||
    lowercaseName.includes("baby") ||
    lowercaseName.includes("boing")
  ) {
    return "kids";
  }
  
  if (lowercaseName.includes("anime") || lowercaseName.includes("toon") || lowercaseName.includes("crunchy")) {
    return "anime";
  }
  
  if (
    lowercaseName.includes("series") ||
    lowercaseName.includes("warner") ||
    lowercaseName.includes("sony") ||
    lowercaseName.includes("fox series") ||
    lowercaseName.includes("universal") ||
    lowercaseName.includes("amc") ||
    lowercaseName.includes("syfy")
  ) {
    return "series";
  }

  return "general";
}

function getRandomProgram(channelName, seed, hour) {
  const category = getCategoryFromChannelName(channelName);
  const pool = PROGRAM_POOL[category] || PROGRAM_POOL.general;
  
  const index = Math.floor(seededRandom(seed) * pool.length);
  const program = pool[index];
  
  let suffix = "";
  if (category === "news") {
    if (hour >= 6 && hour < 12) suffix = " Matinal";
    else if (hour >= 12 && hour < 18) suffix = " Mediodía";
    else if (hour >= 18 && hour < 23) suffix = " Central";
    else suffix = " Noche";
  }

  return {
    title: program.title + suffix,
    description: `${program.desc} Sintoniza ${channelName || 'el canal'} para ver la emisión en vivo.`,
  };
}

/**
 * Generates an array of programs for a full day (from 00:00 to 23:59 Perú Time)
 * for a specific channel name/ID.
 */
export function getEPGForChannel(channelName, channelId, date = new Date(), realNow = null, realNext = null) {
  const seed = getSeed(channelName, channelId, date);
  const { startOfDay, endOfDay } = getPeruDayBounds(date);

  const realNowStart = realNow?.start ? new Date(realNow.start) : null;
  const realNowStop = realNow?.stop ? new Date(realNow.stop) : null;
  const hasValidRealNow = realNowStart && realNowStop && !isNaN(realNowStart.getTime()) && !isNaN(realNowStop.getTime()) && realNowStart < realNowStop;

  const realNextStart = realNext?.start ? new Date(realNext.start) : null;
  const realNextStop = realNext?.stop ? new Date(realNext.stop) : null;
  const hasValidRealNext = realNextStart && realNextStop && !isNaN(realNextStart.getTime()) && !isNaN(realNextStop.getTime()) && realNextStart < realNextStop;

  const programs = [];
  let programIndex = 0;

  // Helper to generate simulated programs between [fromTime, toTime]
  const fillSimulatedPrograms = (fromTime, toTime) => {
    let cur = new Date(fromTime);
    while (cur < toTime) {
      const prgSeed = seed + programIndex;
      const durationOpts = [30, 60, 60, 90, 120];
      const duration = durationOpts[Math.floor(seededRandom(prgSeed) * durationOpts.length)];
      
      const prgStart = new Date(cur);
      let prgEnd = new Date(cur.getTime() + duration * 60 * 1000);
      if (prgEnd > toTime) {
        prgEnd = new Date(toTime);
      }

      // If duration is too tiny (< 10 min) and we already have programs, extend previous program instead
      if (prgEnd.getTime() - prgStart.getTime() < 10 * 60 * 1000 && programs.length > 0) {
        programs[programs.length - 1].end = prgEnd;
        programs[programs.length - 1].duration = Math.round((prgEnd - programs[programs.length - 1].start) / 60000);
        break;
      }

      const peruHour = getPeruTimeComponents(prgStart).hours;
      const { title, description } = getRandomProgram(channelName, prgSeed, peruHour);

      programs.push({
        id: `${channelId || 'chan'}-${programIndex}`,
        title,
        description,
        start: prgStart,
        end: prgEnd,
        duration: Math.round((prgEnd - prgStart) / 60000),
        isReal: false,
      });

      cur = prgEnd;
      programIndex++;
    }
  };

  if (hasValidRealNow) {
    // Fill before realNow
    if (realNowStart > startOfDay) {
      fillSimulatedPrograms(startOfDay, realNowStart);
    }
    // Add realNow
    programs.push({
      id: `${channelId || 'chan'}-live`,
      title: typeof realNow === 'string' ? realNow : (realNow.title || 'En vivo'),
      description: (typeof realNow === 'object' && realNow.desc) ? realNow.desc : `${channelName || 'Canal'} en vivo`,
      start: realNowStart,
      end: realNowStop,
      duration: Math.round((realNowStop - realNowStart) / 60000),
      isReal: true,
    });
    programIndex++;

    let afterTime = realNowStop;
    if (hasValidRealNext && realNextStart >= realNowStop && realNextStart < endOfDay) {
      if (realNextStart > realNowStop) {
        fillSimulatedPrograms(realNowStop, realNextStart);
      }
      programs.push({
        id: `${channelId || 'chan'}-next`,
        title: typeof realNext === 'string' ? realNext : (realNext.title || 'Próximo programa'),
        description: (typeof realNext === 'object' && realNext.desc) ? realNext.desc : 'Próxima emisión',
        start: realNextStart,
        end: realNextStop,
        duration: Math.round((realNextStop - realNextStart) / 60000),
        isReal: true,
      });
      programIndex++;
      afterTime = realNextStop;
    }

    if (afterTime < endOfDay) {
      fillSimulatedPrograms(afterTime, endOfDay);
    }
  } else {
    // Standard generation with Peru time boundaries
    fillSimulatedPrograms(startOfDay, endOfDay);

    // If realNow title exists without start/stop, inject into current slot
    if (realNow && programs.length > 0) {
      const liveSlot = programs.find(p => p.start <= date && date < p.end);
      if (liveSlot) {
        liveSlot.title = typeof realNow === 'string' ? realNow : (realNow.title || liveSlot.title);
        if (typeof realNow === 'object' && realNow.desc) {
          liveSlot.description = realNow.desc;
        }
        liveSlot.isReal = true;
      }
    }
    // If realNext title exists without start/stop, inject into slot after live
    if (realNext && programs.length > 0) {
      const liveIdx = programs.findIndex(p => p.start <= date && date < p.end);
      if (liveIdx !== -1 && liveIdx + 1 < programs.length) {
        programs[liveIdx + 1].title = typeof realNext === 'string' ? realNext : (realNext.title || programs[liveIdx + 1].title);
        if (typeof realNext === 'object' && realNext.desc) {
          programs[liveIdx + 1].description = realNext.desc;
        }
        programs[liveIdx + 1].isReal = true;
      }
    }
  }

  return programs;
}

/**
 * Finds the currently active program in a channel's EPG array.
 */
export function getCurrentProgram(programs, date = new Date()) {
  if (!Array.isArray(programs)) return null;
  return programs.find(p => p.start <= date && date < p.end) || null;
}
