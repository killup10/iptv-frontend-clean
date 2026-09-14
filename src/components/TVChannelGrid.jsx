import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './TVChannelGrid.css';
import TVEpgGuide from './TVEpgGuide.jsx';
import {
  focusTVNav,
  getTVFocusZone,
  TV_FOCUS_ZONE_CONTENT,
} from '../utils/tvFocusZone.js';
import { getAccessLockState } from '../utils/planAccess.js';
import { getTVKeyName } from '../utils/tvRemote.js';

function getChannelColumns(width) {
  if (width <= 960) return 4;
  if (width <= 1280) return 5;
  if (width <= 1920) return 7;
  return 8;
}

function resolveGridAction(event) {
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

export default function TVChannelGrid({
  categories = [],
  currentCategoryIndex = 0,
  onCategoryChange,
  channels = [],
  onChannelSelect,
  onSearch,
  initialChannelIndex = 0,
  onActiveChannelIndexChange,
}) {
  const { user } = useAuth();
  // Default to horizontal guide as requested by user ("debe salir la guia horizontal")
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('tv_live_view_mode') || 'guide';
    } catch {
      return 'guide';
    }
  });
  const [focusMode, setFocusMode] = useState('channel'); // 'controls' | 'category' | 'channel'
  const [controlsIndex, setControlsIndex] = useState(0); // 0: Guide, 1: Grid, 2: Search
  const [columnCount, setColumnCount] = useState(() => getChannelColumns(window.innerWidth || 1920));
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(initialChannelIndex);

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('tv_live_view_mode', mode);
    } catch {}
  };

  const currentCategory = categories[currentCategoryIndex];
  const selectedChannel = channels[selectedChannelIndex];
  const totalRows = useMemo(() => Math.ceil(channels.length / columnCount), [channels.length, columnCount]);
  const currentRow = useMemo(() => Math.floor(selectedChannelIndex / columnCount), [columnCount, selectedChannelIndex]);

  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getChannelColumns(window.innerWidth || 1920));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Removed parent state sync on every keypress to optimize D-pad latency
  // onActiveChannelIndexChange?.(selectedChannelIndex) is no longer called here

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;

      const action = resolveGridAction(event);
      if (!action) return;

      // Bloquear scroll nativo del navegador para que no interfiera
      // (accion resuelta: event.key es "Unidentified" en mandos reales).
      event.preventDefault();

      if (focusMode === 'controls') {
        if (action === 'ArrowLeft') {
          if (controlsIndex === 0) {
            focusTVNav();
          } else {
            setControlsIndex((prev) => prev - 1);
          }
        } else if (action === 'ArrowRight') {
          if (controlsIndex < 2) {
            setControlsIndex((prev) => prev + 1);
          }
        } else if (action === 'ArrowDown') {
          setFocusMode('category');
        } else if (action === 'Enter') {
          if (controlsIndex === 0) {
            handleSetViewMode('guide');
          } else if (controlsIndex === 2) {
            onSearch?.();
          }
        }
        return;
      }

      if (focusMode === 'category') {
        if (action === 'ArrowUp') {
          setFocusMode('controls');
        } else if (action === 'ArrowDown') {
          if (channels.length > 0) {
            setFocusMode('channel');
            setSelectedChannelIndex(0);
          }
        } else if (action === 'ArrowLeft') {
          if (currentCategoryIndex === 0) {
            focusTVNav();
          } else {
            onCategoryChange?.('prev');
          }
        } else if (action === 'ArrowRight') {
          if (currentCategoryIndex < categories.length - 1) {
            onCategoryChange?.('next');
          }
        } else if (action === 'Enter') {
          if (channels.length > 0) {
            setFocusMode('channel');
            setSelectedChannelIndex(0);
          }
        }
        return;
      }

      // focusMode === 'channel'
      switch (action) {
        case 'ArrowUp':
          if (currentRow === 0) {
            setFocusMode('category');
          } else {
            setSelectedChannelIndex(prev => prev - columnCount);
          }
          break;
        case 'ArrowDown':
          if (currentRow < totalRows - 1) {
            setSelectedChannelIndex(prev => Math.min(prev + columnCount, channels.length - 1));
          }
          break;
        case 'ArrowLeft':
          if (selectedChannelIndex % columnCount > 0) {
            setSelectedChannelIndex(prev => prev - 1);
          } else {
            // Borde izquierdo de la fila: ir al sidebar.
            focusTVNav();
          }
          break;
        case 'ArrowRight':
          if (selectedChannelIndex % columnCount < columnCount - 1 && selectedChannelIndex < channels.length - 1) {
            setSelectedChannelIndex(prev => prev + 1);
          }
          break;
        case 'Enter':
          if (channels[selectedChannelIndex]) {
            onChannelSelect?.(channels[selectedChannelIndex], selectedChannelIndex);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    categories.length,
    channels,
    currentCategoryIndex,
    currentRow,
    focusMode,
    controlsIndex,
    onCategoryChange,
    onChannelSelect,
    onSearch,
    selectedChannelIndex,
    columnCount,
    totalRows
  ]);

  useEffect(() => {
    if (focusMode !== 'channel') return;

    const selectedElement = document.querySelector(`[data-channel-index="${selectedChannelIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
    }
  }, [focusMode, selectedChannelIndex]);

  // If viewMode is 'guide', render the dedicated horizontal EPG view
  if (viewMode === 'guide') {
    return (
      <TVEpgGuide
        channels={channels}
        categories={categories}
        currentCategoryIndex={currentCategoryIndex}
        onCategoryChange={onCategoryChange}
        onChannelSelect={onChannelSelect}
        onSwitchToGrid={() => handleSetViewMode('grid')}
        onSearch={onSearch}
        initialChannelIndex={selectedChannelIndex}
      />
    );
  }

  return (
    <div ref={containerRef} className="tv-channel-grid-container h-screen overflow-hidden flex flex-col bg-[#050510]">
      <style>{`
        .tv-channel-grid-container {
          background: radial-gradient(circle at top right, #1a1033 0%, #050510 100%);
        }
        .focus-indicator-ring {
          position: absolute;
          inset: -4px;
          border: 4px solid #00ffff;
          border-radius: 24px;
          animation: pulse-ring 1.5s infinite;
          pointer-events: none;
        }
        @keyframes pulse-ring {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.01); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="tv-channel-header p-6 flex-shrink-0">
        <div className="tv-channel-title-row flex justify-between items-center">
          <div className="tv-channel-brand">
            <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter italic">TV en Vivo</h1>
            <div className="breadcrumb flex items-center gap-2 text-cyan-400 font-bold uppercase text-xs tracking-widest">
              <span className="bg-cyan-900/40 px-3 py-1 rounded">{currentCategory}</span>
              {selectedChannel && (
                <>
                  <span className="text-white/30">/</span>
                  <span className="text-white">{selectedChannel.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Guide Button */}
            <button
              type="button"
              onClick={() => handleSetViewMode('guide')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                focusMode === 'controls' && controlsIndex === 0
                  ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.8)] scale-105'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:text-white'
              }`}
            >
              <span>📅 Guía Horizontal</span>
            </button>

            {/* Grid Button (Active) */}
            <button
              type="button"
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                focusMode === 'controls' && controlsIndex === 1
                  ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.8)] scale-105'
                  : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              <span>▦ Cuadrícula</span>
            </button>

            {/* Search Button */}
            <button
              type="button"
              className={`tv-channel-search-btn transition-all duration-300 ${
                focusMode === 'controls' && controlsIndex === 2
                  ? 'bg-cyan-500 text-black scale-105 shadow-[0_0_30px_rgba(0,255,255,0.5)]'
                  : 'bg-white/5 text-white'
              } px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10`}
              onClick={() => onSearch?.()}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span className="font-bold uppercase text-xs">Búsqueda</span>
            </button>
          </div>
        </div>
      </div>

      <div className="tv-categories-bar px-6 mb-4 flex-shrink-0">
        <div className="categories-scroll-wrapper flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((category, index) => (
            <button
              key={category || index}
              type="button"
              className={`category-btn px-5 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all duration-300 whitespace-nowrap ${
                index === currentCategoryIndex 
                ? (focusMode === 'category' ? 'bg-cyan-400 text-black scale-110 shadow-lg' : 'bg-white text-black') 
                : 'bg-white/5 text-white/50 border border-white/5'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="tv-channels-grid-wrapper flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
        <div
          className="tv-channels-grid grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {channels.length > 0 ? (
            channels.map((channel, index) => {
              const isSelected = focusMode === 'channel' && index === selectedChannelIndex;

              return (
                <div
                  key={channel._id || channel.id || `${channel.name}-${index}`}
                  data-channel-index={index}
                  className="channel-card relative transition-all duration-300 rounded-[22px]"
                  onClick={() => onChannelSelect?.(channel, index)}
                >
                  <div 
                    className={`aspect-[2/3] relative overflow-hidden rounded-[22px] bg-[#090214] flex items-center justify-center border-2 transition-all duration-300 ${
                      isSelected 
                        ? 'border-cyan-400 scale-105 shadow-[0_0_35px_rgba(0,255,255,0.45)]' 
                        : 'border-white/10'
                    }`}
                    style={{ willChange: 'transform, box-shadow' }}
                  >
                    <img
                      src={channel.customThumbnail || channel.thumbnail || channel.logo || '/placeholder.png'}
                      alt={channel.name}
                      className="h-full w-full object-cover transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/placeholder.png';
                      }}
                    />
                    
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 bg-black/75 backdrop-blur-md py-1.5 px-2.5 rounded-xl border border-white/5 shadow-lg">
                      <p className={`text-center font-extrabold truncate uppercase text-[10px] tracking-wider transition-colors duration-200 ${
                        isSelected ? 'text-cyan-400' : 'text-white'
                      }`}>
                        {channel.name}
                      </p>
                      {channel.epg ? (
                        <p className="text-center font-semibold truncate text-[9px] text-cyan-300/90 mt-0.5">
                          🔴 {channel.epg}
                        </p>
                      ) : null}
                    </div>

                    {isSelected && <div className="focus-indicator-ring" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center">
               <div className="text-5xl mb-3 opacity-20">📡</div>
               <p className="text-white/30 font-bold uppercase tracking-widest text-xs">No hay canales disponibles</p>
            </div>
          )}
        </div>
      </div>

      <div className="tv-footer-hint fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-8 flex justify-center gap-10 z-50">
        <div className="hint-item flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
           <span className="bg-white/10 px-2 py-1 rounded text-white">↑↓←→</span> Navegar
        </div>
        <div className="hint-item flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
           <span className="bg-cyan-500/20 px-2 py-1 rounded text-cyan-400 border border-cyan-400/30">OK</span> Ver Canal
        </div>
        <div className="hint-item flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
           <span className="bg-white/10 px-2 py-1 rounded text-white">BACK</span> Salir
        </div>
      </div>
    </div>
  );
}
