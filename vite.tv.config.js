import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // TV-specific build configuration
  build: {
    outDir: 'dist-tv-dev',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps for TV to reduce bundle size
    minify: 'terser', // Use terser for better compression
    target: 'es2015', // Target older browsers for TV compatibility
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'tv-index.html')
      },
      output: {
        // Optimize chunk splitting for TV
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          tv: ['./src/components/TVNavigation.jsx', './src/components/TVCard.jsx', './src/components/TVVideoPlayer.jsx'],
          utils: ['./src/utils/platformDetector.js']
        },
        // Use consistent naming for TV platforms
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Optimize for TV performance
    chunkSizeWarningLimit: 1000, // Increase limit for TV bundles
    cssCodeSplit: true,
    reportCompressedSize: false // Skip compression reporting for faster builds
  },
  
  // Development server configuration for TV testing
  server: {
    port: 5174, // Different port for TV development
    host: '0.0.0.0', // Allow access from TV devices on network
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    }
  },
  
  // Preview server for TV testing
  preview: {
    port: 4174,
    host: '0.0.0.0',
    cors: true
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tv': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@pages': path.resolve(__dirname, './src/pages')
    }
  },
  
  // CSS configuration for TV
  css: {
    postcss: './postcss.config.js',
    preprocessorOptions: {
      scss: {
        additionalData: `
          // TV-specific SCSS variables
          $tv-primary: #00ffff;
          $tv-secondary: #ff00ff;
          $tv-background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          $tv-safe-area: 5%;
          $tv-focus-color: #00ffff;
          $tv-focus-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        `
      }
    }
  },
  
  // Environment variables for TV build
  define: {
    __TV_BUILD__: true,
    __PLATFORM__: JSON.stringify('smarttv'),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  
  // Optimization for TV browsers
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios'
    ],
    exclude: [
      // Exclude heavy dependencies that might not work well on TV
      'electron'
    ]
  },
  
  // Base URL configuration
  base: './', // Use relative paths for TV deployment
  
  // Asset handling for TV
  assetsInclude: [
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.svg',
    '**/*.webp',
    '**/*.mp4',
    '**/*.webm',
    '**/*.m3u8'
  ],
  
  // Worker configuration (disable for TV compatibility)
  worker: {
    format: 'es'
  },
  
  // Experimental features
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      // Ensure proper URL handling for TV platforms
      if (hostType === 'js') {
        return { js: `./assets/js/${filename}` }
      } else if (hostType === 'css') {
        return { css: `./assets/css/${filename}` }
      } else {
        return { relative: true }
      }
    }
  }
})
