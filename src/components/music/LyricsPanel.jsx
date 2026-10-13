import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic2, X, Loader2 } from 'lucide-react';
import { activeLineIndex, getWords } from './lyricsTiming.js';
import './LyricsPanel.css';

export default function LyricsPanel({ data, loading, currentTime, duration, trackKey, onSeek, onClose }) {
  const [follow, setFollow] = useState(true);
  const container = useRef(null);
  useEffect(() => { setFollow(true); }, [trackKey]);
  const lines = data?.syncedLyrics || [];
  const time = currentTime;
  const active = activeLineIndex(lines, time);
  const words = useMemo(() => lines.map((line, index) => getWords(line, lines[index + 1]?.time, duration)), [data, duration]);
  useEffect(() => {
    if (!follow || active < 0) return;
    const root = container.current;
    const element = root?.querySelector('[data-active="true"]');
    if (element) root.scrollTo({ top: Math.max(0, element.offsetTop - root.clientHeight / 2 + element.clientHeight / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [active, follow]);
  return <section className="music-lyrics" aria-label="Letra de la canción">
    <header className="music-lyrics-header">
      <span><Mic2 size={15} /> Letra</span>
      <button type="button" onClick={onClose} aria-label="Volver a carátula"><X size={18} /></button>
    </header>
    <div ref={container} className="music-lyrics-scroll custom-scrollbar" onWheel={() => setFollow(false)} onTouchMove={() => setFollow(false)} onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) setFollow(false); }} tabIndex={0}>
      {loading ? <p className="music-lyrics-message"><Loader2 className="animate-spin" size={22} />Buscando letra...</p> : lines.length ? lines.map((line, index) => {
        const selected = index === active;
        const tokens = words[index];
        let activeWord = -1;
        for (let i = tokens.length - 1; i >= 0; i--) if (time >= tokens[i].time) { activeWord = i; break; }
        return line.text ? <button type="button" className={`music-lyrics-line ${selected ? 'is-current' : ''}`} key={index} data-active={selected ? 'true' : undefined} onClick={event => { event.stopPropagation(); onSeek(Math.max(0, line.time)); setFollow(true); }} aria-label={`Ir a: ${line.text}`}>
          {tokens.map((word, i) => <React.Fragment key={i}><span className={selected && i === activeWord ? 'is-word-active' : ''}>{word.text}</span>{' '}</React.Fragment>)}
        </button> : <p key={index} className="music-lyrics-instrumental" data-active={selected ? 'true' : undefined}><Mic2 size={16} /> Instrumental</p>;
      }) : data?.plainLyrics ? <p className="music-lyrics-plain">{data.plainLyrics}</p> : <p className="music-lyrics-message">No se encontró la letra de esta pista.</p>}
    </div>
    {lines.length > 0 && !follow && <button type="button" className="music-lyrics-follow" onClick={() => setFollow(true)}>Seguir canción</button>}
  </section>;
}
