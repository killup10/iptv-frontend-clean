import React, { useState, useMemo, useEffect, useRef } from 'react';
import { normalizeSearchText } from '../utils/searchUtils.js';

function resolveChannelKeyAction(event) {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Enter':
      return event.key;
    case ' ':
    case 'Spacebar':
    case 'Select':
    case 'MediaPlayPause':
      return 'Enter';
    default:
      break;
  }

  switch (event.keyCode) {
    case 19:
      return 'ArrowUp';
    case 20:
      return 'ArrowDown';
    case 21:
      return 'ArrowLeft';
    case 22:
      return 'ArrowRight';
    case 23:
    case 62:
    case 66:
      return 'Enter';
    default:
      return null;
  }
}

const ChannelsSelector = ({ channels = [], currentChannelId, onSelectChannel, currentChannelName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(-1);
  const channelButtonRefs = useRef([]);

  // Filtrar canales según búsqueda
  const filteredChannels = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    if (!normalizedSearch) return channels;
    return channels.filter((channel) =>
      normalizeSearchText(channel.name || '').includes(normalizedSearch)
    );
  }, [channels, searchTerm]);

  // Actualizar índice seleccionado cuando cambia el canal actual
  useEffect(() => {
    if (currentChannelId) {
      const index = channels.findIndex((ch) => String(ch.id) === String(currentChannelId));
      setSelectedChannelIndex(index);
    }
  }, [currentChannelId, channels]);

  const handleChannelClick = async (channel, index) => {
    if (String(channel.id) === String(currentChannelId)) {
      return;
    }

    // Detener reproducción antes de cambiar canal (Electron MPV)
    if (typeof window !== 'undefined' && window.electronMPV) {
      try {
        console.log('[ChannelsSelector] Deteniendo MPV antes de cambiar canal...');
        await Promise.race([
          window.electronMPV.stop(),
          new Promise(resolve => setTimeout(resolve, 400))
        ]);
      } catch (err) {
        console.error('[ChannelsSelector] Error al detener MPV:', err);
      }
    }

    // Detener reproducción en Android VLC
    if (typeof window !== 'undefined' && window.VideoPlayerPlugin) {
      try {
        console.log('[ChannelsSelector] Deteniendo VLC en Android antes de cambiar canal...');
        if (typeof window.VideoPlayerPlugin.stopVideo === 'function') {
          await Promise.race([
            window.VideoPlayerPlugin.stopVideo(),
            new Promise(resolve => setTimeout(resolve, 400))
          ]);
        }
      } catch (err) {
        console.error('[ChannelsSelector] Error al detener VLC:', err);
      }
    }

    setSelectedChannelIndex(index);
    if (typeof onSelectChannel === 'function') {
      onSelectChannel(channel);
    }
  };

  const focusFilteredChannel = (nextIndex) => {
    const safeIndex = Math.max(0, Math.min(filteredChannels.length - 1, nextIndex));
    const targetButton = channelButtonRefs.current[safeIndex];
    if (!targetButton) return;

    try {
      targetButton.focus({ preventScroll: true });
    } catch {
      targetButton.focus();
    }

    targetButton.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  };

  const handleChannelKeyDown = (event, channel, filteredIndex) => {
    const action = resolveChannelKeyAction(event);
    if (!action || filteredChannels.length === 0) return;

    if (action === 'Enter') {
      event.preventDefault();
      handleChannelClick(channel, channels.indexOf(channel));
      return;
    }

    const columns = window.innerWidth >= 1024 ? 5 : window.innerWidth >= 768 ? 4 : window.innerWidth >= 640 ? 3 : 2;
    let nextIndex = filteredIndex;

    switch (action) {
      case 'ArrowLeft':
        nextIndex = filteredIndex - 1;
        break;
      case 'ArrowRight':
        nextIndex = filteredIndex + 1;
        break;
      case 'ArrowUp':
        nextIndex = filteredIndex - columns;
        break;
      case 'ArrowDown':
        nextIndex = filteredIndex + columns;
        break;
      default:
        return;
    }

    event.preventDefault();
    focusFilteredChannel(nextIndex);
  };

  // Si no hay canales, no mostrar nada
  if (!channels || channels.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-950 rounded-xl shadow-sm border border-cyan-400/20 p-4 sm:p-6 backdrop-blur-sm">
      {/* Título */}
      <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-2 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></span>
        <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          Canales
        </span>
        <span className="text-xs sm:text-sm font-normal text-gray-400 ml-auto">
          {filteredChannels.length} de {channels.length}
        </span>
      </h3>

      {/* Barra de búsqueda */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Buscar canal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-zinc-800/50 border border-cyan-400/30 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-zinc-800 transition-colors text-sm sm:text-base"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Grid de canales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 max-h-96 overflow-y-auto pr-2">
        {filteredChannels.length > 0 ? (
          filteredChannels.map((channel, index) => {
            const isCurrent = String(channel.id) === String(currentChannelId);
            return (
              <button
                key={String(channel.id)}
                ref={(element) => {
                  channelButtonRefs.current[index] = element;
                }}
                onClick={() => handleChannelClick(channel, channels.indexOf(channel))}
                onKeyDown={(event) => handleChannelKeyDown(event, channel, index)}
                className={`
                  relative px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-xs sm:text-sm
                  transition-all duration-300 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-zinc-950
                  ${isCurrent
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-300'
                    : 'bg-zinc-700/40 text-gray-300 hover:bg-zinc-700/70 hover:text-white border border-zinc-600/50 hover:border-cyan-400/50'
                  }
                `}
                title={channel.name}
              >
                {/* Efecto de fondo animado para canales actuales */}
                {isCurrent && (
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 animate-pulse"></span>
                )}

                {/* Contenido */}
                <span className="relative block truncate whitespace-nowrap">
                  {isCurrent && <span className="mr-1">▶</span>}
                  {channel.name}
                </span>

                {/* Hover effect */}
                {!isCurrent && (
                  <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400/0 to-blue-400/0 group-hover:from-cyan-400/10 group-hover:to-blue-400/10 transition-all duration-300"></span>
                )}
              </button>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-gray-400">
            <p className="text-sm">No se encontraron canales</p>
          </div>
        )}
      </div>

      {/* Información del canal actual */}
      {currentChannelName && (
        <div className="mt-4 pt-3 border-t border-cyan-400/20">
          <p className="text-xs sm:text-sm text-gray-400">
            <span className="text-cyan-400 font-semibold">Reproduciendo:</span> {currentChannelName}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChannelsSelector;
