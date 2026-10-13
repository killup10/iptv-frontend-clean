import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

const player = registerPlugin('HomeLivePlayer');
export const supportsHomeLivePlayer = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('HomeLivePlayer');
export const channelUrl = item => item?.url || item?.streamUrl || item?.stream_url || item?.playbackUrl || item?.videoUrl || '';

export default function useHomeLivePlayer(channel, enabled) {
  const [state, setState] = useState('loading');
  const latestUrl = useRef('');
  const pendingTune = useRef(null);
  const alive = useRef(false);
  const fullscreenRequest = useRef(0);
  const enterFullscreen = useCallback(async item => {
    const url = channelUrl(item);
    if (!enabled || !url) return;
    clearTimeout(pendingTune.current);
    if (latestUrl.current !== url) setState('loading');
    latestUrl.current = url;
    const request = ++fullscreenRequest.current;
    try {
      await player.tune({ url });
      if (!alive.current || request !== fullscreenRequest.current) return;
      await player.setFullscreen({ fullscreen: true });
    } catch { if (alive.current) setState('error'); }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    alive.current = true;
    let disposed = false;
    let listener;
    document.documentElement.classList.add('tv-live-home');
    player.addListener('state', event => {
      if (!disposed && event.url === latestUrl.current) setState(event.state);
    }).then(handle => { if (disposed) handle.remove(); else listener = handle; });
    return () => {
      disposed = true;
      alive.current = false;
      fullscreenRequest.current += 1;
      clearTimeout(pendingTune.current);
      listener?.remove();
      document.documentElement.classList.remove('tv-live-home');
      player.stop().catch(() => {});
    };
  }, [enabled]);

  const url = channelUrl(channel);
  useEffect(() => {
    if (!enabled || !url) return undefined;
    // Fast repeats update focus immediately; only the final pending tune runs.
    const timer = setTimeout(() => {
      latestUrl.current = url;
      setState('loading');
      player.tune({ url }).catch(() => {
        if (latestUrl.current === url) setState('error');
      });
    }, 120);
    pendingTune.current = timer;
    return () => clearTimeout(timer);
  }, [enabled, url]);
  return { state, enterFullscreen };
}
