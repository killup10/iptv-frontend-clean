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
  X,
  Loader2
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext.jsx';
import ReactPlayer from 'react-player/youtube';

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
    playTrack,
    ytPlayerRef,
    audioRef,
    setCurrentTime,
    setDuration,
    setIsPlaying
  } = useMusic();

  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);

  if (!currentTrack) return null;

  const isFav = isFavorite(currentTrack.id);
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
    const val = parseFloat(e.target.value);
    seekTo(val);
    setIsSeeking(false);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <>
      {/* BARRA INFERIOR FLOTANTE ESTILO SPOTIFY */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[99990] bg-[#0c0915]/95 backdrop-blur-xl border-t border-fuchsia-500/20 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] px-3 sm:px-6 py-2.5 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1. INFO DE LA CANCIÓN / ARTISTA (IZQUIERDA) */}
          <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-1/3">
            <div 
              onClick={() => setIsExpandedPlayer(true)}
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group shadow-lg border border-white/10"
            >
              <img 
                src={currentTrack.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
                alt={currentTrack.title} 
                className={`w-full h-full object-cover transition-transform duration-500 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
              {currentTrack.isRadio && (
                <div className="absolute top-1 left-1 bg-red-600/90 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  FM
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 
                onClick={() => setIsExpandedPlayer(true)}
                className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:text-cyan-400 transition"
              >
                {currentTrack.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                {currentTrack.artist}
              </p>
              {/* Indicador de calidad: completa vs vista previa de 30s */}
              {!currentTrack.isRadio && (
                <span
                  className={`inline-flex items-center gap-1 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                    audioQuality === 'full'
                      ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10'
                      : audioQuality === 'loading-full'
                        ? 'text-amber-300 border-amber-400/40 bg-amber-500/10 animate-pulse'
                        : audioQuality === 'preview-fallback'
                          ? 'text-gray-400 border-white/15 bg-white/5'
                          : 'text-gray-400 border-white/15 bg-white/5'
                  }`}
                  title={
                    audioQuality === 'full'
                      ? 'Reproduciendo la canción completa'
                      : audioQuality === 'loading-full'
                        ? 'Arrancó la vista previa; buscando la versión completa…'
                        : 'Solo se encontró vista previa de 30 segundos'
                  }
                >
                  {audioQuality === 'full'
                    ? '● COMPLETA'
                    : audioQuality === 'loading-full'
                      ? '◌ BUSCANDO COMPLETA…'
                      : '○ VISTA PREVIA 30s'}
                </span>
              )}
            </div>

            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-1.5 rounded-full transition hidden sm:block ${
                isFav 
                  ? 'text-pink-500 hover:text-pink-400 scale-110' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500' : ''}`} />
            </button>
          </div>

          {/* 2. CONTROLES DE REPRODUCCIÓN & LÍNEA DE TIEMPO (CENTRO) */}
          <div className="flex flex-col items-center gap-1 flex-1 max-w-xl">
            {/* Botones de acción */}
            <div className="flex items-center gap-2 sm:gap-5">
              <button
                onClick={toggleShuffle}
                className={`p-1.5 rounded-full transition hidden sm:block ${
                  isShuffle ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
                title="Modo aleatorio"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={prevTrack}
                disabled={currentTrack.isRadio}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-40 disabled:hover:text-gray-300 transition"
                title="Pista anterior"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoadingAudio}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-black flex items-center justify-center shadow-lg shadow-fuchsia-500/20 hover:scale-105 active:scale-95 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-black text-black" />
                ) : (
                  <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                disabled={currentTrack.isRadio}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-40 disabled:hover:text-gray-300 transition"
                title="Siguiente pista"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-1.5 rounded-full transition hidden sm:block ${
                  repeatMode !== 'off' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
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

            {/* Barra de progreso de tiempo o estado En Vivo */}
            {currentTrack.isRadio ? (
              <div className="flex items-center gap-2 text-xs text-fuchsia-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Transmisión en vivo y directo ({currentTrack.frequency || 'Streaming HD'})</span>
              </div>
            ) : (
              <div className="w-full flex items-center gap-2 text-[11px] text-gray-400">
                <span className="w-9 text-right font-mono">{formatTime(displayedTime)}</span>
                <div className="relative flex-1 flex items-center group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 30}
                    step={0.1}
                    value={displayedTime}
                    onMouseDown={handleSeekMouseDown}
                    onTouchStart={handleSeekMouseDown}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekMouseUp}
                    onTouchEnd={handleSeekMouseUp}
                    className="w-full h-1.5 bg-white/10 group-hover:bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #06b6d4 0%, #d946ef ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%, rgba(255,255,255,0.15) 100%)`
                    }}
                  />
                </div>
                <span className="w-9 font-mono">{formatTime(duration || 30)}</span>
              </div>
            )}
          </div>

          {/* 3. VOLUMEN, COLA & EXPANDIR (DERECHA) */}
          <div className="flex items-center justify-end gap-3 w-1/4 sm:w-1/3">
            <button
              onClick={() => setShowQueueDrawer(prev => !prev)}
              className={`p-2 rounded-xl transition ${
                showQueueDrawer ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Cola de reproducción"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <div className="items-center gap-2 hidden md:flex">
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
                className="w-20 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-cyan-400"
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

      {/* DRAWER LATERAL DE COLA DE REPRODUCCIÓN */}
      {showQueueDrawer && (
        <div className="fixed bottom-20 right-4 z-[99992] w-80 max-h-96 bg-[#120d20]/95 backdrop-blur-2xl border border-fuchsia-500/30 rounded-2xl shadow-2xl p-4 flex flex-col animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Cola de Reproducción ({queue.length})</h3>
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
                        ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 text-white' 
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <img 
                      src={track.cover} 
                      alt={track.title} 
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                    </div>
                    {isSelected && (
                      <div className="flex gap-0.5 items-end h-3">
                        <span className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
                        <span className="w-0.5 h-2 bg-fuchsia-400 animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-cyan-400 animate-pulse delay-150" />
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
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                <Music className="w-4 h-4 text-cyan-400" />
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
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition duration-700 animate-pulse" />
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
              <p className="text-lg text-gray-300 font-medium mb-4">
                {currentTrack.artist}
              </p>
              {!currentTrack.isRadio && (
                <p className={`text-[11px] font-bold mb-4 ${
                  audioQuality === 'full' ? 'text-emerald-300' : audioQuality === 'loading-full' ? 'text-amber-300 animate-pulse' : 'text-gray-400'
                }`}>
                  {audioQuality === 'full'
                    ? '● Canción completa'
                    : audioQuality === 'loading-full'
                      ? '◌ Vista previa · buscando versión completa…'
                      : '○ Vista previa de 30 segundos'}
                </p>
              )}

              <button
                onClick={() => toggleFavorite(currentTrack)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition ${
                  isFav 
                    ? 'border-pink-500/50 bg-pink-500/20 text-pink-300' 
                    : 'border-white/15 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                <span className="text-xs font-semibold">{isFav ? 'En tus favoritos' : 'Añadir a favoritos'}</span>
              </button>
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
                  max={duration || 30}
                  step={0.1}
                  value={displayedTime}
                  onMouseDown={handleSeekMouseDown}
                  onTouchStart={handleSeekMouseDown}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  onTouchEnd={handleSeekMouseUp}
                  className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="w-10 font-mono">{formatTime(duration || 30)}</span>
              </div>
            )}

            {/* Botones de control en grande */}
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition ${isShuffle ? 'text-cyan-400' : 'text-gray-500 hover:text-white'}`}
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
                className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black flex items-center justify-center shadow-xl shadow-fuchsia-500/30 hover:scale-105 active:scale-95 transition"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-black" />
                ) : (
                  <Play className="w-8 h-8 fill-black ml-1" />
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
                className={`p-2 transition ${repeatMode !== 'off' ? 'text-cyan-400' : 'text-gray-500 hover:text-white'}`}
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
                  origin: 'https://www.youtube.com'
                }
              }
            }}
          />
        </div>
      )}
    </>
  );
}
