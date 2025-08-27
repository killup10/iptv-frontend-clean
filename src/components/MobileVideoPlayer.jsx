import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { videoProgressService } from '../services/videoProgress';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { getPlayerType, isAndroid } from '../utils/platformUtils';
import {
  PlayIcon as PlaySolidIcon,
  PauseIcon as PauseSolidIcon,
  SpeakerWaveIcon as SpeakerWaveSolidIcon,
  SpeakerXMarkIcon as SpeakerXMarkSolidIcon,
} from '@heroicons/react/24/solid';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  return `${mm.toString().padStart(2, '0')}:${ss}`;
};

export default function MobileVideoPlayer({ url, itemId, startTime = 0, initialAutoplay = true, title = "Video" }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [playerType, setPlayerType] = useState(null);
  const [isAndroidNative, setIsAndroidNative] = useState(false);

  const testUrl = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const { saveProgress, lastSavedTime } = videoProgressService;

  // Detectar plataforma al montar
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const type = await getPlayerType();
        const androidCheck = await isAndroid();
        setPlayerType(type);
        setIsAndroidNative(androidCheck);
        
        // Si es Android y debe reproducir automáticamente
        if (type === 'android-exoplayer' && initialAutoplay && url) {
          await handleAndroidPlayback();
        }
      } catch (err) {
        console.error('Error detecting platform:', err);
        setPlayerType('web-html5');
        setIsAndroidNative(false);
      }
    };

    detectPlatform();
  }, [url, initialAutoplay]);

  const handleAndroidPlayback = async () => {
    try {
      setError(null);
      console.log('MobileVideoPlayer: Iniciando ExoPlayer con URL:', url);
      
      const result = await VideoPlayerPlugin.playVideo({
        url: url,
        title: title || "Video",
        startTime: startTime || 0
      });

      if (result.success) {
        setPlaying(true);
        console.log('MobileVideoPlayer: ExoPlayer iniciado exitosamente');
      } else {
        throw new Error(result.message || 'Error al iniciar ExoPlayer');
      }
    } catch (err) {
      console.error('MobileVideoPlayer: Error con ExoPlayer:', err);
      setError(`Error de reproducción: ${err.message}`);
    }
  };

  const handleStopAndroid = async () => {
    try {
      await VideoPlayerPlugin.stopVideo();
      setPlaying(false);
    } catch (err) {
      console.error('Error stopping Android player:', err);
    }
  };

  useEffect(() => {
    if (initialAutoplay && videoRef.current && !isAndroidNative) {
      videoRef.current.play().catch(e => setError("Error al iniciar la reproducción automática"));
    }
  }, [initialAutoplay, isAndroidNative]);

  const handlePlay = useCallback(() => setPlaying(true), []);
  const handlePause = useCallback(() => setPlaying(false), []);
  const handleError = useCallback((e) => setError("Error al cargar el video de prueba"), []);
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (lastSavedTime > 0) {
        videoRef.current.currentTime = lastSavedTime;
      }
    }
  }, [lastSavedTime]);

  const handlePlayPause = useCallback(async () => {
    if (isAndroidNative) {
      if (playing) {
        await handleStopAndroid();
      } else {
        await handleAndroidPlayback();
      }
    } else {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [playing, isAndroidNative]);

  const handleVolumeChange = useCallback((e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) videoRef.current.volume = vol;
  }, []);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
  }, [muted]);

  const handleSeekChange = useCallback((e) => {
    const seekTime = parseFloat(e.target.value);
    setPlayedSeconds(seekTime);
    if (videoRef.current) videoRef.current.currentTime = seekTime;
  }, []);

  const playedRatio = duration > 0 ? playedSeconds / duration : 0;

  // Si estamos esperando la detección de plataforma
  if (playerType === null) {
    return (
      <div className="player-wrapper w-full aspect-video bg-gray-900 rounded-lg relative flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p>Detectando reproductor...</p>
        </div>
      </div>
    );
  }

  // Si es Android nativo, mostrar interfaz específica
  if (isAndroidNative && playerType === 'android-exoplayer') {
    return (
      <div className="player-wrapper w-full aspect-video bg-black rounded-lg relative flex flex-col items-center justify-center">
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-2 text-sm z-10">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 px-2 py-1 bg-red-800 rounded text-xs"
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="text-center text-white p-4">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-gray-300 mb-4">
            {playing ? '▶️ Reproduciendo en ExoPlayer' : '⏸️ Toca para reproducir'}
          </p>
          
          <button
            onClick={handlePlayPause}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-lg"
          >
            {playing ? '⏹️ Detener' : '▶️ Reproducir'}
          </button>
          
          {url && (
            <p className="text-xs text-gray-400 mt-4 break-all">
              {url.substring(0, 80)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Para web/otras plataformas, usar HTML5 video
  return (
    <div className="player-wrapper w-full aspect-video bg-blue-900 rounded-lg relative group select-none flex flex-col items-center justify-center">
      <h1 className="text-white text-2xl font-bold mb-4">VERSIÓN DE PRUEBA</h1>
      <video
        ref={videoRef}
        className="w-full h-3/4 object-contain"
        src={testUrl}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => setPlayedSeconds(videoRef.current.currentTime)}
        playsInline
        controls={false}
      />
      {error && (
        <div className="absolute inset-x-0 top-0 text-center py-2 bg-red-800 text-white">
          {error}
        </div>
      )}
      <div className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full relative h-1.5 bg-gray-600 rounded-full">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={playedSeconds}
            onChange={handleSeekChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="absolute h-full bg-red-600 rounded-full" style={{ width: `${playedRatio * 100}%` }} />
        </div>
        <div className="flex items-center justify-between text-white mt-2">
          <div className="flex items-center gap-3">
            <button onClick={handlePlayPause} className="p-1 hover:bg-white/10 rounded-full">
              {playing ? <PauseSolidIcon className="w-5 h-5" /> : <PlaySolidIcon className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={handleMuteToggle} className="p-1 hover:bg-white/10 rounded-full">
                {muted ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveSolidIcon className="w-5 h-h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-red-600"
              />
            </div>
          </div>
          <div className="text-sm">
            {formatTime(playedSeconds)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
}

MobileVideoPlayer.propTypes = {
  url: PropTypes.string.isRequired,
  itemId: PropTypes.string,
  startTime: PropTypes.number,
  initialAutoplay: PropTypes.bool,
  title: PropTypes.string,
};
