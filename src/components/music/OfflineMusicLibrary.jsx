import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Disc3, ListMusic, Music2, Play, Search, Shuffle, Trash2, X } from 'lucide-react';
import { buildOfflineMusicLibrary, filterOfflineMusic } from '../../utils/offlineMusicLibrary.js';

const icons = { track: Music2, album: Disc3, playlist: ListMusic };
const colors = { track: 'text-sky-300 bg-sky-400/10', album: 'text-amber-300 bg-amber-400/10', playlist: 'text-fuchsia-300 bg-fuchsia-400/10' };

export default function OfflineMusicLibrary({ tracks = [], albums = [], playlists = [], storageLabel, onPlay, onDeleteTrack, onDeleteAlbum, onClearAll, initialCollection, onCollectionChange, onCloseCollection }) {
  const [query, setQuery] = useState('');
  const [detailQuery, setDetailQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [selectedKey, setSelectedKey] = useState(null);
  const entries = useMemo(() => buildOfflineMusicLibrary(tracks, albums, playlists), [tracks, albums, playlists]);
  useEffect(() => {
    if (!initialCollection) { setSelectedKey(null); return; }
    const match = entries.find(entry => entry.kind === (initialCollection.kind || 'album') && (String(entry.id) === String(initialCollection.id) || entry.title === initialCollection.title));
    if (match) setSelectedKey(match.key);
  }, [initialCollection, entries]);
  const selected = entries.find(entry => entry.key === selectedKey);
  const search = selected ? detailQuery : query;
  const source = selected ? selected.tracks.map(track => ({ ...track, key: `track:${track.id}`, kind: 'track', label: 'Track', tracks: [track] })) : entries;
  const visible = filterOfflineMusic(source, search, selected ? 'all' : kind);
  const queue = selected?.tracks || tracks;
  const playAll = () => { if (queue.length) onPlay(queue[0], queue); };
  const close = () => { setSelectedKey(null); setDetailQuery(''); onCloseCollection?.(); };

  return <section className="space-y-4" aria-label="Biblioteca de descargas offline">
    {selected && <button type="button" onClick={close} className="inline-flex min-h-11 items-center gap-2 text-sm text-emerald-300"><ArrowLeft className="h-4 w-4" />Todas las descargas</button>}
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="break-words text-xl font-bold text-white">{selected?.title || 'Mis descargas'}</h2>
        <p className="mt-1 text-xs text-gray-400">{selected ? `${selected.label} · ${selected.tracks.length} canciones disponibles` : `${tracks.length} tracks · ${storageLabel || 'Guardado en este dispositivo'} · Sin conexión`}</p>
      </div>
      {!selected && tracks.length > 0 && <button type="button" onClick={() => { if (window.confirm('¿Eliminar todas las descargas de música del dispositivo?')) onClearAll?.(); }} aria-label="Borrar todas las descargas" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-400/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>}
    </div>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-emerald-400" aria-hidden="true" />
      <input type="search" aria-label={selected ? 'Buscar en esta descarga' : 'Buscar descargas'} placeholder={selected ? 'Buscar canción o artista' : 'Buscar track, disco o playlist'} value={search} onChange={event => selected ? setDetailQuery(event.target.value) : setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-11 text-sm text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none" />
      {search && <button type="button" aria-label="Limpiar búsqueda de descargas" onClick={() => selected ? setDetailQuery('') : setQuery('')} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-gray-400"><X className="h-4 w-4" /></button>}
    </div>
    {!selected && <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de descarga">
      {[['all', 'Todo'], ['playlist', 'Playlist'], ['track', 'Track'], ['album', 'Disco']].map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`min-h-11 rounded-full border px-4 text-xs font-semibold ${kind === value ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>{label}</button>)}
    </div>}
    {queue.length > 0 && <div className="flex flex-wrap gap-2">
      <button type="button" onClick={playAll} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-400 px-4 text-xs font-bold text-black"><Play className="h-4 w-4 fill-current" />Reproducir {selected ? selected.label.toLowerCase() : 'todo'}</button>
      <button type="button" onClick={() => { const shuffled = [...queue]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; } onPlay(shuffled[0], shuffled); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs text-gray-300"><Shuffle className="h-4 w-4" />Aleatorio</button>
      {selected?.kind === 'album' && onDeleteAlbum && <button type="button" onClick={async () => { if (window.confirm(`¿Eliminar las canciones descargadas del disco "${selected.title}"?`)) { await onDeleteAlbum(selected); close(); } }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs text-gray-400"><Trash2 className="h-4 w-4" />Eliminar disco</button>}
    </div>}
    <p className="text-xs text-gray-500" role="status">{visible.length} {visible.length === 1 ? 'resultado' : 'resultados'}</p>
    <ul className="divide-y divide-white/10" aria-label={selected ? 'Canciones descargadas' : 'Todas las descargas'}>
      {visible.map(entry => {
        const Icon = icons[entry.kind];
        const open = () => { if (entry.kind === 'track') onPlay(entry.tracks[0], queue); else { setSelectedKey(entry.key); setDetailQuery(''); onCollectionChange?.(entry); } };
        return <li key={entry.key} className="flex min-h-[72px] items-center gap-2 py-2">
          <button type="button" onClick={open} aria-label={`${entry.kind === 'track' ? 'Reproducir' : 'Abrir'} ${entry.label}: ${entry.title}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left focus-visible:outline focus-visible:outline-emerald-400">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colors[entry.kind]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white" title={entry.title}>{entry.title}</span>
              <span className="mt-1 flex min-w-0 items-center gap-2"><span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${colors[entry.kind]}`}>{entry.label}</span><span className="truncate text-xs text-gray-400">{entry.kind === 'track' ? entry.artist : `${entry.tracks.length} canciones${entry.artist ? ` · ${entry.artist}` : ''}`}</span></span>
            </span>
          </button>
          {entry.kind !== 'track' && <button type="button" onClick={() => onPlay(entry.tracks[0], entry.tracks)} aria-label={`Reproducir ${entry.label}: ${entry.title}`} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-emerald-300 hover:bg-white/5"><Play className="h-4 w-4 fill-current" /></button>}
          {entry.kind === 'track' && onDeleteTrack && <button type="button" onClick={() => { if (window.confirm(`¿Eliminar la descarga de "${entry.title}"?`)) onDeleteTrack(entry.id); }} aria-label={`Eliminar descarga: ${entry.title}`} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>}
        </li>;
      })}
    </ul>
    {visible.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">{tracks.length ? 'No hay descargas que coincidan con tu búsqueda.' : 'Todavía no tienes música descargada. Guarda una playlist, un disco o un track para escucharlo aquí.'}</p>}
  </section>;
}
