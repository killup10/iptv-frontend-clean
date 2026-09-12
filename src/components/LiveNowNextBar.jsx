// src/components/LiveNowNextBar.jsx
// Barra compacta "Ahora / A continuación" que vive PEGADA al reproductor:
// se ve mientras el canal reproduce, sin hacer scroll ni salir del player.
// En VLC nativo (Android/TV) queda visible en la pantalla de Watch detrás/
// al volver del reproductor, y su contenido también se inyecta al zapping nativo.
import React, { memo, useEffect, useState } from 'react';
import { formatGuideTime, getProgramProgress } from '../utils/epgCache.js';

function LiveNowNextBar({
  nowTitle,
  nowStart,
  nowStop,
  nextTitle,
  nextStart,
  hasRealEpg = false,
  onOpenGuide,
  guideOpen = false,
}) {
  const [, setTick] = useState(0);

  // Refresca la barra de progreso cada 30 s sin recargar nada
  useEffect(() => {
    if (!nowStart || !nowStop) return undefined;
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, [nowStart, nowStop]);

  if (!nowTitle && !nextTitle) return null;

  const progress = nowStart && nowStop ? getProgramProgress(nowStart, nowStop) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto mt-3 rounded-xl border border-cyan-400/25 bg-black/55 backdrop-blur-sm px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 shrink-0 rounded-full bg-red-600/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          En vivo
        </span>

        <div className="flex-1 min-w-0">
          {nowTitle ? (
            <p className="truncate text-sm font-bold text-white">
              {nowTitle}
              {(nowStart || nowStop) && (
                <span className="ml-2 font-mono text-[11px] font-semibold text-cyan-300/90">
                  {formatGuideTime(nowStart)}{nowStop ? ` - ${formatGuideTime(nowStop)}` : ''}
                </span>
              )}
            </p>
          ) : null}
          {nextTitle ? (
            <p className="truncate text-xs text-zinc-400 mt-0.5">
              <span className="font-bold text-amber-400/90">Sig:</span> {nextTitle}
              {nextStart ? (
                <span className="ml-1 font-mono text-[11px] text-zinc-500">{formatGuideTime(nextStart)}</span>
              ) : null}
            </p>
          ) : null}
          {nowStart && nowStop ? (
            <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          ) : null}
        </div>

        <span
          className={`hidden sm:inline-block shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
            hasRealEpg
              ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
              : 'text-zinc-400 border-white/10 bg-white/5'
          }`}
          title={hasRealEpg ? 'Programación oficial del canal' : 'Programación estimada'}
        >
          {hasRealEpg ? 'Guía' : 'Guía estimada'}
        </span>

        {onOpenGuide && (
          <button
            type="button"
            onClick={onOpenGuide}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
              guideOpen
                ? 'bg-cyan-300 text-black'
                : 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30'
            }`}
          >
            {guideOpen ? 'Cerrar guía' : '📅 Guía'}
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(LiveNowNextBar);
