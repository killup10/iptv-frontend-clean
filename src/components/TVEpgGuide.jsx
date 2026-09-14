import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Clock, Search, LayoutGrid, Calendar, Radio } from 'lucide-react';
import { getEPGForChannel, getCategoryFromChannelName } from '../utils/epgGenerator.js';
import {
  focusTVNav,
  getTVFocusZone,
  TV_FOCUS_ZONE_CONTENT,
} from '../utils/tvFocusZone.js';
import { getTVKeyName } from '../utils/tvRemote.js';

function resolveAction(event) {
  const name = getTVKeyName(event);
  if (
    name === 'ArrowUp' ||
    name === 'ArrowDown' ||
    name === 'ArrowLeft' ||
    name === 'ArrowRight' ||
    name === 'Enter'
  ) {
    return name;
  }
  // BACK/Escape/Borrar: los gestiona AppTV, no consumir aqui.
  return null;
}

const PIXELS_PER_MINUTE = 3;
const CHANNEL_COL_WIDTH = 230; // px

export default function TVEpgGuide({
  channels = [],
  categories = [],
  currentCategoryIndex = 0,
  onCategoryChange,
  onChannelSelect,
  onSwitchToGrid,
  onSearch,
  initialChannelIndex = 0,
}) {
  const [now, setNow] = useState(() => new Date());
  // focusZone: 'controls' | 'category' | 'guide'
  const [focusZone, setFocusZone] = useState('guide');
  const [focusedControlIndex, setFocusedControlIndex] = useState(0); // 0: Guide, 1: Grid, 2: Search
  // selectedChannelRow: index in channels
  const [selectedChannelRow, setSelectedChannelRow] = useState(() =>
    Math.max(0, Math.min(initialChannelIndex, channels.length - 1))
  );
  // selectedColIndex: -1 = channel column, >= 0 = program index
  const [selectedColIndex, setSelectedColIndex] = useState(-1);

  const scrollContainerRef = useRef(null);
  const categoriesRailRef = useRef(null);
  const channelRowRefs = useRef([]);
  const programRefs = useRef({});

  // Navigation State Ref to avoid re-binding keydown and eliminate lag completely
  const stateRef = useRef({
    focusZone: 'guide',
    focusedControlIndex: 0,
    selectedChannelRow: 0,
    selectedColIndex: -1,
    channels: [],
    categories: [],
    currentCategoryIndex: 0,
    channelEpgMap: new Map(),
  });

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current.focusZone = focusZone;
    stateRef.current.focusedControlIndex = focusedControlIndex;
    stateRef.current.selectedChannelRow = selectedChannelRow;
    stateRef.current.selectedColIndex = selectedColIndex;
    stateRef.current.channels = channels;
    stateRef.current.categories = categories;
    stateRef.current.currentCategoryIndex = currentCategoryIndex;
  }, [focusZone, focusedControlIndex, selectedChannelRow, selectedColIndex, channels, categories, currentCategoryIndex]);

  // Update current time tick every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Timeline bounds: 1h in the past, 7h in future (total 8h)
  const { timelineStart, timelineEnd, timeTicks } = useMemo(() => {
    const start = new Date(now);
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() >= 30 ? 30 : 0);

    const tStart = new Date(start.getTime() - 1 * 60 * 60 * 1000);
    const tEnd = new Date(tStart.getTime() + 8 * 60 * 60 * 1000);

    const ticks = [];
    let tickTime = new Date(tStart);
    for (let i = 0; i <= 16; i++) {
      ticks.push(new Date(tickTime));
      tickTime.setMinutes(tickTime.getMinutes() + 30);
    }

    return { timelineStart: tStart, timelineEnd: tEnd, timeTicks: ticks };
  }, [now]);

  const GRID_WIDTH = 8 * 60 * PIXELS_PER_MINUTE; // 1440px

  // Red pointer position
  const pointerLeft = useMemo(() => {
    const diffMinutes = (now - timelineStart) / 60000;
    return diffMinutes * PIXELS_PER_MINUTE;
  }, [now, timelineStart]);

  // Generate / cache stable EPG programs for each channel in view
  const channelEpgMap = useMemo(() => {
    const map = new Map();
    const tStartTime = timelineStart.getTime();
    const tEndTime = timelineEnd.getTime();

    channels.forEach((channel, idx) => {
      const realNow = (channel.epg || channel.currentProgram) ? {
        title: channel.epg || channel.currentProgram,
        desc: channel.epgDesc || channel.description || '',
        start: channel.epgStart,
        stop: channel.epgStop,
      } : null;
      const realNext = channel.nextProgram ? {
        title: channel.nextProgram,
        desc: channel.nextProgramDesc || '',
        start: channel.nextProgramStart,
        stop: channel.nextProgramStop,
      } : null;

      const allPrograms = getEPGForChannel(channel.name, channel.id || channel._id || idx, now, realNow, realNext);

      const visible = allPrograms.filter((p) => {
        const pEnd = new Date(p.end).getTime();
        const pStart = new Date(p.start).getTime();
        return pEnd > tStartTime && pStart < tEndTime;
      });

      map.set(idx, visible.length ? visible : allPrograms);
    });
    return map;
  }, [channels, now, timelineStart, timelineEnd]);

  // Update map in ref
  useEffect(() => {
    stateRef.current.channelEpgMap = channelEpgMap;
  }, [channelEpgMap]);

  // Active channel & active program
  const activeChannel = channels[selectedChannelRow] || null;
  const activePrograms = channelEpgMap.get(selectedChannelRow) || [];
  
  // Find currently live program index for active row
  const liveProgramIndex = useMemo(() => {
    const nowMs = now.getTime();
    return activePrograms.findIndex((p) => {
      const s = new Date(p.start).getTime();
      const e = new Date(p.end).getTime();
      return s <= nowMs && nowMs < e;
    });
  }, [activePrograms, now]);

  const activeProgram = selectedColIndex >= 0 && activePrograms[selectedColIndex]
    ? activePrograms[selectedColIndex]
    : (liveProgramIndex >= 0 ? activePrograms[liveProgramIndex] : activePrograms[0] || null);

  // Helper format time
  const formatTime = useCallback((value) => {
    if (!value) return '--:--';
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' });
    } catch {
      return '--:--';
    }
  }, []);

  // Initial horizontal scroll centering on live red pointer
  useEffect(() => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      const targetLeft = CHANNEL_COL_WIDTH + pointerLeft - (containerWidth / 2);
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'auto',
      });
    }
  }, [pointerLeft]);

  // Surgical auto-scroll on selection changes (smooth & without jank)
  useEffect(() => {
    if (focusZone !== 'guide') return;

    // Scroll active channel row vertically
    const rowElem = channelRowRefs.current[selectedChannelRow];
    if (rowElem) {
      rowElem.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }

    // Scroll active program horizontally
    if (selectedColIndex >= 0 && scrollContainerRef.current) {
      const progKey = `${selectedChannelRow}-${selectedColIndex}`;
      const progElem = programRefs.current[progKey];
      if (progElem) {
        const container = scrollContainerRef.current;
        const progRect = progElem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const progLeftRelative = progRect.left - containerRect.left;
        const progRightRelative = progRect.right - containerRect.left;

        if (progRightRelative > containerRect.width - 20) {
          container.scrollLeft += (progRightRelative - containerRect.width + 100);
        } else if (progLeftRelative < CHANNEL_COL_WIDTH + 20) {
          container.scrollLeft -= (CHANNEL_COL_WIDTH + 60 - progLeftRelative);
        }
      }
    }
  }, [selectedChannelRow, selectedColIndex, focusZone]);

  // Scroll active category pill into view
  useEffect(() => {
    if (categoriesRailRef.current) {
      const activeCatBtn = categoriesRailRef.current.querySelector(`[data-cat-index="${currentCategoryIndex}"]`);
      if (activeCatBtn) {
        activeCatBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentCategoryIndex]);

  // Surgical D-Pad Key Listener (Single stable listener attached ONCE)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;

      const action = resolveAction(event);
      if (!action) return;

      // Bloquear scroll nativo (accion resuelta: event.key es
      // "Unidentified" en mandos reales).
      event.preventDefault();

      const {
        focusZone: currentZone,
        focusedControlIndex: currentCtrlIdx,
        selectedChannelRow: currentRow,
        selectedColIndex: currentCol,
        channels: curChannels,
        categories: curCategories,
        currentCategoryIndex: curCatIdx,
        channelEpgMap: curMap,
      } = stateRef.current;

      // 1. FOCUS ZONE: CONTROLS
      if (currentZone === 'controls') {
        if (action === 'ArrowLeft') {
          if (currentCtrlIdx === 0) {
            focusTVNav();
          } else {
            setFocusedControlIndex(currentCtrlIdx - 1);
          }
        } else if (action === 'ArrowRight') {
          if (currentCtrlIdx < 2) {
            setFocusedControlIndex(currentCtrlIdx + 1);
          }
        } else if (action === 'ArrowDown') {
          setFocusZone('category');
        } else if (action === 'Enter') {
          if (currentCtrlIdx === 1) {
            onSwitchToGrid?.();
          } else if (currentCtrlIdx === 2) {
            onSearch?.();
          }
        }
        return;
      }

      // 2. FOCUS ZONE: CATEGORY
      if (currentZone === 'category') {
        if (action === 'ArrowUp') {
          setFocusZone('controls');
        } else if (action === 'ArrowDown') {
          if (curChannels.length > 0) {
            setFocusZone('guide');
            setSelectedChannelRow(0);
            setSelectedColIndex(-1); // Stay on channel column
          }
        } else if (action === 'ArrowLeft') {
          if (curCatIdx === 0) {
            focusTVNav();
          } else {
            onCategoryChange?.('prev');
          }
        } else if (action === 'ArrowRight') {
          if (curCatIdx < curCategories.length - 1) {
            onCategoryChange?.('next');
          }
        } else if (action === 'Enter') {
          if (curChannels.length > 0) {
            setFocusZone('guide');
            setSelectedChannelRow(0);
            setSelectedColIndex(-1);
          }
        }
        return;
      }

      // 3. FOCUS ZONE: GUIDE (SURGICAL D-PAD)
      if (currentZone === 'guide') {
        // UP / DOWN
        if (action === 'ArrowUp') {
          if (currentRow === 0) {
            // Reached top row: move up to category bar
            setFocusZone('category');
          } else {
            const nextRow = currentRow - 1;
            setSelectedChannelRow(nextRow);
            // If in timeline, clamp column to next row's program count (NEVER jump randomly)
            if (currentCol >= 0) {
              const rowPrograms = curMap.get(nextRow) || [];
              setSelectedColIndex(Math.min(currentCol, Math.max(0, rowPrograms.length - 1)));
            }
          }
          return;
        }

        if (action === 'ArrowDown') {
          if (currentRow < curChannels.length - 1) {
            const nextRow = currentRow + 1;
            setSelectedChannelRow(nextRow);
            // If in timeline, clamp column to next row's program count (NEVER jump randomly)
            if (currentCol >= 0) {
              const rowPrograms = curMap.get(nextRow) || [];
              setSelectedColIndex(Math.min(currentCol, Math.max(0, rowPrograms.length - 1)));
            }
          }
          return;
        }

        // LEFT / RIGHT (SURGICAL)
        if (action === 'ArrowLeft') {
          if (currentCol > 0) {
            // Move to previous program in this channel
            setSelectedColIndex(currentCol - 1);
          } else if (currentCol === 0) {
            // Move back to channel column
            setSelectedColIndex(-1);
          } else if (currentCol === -1) {
            // Borde izquierdo de la guia: ir al sidebar.
            focusTVNav();
          }
          return;
        }

        if (action === 'ArrowRight') {
          const rowPrograms = curMap.get(currentRow) || [];
          if (currentCol === -1) {
            // Entering programs from channel column: jump directly to the LIVE program!
            const nowTime = Date.now();
            let liveIdx = rowPrograms.findIndex((p) => {
              const s = new Date(p.start).getTime();
              const e = new Date(p.end).getTime();
              return s <= nowTime && nowTime < e;
            });
            setSelectedColIndex(liveIdx >= 0 ? liveIdx : 0);
          } else if (currentCol < rowPrograms.length - 1) {
            // Move to next program
            setSelectedColIndex(currentCol + 1);
          }
          return;
        }

        // ENTER: Play channel
        if (action === 'Enter') {
          const ch = curChannels[currentRow];
          if (ch) {
            onChannelSelect?.(ch, currentRow);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCategoryChange, onChannelSelect, onSearch, onSwitchToGrid]);

  const isProgramLive = (program) => {
    if (!program) return false;
    const nowMs = now.getTime();
    return new Date(program.start).getTime() <= nowMs && nowMs < new Date(program.end).getTime();
  };

  return (
    <div className="tv-epg-container h-screen w-full flex flex-col bg-[#050510] text-white overflow-hidden select-none">
      <style>{`
        .tv-epg-container {
          background: radial-gradient(circle at 85% 15%, #180b33 0%, #050510 100%);
        }
        .pulse-live-glow {
          animation: livePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.04); }
        }
        .tv-program-focused {
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.9), inset 0 0 15px rgba(0, 255, 255, 0.4);
          border-color: #00ffff !important;
          background: rgba(8, 145, 178, 0.45) !important;
          transform: scale(1.02);
          z-index: 25 !important;
        }
        .tv-channel-focused {
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.95);
          border-color: #00ffff !important;
          background: rgba(14, 116, 144, 0.7) !important;
          transform: scale(1.03);
          z-index: 40 !important;
        }
      `}</style>

      {/* TOP HEADER */}
      <div className="flex-shrink-0 px-8 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white flex items-center gap-3">
            <span className="text-cyan-400">TeamG</span> TV en Vivo
          </h1>
          <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            Guía EPG Horizontal
          </span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
              focusZone === 'controls' && focusedControlIndex === 0
                ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.8)] scale-105'
                : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Guía Horizontal</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToGrid}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
              focusZone === 'controls' && focusedControlIndex === 1
                ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.8)] scale-105'
                : 'bg-white/5 text-white/70 border border-white/10 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Cuadrícula</span>
          </button>

          <button
            type="button"
            onClick={onSearch}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
              focusZone === 'controls' && focusedControlIndex === 2
                ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.8)] scale-105'
                : 'bg-white/5 text-white/70 border border-white/10 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscar</span>
          </button>

          <div className="ml-4 pl-4 border-l border-white/10 flex items-center gap-2 text-cyan-200 text-sm font-black tracking-wider">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{formatTime(now)}</span>
            <span className="text-[10px] text-white/40 font-bold uppercase">(Perú)</span>
          </div>
        </div>
      </div>

      {/* CATEGORIES PILLS */}
      <div ref={categoriesRailRef} className="flex-shrink-0 px-8 py-2.5 flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat, idx) => {
          const isSelected = idx === currentCategoryIndex;
          const isFocused = focusZone === 'category' && isSelected;

          return (
            <button
              key={cat || idx}
              data-cat-index={idx}
              type="button"
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                isFocused
                  ? 'bg-cyan-400 text-black scale-110 shadow-[0_0_20px_rgba(0,255,255,0.8)] ring-2 ring-white'
                  : isSelected
                    ? 'bg-white text-black font-extrabold shadow-md'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ACTIVE PROGRAM DETAILS BANNER */}
      <div className="flex-shrink-0 mx-8 mb-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-cyan-950/40 to-slate-900/80 border border-cyan-500/20 backdrop-blur-md shadow-xl flex items-center justify-between gap-6 min-h-[90px]">
        {activeChannel ? (
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-black/60 border border-cyan-400/30 flex items-center justify-center overflow-hidden flex-shrink-0 p-1 shadow-inner">
              <img
                src={activeChannel.customThumbnail || activeChannel.thumbnail || activeChannel.logo || '/placeholder.png'}
                alt={activeChannel.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/placeholder.png';
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-0.5">
                <span className="text-cyan-400 font-extrabold text-xs uppercase tracking-wider">
                  {activeChannel.name}
                </span>
                {activeProgram && isProgramLive(activeProgram) && (
                  <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider pulse-live-glow flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                    <Radio className="w-3 h-3" /> En Vivo Ahora
                  </span>
                )}
                {activeProgram && (
                  <span className="text-slate-300 font-bold text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {formatTime(activeProgram.start)} - {formatTime(activeProgram.end)} ({activeProgram.duration} min)
                  </span>
                )}
              </div>

              <h2 className="text-base font-black text-white truncate tracking-wide">
                {activeProgram ? activeProgram.title : activeChannel.name}
              </h2>

              <p className="text-xs text-slate-300/80 line-clamp-1 mt-0.5">
                {activeProgram?.description || 'Transmisión en directo disponible para sintonizar en TeamG Play.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm font-semibold">Selecciona un canal para ver su guía</div>
        )}

        <div className="flex-shrink-0 flex items-center gap-3">
          <div className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 rounded-xl px-4 py-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-lg">
            <span className="bg-cyan-400 text-black px-2 py-0.5 rounded font-black text-sm">OK</span>
            <span>Ver Pantalla Completa</span>
          </div>
        </div>
      </div>

      {/* HORIZONTAL EPG GRID */}
      <div className="flex-1 overflow-hidden relative mx-8 mb-14 rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
        {channels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-3 opacity-20">📡</div>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
              No hay canales disponibles en esta categoría
            </p>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="h-full overflow-x-auto overflow-y-auto no-scrollbar relative select-none"
          >
            <div
              className="relative min-h-full"
              style={{ width: `${CHANNEL_COL_WIDTH + GRID_WIDTH}px` }}
            >
              {/* TIMELINE TIME TICKS */}
              <div className="sticky top-0 z-30 flex h-10 border-b border-white/15 bg-[#09091b]/95 backdrop-blur-md">
                <div
                  style={{ width: `${CHANNEL_COL_WIDTH}px` }}
                  className="sticky left-0 z-40 bg-[#09091b] border-r border-white/15 flex items-center px-4 font-black text-xs uppercase tracking-widest text-cyan-400 shadow-md"
                >
                  Canal
                </div>

                <div className="relative flex-1 h-full">
                  {timeTicks.map((tick, idx) => {
                    const leftPos = idx * 30 * PIXELS_PER_MINUTE;
                    return (
                      <div
                        key={idx}
                        style={{ left: `${leftPos}px` }}
                        className="absolute -translate-x-1/2 flex flex-col items-center justify-center h-full text-xs font-bold text-slate-300"
                      >
                        <span>{formatTime(tick)}</span>
                        <div className="h-2 w-[1px] bg-white/20 mt-0.5" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIVE RED NEEDLE */}
              {pointerLeft >= 0 && pointerLeft <= GRID_WIDTH && (
                <div
                  style={{ left: `${CHANNEL_COL_WIDTH + pointerLeft}px` }}
                  className="absolute top-0 bottom-0 z-20 w-[2px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] pointer-events-none"
                >
                  <div className="sticky top-0 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white shadow-lg" />
                </div>
              )}

              {/* CHANNEL ROWS */}
              <div className="divide-y divide-white/5">
                {channels.map((channel, rowIdx) => {
                  const isSelectedRow = focusZone === 'guide' && rowIdx === selectedChannelRow;
                  const isChannelHeaderFocused = isSelectedRow && selectedColIndex === -1;
                  const programs = channelEpgMap.get(rowIdx) || [];

                  return (
                    <div
                      key={channel.id || channel._id || rowIdx}
                      ref={(el) => (channelRowRefs.current[rowIdx] = el)}
                      className={`flex h-16 transition-colors duration-150 ${
                        isSelectedRow ? 'bg-cyan-500/[0.04]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* STICKY CHANNEL COLUMN */}
                      <div
                        style={{ width: `${CHANNEL_COL_WIDTH}px` }}
                        onClick={() => onChannelSelect?.(channel, rowIdx)}
                        className={`sticky left-0 z-30 bg-[#070716] border-r border-white/10 px-3 flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                          isChannelHeaderFocused
                            ? 'tv-channel-focused border-cyan-400 ring-2 ring-cyan-400'
                            : isSelectedRow
                              ? 'bg-slate-900/90 text-cyan-200'
                              : 'text-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 p-0.5">
                          <img
                            src={channel.customThumbnail || channel.thumbnail || channel.logo || '/placeholder.png'}
                            alt={channel.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/placeholder.png';
                            }}
                          />
                        </div>
                        <div className="truncate flex-1 min-w-0">
                          <p className="text-xs font-black truncate leading-tight">
                            {channel.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate uppercase mt-0.5">
                            {channel.epg ? '🔴 Señal Activa' : getCategoryFromChannelName(channel.name)}
                          </p>
                        </div>
                      </div>

                      {/* PROGRAMS ROW */}
                      <div className="relative flex-1 h-full overflow-hidden">
                        {programs.map((program, colIdx) => {
                          const pStartTime = new Date(program.start).getTime();
                          const pEndTime = new Date(program.end).getTime();
                          const tStartTime = timelineStart.getTime();
                          const tEndTime = timelineEnd.getTime();

                          if (pEndTime <= tStartTime || pStartTime >= tEndTime) return null;

                          const pStart = pStartTime < tStartTime ? tStartTime : pStartTime;
                          const pEnd = pEndTime > tEndTime ? tEndTime : pEndTime;

                          const diffStartMin = (pStart - tStartTime) / 60000;
                          const diffDurationMin = (pEnd - pStart) / 60000;

                          const left = diffStartMin * PIXELS_PER_MINUTE;
                          const width = Math.max(30, diffDurationMin * PIXELS_PER_MINUTE);

                          const isProgramFocused = isSelectedRow && selectedColIndex === colIdx;
                          const isLive = isProgramLive(program);
                          const progKey = `${rowIdx}-${colIdx}`;

                          return (
                            <div
                              key={program.id || progKey}
                              ref={(el) => (programRefs.current[progKey] = el)}
                              style={{
                                left: `${left}px`,
                                width: `${width - 3}px`,
                              }}
                              onClick={() => {
                                setSelectedChannelRow(rowIdx);
                                setSelectedColIndex(colIdx);
                                onChannelSelect?.(channel, rowIdx);
                              }}
                              className={`absolute top-1.5 bottom-1.5 rounded-xl px-3 py-1.5 text-left transition-all duration-150 overflow-hidden flex flex-col justify-between border cursor-pointer ${
                                isProgramFocused
                                  ? 'tv-program-focused text-white font-bold'
                                  : isLive
                                    ? 'bg-cyan-500/[0.08] border-cyan-500/35 text-cyan-100'
                                    : 'bg-slate-900/70 border-white/10 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {isLive && (
                                  <span className="bg-red-600 text-white font-black px-1.5 py-0.2 rounded text-[8px] tracking-wider uppercase pulse-live-glow flex-shrink-0">
                                    LIVE
                                  </span>
                                )}
                                <span className="text-xs font-bold truncate leading-tight">
                                  {program.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold truncate">
                                <Clock className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                                <span>{formatTime(program.start)} - {formatTime(program.end)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black via-black/95 to-transparent px-8 flex items-center justify-center gap-8 z-50 text-xs font-black uppercase tracking-wider text-slate-400">
        <div className="flex items-center gap-2">
          <span className="bg-white/10 px-2 py-0.5 rounded text-white font-black">↑ ↓</span>
          <span>Canales</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-white/10 px-2 py-0.5 rounded text-white font-black">← →</span>
          <span>Programas</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-300">
          <span className="bg-cyan-400 text-black px-2 py-0.5 rounded font-black">OK</span>
          <span>Sintonizar</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-white/10 px-2 py-0.5 rounded text-white font-black">BACK</span>
          <span>Menú Principal</span>
        </div>
      </div>
    </div>
  );
}
