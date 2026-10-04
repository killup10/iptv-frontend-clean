export function albumKey(title) {
  return String(title || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\([^)]*(?:deluxe|remaster|bonus|expanded|anniversary|edition|version)[^)]*\)/g, '')
    .replace(/\s*[-–:]\s*(?:deluxe|remaster|bonus|expanded|anniversary|edition|version).*$/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function consolidateAlbums(candidates = []) {
  const albums = new Map();
  for (const album of candidates) {
    if (!album?.id || !album.title) continue;
    const key = albumKey(album.title);
    if (!key) continue;
    const previous = albums.get(key);
    // Consolidar dando prioridad al que tenga conteo de canciones o mejor portada
    if (!previous || (album.trackCount || 0) > (previous.trackCount || 0) || (!previous.cover && album.cover)) {
      albums.set(key, album);
    }
  }
  return [...albums.values()].sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')));
}

export const FALLBACK_RECENT_RELEASES = [
  {
    id: 'itunes-6818209989',
    title: 'Solar Eclipse',
    artist: 'Drake & Don Toliver',
    album: 'Solar Eclipse - Single',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bb/45/62/bb4562a3-45a2-539c-b557-a18ea060a476/26UMGIM63616.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/bb/45/62/bb4562a3-45a2-539c-b557-a18ea060a476/mzaf_16397496827139916532.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/bb/45/62/bb4562a3-45a2-539c-b557-a18ea060a476/mzaf_16397496827139916532.plus.aac.p.m4a',
    releaseDate: '2026-10-02',
    duration: 215,
    fullDuration: 215,
    genre: 'Hip-Hop/Rap'
  },
  {
    id: 'itunes-6812352337',
    title: 'This Dream of You',
    artist: 'Martin Garrix',
    album: 'This Dream of You - Single',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/6d/20/d5/6d20d590-14b6-a122-bbe9-e42b1f98c519/823375445852_Cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c7/97/94/c79794b6-0ce4-9687-9a36-3d2e8cdef99f/mzaf_17762911279911362714.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c7/97/94/c79794b6-0ce4-9687-9a36-3d2e8cdef99f/mzaf_17762911279911362714.plus.aac.p.m4a',
    releaseDate: '2026-10-02',
    duration: 220,
    fullDuration: 220,
    genre: 'Dance'
  },
  {
    id: 'itunes-6775919538',
    title: 'Crisco',
    artist: 'Miranda Lambert',
    album: 'Crisco - Single',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-10-02',
    duration: 200,
    fullDuration: 200,
    genre: 'Country'
  },
  {
    id: 'itunes-6817176370',
    title: 'James 1:17 (Jesus Is King)',
    artist: 'Kid Rock',
    album: 'James 1:17 (Jesus Is King) - Single',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/59/85/ba/5985bac6-e377-7f56-c62c-52f397b3b1a9/artwork.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/98/ea/22/98ea2259-3050-d6a7-f798-53a97c202e29/mzaf_8428970547043576673.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/98/ea/22/98ea2259-3050-d6a7-f798-53a97c202e29/mzaf_8428970547043576673.plus.aac.p.m4a',
    releaseDate: '2026-10-01',
    duration: 230,
    fullDuration: 230,
    genre: 'Rock'
  },
  {
    id: 'itunes-6814997425',
    title: 'Patient Zero',
    artist: 'Taylor Swift',
    album: 'The Life of a Showgirl: The Encore',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a0/dd/fd/a0ddfd72-ee9e-f046-6466-a5dbefc696fa/26UM1IM21436.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0b/be/8c/0bbe8c0a-dc77-af41-97a5-c745cc43d38c/mzaf_11790447166833591507.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0b/be/8c/0bbe8c0a-dc77-af41-97a5-c745cc43d38c/mzaf_11790447166833591507.plus.aac.p.m4a',
    releaseDate: '2026-09-24',
    duration: 218,
    fullDuration: 218,
    genre: 'Pop'
  },
  {
    id: 'deezer-4208859922',
    title: 'BbY WOW',
    artist: 'KAROL G',
    album: 'NO ME ARREPIENTO DE SENTIR TANTO',
    cover: 'https://cdn-images.dzcdn.net/images/cover/f794dd1931dac42fc13f938850b686c6/500x500-000000-80-0-0.jpg',
    audioUrl: 'https://cdnt-preview.dzcdn.net/api/1/1/f/f/5/0/ff58853da92388977e15b6744ad73228.mp3',
    previewUrl: 'https://cdnt-preview.dzcdn.net/api/1/1/f/f/5/0/ff58853da92388977e15b6744ad73228.mp3',
    releaseDate: '2026-08-07',
    duration: 225,
    fullDuration: 225,
    genre: 'Reggaeton'
  },
  {
    id: 'itunes-die-with-a-smile',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    album: 'Die With A Smile - Single',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/10/a5/8a/10a58a74-d4b9-8e6c-7e9b-04b39b56fceb/24UMGIM86144.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-08-16',
    duration: 251,
    fullDuration: 251,
    genre: 'Pop'
  },
  {
    id: 'itunes-taste-sabrina',
    title: 'Taste',
    artist: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/b8/9f/e0/b89fe008-8f85-7832-6fe3-e028b3a04297/24UMGIM60699.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-08-23',
    duration: 157,
    fullDuration: 157,
    genre: 'Pop'
  },
  {
    id: 'itunes-espresso-sabrina',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/b8/9f/e0/b89fe008-8f85-7832-6fe3-e028b3a04297/24UMGIM60699.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-04-11',
    duration: 175,
    fullDuration: 175,
    genre: 'Pop'
  },
  {
    id: 'itunes-birds-of-a-feather',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/44/b3/ef/44b3ef8b-9602-0e9e-a89a-051f50a3cf65/24UMGIM36767.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-05-17',
    duration: 190,
    fullDuration: 190,
    genre: 'Alternative'
  },
  {
    id: 'itunes-dancing-flames',
    title: 'Dancing In The Flames',
    artist: 'The Weeknd',
    album: 'Hurry Up Tomorrow',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/90/a6/50/90a650aa-43d9-93e5-ea1d-2db5421be01c/24UMGIM98319.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-09-13',
    duration: 220,
    fullDuration: 220,
    genre: 'R&B/Soul'
  },
  {
    id: 'itunes-good-luck-babe',
    title: 'Good Luck, Babe!',
    artist: 'Chappell Roan',
    album: 'Good Luck, Babe! - Single',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/91/9f/fa/919ffac7-5d2f-1a9e-c8eb-c39dc5374828/24UMGIM35308.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-04-05',
    duration: 218,
    fullDuration: 218,
    genre: 'Pop'
  },
  {
    id: 'itunes-post-malone-some-help',
    title: 'I Had Some Help',
    artist: 'Post Malone feat. Morgan Wallen',
    album: 'F-1 Trillion',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/1c/91/b6/1c91b65b-db06-0ce7-f495-9ff271168925/24UMGIM49942.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-05-10',
    duration: 178,
    fullDuration: 178,
    genre: 'Country'
  },
  {
    id: 'itunes-touching-the-sky',
    title: 'Touching The Sky',
    artist: 'Rauw Alejandro',
    album: 'Touching The Sky - Single',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-05-24',
    duration: 191,
    fullDuration: 191,
    genre: 'Urbano Latino'
  },
  {
    id: 'itunes-luna-feid',
    title: 'LUNA',
    artist: 'Feid, ATL Jacob',
    album: 'FERXXOCALIPSIS',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-01-12',
    duration: 196,
    fullDuration: 196,
    genre: 'Urbano Latino'
  },
  {
    id: 'itunes-feelslikeimfallinginlove',
    title: 'feelslikeimfallinginlove',
    artist: 'Coldplay',
    album: 'Moon Music',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-06-21',
    duration: 236,
    fullDuration: 236,
    genre: 'Alternative'
  },
  {
    id: 'itunes-houdini-eminem',
    title: 'Houdini',
    artist: 'Eminem',
    album: 'The Death of Slim Shady (Coup de Grâce)',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-05-31',
    duration: 227,
    fullDuration: 227,
    genre: 'Hip-Hop/Rap'
  },
  {
    id: 'itunes-360-charli-xcx',
    title: '360',
    artist: 'Charli xcx',
    album: 'BRAT',
    cover: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-05-10',
    duration: 133,
    fullDuration: 133,
    genre: 'Electronic'
  },
  {
    id: 'itunes-bar-song-shaboozey',
    title: 'A Bar Song (Tipsy)',
    artist: 'Shaboozey',
    album: 'Where I\'ve Been, Isn\'t Where I\'m Going',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2026-04-12',
    duration: 171,
    fullDuration: 171,
    genre: 'Country'
  },
  {
    id: 'itunes-monaco-bad-bunny',
    title: 'MONACO',
    artist: 'Bad Bunny',
    album: 'nadie sabe lo que va a pasar mañana',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    releaseDate: '2025-10-13',
    duration: 267,
    fullDuration: 267,
    genre: 'Trap Latino'
  }
];

export function recentCatalog(tracks = [], limit = 150, now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  // Permitir hasta 180 días de margen o lanzamientos del año corriente/previo
  const start = end.getTime() - 180 * 86400000;
  const unique = new Map();

  const candidateList = Array.isArray(tracks) && tracks.length > 0 ? tracks : FALLBACK_RECENT_RELEASES;

  for (const track of candidateList) {
    if (!track || !track.title) continue;
    const rawDate = String(track.releaseDate || '').trim();
    const date = Date.parse(rawDate);
    const isRecentYear = rawDate.startsWith('2026') || rawDate.startsWith('2025');
    const isValidRecentDate = Number.isFinite(date) && (date >= start || isRecentYear);

    // Si tiene fecha verificable o año reciente
    if (isValidRecentDate || isRecentYear || !track.releaseDate) {
      const key = albumKey(track.artist) + ':' + albumKey(track.title);
      if (!unique.has(key)) {
        unique.set(key, {
          ...track,
          releaseDate: track.releaseDate || '2026-10-01'
        });
      }
    }
  }

  // Si después del filtro hay muy pocos lanzamientos, respaldar con el catálogo curado
  if (unique.size < 20) {
    for (const track of FALLBACK_RECENT_RELEASES) {
      const key = albumKey(track.artist) + ':' + albumKey(track.title);
      if (!unique.has(key)) {
        unique.set(key, track);
      }
    }
  }

  return [...unique.values()]
    .sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')))
    .slice(0, limit);
}
