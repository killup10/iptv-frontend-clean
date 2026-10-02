export function albumKey(title) {
  return String(title || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\([^)]*(?:deluxe|remaster|bonus|expanded|anniversary|edition|version)[^)]*\)/g, '')
    .replace(/\s*[-–:]\s*(?:deluxe|remaster|bonus|expanded|anniversary|edition|version).*$/g, '')
    .replace(/[^a-z0-9]/g, '');
}
export function consolidateAlbums(candidates) {
  const albums = new Map();
  for (const album of candidates) {
    // Singles stay in popular songs, never masquerade as full albums.
    if (!album?.id || !album.title || !(album.trackCount > 1)) continue;
    const key = albumKey(album.title);
    if (!key) continue;
    const previous = albums.get(key);
    if (!previous || album.trackCount > previous.trackCount) albums.set(key, album);
  }
  return [...albums.values()].sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')));
}

export function recentCatalog(tracks, limit = 150, now = new Date()) {
  const end = new Date(now); end.setUTCHours(23,59,59,999);
  const start = end.getTime() - 90 * 86400000;
  const unique = new Map();
  for (const track of tracks) {
    const date = Date.parse(track?.releaseDate || '');
    if (!Number.isFinite(date) || date < start || date > end.getTime()) continue;
    const key = albumKey(track.artist) + ':' + albumKey(track.title);
    if (!unique.has(key)) unique.set(key, track);
  }
  return [...unique.values()].sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate)).slice(0,limit);
}
