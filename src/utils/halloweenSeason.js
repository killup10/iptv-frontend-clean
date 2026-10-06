// Especial Halloween: visible solo en octubre (1 oct – 31 oct).
// Llegado el 1 de noviembre se oculta solo hasta el próximo octubre.
// Para cambiar el rango, ajusta START/END (mes 1-12, día 1-31).
export const HALLOWEEN_SEASON_START = { month: 10, day: 1 };
export const HALLOWEEN_SEASON_END = { month: 10, day: 31 };

export function isHalloweenSeason(now = new Date()) {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const afterStart = m > HALLOWEEN_SEASON_START.month
    || (m === HALLOWEEN_SEASON_START.month && d >= HALLOWEEN_SEASON_START.day);
  const beforeEnd = m < HALLOWEEN_SEASON_END.month
    || (m === HALLOWEEN_SEASON_END.month && d <= HALLOWEEN_SEASON_END.day);
  if (HALLOWEEN_SEASON_START.month <= HALLOWEEN_SEASON_END.month) {
    return afterStart && beforeEnd;
  }
  return afterStart || beforeEnd;
}
