export const TV_FOCUS_ZONE_NAV = 'nav';
export const TV_FOCUS_ZONE_CONTENT = 'content';
export const TV_FOCUS_ZONE_MODAL = 'modal';

export const TV_FOCUS_NAV_EVENT = 'teamg:tv-focus-nav';
export const TV_FOCUS_CONTENT_EVENT = 'teamg:tv-focus-content';
export const TV_FOCUS_ZONE_CHANGE_EVENT = 'teamg:tv-focus-zone-change';

const DEFAULT_TV_FOCUS_ZONE = TV_FOCUS_ZONE_CONTENT;

const getWindowRef = () => (typeof window !== 'undefined' ? window : null);

export function getTVFocusZone() {
  const win = getWindowRef();
  return win?.__TEAMG_TV_FOCUS_ZONE || DEFAULT_TV_FOCUS_ZONE;
}

export function setTVFocusZone(zone) {
  const win = getWindowRef();
  if (!win) return;

  win.__TEAMG_TV_FOCUS_ZONE = zone;
  win.dispatchEvent(new CustomEvent(TV_FOCUS_ZONE_CHANGE_EVENT, { detail: { zone } }));
}

export function focusTVNav() {
  const win = getWindowRef();
  if (!win) return;

  setTVFocusZone(TV_FOCUS_ZONE_NAV);
  win.dispatchEvent(new CustomEvent(TV_FOCUS_NAV_EVENT));
}

export function focusTVContent() {
  const win = getWindowRef();
  if (!win) return;

  const activeElement = win.document?.activeElement;
  if (
    activeElement &&
    activeElement !== win.document?.body &&
    typeof activeElement.blur === 'function'
  ) {
    try {
      activeElement.blur();
    } catch {
    }
  }

  setTVFocusZone(TV_FOCUS_ZONE_CONTENT);
  win.dispatchEvent(new CustomEvent(TV_FOCUS_CONTENT_EVENT));
}
