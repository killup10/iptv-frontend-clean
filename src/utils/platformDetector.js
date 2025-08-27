// Platform detection utility for Smart TVs
export const PlatformDetector = {
  // Detect if running on LG WebOS
  isWebOS() {
    return typeof window !== 'undefined' && (
      window.webOS !== undefined ||
      navigator.userAgent.includes('webOS') ||
      navigator.userAgent.includes('LG Browser')
    );
  },

  // Detect if running on LG NetCast (older LG TVs)
  isNetCast() {
    return typeof window !== 'undefined' && (
      window.NetCastBack !== undefined ||
      window.NetCastExit !== undefined ||
      navigator.userAgent.includes('NetCast') ||
      (navigator.userAgent.includes('LG') && navigator.userAgent.includes('CE-HTML'))
    );
  },

  // Detect if running on Samsung Tizen
  isTizen() {
    return typeof window !== 'undefined' && (
      window.tizen !== undefined ||
      navigator.userAgent.includes('Tizen') ||
      navigator.userAgent.includes('Samsung')
    );
  },

  // Detect if running on any Smart TV
  isSmartTV() {
    return this.isWebOS() || this.isNetCast() || this.isTizen() || this.isGenericTV();
  },

  // Detect generic Smart TV (fallback)
  isGenericTV() {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const tvIndicators = [
      'smart-tv', 'smarttv', 'googletv', 'appletv', 
      'hbbtv', 'ce-html', 'netcast', 'maple',
      'roku', 'viera', 'bravia', 'philips'
    ];
    
    return tvIndicators.some(indicator => userAgent.includes(indicator)) ||
           (screen.width >= 1920 && screen.height >= 1080 && !this.isMobile());
  },

  // Detect mobile devices
  isMobile() {
    if (typeof window === 'undefined') return false;
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.orientation !== undefined);
  },

  // Detect desktop
  isDesktop() {
    return !this.isSmartTV() && !this.isMobile();
  },

  // Get platform name
  getPlatform() {
    if (this.isWebOS()) return 'webos';
    if (this.isNetCast()) return 'netcast';
    if (this.isTizen()) return 'tizen';
    if (this.isSmartTV()) return 'smarttv';
    if (this.isMobile()) return 'mobile';
    return 'desktop';
  },

  // Check if platform supports specific features
  supportsFeature(feature) {
    const platform = this.getPlatform();
    
    const featureSupport = {
      webos: {
        remoteControl: true,
        voiceControl: true,
        magicRemote: true,
        spatialNavigation: true,
        nativeVideoPlayer: true,
        hls: true,
        dash: true
      },
      netcast: {
        remoteControl: true,
        voiceControl: false,
        magicRemote: false,
        spatialNavigation: true,
        nativeVideoPlayer: true,
        hls: false,
        dash: false,
        mp4: true
      },
      tizen: {
        remoteControl: true,
        voiceControl: true,
        spatialNavigation: true,
        nativeVideoPlayer: true,
        hls: true,
        dash: true
      },
      smarttv: {
        remoteControl: true,
        spatialNavigation: true,
        nativeVideoPlayer: false,
        hls: true,
        dash: false
      },
      mobile: {
        touchControl: true,
        nativeVideoPlayer: false,
        hls: true,
        dash: false
      },
      desktop: {
        keyboardControl: true,
        mouseControl: true,
        nativeVideoPlayer: false,
        hls: true,
        dash: true
      }
    };

    return featureSupport[platform]?.[feature] || false;
  },

  // Initialize platform-specific features
  initializePlatform() {
    const platform = this.getPlatform();
    
    // Add platform class to body
    if (typeof document !== 'undefined') {
      document.body.classList.add(`platform-${platform}`);
      
      // Add TV-specific styles
      if (this.isSmartTV()) {
        document.body.classList.add('tv-interface');
        
        // Disable text selection on TV
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // Set TV-optimized cursor
        document.body.style.cursor = 'none';
      }
    }

    // Initialize platform-specific APIs
    if (this.isWebOS()) {
      this.initializeWebOS();
    } else if (this.isTizen()) {
      this.initializeTizen();
    }

    return platform;
  },

  // Initialize WebOS specific features
  initializeWebOS() {
    if (typeof window !== 'undefined' && window.webOS) {
      // Initialize WebOS services
      try {
        // Enable spatial navigation
        if (window.webOS.service) {
          window.webOS.service.request('luna://com.webos.service.tv.systemproperty', {
            method: 'getSystemProperty',
            parameters: { key: 'webos.version' },
            onSuccess: (result) => {
              console.log('WebOS version:', result.value);
            }
          });
        }
      } catch (error) {
        console.warn('WebOS initialization error:', error);
      }
    }
  },

  // Initialize Tizen specific features
  initializeTizen() {
    if (typeof window !== 'undefined' && window.tizen) {
      try {
        // Register key events for Tizen
        if (window.tizen.tvinputdevice) {
          const supportedKeys = [
            'MediaPlay', 'MediaPause', 'MediaStop',
            'MediaRewind', 'MediaFastForward',
            'VolumeUp', 'VolumeDown', 'VolumeMute'
          ];
          
          window.tizen.tvinputdevice.registerKeyBatch(supportedKeys);
        }
      } catch (error) {
        console.warn('Tizen initialization error:', error);
      }
    }
  },

  // Get optimal video player configuration
  getVideoPlayerConfig() {
    const platform = this.getPlatform();
    
    const configs = {
      webos: {
        preferNative: true,
        supportedFormats: ['hls', 'dash', 'mp4'],
        controls: 'custom',
        autoplay: true
      },
      netcast: {
        preferNative: true,
        supportedFormats: ['mp4'],
        controls: 'custom',
        autoplay: true
      },
      tizen: {
        preferNative: true,
        supportedFormats: ['hls', 'mp4'],
        controls: 'custom',
        autoplay: true
      },
      smarttv: {
        preferNative: false,
        supportedFormats: ['hls', 'mp4'],
        controls: 'custom',
        autoplay: true
      },
      mobile: {
        preferNative: false,
        supportedFormats: ['hls', 'mp4'],
        controls: 'native',
        autoplay: false
      },
      desktop: {
        preferNative: false,
        supportedFormats: ['hls', 'dash', 'mp4'],
        controls: 'custom',
        autoplay: false
      }
    };

    return configs[platform] || configs.desktop;
  }
};

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PlatformDetector.initializePlatform();
    });
  } else {
    PlatformDetector.initializePlatform();
  }
}

export default PlatformDetector;
