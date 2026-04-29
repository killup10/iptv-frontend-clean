export const TV_OPEN_SEARCH_EVENT = 'teamg:tv-open-search';

export function requestTVSearch(detail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(TV_OPEN_SEARCH_EVENT, { detail }));
}
