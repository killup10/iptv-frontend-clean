import React, { useState } from 'react';
import { DownloadCloud, Loader2 } from 'lucide-react';
import { musicService } from '../../services/musicService.js';

export default function ImportPlaylistForm({ createPlaylist }) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function readPlaylist(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError(''); setSuccess(''); setResult(null);
    try { setResult(await musicService.importPlaylist(url.trim())); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function savePlaylist() {
    if (!result?.tracks?.length) return;
    const tracks = result.tracks.slice(0, 100);
    const playlist = createPlaylist(result.name, `Importada desde ${result.provider}: ${result.sourceUrl}`, false, tracks);
    if (!playlist) { setError('No se pudo guardar la playlist.'); return; }
    setSuccess(`“${playlist.name}” guardada con ${tracks.length} canciones.`);
    setResult(null); setUrl('');
  }

  return (
    <section className="p-4 rounded-2xl bg-white/5 border border-white/10">
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} aria-controls="playlist-import-form"
        className="min-h-11 flex items-center gap-2 text-sm font-bold text-fuchsia-300">
        <DownloadCloud className="w-5 h-5" aria-hidden="true" /> <span>Traer mi playlist</span>
      </button>
      {expanded && (
        <div id="playlist-import-form" className="mt-3 space-y-3">
          <form onSubmit={readPlaylist} className="space-y-3">
            <label htmlFor="playlist-import-url" className="block text-sm text-gray-200">Enlace de una playlist pública</label>
            <input id="playlist-import-url" type="url" required maxLength={2048} value={url} disabled={loading}
              onChange={e => { setUrl(e.target.value); setResult(null); setError(''); setSuccess(''); }}
              aria-describedby="playlist-import-help" placeholder="https://open.spotify.com/playlist/…"
              className="w-full px-4 py-3 bg-black/50 border border-white/20 focus:border-fuchsia-400 rounded-xl text-white text-sm focus:outline-none" />
            <p id="playlist-import-help" className="text-xs text-gray-400">Spotify y Deezer · Sin conectar tu cuenta de música. Máximo 100 canciones por importación; en listas más largas se toman las primeras 100.</p>
            <button type="submit" disabled={loading || !url.trim()}
              className="min-h-11 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{loading ? 'Leyendo playlist…' : 'Leer enlace'}</span>
            </button>
          </form>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {success && <p role="status" className="text-sm text-green-300">{success}</p>}
          {result && (
            <div className="space-y-3" aria-live="polite">
              <p className="text-sm font-semibold text-white">{result.name} · {result.tracks.length} canciones de {result.provider}</p>
              {result.limitReached && <p className="text-xs text-fuchsia-300">Se alcanzó el límite de 100. Si la lista original tiene más canciones, las restantes no se importarán.</p>}
              {result.skipped > 0 && <p className="text-xs text-gray-400">{result.skipped} elementos sin datos de canción se omitieron.</p>}
              <ol className="max-h-60 overflow-y-auto list-decimal pl-6 text-sm text-gray-300 space-y-1">
                {result.tracks.map((track, index) => <li key={`${track.id}-${index}`}>{track.title} — {track.artist}</li>)}
              </ol>
              <p className="text-xs text-gray-400">Se guardará en tus playlists como privada. TeamG buscará cada canción al reproducirla; algunas versiones pueden no estar disponibles.</p>
              <button type="button" onClick={savePlaylist} className="min-h-11 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold">Guardar en mis playlists</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
