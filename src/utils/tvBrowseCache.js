let cachedSeriesItems = null;

export function getCachedTVSeriesItems() {
  return Array.isArray(cachedSeriesItems) ? cachedSeriesItems : null;
}

export function setCachedTVSeriesItems(items) {
  cachedSeriesItems = Array.isArray(items) ? [...items] : null;
}

export function clearCachedTVSeriesItems() {
  cachedSeriesItems = null;
}
