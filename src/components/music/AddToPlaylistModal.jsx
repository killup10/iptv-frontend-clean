// src/components/music/AddToPlaylistModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Check, ListMusic, Music2, Globe, Lock, Disc3, Loader2 } from 'lucide-react';
import { useMusic } from '../../context/MusicContext.jsx';
import { musicService } from '../../services/musicService.js';

export default function AddToPlaylistModal() {
  const { 
    playlistModalTrack, 
    closeAddToPlaylistModal, 
    customPlaylists, 
    toggleTrackInPlaylist, 
    isTrackInPlaylist,
    createPlaylist,
    addTrackToPlaylist
  } = useMusic();

  const isAlbum = Boolean(playlistModalTrack?.isAlbum);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [isLoadingAlbumTracks, setIsLoadingAlbumTracks] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Cargar pistas del álbum si el elemento es un álbum completo
  useEffect(() => {
    if (!playlistModalTrack) return;
    if (playlistModalTrack.isAlbum) {
      if (Array.isArray(playlistModalTrack.tracks) && playlistModalTrack.tracks.length > 0) {
        setAlbumTracks(playlistModalTrack.tracks);
      } else if (playlistModalTrack.id) {
        setIsLoadingAlbumTracks(true);
        musicService.getAlbumTracks(playlistModalTrack.id, playlistModalTrack.title, playlistModalTrack.artist)
          .then((res) => {
            setAlbumTracks(res || []);
          })
          .catch(() => setAlbumTracks([]))
          .finally(() => setIsLoadingAlbumTracks(false));
      }
      setNewPlaylistName(`${playlistModalTrack.title || 'Álbum'} - ${playlistModalTrack.artist || ''}`.trim());
    } else {
      setAlbumTracks([]);
      setNewPlaylistName('');
    }
  }, [playlistModalTrack]);

  if (!playlistModalTrack) return null;

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    const created = createPlaylist(name, '', newPlaylistIsPublic);
    if (created) {
      if (isAlbum) {
        let tracksToAdd = albumTracks;
        if (tracksToAdd.length === 0 && playlistModalTrack.id) {
          try {
            tracksToAdd = await musicService.getAlbumTracks(playlistModalTrack.id, playlistModalTrack.title, playlistModalTrack.artist) || [];
          } catch {}
        }
        for (const t of tracksToAdd) {
          addTrackToPlaylist(created.id, t);
        }
        setFeedbackMsg(`¡Álbum completo (${tracksToAdd.length} canciones) añadido a "${name}"!`);
      } else {
        addTrackToPlaylist(created.id, playlistModalTrack);
        setFeedbackMsg(`¡Añadida a "${name}" (${newPlaylistIsPublic ? 'Pública' : 'Privada'})!`);
      }
      setNewPlaylistName('');
      setTimeout(() => setFeedbackMsg(''), 2500);
    }
  };

  const handleToggle = async (playlist) => {
    if (isAlbum) {
      let tracksToAdd = albumTracks;
      if (tracksToAdd.length === 0 && playlistModalTrack.id) {
        try {
          tracksToAdd = await musicService.getAlbumTracks(playlistModalTrack.id, playlistModalTrack.title, playlistModalTrack.artist) || [];
        } catch {}
      }
      let added = 0;
      for (const t of tracksToAdd) {
        if (!isTrackInPlaylist(playlist.id, t.id)) {
          addTrackToPlaylist(playlist.id, t);
          added++;
        }
      }
      setFeedbackMsg(added > 0 ? `¡Se añadieron ${added} canciones del álbum a "${playlist.name}"!` : `Todas las pistas del álbum ya están en "${playlist.name}"`);
      setTimeout(() => setFeedbackMsg(''), 2500);
      return;
    }

    const isAlready = isTrackInPlaylist(playlist.id, playlistModalTrack.id);
    toggleTrackInPlaylist(playlist.id, playlistModalTrack);
    setFeedbackMsg(isAlready ? `Eliminada de "${playlist.name}"` : `¡Añadida a "${playlist.name}"!`);
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#120d20] border border-fuchsia-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-fuchsia-950/30 to-black">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 border border-white/10 shadow-md">
              <img 
                src={playlistModalTrack.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
                alt={playlistModalTrack.title}
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${isAlbum ? 'text-purple-300' : 'text-cyan-400'}`}>
                {isAlbum && <Disc3 className="w-3 h-3 text-purple-400" />}
                <span>{isAlbum ? 'Añadir álbum a playlist' : 'Añadir a playlist'}</span>
              </span>
              <h3 className="text-sm font-bold text-white truncate">
                {playlistModalTrack.title}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {playlistModalTrack.artist} {isAlbum && (isLoadingAlbumTracks ? '• Cargando pistas...' : `• ${albumTracks.length} canciones`)}
              </p>
            </div>
          </div>

          <button
            onClick={closeAddToPlaylistModal}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensaje de feedback temporal */}
        {feedbackMsg && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-center text-xs font-semibold text-emerald-300 animate-in fade-in">
            {feedbackMsg}
          </div>
        )}

        {/* Lista de Playlists Existentes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <p className="text-xs font-semibold text-gray-400 px-1 mb-2">
            Selecciona una o más listas:
          </p>

          {customPlaylists.length === 0 ? (
            <div className="text-center py-8 px-4 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
              <ListMusic className="w-8 h-8 mx-auto mb-2 text-fuchsia-400/50" />
              <p className="text-xs font-semibold text-gray-300">Aún no tienes listas personalizadas</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Crea la primera abajo para empezar a organizar tu música.</p>
            </div>
          ) : (
            customPlaylists.map((pl) => {
              const inPlaylist = isTrackInPlaylist(pl.id, playlistModalTrack.id);
              return (
                <div
                  key={pl.id}
                  onClick={() => handleToggle(pl)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition duration-200 cursor-pointer ${
                    inPlaylist 
                      ? 'bg-cyan-500/10 border-cyan-400/40 text-white shadow-md'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      {pl.cover ? (
                        <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover" />
                      ) : (
                        <Music2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white truncate">{pl.name}</h4>
                        {pl.isPublic ? (
                          <span title="Pública (Comunidad)" className="text-cyan-400">
                            <Globe className="w-3 h-3 inline" />
                          </span>
                        ) : (
                          <span title="Privada" className="text-gray-500">
                            <Lock className="w-3 h-3 inline" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">{pl.tracks.length} {pl.tracks.length === 1 ? 'canción' : 'canciones'}</p>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                    inPlaylist 
                      ? 'bg-cyan-400 border-cyan-400 text-black font-bold' 
                      : 'border-white/20 bg-white/5'
                  }`}>
                    {inPlaylist && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Formulario para Crear Nueva Playlist */}
        <div className="p-4 border-t border-white/10 bg-black/40 space-y-2.5">
          <form onSubmit={handleCreateAndAdd} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nueva playlist (ej. Mis Favoritas, Gym...)"
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/15 focus:border-cyan-400/60 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition"
                maxLength={40}
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-black font-bold text-xs shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Crear y Añadir</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-400 hover:text-cyan-300 transition">
                <input
                  type="checkbox"
                  checked={newPlaylistIsPublic}
                  onChange={(e) => setNewPlaylistIsPublic(e.target.checked)}
                  className="rounded bg-black/40 border-white/20 text-cyan-400 focus:ring-0 cursor-pointer"
                />
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Hacer pública para la comunidad</span>
              </label>

              <button
                type="button"
                onClick={closeAddToPlaylistModal}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition cursor-pointer"
              >
                Listo
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
