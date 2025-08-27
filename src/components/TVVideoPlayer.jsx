import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TVVideoPlayer({ 
  videoUrl, 
  title = "Video", 
  onBack,
  chapters = [],
  autoPlay = true 
}) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [focusedControl, setFocusedControl] = useState(0);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const controls = [
    { id: 'play', label: isPlaying ? '⏸️ Pausar' : '▶️ Reproducir' },
    { id: 'rewind', label: '⏪ -10s' },
    { id: 'forward', label: '⏩ +10s' },
    { id: 'chapters', label: '📋 Capítulos' },
    { id: 'back', label: '🔙 Volver' }
  ];

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => clearTimeout(controlsTimeoutRef.current);
  }, [showControls]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      setShowControls(true);
      
      switch (e.keyCode) {
        case 37: // Left arrow
          e.preventDefault();
          if (showControls) {
            setFocusedControl(prev => prev > 0 ? prev - 1 : controls.length - 1);
          } else {
            // Seek backward
            if (videoRef.current) {
              videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
            }
          }
          break;
          
        case 39: // Right arrow
          e.preventDefault();
          if (showControls) {
            setFocusedControl(prev => prev < controls.length - 1 ? prev + 1 : 0);
          } else {
            // Seek forward
            if (videoRef.current) {
              videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
            }
          }
          break;
          
        case 38: // Up arrow
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
          
        case 40: // Down arrow
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
          
        case 13: // Enter/OK
          e.preventDefault();
          handleControlAction(controls[focusedControl].id);
          break;
          
        case 32: // Space
          e.preventDefault();
          togglePlayPause();
          break;
          
        case 8: // Back
          e.preventDefault();
          if (onBack) {
            onBack();
          } else {
            navigate(-1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showControls, focusedControl, duration, navigate, onBack]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNextChapter();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Update video volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleControlAction = (action) => {
    switch (action) {
      case 'play':
        togglePlayPause();
        break;
      case 'rewind':
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        }
        break;
      case 'forward':
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
        }
        break;
      case 'chapters':
        showChaptersMenu();
        break;
      case 'back':
        if (onBack) {
          onBack();
        } else {
          navigate(-1);
        }
        break;
    }
  };

  const playNextChapter = () => {
    if (chapters.length > 0 && currentChapterIndex < chapters.length - 1) {
      const nextChapter = chapters[currentChapterIndex + 1];
      setCurrentChapterIndex(currentChapterIndex + 1);
      // Here you would typically update the video source
      console.log('Playing next chapter:', nextChapter.title);
    }
  };

  const showChaptersMenu = () => {
    // Implementation for chapters menu
    console.log('Show chapters menu');
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <style>{`
        .tv-video-container {
          background: #000;
          position: relative;
          width: 100vw;
          height: 100vh;
        }
        
        .tv-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .tv-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          padding: 40px;
          transition: opacity 0.3s ease;
        }
        
        .tv-controls.hidden {
          opacity: 0;
          pointer-events: none;
        }
        
        .tv-control-button {
          background: rgba(0, 0, 0, 0.7);
          border: 3px solid transparent;
          color: white;
          padding: 15px 25px;
          margin: 0 10px;
          border-radius: 10px;
          font-size: 18px;
          transition: all 0.3s ease;
        }
        
        .tv-control-button.focused {
          border-color: hsl(190, 100%, 50%);
          background: linear-gradient(135deg, hsl(190, 100%, 50%, 0.3), hsl(315, 100%, 60%, 0.3));
          box-shadow: 0 0 20px hsl(190, 100%, 50%, 0.5);
          transform: scale(1.1);
        }
        
        .tv-progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        .tv-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, hsl(190, 100%, 50%), hsl(315, 100%, 60%));
          transition: width 0.1s ease;
        }
        
        .tv-volume-indicator {
          position: absolute;
          top: 50%;
          right: 40px;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.8);
          padding: 20px;
          border-radius: 10px;
          color: white;
          font-size: 24px;
        }
      `}</style>

      <div className="tv-video-container">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="tv-video"
          src={videoUrl}
          autoPlay={autoPlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Title Overlay */}
        <div className="absolute top-8 left-8 text-white">
          <h1 className="text-4xl font-bold mb-2" style={{
            textShadow: '0 0 10px rgba(0,0,0,0.8)'
          }}>
            {title}
          </h1>
          {chapters.length > 0 && (
            <p className="text-xl text-gray-300">
              Capítulo {currentChapterIndex + 1} de {chapters.length}
            </p>
          )}
        </div>

        {/* Volume Indicator */}
        {showControls && (
          <div className="tv-volume-indicator">
            🔊 {Math.round(volume * 100)}%
          </div>
        )}

        {/* Controls */}
        <div className={`tv-controls ${showControls ? '' : 'hidden'}`}>
          {/* Progress Bar */}
          <div className="tv-progress-bar">
            <div 
              className="tv-progress-fill"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-white text-xl">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <span className="text-gray-300 text-lg">
              🎮 Use las flechas para navegar • OK para seleccionar
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center items-center">
            {controls.map((control, index) => (
              <button
                key={control.id}
                className={`tv-control-button ${
                  index === focusedControl ? 'focused' : ''
                }`}
                onClick={() => handleControlAction(control.id)}
              >
                {control.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Indicator */}
        {!duration && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-2xl">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mb-4"></div>
              Cargando video...
            </div>
          </div>
        )}
      </div>
    </>
  );
}
