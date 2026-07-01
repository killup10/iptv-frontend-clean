// src/utils/epgGenerator.js

/**
 * Generates a stable daily program guide (EPG) for any channel name.
 * Uses a seeded pseudo-random generator so the schedule remains exactly
 * the same for a channel throughout the calendar day.
 */

const PROGRAM_POOL = {
  sports: [
    { title: "Fútbol: Copa G-Play", desc: "El partido de la jornada en vivo y en directo con relatores oficiales." },
    { title: "Sports Center", desc: "Resumen completo de las noticias deportivas globales y goles destacados." },
    { title: "ESPN F360", desc: "Debate, análisis y entrevistas sobre la actualidad del fútbol continental." },
    { title: "Fórmula 1: Clasificación", desc: "Toda la adrenalina del motor y los mejores monoplazas del circuito." },
    { title: "Combate Estelar UFC", desc: "Lo mejor del boxeo y artes marciales mixtas en el octágono." },
    { title: "Deportes Extremos y Aventura", desc: "Hazañas al límite, snowboard, surf y reportajes de acción." },
    { title: "Leyendas del Deporte", desc: "Documentales e historias íntimas sobre las figuras más grandes de la historia." },
  ],
  news: [
    { title: "Noticiario Matinal", desc: "Primeras informaciones del día, el pronóstico del tiempo y el tránsito." },
    { title: "CHV Noticias Tarde", desc: "Cobertura completa de los hechos nacionales e internacionales más relevantes." },
    { title: "Enfoque Político", desc: "Entrevistas en profundidad con los líderes y protagonistas de la semana." },
    { title: "Economía y Futuro", desc: "Análisis financiero, fluctuaciones de mercados y tendencias tecnológicas." },
    { title: "Debate Abierto", desc: "Panelistas de opinión discuten los temas candentes de la agenda nacional." },
    { title: "Noticias Central", desc: "El resumen periodístico más completo e investigativo de la jornada." },
    { title: "Crónica Nocturna", desc: "Investigaciones periodísticas exclusivas y debates de medianoche." },
  ],
  movies: [
    { title: "Cine de Acción: Al Límite", desc: "Una espectacular historia llena de adrenalina, combates y persecuciones." },
    { title: "Cine Familiar: El Gran Escape", desc: "Aventura, risas y emoción para disfrutar con todos los de casa." },
    { title: "Maratón de Suspenso: Intriga", desc: "Pistas ocultas y misterios que te mantendrán al borde del asiento." },
    { title: "Clásicos del Séptimo Arte", desc: "Las obras maestras inmortales que marcaron la historia de Hollywood." },
    { title: "Noche de Terror y Misterio", desc: "Sucesos paranormales, leyendas oscuras y suspenso psicológico." },
    { title: "Drama Estelar: Destinos Cruzados", desc: "Una conmovedora historia galardonada en fines de semana." },
    { title: "Estreno Semanal: Blockbuster", desc: "La superproducción cinematográfica más taquillera y esperada del año." },
  ],
  kids: [
    { title: "Dibujos Animados de la Mañana", desc: "Diversión y aventuras sin límites con tus personajes favoritos." },
    { title: "El Club de la Diversión", desc: "Canciones, risas y entretenimiento educativo para los más pequeños." },
    { title: "Aventuras Mágicas", desc: "Viajes fantásticos a reinos ocultos llenos de imaginación." },
    { title: "Los Pequeños Héroes", desc: "Historias animadas sobre el compañerismo y el trabajo en equipo." },
    { title: "Mundo de Juguetes", desc: "Aprende jugando con divertidos desafíos y manualidades coloridas." },
  ],
  anime: [
    { title: "El Club del Anime", desc: "Episodios de estreno de las series más populares y aclamadas de Japón." },
    { title: "Batallas Legendarias Shonen", desc: "Combates épicos, superpoderes y aventuras del universo ninja." },
    { title: "Clásicos de Animación Oriental", desc: "Revive las obras de culto que definieron una época dorada del anime." },
    { title: "Héroes del Futuro (Cyberpunk)", desc: "Aventuras de acción y fantasía tecnológica en mundos futuristas." },
  ],
  series: [
    { title: "Maratón de Comedia", desc: "Risas y diversión aseguradas con los capítulos clásicos de la serie." },
    { title: "Noches de Intriga y Crimen", desc: "Casos policiales de homicidios resueltos por el equipo forense." },
    { title: "Series del Recuerdo", desc: "Vuelve a disfrutar de los episodios nostálgicos y recordados por todos." },
    { title: "Drama Médico: Código de Emergencias", desc: "Historias apasionantes dentro de la sala de urgencias de un hospital." },
    { title: "Warner Hits: Lo Mejor", desc: "Selección de los mejores episodios de tus series de comedia favoritas." },
  ],
  general: [
    { title: "Mañana Entretenida", desc: "Magacín matutino con cocina en vivo, moda y entrevistas a celebridades." },
    { title: "Tarde de Variedades", desc: "Concursos divertidos, humor y música para amenizar tu tarde." },
    { title: "El Gran Show de Talentos", desc: "Artistas aficionados compiten ante un exigente jurado nacional." },
    { title: "Viajeros del Mundo", desc: "Descubre los rincones más exóticos, bellos e interesantes del planeta." },
    { title: "Cocina con Estilo", desc: "Las mejores recetas culinarias explicadas de forma práctica paso a paso." },
    { title: "Documental Científico", desc: "Explorando los misterios del cosmos, física cuántica y la naturaleza." },
    { title: "Música en Vivo y Éxitos", desc: "Los videoclips más populares y conciertos en vivo de tus artistas preferidos." },
  ],
};

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeed(channelName, channelId, date) {
  const cleanName = String(channelName || '').toLowerCase().trim();
  const cleanId = String(channelId || '').trim();
  const str = `${cleanName}-${cleanId}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
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
  const pool = PROGRAM_POOL[category];
  
  const index = Math.floor(seededRandom(seed) * pool.length);
  const program = pool[index];
  
  let suffix = "";
  if (category === "news") {
    if (hour >= 6 && hour < 12) suffix = " AM";
    else if (hour >= 12 && hour < 18) suffix = " Tarde";
    else if (hour >= 18 && hour < 23) suffix = " Central";
    else suffix = " Noche";
  }

  return {
    title: program.title + suffix,
    description: program.desc,
  };
}

/**
 * Generates an array of programs for a full day (from 00:00 to 23:59)
 * for a specific channel name/ID.
 */
export function getEPGForChannel(channelName, channelId, date = new Date()) {
  const seed = getSeed(channelName, channelId, date);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const programs = [];
  let currentTime = new Date(startOfDay);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  let programIndex = 0;
  while (currentTime < endOfDay) {
    const prgSeed = seed + programIndex;
    // Possible durations: 30m, 60m, 90m, 120m
    const durationOpts = [30, 60, 60, 90, 120];
    const duration = durationOpts[Math.floor(seededRandom(prgSeed) * durationOpts.length)];
    
    const prgStart = new Date(currentTime);
    const prgEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
    
    // Ensure we do not overshoot the day boundary
    if (prgEnd > endOfDay) {
      prgEnd.setTime(endOfDay.getTime());
    }

    const { title, description } = getRandomProgram(channelName, prgSeed, prgStart.getHours());
    
    programs.push({
      id: `${channelId || 'chan'}-${programIndex}`,
      title,
      description,
      start: prgStart,
      end: prgEnd,
      duration: Math.round((prgEnd - prgStart) / 60000),
    });

    currentTime = prgEnd;
    programIndex++;
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
