import React from 'react';
import { LayoutGrid, ListMusic, Play, Heart, ListPlus, Trash2, Download, Check, Loader2, Music2 } from 'lucide-react';

export function PlaylistSongView({ mode, onModeChange, children }) {
  return <div className="space-y-3">
    <div className="flex justify-end gap-1" role="group" aria-label="Vista de canciones">
      {[['grid', 'Cuadrícula', LayoutGrid], ['list', 'Lista', ListMusic]].map(([value, label, Icon]) =>
        <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)}
          className={`min-h-11 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold border transition ${mode === value ? 'bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-300' : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}>
          <Icon className="w-4 h-4" aria-hidden="true" /><span>{label}</span>
        </button>)}
    </div>
    {mode === 'list' && <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] md:grid-cols-[2rem_minmax(0,1fr)_minmax(0,0.5fr)_4rem_9rem] gap-3 px-2 sm:px-4 py-2 border-b border-white/10 text-xs text-gray-400" aria-hidden="true">
      <span>#</span><span>Título / Artista</span><span className="hidden md:block">Álbum</span><span className="hidden md:block text-right">Duración</span><span className="text-right">Acciones</span>
    </div>}
    <div className={mode === 'list' ? 'space-y-1' : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'}>{children}</div>
  </div>;
}

export function PlaylistTrackRow({ track, index, isPlaying, onPlay, isFav, onToggleFav, onAddToPlaylist, onRemoveFromPlaylist, isDownloaded, downloadStatus, onDownload, onArtistClick }) {
  const seconds = Math.round(track.fullDuration || track.duration || 0);
  const duration = seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '—';
  const downloading = downloadStatus?.status === 'downloading';
  const actionClass = 'min-w-9 min-h-11 flex items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-fuchsia-400';
  return <div className={`group grid grid-cols-[2rem_minmax(0,1fr)_auto] md:grid-cols-[2rem_minmax(0,1fr)_minmax(0,0.5fr)_4rem_9rem] items-center gap-3 px-2 sm:px-4 py-1 rounded-lg hover:bg-white/5 ${isPlaying ? 'bg-fuchsia-500/10 text-fuchsia-300' : 'text-gray-300'}`}>
    <button type="button" onClick={onPlay} aria-label={`Reproducir ${track.title}`} className="min-h-11 text-sm relative flex items-center justify-center rounded focus-visible:outline focus-visible:outline-fuchsia-400">
      <span className="group-hover:hidden group-focus-within:hidden">{index}</span><Play className="w-4 h-4 hidden group-hover:block group-focus-within:block" aria-hidden="true" />
    </button>
    <div className="flex items-center gap-3 min-w-0">
      <button type="button" onClick={onPlay} aria-label={`Reproducir ${track.title}`} className="shrink-0 w-11 h-11 rounded overflow-hidden bg-white/5">
        {track.cover ? <img src={track.cover} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Music2 className="w-5 h-5 mx-auto" />}
      </button>
      <div className="min-w-0">
        <button type="button" onClick={onPlay} title={track.title} className="block text-left font-semibold text-sm truncate max-w-full hover:underline">{track.title}</button>
        <button type="button" onClick={onArtistClick} title={track.artist} className="block text-left text-xs text-gray-400 truncate max-w-full hover:underline">{track.artist}</button>
        <span className="md:hidden text-[10px] text-gray-500">{duration}{isDownloaded ? ' · Offline' : ''}</span>
      </div>
    </div>
    <span className="hidden md:block truncate text-xs text-gray-400" title={track.album}>{track.album || '—'}</span>
    <span className="hidden md:block text-right text-xs text-gray-400 tabular-nums">{duration}</span>
    <div className="flex items-center justify-end flex-wrap md:flex-nowrap">
      <button type="button" onClick={onToggleFav} aria-label={`${isFav ? 'Quitar de' : 'Añadir a'} favoritos: ${track.title}`} aria-pressed={isFav} className={`${actionClass} ${isFav ? 'text-fuchsia-400' : ''}`}><Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} /></button>
      <button type="button" onClick={onAddToPlaylist} aria-label={`Añadir ${track.title} a una playlist`} className={actionClass}><ListPlus className="w-4 h-4" /></button>
      <button type="button" onClick={onDownload} disabled={isDownloaded || downloading} aria-label={`${isDownloaded ? 'Disponible offline' : downloading ? 'Descargando' : 'Descargar'}: ${track.title}`} className={`${actionClass} ${isDownloaded ? 'text-emerald-400' : ''}`}>
        {isDownloaded ? <Check className="w-4 h-4" /> : downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>
      {onRemoveFromPlaylist && <button type="button" onClick={onRemoveFromPlaylist} aria-label={`Quitar ${track.title} de esta playlist`} className={`${actionClass} hover:text-red-300`}><Trash2 className="w-4 h-4" /></button>}
    </div>
  </div>;
}
