import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getPlayerType } from '../utils/platformUtils';
import VideoPlayerPlugin from '../plugins/VideoPlayerPlugin';
import { backgroundPlaybackService } from '../services/backgroundPlayback';
import useProgressReporter from '../hooks/useProgressReporter';
import useElectronMpvProgress from '../hooks/useElectronMpvProgress';
import { videoProgressService } from '../services/videoProgress';
import { App as CapacitorApp } from '@capacitor/app';

export default function VideoPlayer({ url, itemId, startTime, initialAutoplay, title, seasons, currentChapterInfo, onNextEpisode, isUnmountingRef }) {
  const platform = getPlayerType();
  const videoRef = useRef(null);
  const isPlayingRef = useRef(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const lastSavedTimeRef = useRef(0);
  
  const seasonNumber = seasons?.[currentChapterInfo?.seasonIndex]?.seasonNumber;
  const chapterNumber = seasons?.[currentChapterInfo?.seasonIndex]?.chapters?.[currentChapterInfo?.chapterIndex]?.episodeNumber;
  const allChapters = seasons?.flatMap(season => season.chapters) || [];

  console.log('[VideoPlayer] Reproductor simplificado - sin proxy');

  // Progreso Android VLC
  useEffect(() => {
    if (platform !== 'android-vlc' || !itemId) return;

    if (startTime > 0) {
      setCurrentTime(startTime);
      lastSavedTimeRef.current = startTime;
    }

    const saveProgress = async (currentTimeValue, completed = false) => {
      if (currentTimeValue > 0 && itemId) {
        try {
          await videoProgressService.saveProgress(itemId, { 
            lastTime: currentTimeValue,
            completed,
            lastSeason: currentChapterInfo?.seasonIndex,
            lastChapter: currentChapterInfo?.chapterIndex
          });
          lastSavedTimeRef.current = currentTimeValue;
        } catch (error) {
          console.error('[VideoPlayer] Error guardando progreso:', error);
        }
      }
    };

    const handleTimeUpdate = (data) => {
      const currentTimeValue = data.currentTime || 0;
      const completed = data.completed || false;

      setCurrentTime(currentTimeValue);
      lastSavedTimeRef.current = currentTimeValue;

      if (completed) {
        saveProgress(currentTimeValue, true);
        if (onNextEpisode && seasons && currentChapterInfo) {
          const { seasonIndex, chapterIndex } = currentChapterInfo;
          const currentSeason = seasons[seasonIndex];

          if (currentSeason && currentSeason.chapters.length > chapterIndex + 1) {
            onNextEpisode(seasonIndex, chapterIndex + 1);
          } else if (seasons.length > seasonIndex + 1) {
            onNextEpisode(seasonIndex + 1, 0);
          }
        }
      }
    };

    let progressListener = null;
    let stopListener = null;
    if (VideoPlayerPlugin?.addListener) {
      progressListener = VideoPlayerPlugin.addListener('timeupdate', handleTimeUpdate);
      stopListener = VideoPlayerPlugin.addListener('stopped', () => {
        isPlayingRef.current = false;
      });
    }

    const progressSaveInterval = setInterval(async () => {
      const currentTimeValue = lastSavedTimeRef.current;
      if (currentTimeValue > 0) {
        await saveProgress(currentTimeValue, false);
      }
    }, 20000);

    return () => {
      clearInterval(progressSaveInterval);
      
      const finalTime = lastSavedTimeRef.current;
      if (finalTime > 0) {
        saveProgress(finalTime, false);
      }

      if (progressListener?.remove) progressListener.remove();
      if (stopListener?.remove) stopListener.remove();
    };
  }, [platform, itemId, startTime, seasonNumber, chapterNumber, onNextEpisode, seasons, currentChapterInfo]);

  // Android VLC playback
  useEffect(() => {
    if (!url || !platform || platform !== 'android-vlc') return;

    const handleAndroidPlayback = async () => {
      if (isUnmountingRef?.current === true) return;
      if (isPlayingRef.current) return;
      
      if (initialAutoplay) {
        try {
          await backgroundPlaybackService.startPlayback({
            title: title || "TeamG Play",
            artist: "Reproduciendo contenido",
            album: "TeamG Play",
            artwork: [{ src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }]
          });

          await VideoPlayerPlugin.playVideo({
            url: url,
            title: title || "Video",
            startTime: startTime || 0,
            chapters: allChapters,
          });

          isPlayingRef.current = true;
          
          try {
            const initialTime = startTime || 0;
            await videoProgressService.saveProgress(itemId, {
              lastTime: initialTime,
              lastSeason: currentChapterInfo?.seasonIndex,
              lastChapter: currentChapterInfo?.chapterIndex,
              completed: false
            });
            lastSavedTimeRef.current = initialTime;
          } catch (err) {
            console.warn('[VideoPlayer] Error guardando progreso inicial:', err);
          }
        } catch (err) {
          console.error("Error iniciando Android player:", err);
          await backgroundPlaybackService.stopPlayback();
        }
      }
    };

    const timer = setTimeout(handleAndroidPlayback, 300);

    return () => {
      clearTimeout(timer);
      if (isPlayingRef.current) {
        try {
          if (VideoPlayerPlugin?.stopVideo) VideoPlayerPlugin.stopVideo();
          backgroundPlaybackService.stopPlayback();
        } catch (err) {
          console.warn('[VideoPlayer] Error cleanup:', err);
        }
        isPlayingRef.current = false;
      }
    };
  }, [platform, url, initialAutoplay, title, startTime, allChapters, itemId, currentChapterInfo]);

  // Android background events
  useEffect(() => {
    if (platform !== 'android-vlc') return;

    const handlers = {
      'backgroundPlayback:play': () => {
        if (VideoPlayerPlugin?.resumeVideo) VideoPlayerPlugin.resumeVideo();
        backgroundPlaybackService.resumePlayback();
      },
      'backgroundPlayback:pause': () => {
        if (VideoPlayerPlugin?.pauseVideo) VideoPlayerPlugin.pauseVideo();
        backgroundPlaybackService.pausePlayback();
      },
      'backgroundPlayback:stop': () => {
        if (VideoPlayerPlugin?.stopVideo) VideoPlayerPlugin.stopVideo();
        backgroundPlaybackService.stopPlayback();
        isPlayingRef.current = false;
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [platform]);

  // Global cleanup
  useEffect(() => {
    return () => {
      try {
        if (window.VideoPlayerPlugin?.stopVideo) window.VideoPlayerPlugin.stopVideo();
        if (backgroundPlaybackService?.stopPlayback) backgroundPlaybackService.stopPlayback();
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
      } catch (err) {
        // Ignorar
      }
      isPlayingRef.current = false;
    };
  }, []);

  // App state listener
  useEffect(() => {
    if (platform !== 'android-vlc') return;

    const forceStop = () => {
      try {
        if (window.VideoPlayerPlugin?.stopVideo) window.VideoPlayerPlugin.stopVideo();
        if (backgroundPlaybackService?.stopPlayback) backgroundPlaybackService.stopPlayback();
        isPlayingRef.current = false;
      } catch (err) {
        // Ignorar
      }
    };

    const appStateListener = CapacitorApp.addListener('appStateChange', (state) => {
      if (!state.isActive) forceStop();
    });

    const pauseListener = CapacitorApp.addListener('pause', forceStop);

    return () => {
      appStateListener.remove();
      pauseListener.remove();
    };
  }, [platform]);

  // Web player
  useEffect(() => {
    let cleanupDone = false;

    if (platform === 'web' && url && videoRef.current) {
      const video = videoRef.current;

      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (isPlayingRef.current) {
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }
      } catch (e) {
        console.warn('[VideoPlayer] Error cleanup:', e);
      }

      const initBackgroundPlayback = async () => {
        try {
          if (!cleanupDone) {
            await backgroundPlaybackService.startPlayback({
              title: title || "TeamG Play",
              artist: "Reproduciendo contenido",
              album: "TeamG Play",
              artwork: [{ src: '/TeamG Play.png', sizes: '512x512', type: 'image/png' }]
            });
          }
        } catch (err) {
          console.warn('[VideoPlayer] Error background playback:', err);
        }
      };
      
      const handleLoadedMetadata = async () => {
        if (startTime > 0) video.currentTime = startTime;

        if (initialAutoplay) {
          try {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              await playPromise;
              isPlayingRef.current = true;
              await initBackgroundPlayback();
            }
          } catch (error) {
            try {
              video.muted = true;
              const mutedPlayPromise = video.play();
              if (mutedPlayPromise !== undefined) {
                await mutedPlayPromise;
                isPlayingRef.current = true;
                await initBackgroundPlayback();
                
                setTimeout(() => {
                  try {
                    video.muted = false;
                    video.play().catch(e => console.warn('[VideoPlayer] Error desmutear:', e));
                  } catch (e) {
                    console.warn('[VideoPlayer] Error:', e);
                  }
                }, 1500);
              }
            } catch (mutedErr) {
              console.error('[VideoPlayer] Muted autoplay fallido:', mutedErr.message);
              setAutoplayFailed(true);
            }
          }
        }
      };

      const handleVideoError = (ev) => {
        try {
          const err = ev.target.error;
          console.error('[VideoPlayer] Error de video:', err?.message);
          setAutoplayFailed(true);
        } catch (e) {
          console.error('[VideoPlayer] Error:', e);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleVideoError);
      
      video.src = url;

      return () => {
        cleanupDone = true;
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleVideoError);
        
        if (isPlayingRef.current) {
          backgroundPlaybackService.stopPlayback();
          isPlayingRef.current = false;
        }

        try { 
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {
          console.warn('[VideoPlayer] Error cleanup:', e);
        }
      };
    }
  }, [platform, url, startTime, initialAutoplay, title]);

  // Render
  if (platform === 'android-vlc') {
    return (
      <div 
        className="w-full aspect-video rounded-lg flex items-center justify-center text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(254 50% 8%) 0%, hsl(315 100% 25% / 0.3) 50%, hsl(190 100% 50% / 0.2) 100%)',
          border: '1px solid hsl(315 100% 25% / 0.5)'
        }}
      >
        <div className="text-center z-10">
          <h3 className="text-lg font-semibold mb-2" style={{
            color: 'hsl(190 100% 50%)',
            textShadow: '0 0 5px hsl(190 100% 50% / 0.8), 0 0 10px hsl(190 100% 50% / 0.6)'
          }}>
            {title}
          </h3>
          <p className="text-sm" style={{
            color: 'hsl(315 100% 60%)',
            textShadow: '0 0 5px hsl(315 100% 60% / 0.8), 0 0 10px hsl(315 100% 60% / 0.6)'
          }}>
            Reproduciendo en VLC
          </p>
        </div>
      </div>
    );
  }

  if (platform === 'web') {
    useProgressReporter(videoRef, itemId, { 
      intervalMs: 20000,
      seasonIndex: currentChapterInfo?.seasonIndex,
      chapterIndex: currentChapterInfo?.chapterIndex
    });

    return (
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          controlsList="nodownload"
          preload="auto"
          playsInline
          autoPlay={false}
          muted={initialAutoplay}
          crossOrigin="anonymous"
          style={{ backgroundColor: '#000' }}
        >
          Tu navegador no soporta el elemento video.
        </video>
      </div>
    );
  }

  if (platform === 'electron') {
    useElectronMpvProgress(itemId, onNextEpisode, seasons, currentChapterInfo, { intervalMs: 20000 });
    return (
      <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center text-white">
        {/* Electron MPV */}
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-red-900 rounded-lg flex items-center justify-center text-white">
      <p>Error: Plataforma no reconocida.</p>
    </div>
  );
}

VideoPlayer.propTypes = {
  url: PropTypes.string.isRequired,
  itemId: PropTypes.string,
  startTime: PropTypes.number,
  initialAutoplay: PropTypes.bool,
  title: PropTypes.string,
  seasons: PropTypes.array,
  currentChapterInfo: PropTypes.object,
  onNextEpisode: PropTypes.func,
  isUnmountingRef: PropTypes.object
};
