// src/components/music/AddToPlaylistModal.jsx
import React, { useState } from 'react';
import { X, Plus, Check, ListMusic, Music2 } from 'lucide-react';
import { useMusic } from '../../context/MusicContext.jsx';

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

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!playlistModalTrack) return null;

  const handleCreateAndAdd = (e) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    const created = createPlaylist(name);
    if (created) {
      addTrackToPlaylist(created.id, playlistModalTrack);
      setNewPlaylistName('');
      setFeedbackMsg(`¡Añadida a "${name}"!`);
      setTimeout(() => setFeedbackMsg(''), 2500);
    }
  };

  const handleToggle = (playlist) => {
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Añadir a playlist
              </span>
              <h3 className="text-sm font-bold text-white truncate">
                {playlistModalTrack.title}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {playlistModalTrack.artist}
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
                      <h4 className="text-sm font-bold text-white truncate">{pl.name}</h4>
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
        <div className="p-4 border-t border-white/10 bg-black/40">
          <form onSubmit={handleCreateAndAdd} className="flex gap-2">
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
          </form>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={closeAddToPlaylistModal}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
