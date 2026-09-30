// src/components/music/GlobalMusicPlayer.jsx
import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Heart, 
  Maximize2, 
  Minimize2, 
  Music, 
  Radio, 
  ListMusic, 
  ListPlus,
  X,
  Loader2,
  Check,
  Download,
  DownloadCloud
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext.jsx';
import ReactPlayer from 'react-player/youtube';
import AddToPlaylistModal from './AddToPlaylistModal.jsx';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function GlobalMusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoadingAudio,
    audioQuality,
    playbackMode,
    fallbackToPreview,
    volume,
    isMuted,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isExpandedPlayer,
    setIsExpandedPlayer,
    queue,
    queueIndex,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    isFavorite,
    openAddToPlaylistModal,
    playTrack,
    ytPlayerRef,
    audioRef,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    isTrackDownloaded,
    downloadTrack,
    deleteOfflineTrack,
    activeDownloadsMap
  } = useMusic();

  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);

  if (!currentTrack) return null;

  const isFav = isFavorite(currentTrack.id);
  const isDownloaded = isTrackDownloaded(currentTrack.id);
  const dlStatus = activeDownloadsMap[currentTrack.id];
  const isDownloading = dlStatus?.status === 'downloading';
  const displayedTime = isSeeking ? seekVal : currentTime;
  const progressPercent = duration > 0 ? (displayedTime / duration) * 100 : 0;

  const VolumeIcon = isMuted || volume === 0 
    ? VolumeX 
    : volume < 0.5 
      ? Volume1 
      : Volume2;

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
  };

  const handleSeekChange = (e) => {
    setSeekVal(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e) => {
    const rawVal = e?.target?.value;
    const num = parseFloat(rawVal);
    const val = (!isNaN(num) && Number.isFinite(num)) ? num : seekVal;
    seekTo(val);
    setIsSeeking(false);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <>
      {/* BARRA INFERIOR / MINI-PLAYER ADAPTATIVO */}
      <div 
        className="fixed bottom-2 left-2 right-2 md:bottom-0 md:left-0 md:right-0 z-[99990] bg-[#0c0915]/95 backdrop-blur-2xl border border-white/10 md:border-b-0 md:border-x-0 md:border-t md:border-fuchsia-500/20 shadow-[0_10px_35px_rgba(0,0,0,0.85)] rounded-2xl md:rounded-none px-3 sm:px-6 py-2 transition-all duration-300"
      >
        {/* LÍNEA DE PROGRESO DISCRETA (EN MÓVIL: en el borde inferior de la píldora) */}
        {!currentTrack.isRadio && (
          <div className="md:hidden absolute bottom-0 left-2 right-2 h-[2.5px] bg-white/10 rounded-b-2xl overflow-hidden pointer-events-none">
            <div 
              className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* 1. INFO DE LA CANCIÓN / ARTISTA (Clic abre el reproductor completo) */}
          <div 
            onClick={() => setIsExpandedPlayer(true)}
            className="flex items-center gap-3 min-w-0 flex-1 md:w-1/4 md:flex-initial cursor-pointer group"
          >
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/10">
              <img 
                src={currentTrack.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
                alt={currentTrack.title} 
                className={`w-full h-full object-cover transition-transform duration-500 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
              {currentTrack.isRadio && (
                <div className="absolute top-0.5 left-0.5 bg-red-600 text-[8px] font-black text-white px-1 py-0.2 rounded flex items-center gap-1 shadow">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  FM
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-fuchsia-400 transition">
                {currentTrack.title}
              </h4>
              <p className="text-[11px] text-gray-400 truncate">
                {currentTrack.artist}
              </p>
            </div>

            {/* Acciones en Desktop */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(currentTrack);
                }}
                className={`p-1.5 rounded-full transition ${
                  isFav 
                    ? 'text-pink-500 hover:text-pink-400 scale-110' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title={isFav ? 'Quitar de Mis Me Gusta' : 'Guardar en Mis Me Gusta'}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500' : ''}`} />
              </button>

              {/* Botón Descarga Offline */}
              {!currentTrack.isRadio && (
                isDownloaded ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOfflineTrack(currentTrack.id);
                    }}
                    className="p-1.5 rounded-full text-emerald-400 hover:text-red-400 hover:bg-white/5 transition"
                    title="Canción descargada en tu dispositivo (Modo Offline). Toca para borrar archivo"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>
                ) : isDownloading ? (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full text-fuchsia-400"
                    title={`Descargando audio: ${dlStatus?.progress || 0}%`}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTrack(currentTrack);
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:text-fuchsia-400 hover:bg-white/5 transition"
                    title="Descargar para Modo Offline (escuchar sin internet)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )
              )}

              {!currentTrack.isRadio && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddToPlaylistModal(currentTrack);
                  }}
                  className="p-1.5 rounded-full text-gray-400 hover:text-fuchsia-400 transition"
                  title="Añadir a lista personalizada"
                >
                  <ListPlus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 2. CONTROLES CENTRALES (EN DESKTOP: Shuffle, Prev, Play, Next, Repeat + Barra completa) */}
          <div className="hidden md:flex flex-col items-center gap-1 flex-1 max-w-xl">
            <div className="flex items-center gap-5">
              <button
                onClick={toggleShuffle}
                className={`p-1.5 rounded-full transition ${
                  isShuffle ? 'text-fuchsia-400' : 'text-gray-400 hover:text-white'
                }`}
                title="Modo aleatorio"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={prevTrack}
                disabled={currentTrack.isRadio}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-40 transition"
                title="Pista anterior"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/25 hover:scale-105 active:scale-95 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                disabled={currentTrack.isRadio}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-40 transition"
                title="Siguiente pista"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-1.5 rounded-full transition ${
                  repeatMode !== 'off' ? 'text-fuchsia-400' : 'text-gray-400 hover:text-white'
                }`}
                title={`Repetir: ${repeatMode === 'all' ? 'Toda la cola' : repeatMode === 'one' ? 'Canción actual' : 'Desactivado'}`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Barra de progreso de tiempo o estado En Vivo en Desktop */}
            {currentTrack.isRadio ? (
              <div className="flex items-center gap-2 text-xs text-fuchsia-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Transmisión en vivo ({currentTrack.frequency || 'Streaming HD'})</span>
              </div>
            ) : (
              <div className="w-full flex items-center gap-2 text-[11px] text-gray-400">
                <span className="w-9 text-right font-mono">{formatTime(displayedTime)}</span>
                <div className="relative flex-1 flex items-center group">
                  <input
                    type="range"
                    min={0}
                    max={duration || currentTrack.fullDuration || currentTrack.duration || 210}
                    step={0.1}
                    value={displayedTime}
                    onMouseDown={handleSeekMouseDown}
                    onTouchStart={handleSeekMouseDown}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekMouseUp}
                    onTouchEnd={handleSeekMouseUp}
                    className="w-full h-1.5 bg-white/10 group-hover:bg-white/20 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #d946ef 0%, #a855f7 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%, rgba(255,255,255,0.15) 100%)`
                    }}
                  />
                </div>
                <span className="w-9 font-mono">{formatTime(duration || currentTrack.fullDuration || currentTrack.duration || 210)}</span>
              </div>
            )}
          </div>

          {/* 3. DERECHA: EN MÓVIL (Favorito + Play) | EN DESKTOP (Cola + Volumen + Expandir) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Solo Móvil: Botón Me Gusta */}
            <div className="md:hidden flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(currentTrack);
                }}
                className={`p-2 rounded-full transition active:scale-90 ${
                  isFav ? 'text-pink-500' : 'text-gray-400 hover:text-white'
                }`}
                title={isFav ? 'Quitar de Mis Me Gusta' : 'Guardar en Mis Me Gusta'}
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-pink-500' : ''}`} />
              </button>
            </div>

            {/* Solo Móvil: Botón Play/Pause grande y cómodo */}
            <div className="md:hidden flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/25 active:scale-95 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                )}
              </button>
            </div>

            {/* Solo Desktop: Cola, Volumen y Botón Expandir */}
            <div className="hidden md:flex items-center gap-3 w-48 justify-end">
              <button
                onClick={() => setShowQueueDrawer(prev => !prev)}
                className={`p-2 rounded-xl transition ${
                  showQueueDrawer ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lista de Reproducción"
              >
                <ListMusic className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 group">
                <button 
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white transition p-1"
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  <VolumeIcon className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
              </div>

              <button
                onClick={() => setIsExpandedPlayer(true)}
                className="text-gray-400 hover:text-white transition p-1.5 hover:bg-white/5 rounded-xl"
                title="Expandir reproductor"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* DRAWER LATERAL DE COLA DE REPRODUCCIÓN */}
      {showQueueDrawer && (
        <div className="fixed bottom-20 right-4 z-[99992] w-80 max-h-96 bg-[#120d20]/95 backdrop-blur-2xl border border-fuchsia-500/30 rounded-2xl shadow-2xl p-4 flex flex-col animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-fuchsia-400" />
              <h3 className="text-sm font-bold text-white">Lista de Reproducción ({queue.length})</h3>
            </div>
            <button
              onClick={() => setShowQueueDrawer(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {queue.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No hay canciones en la cola</p>
            ) : (
              queue.map((track, idx) => {
                const isSelected = track.id === currentTrack.id;
                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onClick={() => playTrack(track, queue)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition ${
                      isSelected 
                        ? 'bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-400/30 text-white' 
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <img 
                      src={track.cover} 
                      alt={track.title} 
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-fuchsia-300' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                    </div>
                    {isSelected && (
                      <div className="flex gap-0.5 items-end h-3">
                        <span className="w-0.5 h-3 bg-fuchsia-400 animate-pulse" />
                        <span className="w-0.5 h-2 bg-pink-400 animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-fuchsia-400 animate-pulse delay-150" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN / NOW PLAYING EXPANDIDO */}
      {isExpandedPlayer && (
        <div className="fixed inset-0 z-[99999] bg-gradient-to-b from-[#180e2b] via-[#0d0716] to-[#05020a] flex flex-col justify-between p-6 sm:p-12 animate-in fade-in duration-300">
          
          {/* Header del Modal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center">
                <Music className="w-4 h-4 text-fuchsia-400" />
              </div>
              <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                {currentTrack.isRadio ? 'Radio en Vivo' : 'Reproduciendo de TeamG Music'}
              </span>
            </div>

            <button
              onClick={() => setIsExpandedPlayer(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
              title="Minimizar vista"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo Central: Carátula gigante & Título */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 my-auto max-w-5xl mx-auto w-full">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition duration-700 animate-pulse" />
              <img 
                src={currentTrack.cover} 
                alt={currentTrack.title}
                className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl object-cover shadow-2xl border border-white/15"
              />
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md">
              <span className="text-xs font-bold text-fuchsia-400 tracking-wider uppercase mb-2">
                {currentTrack.album || currentTrack.genre || 'TeamG Play Music'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 leading-tight">
                {currentTrack.title}
              </h2>
              <p className="text-lg text-gray-300 font-medium mb-3">
                {currentTrack.artist}
              </p>
              {!currentTrack.isRadio && (
                <div className="flex items-center gap-2 mb-4">
                  {currentTrack.genre && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/30">
                      {currentTrack.genre}
                    </span>
                  )}
                  {currentTrack.releaseDate && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300">
                      {currentTrack.releaseDate}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(currentTrack)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition ${
                    isFav 
                      ? 'border-pink-500/50 bg-pink-500/20 text-pink-300' 
                      : 'border-white/15 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                  <span className="text-xs font-semibold">{isFav ? 'En Mis Me Gusta' : 'Guardar'}</span>
                </button>

                {!currentTrack.isRadio && (
                  <button
                    onClick={() => openAddToPlaylistModal(currentTrack)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 transition cursor-pointer"
                  >
                    <ListPlus className="w-4 h-4" />
                    <span className="text-xs font-semibold">Añadir a Playlist</span>
                  </button>
                )}

                {/* Botón Descarga Modo Offline en pantalla completa */}
                {!currentTrack.isRadio && (
                  isDownloaded ? (
                    <button
                      onClick={() => deleteOfflineTrack(currentTrack.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition cursor-pointer"
                      title="Canción descargada en tu dispositivo. Toca para borrar archivo"
                    >
                      <Check className="w-4 h-4 stroke-[2.5] text-emerald-400" />
                      <span className="text-xs font-semibold">Descargada (Offline)</span>
                    </button>
                  ) : isDownloading ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300">
                      <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                      <span className="text-xs font-semibold">Descargando {dlStatus?.progress || 0}%</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => downloadTrack(currentTrack)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-gray-300 hover:text-fuchsia-300 hover:border-fuchsia-400/40 hover:bg-white/10 transition cursor-pointer"
                      title="Descargar para escuchar sin internet (Modo Offline)"
                    >
                      <Download className="w-4 h-4 text-fuchsia-400" />
                      <span className="text-xs font-semibold">Descargar Offline</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Controles Expandidos Inferiores */}
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-4">
            {/* Barra de progreso */}
            {!currentTrack.isRadio && (
              <div className="w-full flex items-center gap-3 text-xs text-gray-400">
                <span className="w-10 text-right font-mono">{formatTime(displayedTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack.fullDuration || currentTrack.duration || 210}
                  step={0.1}
                  value={displayedTime}
                  onMouseDown={handleSeekMouseDown}
                  onTouchStart={handleSeekMouseDown}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  onTouchEnd={handleSeekMouseUp}
                  className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
                <span className="w-10 font-mono">{formatTime(duration || currentTrack.fullDuration || currentTrack.duration || 210)}</span>
              </div>
            )}

            {/* Botones de control en grande */}
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition ${isShuffle ? 'text-fuchsia-400' : 'text-gray-500 hover:text-white'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={prevTrack}
                disabled={currentTrack.isRadio}
                className="p-2 text-gray-300 hover:text-white disabled:opacity-30 transition"
              >
                <SkipBack className="w-7 h-7" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-fuchsia-500/30 hover:scale-105 active:scale-95 transition"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-white text-white" />
                ) : (
                  <Play className="w-8 h-8 fill-white text-white ml-1" />
                )}
              </button>

              <button
                onClick={nextTrack}
                disabled={currentTrack.isRadio}
                className="p-2 text-gray-300 hover:text-white disabled:opacity-30 transition"
              >
                <SkipForward className="w-7 h-7" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-2 transition ${repeatMode !== 'off' ? 'text-fuchsia-400' : 'text-gray-500 hover:text-white'}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPRODUCTOR DE YOUTUBE (SOLO RESPALDO: cuando no hay stream directo).
          El motor principal es el <audio> nativo con mp3/m4a directo. */}
      {currentTrack?.youtubeId && playbackMode === 'youtube' && (
        <div 
          className="fixed bottom-0 right-0 w-[300px] h-[200px] overflow-hidden pointer-events-none z-[10] opacity-5"
          aria-hidden="true"
        >
          <ReactPlayer
            ref={ytPlayerRef}
            url={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            controls={false}
            width="100%"
            height="100%"
            onPlay={() => {
              console.log('[ReactPlayer] ✓ YouTube reproduciendo canción completa');
              setIsPlaying(true);
              if (audioRef?.current && !audioRef.current.paused) {
                audioRef.current.pause();
              }
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={nextTrack}
            progressInterval={250}
            onProgress={(progress) => {
              if (!isSeeking && progress.playedSeconds !== undefined) {
                setCurrentTime(progress.playedSeconds);
              }
            }}
            onDuration={(dur) => {
              if (dur && dur > 0) setDuration(dur);
            }}
            onError={(err) => {
              console.warn('[ReactPlayer] Iframe YouTube falló, volviendo a preview 30s:', err);
              fallbackToPreview();
            }}
            config={{
              youtube: {
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  disablekb: 1,
                  fs: 0,
                  modestbranding: 1,
                  playsinline: 1,
                  rel: 0,
                  origin: (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://www.youtube.com'
                }
              }
            }}
          />
        </div>
      )}

      {/* Modal global para añadir canción a listas personalizadas */}
      <AddToPlaylistModal />
    </>
  );
}
