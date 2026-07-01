// src/components/EpgGuide.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Tv, Info, Calendar, Clock, Film } from 'lucide-react';
import { getEPGForChannel, getCurrentProgram, getCategoryFromChannelName } from '../utils/epgGenerator.js';

const CATEGORIES = [
  { id: 'Todos', label: 'Todos' },
  { id: 'news', label: 'Noticias' },
  { id: 'sports', label: 'Deportes' },
  { id: 'movies', label: 'Cine' },
  { id: 'series', label: 'Series' },
  { id: 'kids', label: 'Infantil' },
  { id: 'anime', label: 'Anime' },
  { id: 'general', label: 'Variedades' },
];

export default function EpgGuide({
  channels = [],
  currentChannelId = null,
  onSelectChannel,
  isLoading = false,
}) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedProgramChannel, setSelectedProgramChannel] = useState(null);
  const [now, setNow] = useState(new Date());

  const scrollContainerRef = useRef(null);

  // Update current time tick every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter channels by active category
  const filteredChannels = useMemo(() => {
    if (activeCategory === 'Todos') return channels;
    return channels.filter(
      (channel) => getCategoryFromChannelName(channel.name) === activeCategory
    );
  }, [channels, activeCategory]);

  // Calculate timeline start and end
  // Start: rounded down to the nearest half hour, minus 2 hours
  const { timelineStart, timelineEnd, timeTicks } = useMemo(() => {
    const start = new Date(now);
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() >= 30 ? 30 : 0);
    
    const tStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
    const tEnd = new Date(tStart.getTime() + 8 * 60 * 60 * 1000);

    const ticks = [];
    let tickTime = new Date(tStart);
    for (let i = 0; i <= 16; i++) {
      ticks.push(new Date(tickTime));
      tickTime.setMinutes(tickTime.getMinutes() + 30);
    }

    return {
      timelineStart: tStart,
      timelineEnd: tEnd,
      timeTicks: ticks,
    };
  }, [now]);

  // Scroll to center the red time pointer initially
  useEffect(() => {
    if (scrollContainerRef.current) {
      // The current time pointer sits exactly 2 hours (360px) from the left
      const containerWidth = scrollContainerRef.current.clientWidth;
      const leftColWidth = 176; // width of sticky channel column (w-44)
      scrollContainerRef.current.scrollLeft = 360 - (containerWidth / 2) + (leftColWidth / 2);
    }
  }, [isLoading, filteredChannels.length]);

  // Select current playing program of the active channel on load
  useEffect(() => {
    if (currentChannelId && channels.length > 0) {
      const activeChan = channels.find(
        (c) => String(c.id || c._id) === String(currentChannelId)
      );
      if (activeChan) {
        const programs = getEPGForChannel(activeChan.name, activeChan.id || activeChan._id, now);
        const current = getCurrentProgram(programs, now);
        if (current) {
          setSelectedProgram(current);
          setSelectedProgramChannel(activeChan);
        }
      }
    }
  }, [currentChannelId, channels, now]);

  // Helper to format Date to HH:MM
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // 1 hour = 180px, 3px per minute
  const PIXELS_PER_MINUTE = 3;
  const GRID_WIDTH = 8 * 60 * PIXELS_PER_MINUTE; // 1440px

  // Calculate live red pointer left position
  const pointerLeft = useMemo(() => {
    const diffMs = now - timelineStart;
    const diffMinutes = diffMs / 60000;
    return diffMinutes * PIXELS_PER_MINUTE;
  }, [now, timelineStart]);

  const handleProgramClick = (program, channel) => {
    setSelectedProgram(program);
    setSelectedProgramChannel(channel);
  };

  const handleTuneIn = () => {
    if (selectedProgramChannel && onSelectChannel) {
      onSelectChannel(selectedProgramChannel);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 bg-zinc-950 text-white rounded-2xl border border-zinc-800/80 p-4 shadow-2xl">
      {/* Category Selection Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-zinc-800/50">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full font-bold uppercase transition-all duration-200 ${
              activeCategory === cat.id
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-cyan-400/50 scale-105'
                : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main EPG Scrolling Grid */}
      <div className="relative overflow-hidden border border-zinc-800/60 rounded-xl bg-zinc-900/10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500 mb-3"></div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Cargando guía de programación...</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tv className="w-12 h-12 text-zinc-700 mb-2" />
            <p className="text-zinc-400 text-sm">No hay canales disponibles en esta categoría.</p>
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="w-full overflow-x-auto select-none scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
          >
            {/* Scrollable grid inner wrapping */}
            <div className="relative" style={{ width: `${176 + GRID_WIDTH}px` }}>
              
              {/* Timeline Header Row */}
              <div className="flex border-b border-zinc-800/80 bg-zinc-900/70 sticky top-0 z-20 h-10">
                {/* Sticky Left Corner Spacer */}
                <div className="sticky left-0 bg-zinc-950/95 border-r border-zinc-800/80 w-44 min-w-[176px] flex items-center px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 z-30">
                  Canal
                </div>
                
                {/* Horizontal hours indicators */}
                <div className="relative flex-grow flex h-full items-center">
                  {timeTicks.map((tick, idx) => {
                    const leftPos = idx * 30 * PIXELS_PER_MINUTE;
                    return (
                      <div 
                        key={idx} 
                        style={{ left: `${leftPos}px` }}
                        className="absolute -translate-x-1/2 flex flex-col items-center justify-center text-[10px] font-bold text-zinc-400/90"
                      >
                        <span>{formatTime(tick)}</span>
                        <div className="h-1.5 w-[1px] bg-zinc-700/80 mt-1"></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Time Red Pointer Line */}
              {pointerLeft >= 0 && pointerLeft <= GRID_WIDTH && (
                <div 
                  style={{ left: `${176 + pointerLeft}px` }}
                  className="absolute top-0 bottom-0 z-20 w-[2px] bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.7)] pointer-events-none"
                >
                  {/* Glowing small handle at the top */}
                  <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></div>
                </div>
              )}

              {/* Grid Rows Body */}
              <div className="divide-y divide-zinc-800/40">
                {filteredChannels.map((channel) => {
                  const isCurrentChannel = String(channel.id || channel._id) === String(currentChannelId);
                  
                  // Generate stable EPG for the channel
                  const epgPrograms = getEPGForChannel(channel.name, channel.id || channel._id, now);

                  return (
                    <div 
                      key={channel.id || channel._id}
                      className={`flex h-16 transition-colors ${
                        isCurrentChannel ? 'bg-cyan-500/[0.02]' : 'hover:bg-zinc-900/[0.15]'
                      }`}
                    >
                      {/* Sticky Channel Logo and Info */}
                      <button
                        onClick={() => onSelectChannel(channel)}
                        className={`sticky left-0 bg-zinc-950/95 border-r border-zinc-800/80 w-44 min-w-[176px] flex items-center gap-2.5 p-2 text-left z-10 transition-colors focus:outline-none ${
                          isCurrentChannel ? 'text-cyan-400' : 'text-zinc-200 hover:text-white'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800/50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                          <img
                            src={channel.customThumbnail || channel.thumbnail || channel.logo || '/img/placeholder-thumbnail.png'}
                            alt={channel.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/img/placeholder-thumbnail.png';
                            }}
                          />
                        </div>
                        <div className="truncate flex flex-col justify-center">
                          <span className="text-xs font-bold truncate leading-snug">{channel.name}</span>
                          <span className="text-[10px] text-zinc-500 font-semibold truncate uppercase">
                            {isCurrentChannel ? 'En vivo' : getCategoryFromChannelName(channel.name)}
                          </span>
                        </div>
                      </button>

                      {/* EPG Programs Timeline Row */}
                      <div className="relative flex-grow h-full overflow-hidden">
                        {epgPrograms.map((program) => {
                          // Filter out programs completely outside the 8-hour window
                          if (program.end <= timelineStart || program.start >= timelineEnd) {
                            return null;
                          }

                          const pStart = program.start < timelineStart ? timelineStart : program.start;
                          const pEnd = program.end > timelineEnd ? timelineEnd : program.end;

                          const diffStartMin = (pStart - timelineStart) / 60000;
                          const diffDurationMin = (pEnd - pStart) / 60000;

                          const left = diffStartMin * PIXELS_PER_MINUTE;
                          const width = diffDurationMin * PIXELS_PER_MINUTE;

                          const isLive = program.start <= now && now < program.end;
                          const isCurrentlySelected = selectedProgram?.id === program.id;

                          return (
                            <button
                              key={program.id}
                              style={{ 
                                left: `${left}px`, 
                                width: `${width - 2}px` // Subtract 2px for gap
                              }}
                              onClick={() => handleProgramClick(program, channel)}
                              className={`absolute top-1 bottom-1 rounded-lg px-2.5 py-1.5 text-left transition-all overflow-hidden flex flex-col justify-between border select-none group focus:outline-none ${
                                isLive
                                  ? isCurrentlySelected
                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                    : 'bg-cyan-500/[0.06] border-cyan-500/30 text-cyan-100 hover:bg-cyan-500/10'
                                  : isCurrentlySelected
                                    ? 'bg-zinc-800 border-zinc-500 text-white'
                                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/80'
                              }`}
                            >
                              <span className="text-xs font-bold line-clamp-1 truncate w-full tracking-wide">
                                {program.title}
                              </span>
                              <span className="text-[9px] font-semibold text-zinc-500 group-hover:text-zinc-400 flex items-center gap-1 transition-colors">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTime(program.start)} - {formatTime(program.end)}
                                {isLive && (
                                  <span className="bg-red-500 text-white font-extrabold px-1 rounded-sm text-[8px] animate-pulse">
                                    LIVE
                                  </span>
                                )}
                              </span>
                            </button>
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

      {/* Selected Program Details Drawer Panel */}
      {selectedProgram && selectedProgramChannel && (
        <div className="flex flex-col sm:flex-row gap-4 border border-zinc-800/80 bg-zinc-900/30 rounded-xl p-4 transition-all duration-300 ease-in-out">
          {/* Logo */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
            <img
              src={selectedProgramChannel.customThumbnail || selectedProgramChannel.thumbnail || selectedProgramChannel.logo || '/img/placeholder-thumbnail.png'}
              alt={selectedProgramChannel.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Texts and Action */}
          <div className="flex-1 flex flex-col justify-between gap-2.5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 font-semibold uppercase">
                <span>{selectedProgramChannel.name}</span>
                <span>•</span>
                <span className="text-cyan-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(selectedProgram.start)} - {formatTime(selectedProgram.end)} ({selectedProgram.duration} min)
                </span>
                {selectedProgram.start <= now && now < selectedProgram.end && (
                  <>
                    <span>•</span>
                    <span className="bg-red-600 text-white font-black px-1.5 py-0.5 rounded text-[9px] animate-pulse uppercase">
                      Ahora en vivo
                    </span>
                  </>
                )}
              </div>
              <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                {selectedProgram.title}
              </h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-3xl">
                {selectedProgram.description || 'No hay descripción detallada disponible para este programa.'}
              </p>
            </div>

            {/* Tune in button */}
            {String(selectedProgramChannel.id || selectedProgramChannel._id) !== String(currentChannelId) && (
              <div>
                <button
                  onClick={handleTuneIn}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase transition-all duration-200 active:scale-95 shadow-md shadow-cyan-500/10"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Sintonizar Canal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
