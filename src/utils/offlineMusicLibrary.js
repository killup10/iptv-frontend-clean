const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const identity = track => `${normalize(track.title)}|${normalize(track.artist)}`;

export function buildOfflineMusicLibrary(tracks = [], albums = [], playlists = []) {
  const files = [...new Map(tracks.filter(Boolean).map(track => [String(track.id), track])).values()];
  const byId = new Map(files.map(track => [String(track.id), track]));
  const byName = new Map(files.map(track => [identity(track), track]));
  const entries = files.map(track => ({ ...track, key: `track:${track.id}`, kind: 'track', label: 'Track', tracks: [track] }));
  const resolveTracks = collection => {
    const source = collection.trackIds || collection.tracks || [];
    return [...new Map(source.map(value => typeof value === 'object'
      ? (byId.get(String(value.id)) || byName.get(identity(value)))
      : byId.get(String(value))).filter(Boolean).map(track => [String(track.id), track])).values()];
  };
  const albumMap = new Map();
  for (const album of albums.filter(Boolean)) {
    const key = `${normalize(album.title)}|${normalize(album.artist)}`;
    const available = resolveTracks(album);
    const matching = available.length || album.trackIds ? available : files.filter(track =>
      normalize(track.album || track.albumTitle) === normalize(album.title) &&
      (!album.artist || normalize(album.artist) === 'varios artistas' || normalize(track.artist) === normalize(album.artist)));
    if (matching.length) albumMap.set(key, { ...album, tracks: matching });
  }
  const groupedIds = new Set([...albumMap.values()].flatMap(album => album.tracks.map(track => String(track.id))));
  // Compatibilidad con descargas antiguas que solo guardaban el álbum en la pista.
  for (const track of files) {
    const title = track.album || track.albumTitle;
    if (!title || ['teamg music', 'sencillo', 'sencillos descargados'].includes(normalize(title))) continue;
    if (groupedIds.has(String(track.id))) continue;
    const key = `${normalize(title)}|${normalize(track.artist)}`;
    const album = albumMap.get(key) || { id: track.albumId || key, title, artist: track.artist, tracks: [] };
    album.tracks.push(track);
    groupedIds.add(String(track.id));
    albumMap.set(key, album);
  }
  for (const [key, album] of albumMap) entries.push({ ...album, key: `album:${key}`, kind: 'album', label: 'Disco' });
  const seen = new Set();
  for (const playlist of playlists.filter(Boolean)) {
    const key = String(playlist.id || normalize(playlist.title));
    if (seen.has(key)) continue;
    seen.add(key);
    const available = resolveTracks(playlist);
    if (available.length) entries.push({ ...playlist, title: playlist.title || playlist.name || 'Playlist', key: `playlist:${key}`, kind: 'playlist', label: 'Playlist', tracks: available });
  }
  return entries.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'es', { sensitivity: 'base', numeric: true }));
}

export function filterOfflineMusic(entries, query = '', kind = 'all') {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    if (kind !== 'all' && entry.kind !== kind) return false;
    const text = normalize([entry.title, entry.artist, entry.label,
      ...entry.tracks.flatMap(track => [track.title, track.artist, track.album])].join(' '));
    return words.every(word => text.includes(word));
  });
}
