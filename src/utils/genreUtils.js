// src/utils/genreUtils.js

const CANONICAL_GENRE_MAP = {
  'accion': 'Acción',
  'acción': 'Acción',
  'action': 'Acción',
  'aventura': 'Aventura',
  'adventure': 'Aventura',
  'comedia': 'Comedia',
  'comedy': 'Comedia',
  'humor': 'Comedia',
  'drama': 'Drama',
  'terror': 'Terror',
  'horror': 'Terror',
  'miedo': 'Terror',
  'suspenso': 'Suspenso',
  'thriller': 'Suspenso',
  'misterio': 'Suspenso',
  'ciencia ficcion': 'Ciencia Ficción',
  'ciencia ficción': 'Ciencia Ficción',
  'sci-fi': 'Ciencia Ficción',
  'scifi': 'Ciencia Ficción',
  'fantasia': 'Fantasía',
  'fantasía': 'Fantasía',
  'fantasy': 'Fantasía',
  'familiar': 'Familiar',
  'familia': 'Familiar',
  'family': 'Familiar',
  'infantil': 'Infantil',
  'kids': 'Kids',
  'ninos': 'Infantil',
  'niños': 'Infantil',
  'animacion': 'Animación',
  'animación': 'Animación',
  'animation': 'Animación',
  'animada': 'Animación',
  'animadas': 'Animación',
  'romance': 'Romance',
  'romantica': 'Romance',
  'romántica': 'Romance',
  'crimen': 'Crimen',
  'crime': 'Crimen',
  'policial': 'Crimen',
  'documental': 'Documental',
  'documentales': 'Documental',
  'documentary': 'Documental',
  'anime': 'Anime',
  'dorama': 'Dorama',
  'novela': 'Novela',
  'musica': 'Música',
  'música': 'Música',
  'musical': 'Música',
  'deporte': 'Deportes',
  'deportes': 'Deportes',
  'sports': 'Deportes',
  'historia': 'Historia',
  'history': 'Historia',
  'belica': 'Guerra',
  'bélica': 'Guerra',
  'guerra': 'Guerra',
  'war': 'Guerra',
  'western': 'Western',
  'oeste': 'Western',
  'juvenil': 'Juvenil',
  'adolescencia': 'Juvenil',
  'adolescente': 'Juvenil',
  'especiales': 'Especiales',
  'especial': 'Especiales',
};

const BLACKLISTED_GENRES = new Set([
  'indefinido',
  'sin genero',
  'sin género',
  'desconocido',
  'null',
  'undefined',
  'n/a',
  'none',
  'sin categoria',
  'sin categoría',
  'james bond coleccion',
  'james bond',
  'katla',
  'kleo',
  'monstruo la historia de ed gein',
  'black rabbit',
  'variados',
  'variado',
  'otros',
  'todos',
  'todas',
  'por genero',
  'por género',
  '4k',
  '60fps',
  '1080p',
  '720p',
  'hd',
]);

/**
 * Splits and normalizes a raw genre string into an array of clean canonical names.
 * Example: "familiar-infantil" -> ["Familiar", "Infantil"]
 * Example: "COMEDIA" -> ["Comedia"]
 * Example: "Indefinido" -> []
 */
export function normalizeGenreString(rawGenre) {
  if (!rawGenre || typeof rawGenre !== 'string') return [];
  const str = rawGenre.trim();
  if (!str) return [];

  // Split on hyphens, slashes, commas, pipes, or ' y '
  const tokens = str.split(/[-/,|]|\sy\s/i).map(t => t.trim()).filter(Boolean);

  const results = [];
  for (const token of tokens) {
    const normalizedKey = token
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (!normalizedKey || BLACKLISTED_GENRES.has(normalizedKey)) {
      continue;
    }

    if (CANONICAL_GENRE_MAP[normalizedKey]) {
      results.push(CANONICAL_GENRE_MAP[normalizedKey]);
    } else {
      // Keep string capitalized if it looks like a valid genre name (< 22 chars, no dates)
      if (token.length < 22 && !/\d{4}/.test(token)) {
        const capitalized = token
          .toLowerCase()
          .replace(/(?:^|\s|-)\S/g, (a) => a.toUpperCase());
        results.push(capitalized);
      }
    }
  }

  return results;
}

/**
 * Extracts clean, unified unique genres from a array of content items
 */
export function extractUniqueGenres(items) {
  const genreSet = new Set();

  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (!item) return;
      const rawGenres = Array.isArray(item.genres)
        ? item.genres
        : item.genre ? [item.genre] : item.genero ? [item.genero] : [];

      rawGenres.forEach((raw) => {
        const cleaned = normalizeGenreString(raw);
        cleaned.forEach((g) => genreSet.add(g));
      });
    });
  }

  const sortedGenres = Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'es'));
  return ['Todas', ...sortedGenres];
}

/**
 * Tests if an item matches a selected genre
 */
export function itemMatchesGenre(item, targetGenre) {
  if (!targetGenre || targetGenre === 'Todas' || targetGenre === 'TODOS') return true;
  if (!item) return false;

  const rawGenres = Array.isArray(item.genres)
    ? item.genres
    : item.genre ? [item.genre] : item.genero ? [item.genero] : [];

  const normalizedItemGenres = rawGenres.flatMap(g => normalizeGenreString(g)).map(g => g.toLowerCase());
  const normalizedTargetTokens = normalizeGenreString(targetGenre).map(g => g.toLowerCase());

  if (normalizedTargetTokens.length === 0) {
    const rawTargetLower = targetGenre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedItemGenres.some(g => g.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(rawTargetLower));
  }

  return normalizedTargetTokens.some(target => (
    normalizedItemGenres.some(ig => ig === target || ig.includes(target))
  ));
}
