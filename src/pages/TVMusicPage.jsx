import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Search,
  Radio,
  Disc3,
  User,
  ListMusic,
  ArrowLeft,
  Sparkles,
  Flame,
  Loader2,
  Music2,
  Calendar,
  Volume2,
  Compass,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMusic } from '../context/MusicContext.jsx';
import {
  musicService,
  LIVE_RADIOS,
  DEFAULT_CURATED_PLAYLISTS,
  INDEPENDENT_ARTISTS
} from '../services/musicService.js';
import { focusTVNav, getTVFocusZone, TV_FOCUS_ZONE_CONTENT } from '../utils/tvFocusZone.js';
import { getTVKeyName, isTVBackKey } from '../utils/tvRemote.js';
import { Capacitor } from '@capacitor/core';

// Format time mm:ss
function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const TABS = [
  { key: 'top', label: 'Más Escuchado', icon: Flame },
  { key: 'recent', label: 'Más Reciente', icon: Sparkles },
  { key: 'artists', label: 'Artistas', icon: User },
  { key: 'albums', label: 'Álbumes', icon: Disc3 },
  { key: 'radios', label: 'Radios en Vivo', icon: Radio },
  { key: 'favorites', label: 'Mis Favoritas', icon: Heart },
  { key: 'playlists', label: 'Playlists', icon: ListMusic },
];

