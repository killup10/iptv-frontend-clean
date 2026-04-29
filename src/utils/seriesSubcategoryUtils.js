export const SERIES_SUBCATEGORIES = [
  'TODOS',
  'Netflix',
  'Prime Video',
  'Disney',
  'Apple TV',
  'HBO Max',
  'Hulu y Otros',
  'Retro',
  'Animadas',
];

const SUBCATEGORY_ALIASES = {
  netflix: ['netflix', 'netflix series', 'series netflix', 'netflix originals'],
  'prime video': ['prime video', 'primevideo', 'amazon prime', 'amazon prime video'],
  disney: ['disney', 'disney plus', 'disney+', 'disney series'],
  'apple tv': ['apple tv', 'apple tv+', 'apple tv plus', 'appletv'],
  'hbo max': ['hbo max', 'hbomax', 'max originals'],
  'hulu y otros': ['hulu', 'paramount', 'paramount+', 'peacock', 'starz', 'showtime', 'amc', 'fx', 'syfy'],
  retro: ['retro', 'clasico', 'clasicos', 'classic', 'vintage'],
  animadas: ['animada', 'animadas', 'animated', 'animation', 'cartoon'],
};

export function normalizeSeriesValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[+]/g, ' plus ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandSeriesTokens(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => expandSeriesTokens(entry));
  }

  const normalized = normalizeSeriesValue(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[,/|;-]/g)
    .map((token) => normalizeSeriesValue(token))
    .filter(Boolean);
}

function collectSeriesCategoryTokens(item) {
  const rawValues = [
    item?.subcategoria,
    item?.subCategory,
    item?.platform,
    item?.provider,
    item?.network,
    item?.studio,
    item?.collection,
  ];

  return Array.from(new Set(rawValues.flatMap((value) => expandSeriesTokens(value))));
}

function tokenMatchesAlias(token, alias) {
  if (!token || !alias) {
    return false;
  }

  if (token === alias) {
    return true;
  }

  const aliasParts = alias.split(' ').filter(Boolean);
  if (aliasParts.length > 1 && aliasParts.every((part) => token.includes(part))) {
    return true;
  }

  if (alias.length >= 5 && token.includes(alias)) {
    return true;
  }

  return false;
}

export function matchesSeriesSubcategory(item, subcategory) {
  const normalizedSubcategory = normalizeSeriesValue(subcategory);
  if (!normalizedSubcategory || normalizedSubcategory === 'todos') {
    return true;
  }

  const aliases = Array.from(new Set([
    normalizedSubcategory,
    ...(SUBCATEGORY_ALIASES[normalizedSubcategory] || []),
  ]));
  const tokens = collectSeriesCategoryTokens(item);

  return aliases.some((alias) => tokens.some((token) => tokenMatchesAlias(token, alias)));
}

export function buildSeriesSubcategoryCounts(items = []) {
  return SERIES_SUBCATEGORIES.reduce((acc, subcategory) => {
    acc[subcategory] = subcategory === 'TODOS'
      ? items.length
      : items.filter((item) => matchesSeriesSubcategory(item, subcategory)).length;
    return acc;
  }, {});
}