export default function TVMusicPage() {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    playTrack,
    playRadio,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    toggleFavorite,
    isFavorite,
    favorites,
    customPlaylists,
    saveAlbumAsPlaylist,
    isAlbumSavedAsPlaylist,
    isLoadingAudio
  } = useMusic();

  const isAndroidTVNative = Capacitor.isNativePlatform();

  // Navigation & View state
  const [activeTab, setActiveTab] = useState('top');
  const [focusZone, setFocusZone] = useState('tabs'); // 'tabs' | 'search_btn' | 'grid' | 'artist_detail' | 'album_detail' | 'playlist_detail' | 'player' | 'search_modal'
  const [focusedTabIndex, setFocusedTabIndex] = useState(0);
  const [focusedGridIndex, setFocusedGridIndex] = useState(0);
  const [focusedPlayerIndex, setFocusedPlayerIndex] = useState(1); // 1 = play/pause button

  // Data states
  const [topTracks, setTopTracks] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [artistsList, setArtistsList] = useState([]);
  const [albumsList, setAlbumsList] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Artist Detail view
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistDetails, setArtistDetails] = useState(null);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [artistDetailSubZone, setArtistDetailSubZone] = useState('actions'); // 'actions' | 'songs' | 'albums'
  const [focusedArtistSongIndex, setFocusedArtistSongIndex] = useState(0);
  const [focusedArtistAlbumIndex, setFocusedArtistAlbumIndex] = useState(0);

  // Album Detail view
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumSourceArtist, setAlbumSourceArtist] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  const [albumDetailSubZone, setAlbumDetailSubZone] = useState('actions'); // 'actions' | 'songs'
  const [focusedAlbumActionIndex, setFocusedAlbumActionIndex] = useState(0); // 0 = play, 1 = save playlist
  const [focusedAlbumSongIndex, setFocusedAlbumSongIndex] = useState(0);

  // Playlist Detail view
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [playlistDetailSubZone, setPlaylistDetailSubZone] = useState('actions'); // 'actions' | 'songs'
  const [focusedPlaylistSongIndex, setFocusedPlaylistSongIndex] = useState(0);

  // Search Modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchArtists, setSearchArtists] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocusZone, setSearchFocusZone] = useState('input'); // 'input' | 'artists' | 'tracks'
  const [focusedSearchArtistIndex, setFocusedSearchArtistIndex] = useState(0);
  const [focusedSearchTrackIndex, setFocusedSearchTrackIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Columns for grids
  const gridColumns = useMemo(() => {
    if (activeTab === 'artists') return 4;
    if (activeTab === 'albums') return 4;
    if (activeTab === 'radios') return 3;
    if (activeTab === 'playlists') return 3;
    return 2; // 2 wide cards for tracks
  }, [activeTab]);

  // Load initial content
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoadingContent(true);
      try {
        const [top, recent] = await Promise.allSettled([
          musicService.getTopTracks('global'),
          musicService.getRecentTracks(120)
        ]);

        if (cancelled) return;

        const resolvedTop = top.status === 'fulfilled' && Array.isArray(top.value) ? top.value : [];
        const resolvedRecent = recent.status === 'fulfilled' && Array.isArray(recent.value) ? recent.value : [];

        setTopTracks(resolvedTop);
        setRecentTracks(resolvedRecent);

        // Build consolidated artists list from top & recent + presets
        const artistsMap = new Map();
        INDEPENDENT_ARTISTS.forEach(a => {
          artistsMap.set(a.name.toLowerCase(), {
            id: a.id,
            name: a.name,
            picture: a.cover,
            genre: a.genre,
            fans: 150000
          });
        });

        [...resolvedTop, ...resolvedRecent].forEach(t => {
          if (!t.artist || t.artist === 'Artista Desconocido') return;
          const key = t.artist.toLowerCase();
          if (!artistsMap.has(key)) {
            artistsMap.set(key, {
              id: `artist-${t.artistId || key}`,
              name: t.artist,
              picture: t.artistPicture || t.cover,
              genre: t.genre || 'Música',
              fans: 500000
            });
          }
        });
        setArtistsList([...artistsMap.values()]);

        // Build consolidated albums list from tracks
        const albumsMap = new Map();
        [...resolvedTop, ...resolvedRecent].forEach(t => {
          if (!t.album || t.album === 'Sencillo' || !t.cover) return;
          const key = `${t.artist}_${t.album}`.toLowerCase();
          if (!albumsMap.has(key)) {
            albumsMap.set(key, {
              id: t.albumId || `album-${key}`,
              title: t.album,
              artist: t.artist,
              cover: t.cover,
              releaseDate: t.releaseDate || '2026',
              genre: t.genre
            });
          }
        });
        setAlbumsList([...albumsMap.values()]);
      } catch (err) {
        console.warn('[TVMusicPage] Error cargando catalogo:', err);
      } finally {
        if (!cancelled) setLoadingContent(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Compute active grid items based on activeTab
  const currentGridItems = useMemo(() => {
    switch (activeTab) {
      case 'top':
        return topTracks;
      case 'recent':
        return recentTracks;
      case 'artists':
        return artistsList;
      case 'albums':
        return albumsList;
      case 'radios':
        return LIVE_RADIOS;
      case 'favorites':
        return favorites;
      case 'playlists':
        return [...customPlaylists, ...DEFAULT_CURATED_PLAYLISTS];
      default:
        return [];
    }
  }, [activeTab, topTracks, recentTracks, artistsList, albumsList, favorites, customPlaylists]);

  // Open Artist Detail
  const handleOpenArtist = useCallback(async (artist) => {
    setSelectedArtist(artist);
    setArtistDetails(null);
    setIsLoadingArtist(true);
    setFocusZone('artist_detail');
    setArtistDetailSubZone('actions');
    setFocusedArtistSongIndex(0);
    setFocusedArtistAlbumIndex(0);

    try {
      const details = await musicService.getArtistDetails(artist.name, artist.id);
      setArtistDetails(details);
    } catch (err) {
      console.warn('[TVMusicPage] Error cargando detalles del artista:', err);
    } finally {
      setIsLoadingArtist(false);
    }
  }, []);

  // Open Album Detail
  const handleOpenAlbum = useCallback(async (album, fromArtist = null) => {
    setSelectedAlbum(album);
    setAlbumSourceArtist(fromArtist);
    setAlbumTracks([]);
    setIsLoadingAlbum(true);
    setFocusZone('album_detail');
    setAlbumDetailSubZone('actions');
    setFocusedAlbumActionIndex(0);
    setFocusedAlbumSongIndex(0);

    try {
      const tracks = await musicService.getAlbumTracks(album.id, album.title, album.artist);
      setAlbumTracks(tracks.length ? tracks : (album.tracks || []));
    } catch (err) {
      console.warn('[TVMusicPage] Error cargando pistas del album:', err);
    } finally {
      setIsLoadingAlbum(false);
    }
  }, []);

  // Open Playlist Detail
  const handleOpenPlaylist = useCallback(async (playlist) => {
    setSelectedPlaylist(playlist);
    setPlaylistTracks([]);
    setIsLoadingPlaylist(true);
    setFocusZone('playlist_detail');
    setPlaylistDetailSubZone('actions');
    setFocusedPlaylistSongIndex(0);

    try {
      if (playlist.tracks && playlist.tracks.length > 0) {
        setPlaylistTracks(playlist.tracks);
      } else {
        const tracks = await musicService.getPlaylistTracks(playlist.id || playlist.deezerId);
        setPlaylistTracks(tracks);
      }
    } catch (err) {
      console.warn('[TVMusicPage] Error cargando pistas de playlist:', err);
    } finally {
      setIsLoadingPlaylist(false);
    }
  }, []);

  // Search executor
  const executeSearch = useCallback(async (q) => {
    if (!q || !q.trim()) {
      setSearchResults([]);
      setSearchArtists([]);
      return;
    }
    setIsSearching(true);
    try {
      const [tracks, artists] = await Promise.allSettled([
        musicService.searchTracks(q.trim(), 80),
        musicService.searchArtists(q.trim(), 8)
      ]);
      setSearchResults(tracks.status === 'fulfilled' && Array.isArray(tracks.value) ? tracks.value : []);
      setSearchArtists(artists.status === 'fulfilled' && Array.isArray(artists.value) ? artists.value : []);
    } catch (err) {
      console.warn('[TVMusicPage] Error en busqueda:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-scroll focused element into view
  useEffect(() => {
    const timer = setTimeout(() => {
      const focusedEl = document.querySelector('[data-tv-focused="true"]');
      if (focusedEl) {
        focusedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [
    focusZone,
    focusedTabIndex,
    focusedGridIndex,
    focusedPlayerIndex,
    focusedArtistSongIndex,
    focusedArtistAlbumIndex,
    focusedAlbumSongIndex,
    focusedPlaylistSongIndex,
    artistDetailSubZone,
    albumDetailSubZone,
    playlistDetailSubZone,
    searchFocusZone,
    focusedSearchArtistIndex,
    focusedSearchTrackIndex
  ]);

  // Master D-Pad keydown handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check TV Focus Zone: must be in content
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;

      const action = getTVKeyName(e);
      const isBack = isTVBackKey(e, action);

      // 1. Remote Media Hardware Keys (Work in all zones)
      if (e.keyCode === 85 || action === 'MediaPlayPause') {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.keyCode === 87 || action === 'MediaTrackNext') {
        e.preventDefault();
        nextTrack();
        return;
      }
      if (e.keyCode === 88 || action === 'MediaTrackPrevious') {
        e.preventDefault();
        prevTrack();
        return;
      }

      // 2. BACK / ESCAPE KEY: Hierarchy Unwinding
      if (isBack) {
        if (showSearchModal) {
          e.preventDefault();
          e.stopPropagation();
          setShowSearchModal(false);
          setFocusZone('tabs');
          return;
        }

        if (focusZone === 'album_detail') {
          e.preventDefault();
          e.stopPropagation();
          if (albumSourceArtist) {
            setSelectedAlbum(null);
            setFocusZone('artist_detail');
          } else {
            setSelectedAlbum(null);
            setFocusZone('grid');
          }
          return;
        }

        if (focusZone === 'artist_detail') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedArtist(null);
          setArtistDetails(null);
          setFocusZone('grid');
          return;
        }

        if (focusZone === 'playlist_detail') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedPlaylist(null);
          setPlaylistTracks([]);
          setFocusZone('grid');
          return;
        }

        if (focusZone === 'player') {
          e.preventDefault();
          e.stopPropagation();
          setFocusZone('grid');
          return;
        }

        if (focusZone === 'grid') {
          e.preventDefault();
          e.stopPropagation();
          setFocusZone('tabs');
          return;
        }

        if (focusZone === 'search_btn') {
          e.preventDefault();
          e.stopPropagation();
          setFocusZone('tabs');
          return;
        }

        // If in 'tabs', let event bubble so AppTV focuses TV Navigation sidebar or navigates to Home!
        return;
      }

      if (!action) return;

      // Prevent native scroll on Arrow keys
      if (action.startsWith('Arrow')) {
        e.preventDefault();
      }

      // 3. SEARCH MODAL D-PAD
      if (showSearchModal) {
        if (searchFocusZone === 'input') {
          if (action === 'ArrowDown') {
            if (searchArtists.length > 0) {
              setSearchFocusZone('artists');
              setFocusedSearchArtistIndex(0);
            } else if (searchResults.length > 0) {
              setSearchFocusZone('tracks');
              setFocusedSearchTrackIndex(0);
            }
          } else if (action === 'Enter') {
            searchInputRef.current?.focus();
          }
          return;
        }

        if (searchFocusZone === 'artists') {
          if (action === 'ArrowUp') {
            setSearchFocusZone('input');
          } else if (action === 'ArrowLeft') {
            setFocusedSearchArtistIndex(prev => Math.max(0, prev - 1));
          } else if (action === 'ArrowRight') {
            setFocusedSearchArtistIndex(prev => Math.min(searchArtists.length - 1, prev + 1));
          } else if (action === 'ArrowDown') {
            if (searchResults.length > 0) {
              setSearchFocusZone('tracks');
              setFocusedSearchTrackIndex(0);
            }
          } else if (action === 'Enter') {
            const artist = searchArtists[focusedSearchArtistIndex];
            if (artist) {
              setShowSearchModal(false);
              handleOpenArtist(artist);
            }
          }
          return;
        }

        if (searchFocusZone === 'tracks') {
          if (action === 'ArrowUp') {
            if (focusedSearchTrackIndex === 0) {
              if (searchArtists.length > 0) {
                setSearchFocusZone('artists');
              } else {
                setSearchFocusZone('input');
              }
            } else {
              setFocusedSearchTrackIndex(prev => Math.max(0, prev - 1));
            }
          } else if (action === 'ArrowDown') {
            setFocusedSearchTrackIndex(prev => Math.min(searchResults.length - 1, prev + 1));
          } else if (action === 'Enter') {
            const track = searchResults[focusedSearchTrackIndex];
            if (track) {
              playTrack(track, searchResults);
            }
          }
          return;
        }
      }

      // 4. ZONE: TABS
      if (focusZone === 'tabs') {
        if (action === 'ArrowLeft') {
          if (focusedTabIndex === 0) {
            focusTVNav();
          } else {
            setFocusedTabIndex(prev => prev - 1);
            setActiveTab(TABS[focusedTabIndex - 1].key);
            setFocusedGridIndex(0);
          }
        } else if (action === 'ArrowRight') {
          if (focusedTabIndex === TABS.length - 1) {
            setFocusZone('search_btn');
          } else {
            setFocusedTabIndex(prev => prev + 1);
            setActiveTab(TABS[focusedTabIndex + 1].key);
            setFocusedGridIndex(0);
          }
        } else if (action === 'ArrowDown') {
          if (currentGridItems.length > 0) {
            setFocusZone('grid');
            setFocusedGridIndex(0);
          } else if (currentTrack) {
            setFocusZone('player');
          }
        } else if (action === 'Enter') {
          setActiveTab(TABS[focusedTabIndex].key);
          setFocusedGridIndex(0);
          setFocusZone('grid');
        }
        return;
      }

      // 5. ZONE: SEARCH_BTN
      if (focusZone === 'search_btn') {
        if (action === 'ArrowLeft') {
          setFocusZone('tabs');
          setFocusedTabIndex(TABS.length - 1);
        } else if (action === 'ArrowDown') {
          if (currentGridItems.length > 0) {
            setFocusZone('grid');
            setFocusedGridIndex(0);
          } else if (currentTrack) {
            setFocusZone('player');
          }
        } else if (action === 'Enter') {
          setShowSearchModal(true);
          setSearchFocusZone('input');
        }
        return;
      }

      // 6. ZONE: GRID (Content items)
      if (focusZone === 'grid') {
        const total = currentGridItems.length;
        if (total === 0) {
          if (action === 'ArrowUp') setFocusZone('tabs');
          else if (action === 'ArrowLeft') focusTVNav();
          return;
        }

        const cols = gridColumns;
        const col = focusedGridIndex % cols;
        const row = Math.floor(focusedGridIndex / cols);
        const totalRows = Math.ceil(total / cols);

        if (action === 'ArrowLeft') {
          if (col === 0) {
            focusTVNav();
          } else {
            setFocusedGridIndex(prev => Math.max(0, prev - 1));
          }
        } else if (action === 'ArrowRight') {
          if (col < cols - 1 && focusedGridIndex < total - 1) {
            setFocusedGridIndex(prev => Math.min(total - 1, prev + 1));
          }
        } else if (action === 'ArrowUp') {
          if (row === 0) {
            setFocusZone('tabs');
          } else {
            setFocusedGridIndex(prev => Math.max(0, prev - cols));
          }
        } else if (action === 'ArrowDown') {
          if (row < totalRows - 1) {
            setFocusedGridIndex(prev => Math.min(total - 1, prev + cols));
          } else if (currentTrack) {
            setFocusZone('player');
          }
        } else if (action === 'Enter') {
          const item = currentGridItems[focusedGridIndex];
          if (!item) return;

          if (activeTab === 'artists') {
            handleOpenArtist(item);
          } else if (activeTab === 'albums') {
            handleOpenAlbum(item);
          } else if (activeTab === 'radios') {
            playRadio(item);
          } else if (activeTab === 'playlists') {
            handleOpenPlaylist(item);
          } else {
            // Track playback: top, recent, favorites
            playTrack(item, currentGridItems);
          }
        }
        return;
      }

      // 7. ZONE: ARTIST_DETAIL
      if (focusZone === 'artist_detail') {
        const topSongs = artistDetails?.topTracks || [];
        const albums = artistDetails?.albums || [];

        if (artistDetailSubZone === 'actions') {
          if (action === 'ArrowLeft') {
            focusTVNav();
          } else if (action === 'ArrowDown') {
            if (topSongs.length > 0) {
              setArtistDetailSubZone('songs');
              setFocusedArtistSongIndex(0);
            } else if (albums.length > 0) {
              setArtistDetailSubZone('albums');
              setFocusedArtistAlbumIndex(0);
            }
          } else if (action === 'Enter') {
            if (topSongs.length > 0) {
              playTrack(topSongs[0], topSongs);
            }
          }
          return;
        }

        if (artistDetailSubZone === 'songs') {
          if (action === 'ArrowLeft') {
            focusTVNav();
          } else if (action === 'ArrowUp') {
            if (focusedArtistSongIndex === 0) {
              setArtistDetailSubZone('actions');
            } else {
              setFocusedArtistSongIndex(prev => Math.max(0, prev - 1));
            }
          } else if (action === 'ArrowDown') {
            if (focusedArtistSongIndex < topSongs.length - 1) {
              setFocusedArtistSongIndex(prev => prev + 1);
            } else if (albums.length > 0) {
              setArtistDetailSubZone('albums');
              setFocusedArtistAlbumIndex(0);
            } else if (currentTrack) {
              setFocusZone('player');
            }
          } else if (action === 'Enter') {
            const track = topSongs[focusedArtistSongIndex];
            if (track) playTrack(track, topSongs);
          }
          return;
        }

        if (artistDetailSubZone === 'albums') {
          const cols = 4;
          const col = focusedArtistAlbumIndex % cols;
          const row = Math.floor(focusedArtistAlbumIndex / cols);
          const totalRows = Math.ceil(albums.length / cols);

          if (action === 'ArrowLeft') {
            if (col === 0) {
              focusTVNav();
            } else {
              setFocusedArtistAlbumIndex(prev => Math.max(0, prev - 1));
            }
          } else if (action === 'ArrowRight') {
            if (col < cols - 1 && focusedArtistAlbumIndex < albums.length - 1) {
              setFocusedArtistAlbumIndex(prev => Math.min(albums.length - 1, prev + 1));
            }
          } else if (action === 'ArrowUp') {
            if (row === 0) {
              if (topSongs.length > 0) {
                setArtistDetailSubZone('songs');
                setFocusedArtistSongIndex(Math.min(topSongs.length - 1, 4));
              } else {
                setArtistDetailSubZone('actions');
              }
            } else {
              setFocusedArtistAlbumIndex(prev => Math.max(0, prev - cols));
            }
          } else if (action === 'ArrowDown') {
            if (row < totalRows - 1) {
              setFocusedArtistAlbumIndex(prev => Math.min(albums.length - 1, prev + cols));
            } else if (currentTrack) {
              setFocusZone('player');
            }
          } else if (action === 'Enter') {
            const album = albums[focusedArtistAlbumIndex];
            if (album) {
              handleOpenAlbum(album, selectedArtist);
            }
          }
          return;
        }
      }

      // 8. ZONE: ALBUM_DETAIL
      if (focusZone === 'album_detail') {
        if (albumDetailSubZone === 'actions') {
          if (action === 'ArrowLeft') {
            if (focusedAlbumActionIndex > 0) {
              setFocusedAlbumActionIndex(0);
            } else {
              focusTVNav();
            }
          } else if (action === 'ArrowRight') {
            setFocusedAlbumActionIndex(1);
          } else if (action === 'ArrowDown') {
            if (albumTracks.length > 0) {
              setAlbumDetailSubZone('songs');
              setFocusedAlbumSongIndex(0);
            }
          } else if (action === 'Enter') {
            if (focusedAlbumActionIndex === 1) {
              saveAlbumAsPlaylist({ ...selectedAlbum, tracks: albumTracks });
            } else if (albumTracks.length > 0) {
              playTrack(albumTracks[0], albumTracks);
            }
          }
          return;
        }

        if (albumDetailSubZone === 'songs') {
          if (action === 'ArrowLeft') {
            focusTVNav();
          } else if (action === 'ArrowUp') {
            if (focusedAlbumSongIndex === 0) {
              setAlbumDetailSubZone('actions');
            } else {
              setFocusedAlbumSongIndex(prev => Math.max(0, prev - 1));
            }
          } else if (action === 'ArrowDown') {
            if (focusedAlbumSongIndex < albumTracks.length - 1) {
              setFocusedAlbumSongIndex(prev => prev + 1);
            } else if (currentTrack) {
              setFocusZone('player');
            }
          } else if (action === 'Enter') {
            const track = albumTracks[focusedAlbumSongIndex];
            if (track) playTrack(track, albumTracks);
          }
          return;
        }
      }

      // 9. ZONE: PLAYLIST_DETAIL
      if (focusZone === 'playlist_detail') {
        if (playlistDetailSubZone === 'actions') {
          if (action === 'ArrowLeft') {
            focusTVNav();
          } else if (action === 'ArrowDown') {
            if (playlistTracks.length > 0) {
              setPlaylistDetailSubZone('songs');
              setFocusedPlaylistSongIndex(0);
            }
          } else if (action === 'Enter') {
            if (playlistTracks.length > 0) {
              playTrack(playlistTracks[0], playlistTracks);
            }
          }
          return;
        }

        if (playlistDetailSubZone === 'songs') {
          if (action === 'ArrowLeft') {
            focusTVNav();
          } else if (action === 'ArrowUp') {
            if (focusedPlaylistSongIndex === 0) {
              setPlaylistDetailSubZone('actions');
            } else {
              setFocusedPlaylistSongIndex(prev => Math.max(0, prev - 1));
            }
          } else if (action === 'ArrowDown') {
            if (focusedPlaylistSongIndex < playlistTracks.length - 1) {
              setFocusedPlaylistSongIndex(prev => prev + 1);
            } else if (currentTrack) {
              setFocusZone('player');
            }
          } else if (action === 'Enter') {
            const track = playlistTracks[focusedPlaylistSongIndex];
            if (track) playTrack(track, playlistTracks);
          }
          return;
        }
      }

      // 10. ZONE: PLAYER (Bottom Now-Playing Bar)
      if (focusZone === 'player') {
        const totalControls = 6; // 0: prev, 1: play/pause, 2: next, 3: shuffle, 4: repeat, 5: artist, 6: favorite

        if (action === 'ArrowLeft') {
          if (focusedPlayerIndex === 0) {
            focusTVNav();
          } else {
            setFocusedPlayerIndex(prev => Math.max(0, prev - 1));
          }
        } else if (action === 'ArrowRight') {
          setFocusedPlayerIndex(prev => Math.min(totalControls, prev + 1));
        } else if (action === 'ArrowUp') {
          // Return focus to content
          if (selectedAlbum) setFocusZone('album_detail');
          else if (selectedArtist) setFocusZone('artist_detail');
          else if (selectedPlaylist) setFocusZone('playlist_detail');
          else setFocusZone('grid');
        } else if (action === 'Enter') {
          switch (focusedPlayerIndex) {
            case 0:
              prevTrack();
              break;
            case 1:
              togglePlay();
              break;
            case 2:
              nextTrack();
              break;
            case 3:
              toggleShuffle();
              break;
            case 4:
              toggleRepeat();
              break;
            case 5:
              if (currentTrack?.artist) {
                handleOpenArtist({ name: currentTrack.artist });
              }
              break;
            case 6:
              if (currentTrack) toggleFavorite(currentTrack);
              break;
            default:
              break;
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusZone,
    focusedTabIndex,
    focusedGridIndex,
    focusedPlayerIndex,
    focusedArtistSongIndex,
    focusedArtistAlbumIndex,
    focusedAlbumSongIndex,
    focusedPlaylistSongIndex,
    artistDetailSubZone,
    albumDetailSubZone,
    playlistDetailSubZone,
    currentGridItems,
    gridColumns,
    selectedArtist,
    artistDetails,
    selectedAlbum,
    albumTracks,
    selectedPlaylist,
    playlistTracks,
    showSearchModal,
    searchFocusZone,
    focusedSearchArtistIndex,
    focusedSearchTrackIndex,
    searchResults,
    searchArtists,
    currentTrack,
    playTrack,
    playRadio,
    togglePlay,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    handleOpenArtist,
    handleOpenAlbum,
    handleOpenPlaylist
  ]);

  return (
    <div className="tv-music-root min-h-screen text-white select-none pb-28">
      <style>{`
        .tv-music-root {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: radial-gradient(circle at 10% 20%, rgba(34, 211, 238, 0.08), transparent 30%),
                      radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.08), transparent 30%),
                      #050816;
        }

        .tv-focus-glow {
          outline: none;
          transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.18s;
        }

        .tv-focus-glow[data-tv-focused="true"] {
          outline: 3px solid #22d3ee !important;
          box-shadow: 0 0 35px rgba(34, 211, 238, 0.55), 0 10px 25px rgba(0, 0, 0, 0.8) !important;
          transform: scale(1.035) !important;
          z-index: 10 !important;
        }

        .tv-focus-tab[data-tv-focused="true"] {
          outline: 2px solid #22d3ee !important;
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.5) !important;
          background: rgba(34, 211, 238, 0.2) !important;
          color: #fff !important;
          transform: scale(1.05) !important;
        }

        .tv-focus-btn[data-tv-focused="true"] {
          outline: 3px solid #22d3ee !important;
          box-shadow: 0 0 25px rgba(34, 211, 238, 0.6) !important;
          background: #22d3ee !important;
          color: #050816 !important;
          transform: scale(1.06) !important;
        }

        .tv-player-bar {
          background: rgba(8, 12, 28, 0.95);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border-top: 1px solid rgba(34, 211, 238, 0.2);
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.75);
        }

        .vinyl-spin {
          animation: spin 16s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Top Header Bar */}
      <div className="pt-8 px-12 pb-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Music2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-wider bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              TEAMG MUSIC TV
            </h1>
            <p className="text-xs text-cyan-300/70 font-semibold tracking-widest uppercase">
              {isAndroidTVNative ? 'Reproducción Nativa ExoPlayer · Audio Ininterrumpido' : 'Sonido Master Studio Hi-Fi'}
            </p>
          </div>
        </div>

        {/* Search Quick Launcher */}
        <button
          data-tv-focused={focusZone === 'search_btn'}
          onClick={() => {
            setShowSearchModal(true);
            setSearchFocusZone('input');
          }}
          className={`tv-focus-btn flex items-center gap-3 px-6 py-3 rounded-full border transition-all text-sm font-bold ${
            focusZone === 'search_btn'
              ? 'bg-cyan-400 text-black border-cyan-300'
              : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/10'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Buscar Canción o Artista</span>
        </button>
      </div>

      {/* Main Tabs Navigation Bar */}
      {!selectedArtist && !selectedAlbum && !selectedPlaylist && (
        <div className="px-12 pt-6 pb-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {TABS.map((tab, idx) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.key;
              const isFocused = focusZone === 'tabs' && focusedTabIndex === idx;

              return (
                <button
                  key={tab.key}
                  data-tv-focused={isFocused}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setFocusedTabIndex(idx);
                    setFocusedGridIndex(0);
                    setFocusZone('grid');
                  }}
                  className={`tv-focus-tab flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:text-white'
                  }`}
                >
                  <TabIcon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: ARTIST DETAIL */}
      {selectedArtist && (
        <div className="px-12 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              data-tv-focused={focusZone === 'artist_detail' && artistDetailSubZone === 'actions'}
              onClick={() => {
                setSelectedArtist(null);
                setArtistDetails(null);
                setFocusZone('grid');
              }}
              className="tv-focus-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Catálogo</span>
            </button>
          </div>

          {/* Artist Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black/60 border border-white/10 flex items-center gap-8 mb-8">
            <img
              src={artistDetails?.picture || selectedArtist.picture || selectedArtist.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}
              alt={selectedArtist.name}
              className="w-40 h-40 rounded-full object-cover shadow-2xl border-4 border-cyan-400/40"
            />
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
                Artista Verificado
              </span>
              <h2 className="text-5xl font-black mt-2 tracking-tight text-white">{selectedArtist.name}</h2>
              <p className="text-gray-400 text-sm mt-2 max-w-2xl">
                {selectedArtist.bio || 'Discografía completa en alta fidelidad y canciones más populares.'}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <button
                  data-tv-focused={focusZone === 'artist_detail' && artistDetailSubZone === 'actions'}
                  onClick={() => {
                    if (artistDetails?.topTracks?.length) {
                      playTrack(artistDetails.topTracks[0], artistDetails.topTracks);
                    }
                  }}
                  className="tv-focus-btn flex items-center gap-3 px-8 py-3 rounded-full bg-cyan-400 text-black font-extrabold text-sm shadow-xl shadow-cyan-400/30"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Reproducir Éxitos</span>
                </button>
              </div>
            </div>
          </div>

          {isLoadingArtist && (
            <div className="flex items-center justify-center py-20 gap-3 text-cyan-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="font-bold text-lg">Cargando discografía y canciones...</span>
            </div>
          )}

          {!isLoadingArtist && artistDetails && (
            <div className="grid grid-cols-12 gap-8">
              {/* Popular Songs */}
              <div className="col-span-6">
                <h3 className="text-xl font-black text-cyan-300 mb-4 flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  <span>Canciones Más Escuchadas</span>
                </h3>
                <div className="space-y-2">
                  {(artistDetails.topTracks || []).slice(0, 10).map((track, idx) => {
                    const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                    const isFocused = focusZone === 'artist_detail' && artistDetailSubZone === 'songs' && focusedArtistSongIndex === idx;

                    return (
                      <div
                        key={track.id || idx}
                        data-tv-focused={isFocused}
                        onClick={() => playTrack(track, artistDetails.topTracks)}
                        className={`tv-focus-glow flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isTrackPlaying
                            ? 'bg-cyan-500/20 border-cyan-400'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="w-6 text-center text-sm font-bold text-gray-400">{idx + 1}</span>
                          <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm truncate text-white">{track.title}</p>
                            <p className="text-xs text-gray-400 truncate">{track.album || selectedArtist.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isTrackPlaying && (
                            <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-400/40">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                              Sonar
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-mono">{formatTime(track.duration)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Albums & Discography */}
              <div className="col-span-6">
                <h3 className="text-xl font-black text-pink-400 mb-4 flex items-center gap-2">
                  <Disc3 className="w-5 h-5" />
                  <span>Álbumes & Discografía ({artistDetails.albums?.length || 0})</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {(artistDetails.albums || []).map((album, idx) => {
                    const isFocused = focusZone === 'artist_detail' && artistDetailSubZone === 'albums' && focusedArtistAlbumIndex === idx;

                    return (
                      <div
                        key={album.id || idx}
                        data-tv-focused={isFocused}
                        onClick={() => handleOpenAlbum(album, selectedArtist)}
                        className="tv-focus-glow p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer flex flex-col items-center text-center"
                      >
                        <img
                          src={album.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'}
                          alt={album.title}
                          className="w-full aspect-square rounded-xl object-cover shadow-lg mb-3"
                        />
                        <h4 className="font-extrabold text-sm text-white truncate w-full">{album.title}</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {album.releaseDate ? album.releaseDate.substring(0, 4) : 'Álbum'} · {album.trackCount || 'Varios'} temas
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: ALBUM DETAIL */}
      {selectedAlbum && (
        <div className="px-12 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              data-tv-focused={focusZone === 'album_detail' && albumDetailSubZone === 'actions'}
              onClick={() => {
                if (albumSourceArtist) {
                  setSelectedAlbum(null);
                  setFocusZone('artist_detail');
                } else {
                  setSelectedAlbum(null);
                  setFocusZone('grid');
                }
              }}
              className="tv-focus-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a {albumSourceArtist ? selectedArtist?.name : 'Álbumes'}</span>
            </button>
          </div>

          {/* Album Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black/60 border border-white/10 flex items-center gap-8 mb-8">
            <img
              src={selectedAlbum.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'}
              alt={selectedAlbum.title}
              className="w-44 h-44 rounded-2xl object-cover shadow-2xl border-2 border-white/10"
            />
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-widest text-pink-400 bg-pink-950/60 px-3 py-1 rounded-full border border-pink-500/30">
                Álbum Oficial
              </span>
              <h2 className="text-4xl font-black mt-2 tracking-tight text-white">{selectedAlbum.title}</h2>
              <p className="text-lg font-bold text-cyan-300 mt-1">{selectedAlbum.artist}</p>
              <p className="text-gray-400 text-xs mt-1">
                Lanzamiento: {selectedAlbum.releaseDate || '2026'} · {albumTracks.length} canciones
              </p>
              <div className="flex items-center gap-4 mt-5">
                <button
                  data-tv-focused={focusZone === 'album_detail' && albumDetailSubZone === 'actions' && focusedAlbumActionIndex === 0}
                  onClick={() => {
                    if (albumTracks.length > 0) {
                      playTrack(albumTracks[0], albumTracks);
                    }
                  }}
                  className="tv-focus-btn flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-extrabold text-sm shadow-xl shadow-cyan-400/25"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Reproducir Álbum Completo</span>
                </button>

                <button
                  data-tv-focused={focusZone === 'album_detail' && albumDetailSubZone === 'actions' && focusedAlbumActionIndex === 1}
                  onClick={async () => {
                    await saveAlbumAsPlaylist({ ...selectedAlbum, tracks: albumTracks });
                  }}
                  className={`tv-focus-btn flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm border transition ${
                    isAlbumSavedAsPlaylist(selectedAlbum)
                      ? 'bg-purple-600/40 text-purple-200 border-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'bg-white/10 text-white border-white/20'
                  }`}
                >
                  {isAlbumSavedAsPlaylist(selectedAlbum) ? (
                    <>
                      <Check className="w-4 h-4 text-purple-400" />
                      <span>En tus Playlists</span>
                    </>
                  ) : (
                    <>
                      <ListMusic className="w-4 h-4 text-purple-300" />
                      <span>Guardar como Playlist</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {isLoadingAlbum && (
            <div className="flex items-center justify-center py-20 gap-3 text-pink-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="font-bold text-lg">Cargando pistas del álbum...</span>
            </div>
          )}

          {!isLoadingAlbum && (
            <div className="space-y-2 max-w-4xl">
              {albumTracks.map((track, idx) => {
                const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                const isFocused = focusZone === 'album_detail' && albumDetailSubZone === 'songs' && focusedAlbumSongIndex === idx;

                return (
                  <div
                    key={track.id || idx}
                    data-tv-focused={isFocused}
                    onClick={() => playTrack(track, albumTracks)}
                    className={`tv-focus-glow flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isTrackPlaying
                        ? 'bg-cyan-500/20 border-cyan-400'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-6 text-center text-sm font-bold text-gray-400">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm truncate text-white">{track.title}</p>
                        <p className="text-xs text-gray-400 truncate">{track.artist || selectedAlbum.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isTrackPlaying && (
                        <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-400/40">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          Sonar
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">{formatTime(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: PLAYLIST DETAIL */}
      {selectedPlaylist && (
        <div className="px-12 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              data-tv-focused={focusZone === 'playlist_detail' && playlistDetailSubZone === 'actions'}
              onClick={() => {
                setSelectedPlaylist(null);
                setPlaylistTracks([]);
                setFocusZone('grid');
              }}
              className="tv-focus-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Playlists</span>
            </button>
          </div>

          {/* Playlist Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-black/60 border border-white/10 flex items-center gap-8 mb-8">
            <img
              src={selectedPlaylist.cover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600'}
              alt={selectedPlaylist.name}
              className="w-44 h-44 rounded-2xl object-cover shadow-2xl border-2 border-white/10"
            />
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
                Playlist TeamG
              </span>
              <h2 className="text-4xl font-black mt-2 tracking-tight text-white">{selectedPlaylist.name}</h2>
              <p className="text-gray-300 text-sm mt-2 max-w-2xl">{selectedPlaylist.description}</p>
              <div className="flex items-center gap-4 mt-5">
                <button
                  data-tv-focused={focusZone === 'playlist_detail' && playlistDetailSubZone === 'actions'}
                  onClick={() => {
                    if (playlistTracks.length > 0) {
                      playTrack(playlistTracks[0], playlistTracks);
                    }
                  }}
                  className="tv-focus-btn flex items-center gap-3 px-8 py-3 rounded-full bg-cyan-400 text-black font-extrabold text-sm shadow-xl shadow-cyan-400/25"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Reproducir Playlist</span>
                </button>
              </div>
            </div>
          </div>

          {isLoadingPlaylist && (
            <div className="flex items-center justify-center py-20 gap-3 text-cyan-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="font-bold text-lg">Cargando temas de la playlist...</span>
            </div>
          )}

          {!isLoadingPlaylist && (
            <div className="space-y-2 max-w-4xl">
              {playlistTracks.map((track, idx) => {
                const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                const isFocused = focusZone === 'playlist_detail' && playlistDetailSubZone === 'songs' && focusedPlaylistSongIndex === idx;

                return (
                  <div
                    key={track.id || idx}
                    data-tv-focused={isFocused}
                    onClick={() => playTrack(track, playlistTracks)}
                    className={`tv-focus-glow flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isTrackPlaying
                        ? 'bg-cyan-500/20 border-cyan-400'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-6 text-center text-sm font-bold text-gray-400">{idx + 1}</span>
                      <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm truncate text-white">{track.title}</p>
                        <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isTrackPlaying && (
                        <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-400/40">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          Sonar
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">{formatTime(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: MAIN TABS CONTENT GRID */}
      {!selectedArtist && !selectedAlbum && !selectedPlaylist && (
        <div className="px-12 pt-4">
          {loadingContent && (
            <div className="flex items-center justify-center py-28 gap-3 text-cyan-400">
              <Loader2 className="w-10 h-10 animate-spin" />
              <span className="font-bold text-xl">Sincronizando biblioteca de música...</span>
            </div>
          )}

          {!loadingContent && currentGridItems.length === 0 && (
            <div className="text-center py-28 text-gray-400">
              <Music2 className="w-16 h-16 mx-auto mb-4 opacity-40 text-cyan-400" />
              <h3 className="text-2xl font-bold text-white mb-2">No hay elementos en esta categoría</h3>
              <p className="text-sm">Explora otras secciones o usa la búsqueda superior con el control remoto.</p>
            </div>
          )}

          {/* GRID TYPE 1: TRACKS (Top, Recent, Favorites) */}
          {!loadingContent && (activeTab === 'top' || activeTab === 'recent' || activeTab === 'favorites') && (
            <div className="grid grid-cols-2 gap-4">
              {currentGridItems.map((track, idx) => {
                const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={track.id || idx}
                    data-tv-focused={isFocused}
                    onClick={() => playTrack(track, currentGridItems)}
                    className={`tv-focus-glow flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer ${
                      isTrackPlaying
                        ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-cyan-400 shadow-xl shadow-cyan-500/15'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}
                          alt={track.title}
                          className="w-16 h-16 rounded-2xl object-cover shadow-md"
                        />
                        {isTrackPlaying && (
                          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-base truncate text-white">{track.title}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
                        <p className="text-[11px] text-cyan-400/80 truncate mt-1">
                          {track.album !== 'Sencillo' ? track.album : 'Estreno'} · {track.releaseDate ? track.releaseDate.substring(0, 4) : '2026'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-2 flex-shrink-0">
                      {isFavorite(track.id) && <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />}
                      <span className="text-xs font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg">
                        {formatTime(track.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID TYPE 2: ARTISTS */}
          {!loadingContent && activeTab === 'artists' && (
            <div className="grid grid-cols-4 gap-6">
              {currentGridItems.map((artist, idx) => {
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={artist.id || idx}
                    data-tv-focused={isFocused}
                    onClick={() => handleOpenArtist(artist)}
                    className="tv-focus-glow p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer flex flex-col items-center text-center"
                  >
                    <img
                      src={artist.picture || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}
                      alt={artist.name}
                      className="w-36 h-36 rounded-full object-cover shadow-2xl border-2 border-white/10 mb-4"
                    />
                    <h3 className="font-extrabold text-base text-white truncate w-full">{artist.name}</h3>
                    <p className="text-xs text-cyan-400 mt-1 font-semibold">{artist.genre || 'Artista'}</p>
                    <span className="mt-3 text-[11px] text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                      Ver Álbumes y Canciones
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID TYPE 3: ALBUMS */}
          {!loadingContent && activeTab === 'albums' && (
            <div className="grid grid-cols-4 gap-6">
              {currentGridItems.map((album, idx) => {
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={album.id || idx}
                    data-tv-focused={isFocused}
                    onClick={() => handleOpenAlbum(album)}
                    className="tv-focus-glow p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer flex flex-col"
                  >
                    <img
                      src={album.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'}
                      alt={album.title}
                      className="w-full aspect-square rounded-2xl object-cover shadow-xl mb-3"
                    />
                    <h3 className="font-extrabold text-sm text-white truncate w-full">{album.title}</h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{album.artist}</p>
                    <span className="text-[11px] text-cyan-400 mt-2 font-mono">
                      {album.releaseDate ? album.releaseDate.substring(0, 4) : '2026'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID TYPE 4: RADIOS EN VIVO */}
          {!loadingContent && activeTab === 'radios' && (
            <div className="grid grid-cols-3 gap-6">
              {currentGridItems.map((radioItem, idx) => {
                const isRadioPlaying = currentTrack?.id === radioItem.id && isPlaying;
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={radioItem.id || idx}
                    data-tv-focused={isFocused}
                    onClick={() => playRadio(radioItem)}
                    className={`tv-focus-glow p-6 rounded-3xl border transition-all cursor-pointer flex items-center gap-5 ${
                      isRadioPlaying
                        ? 'bg-gradient-to-r from-red-950/80 to-amber-950/80 border-red-500 shadow-xl shadow-red-500/20'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={radioItem.cover}
                        alt={radioItem.title}
                        className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                      />
                      {isRadioPlaying && (
                        <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-500/30">
                          EN VIVO
                        </span>
                        <span className="text-xs text-gray-400 font-bold">{radioItem.frequency}</span>
                      </div>
                      <h3 className="font-extrabold text-base text-white truncate">{radioItem.title}</h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{radioItem.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID TYPE 5: PLAYLISTS */}
          {!loadingContent && activeTab === 'playlists' && (
            <div className="grid grid-cols-3 gap-6">
              {currentGridItems.map((playlist, idx) => {
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={playlist.id || idx}
                    data-tv-focused={isFocused}
                    onClick={() => handleOpenPlaylist(playlist)}
                    className="tv-focus-glow p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center gap-5"
                  >
                    <img
                      src={playlist.cover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600'}
                      alt={playlist.name}
                      className="w-20 h-20 rounded-2xl object-cover shadow-lg flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        {playlist.creator || 'Curada'}
                      </span>
                      <h3 className="font-extrabold text-base text-white truncate mt-1.5">{playlist.name}</h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{playlist.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SEARCH OVERLAY MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl p-16 flex flex-col">
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <h2 className="text-3xl font-black text-white flex items-center gap-3">
              <Search className="w-8 h-8 text-cyan-400" />
              <span>Búsqueda Universal TeamG Music</span>
            </h2>
            <button
              onClick={() => setShowSearchModal(false)}
              className="text-sm font-bold text-gray-400 hover:text-white bg-white/10 px-4 py-2 rounded-xl"
            >
              Presiona BACK para cerrar
            </button>
          </div>

          <div className="pt-8 max-w-4xl w-full mx-auto">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                data-tv-focused={searchFocusZone === 'input'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  executeSearch(e.target.value);
                }}
                placeholder="Escribe el nombre de la canción, artista (ej: Zen, Libido, Taylor) o álbum..."
                className="tv-focus-glow w-full bg-white/10 border-2 border-white/10 text-white font-bold text-xl px-6 py-4 rounded-2xl placeholder-gray-400 outline-none focus:border-cyan-400 focus:bg-white/15"
              />
              {isSearching && (
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400 absolute right-6 top-5" />
              )}
            </div>

            {/* Matching Artists */}
            {searchArtists.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 mb-3">
                  Artistas Coincidentes
                </h3>
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                  {searchArtists.map((artist, idx) => {
                    const isFocused = searchFocusZone === 'artists' && focusedSearchArtistIndex === idx;
                    return (
                      <div
                        key={artist.id || idx}
                        data-tv-focused={isFocused}
                        onClick={() => {
                          setShowSearchModal(false);
                          handleOpenArtist(artist);
                        }}
                        className="tv-focus-glow flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer min-w-[220px]"
                      >
                        <img
                          src={artist.picture || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}
                          alt={artist.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-sm text-white truncate">{artist.name}</p>
                          <p className="text-[11px] text-cyan-400">Ver Discografía</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matching Tracks */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-pink-400 mb-3">
                  Canciones Encontradas ({searchResults.length})
                </h3>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                  {searchResults.map((track, idx) => {
                    const isFocused = searchFocusZone === 'tracks' && focusedSearchTrackIndex === idx;
                    const isTrackPlaying = currentTrack?.id === track.id && isPlaying;

                    return (
                      <div
                        key={track.id || idx}
                        data-tv-focused={isFocused}
                        onClick={() => playTrack(track, searchResults)}
                        className={`tv-focus-glow flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer ${
                          isTrackPlaying ? 'bg-cyan-500/20 border-cyan-400' : 'bg-white/5 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-white truncate">{track.title}</p>
                            <p className="text-xs text-gray-400 truncate">{track.artist} · {track.album}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{formatTime(track.duration)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOW PLAYING BOTTOM BAR (10-Foot UI) */}
      {currentTrack && (
        <div className="tv-player-bar fixed bottom-0 left-0 right-0 z-40 px-12 py-4 flex items-center justify-between">
          {/* Track Info */}
          <div className="flex items-center gap-5 min-w-0 max-w-md">
            <div className="relative">
              <img
                src={currentTrack.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}
                alt={currentTrack.title}
                className={`w-16 h-16 rounded-2xl object-cover shadow-2xl border border-white/10 ${
                  isPlaying ? 'vinyl-spin' : ''
                }`}
              />
            </div>
            <div className="min-w-0">
              <p className="font-black text-lg text-white truncate tracking-tight">{currentTrack.title}</p>
              <p className="text-sm font-semibold text-cyan-300 truncate mt-0.5">{currentTrack.artist}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-cyan-400 px-2 py-0.5 rounded font-mono">
                  {isAndroidTVNative ? 'EXOPLAYER NATIVO' : 'AUDIO NATIVO'}
                </span>
                {isLoadingAudio && (
                  <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Playback Controls & Progress */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-xl mx-8">
            <div className="flex items-center gap-6">
              {/* Prev */}
              <button
                data-tv-focused={focusZone === 'player' && focusedPlayerIndex === 0}
                onClick={prevTrack}
                className="tv-focus-btn p-3 rounded-full bg-white/5 text-gray-300 hover:text-white transition-all"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {/* Play/Pause */}
              <button
                data-tv-focused={focusZone === 'player' && focusedPlayerIndex === 1}
                onClick={togglePlay}
                className="tv-focus-btn w-14 h-14 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-xl shadow-cyan-400/30 transition-all"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
              </button>

              {/* Next */}
              <button
                data-tv-focused={focusZone === 'player' && focusedPlayerIndex === 2}
                onClick={nextTrack}
                className="tv-focus-btn p-3 rounded-full bg-white/5 text-gray-300 hover:text-white transition-all"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              {/* Shuffle */}
              <button
                data-tv-focused={focusZone === 'player' && focusedPlayerIndex === 3}
                onClick={toggleShuffle}
                className={`tv-focus-btn p-2.5 rounded-xl transition-all ${
                  isShuffle ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400' : 'bg-white/5 text-gray-400'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Repeat */}
              <button
                data-tv-focused={focusZone === 'player' && focusedPlayerIndex === 4}
                onClick={toggleRepeat}
                className={`tv-focus-btn p-2.5 rounded-xl transition-all ${
                  repeatMode !== 'off' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400' : 'bg-white/5 text-gray-400'
                }`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Time Scrubber Display */}
            <div className="w-full flex items-center gap-3 text-xs font-mono text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`
                  }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* View Artist */}
            <button
              data-tv-focused={focusZone === 'player' && focusedPlayerIndex === 5}
              onClick={() => {
                if (currentTrack?.artist) {
                  handleOpenArtist({ name: currentTrack.artist });
                }
              }}
              className="tv-focus-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 font-bold text-xs border border-white/5"
            >
              <User className="w-4 h-4" />
              <span>Ver Artista</span>
            </button>

            {/* Favorite Toggle */}
            <button
              data-tv-focused={focusZone === 'player' && focusedPlayerIndex === 6}
              onClick={() => toggleFavorite(currentTrack)}
              className="tv-focus-btn p-2.5 rounded-xl bg-white/5 text-gray-300 border border-white/5"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite(currentTrack.id) ? 'fill-pink-500 text-pink-500' : 'text-gray-300'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
