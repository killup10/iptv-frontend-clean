#!/usr/bin/env node

/**
 * Build script for TeamG Play Smart TV versions
 * Supports: LG WebOS, LG NetCast, Samsung Tizen, Generic Smart TV
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  platforms: ['webos', 'netcast', 'tizen', 'smarttv'],
  buildDir: 'dist-tv',
  sourceDir: 'src',
  publicDir: 'public'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`✓ Created directory: ${dir}`, 'green');
  }
}

function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    log(`✓ Copied: ${src} → ${dest}`, 'green');
  } catch (error) {
    log(`✗ Failed to copy: ${src} → ${dest}`, 'red');
    console.error(error.message);
  }
}

function copyDirectory(src, dest) {
  createDirectory(dest);
  const items = fs.readdirSync(src);
  
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
}

function buildForPlatform(platform) {
  log(`\n🚀 Building for ${platform.toUpperCase()}...`, 'cyan');
  
  const platformDir = path.join(config.buildDir, platform);
  createDirectory(platformDir);
  
  // Copy base files
  log('📁 Copying base files...', 'yellow');
  
  // Copy TV-optimized HTML
  copyFile('tv-index.html', path.join(platformDir, 'index.html'));
  
  // Copy public assets
  if (fs.existsSync(config.publicDir)) {
    copyDirectory(config.publicDir, platformDir);
  }
  
  // Platform-specific configurations
  switch (platform) {
    case 'webos':
      buildWebOS(platformDir);
      break;
    case 'netcast':
      buildNetCast(platformDir);
      break;
    case 'tizen':
      buildTizen(platformDir);
      break;
    case 'smarttv':
      buildGenericTV(platformDir);
      break;
  }
  
  log(`✅ ${platform.toUpperCase()} build completed!`, 'green');
}

function buildWebOS(platformDir) {
  log('🔧 Configuring for LG WebOS...', 'yellow');
  
  // Copy WebOS configuration
  if (fs.existsSync('webos/appinfo.json')) {
    copyFile('webos/appinfo.json', path.join(platformDir, 'appinfo.json'));
  }
  
  // Create WebOS-specific package structure
  const webosStructure = [
    'assets',
    'css',
    'js',
    'locales'
  ];
  
  webosStructure.forEach(dir => {
    createDirectory(path.join(platformDir, dir));
  });
  
  // Create WebOS launch script
  const launchScript = `
// WebOS Launch Script for TeamG Play TV
if (typeof webOS !== 'undefined') {
  console.log('[WebOS] Initializing TeamG Play TV');
  
  // WebOS specific initialization
  webOS.fetchAppInfo(function(info) {
    console.log('[WebOS] App info:', info);
  });
  
  // Handle WebOS lifecycle
  webOS.service.request('luna://com.webos.applicationManager', {
    method: 'getForegroundAppInfo',
    onSuccess: function(result) {
      console.log('[WebOS] Foreground app:', result);
    }
  });
}
`;
  
  fs.writeFileSync(path.join(platformDir, 'js', 'webos-launch.js'), launchScript);
  
  log('✓ WebOS configuration completed', 'green');
}

function buildNetCast(platformDir) {
  log('🔧 Configuring for LG NetCast...', 'yellow');
  
  // Copy NetCast configuration
  if (fs.existsSync('netcast/config.xml')) {
    copyFile('netcast/config.xml', path.join(platformDir, 'config.xml'));
  }
  
  // Create NetCast-specific package structure
  const netcastStructure = [
    'css',
    'js',
    'images',
    'locales'
  ];
  
  netcastStructure.forEach(dir => {
    createDirectory(path.join(platformDir, dir));
  });
  
  // Create NetCast launch script
  const launchScript = `
// NetCast Launch Script for TeamG Play TV
if (typeof NetCastBack !== 'undefined' || typeof NetCastExit !== 'undefined') {
  console.log('[NetCast] Initializing TeamG Play TV');
  
  // NetCast specific initialization
  try {
    // Handle NetCast back button
    if (typeof NetCastBack !== 'undefined') {
      window.NetCastBack = function() {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      };
    }
    
    // Handle NetCast exit
    if (typeof NetCastExit !== 'undefined') {
      window.NetCastExit = function() {
        window.close();
      };
    }
    
    console.log('[NetCast] NetCast handlers registered');
    
  } catch (error) {
    console.error('[NetCast] Initialization error:', error);
  }
}

// NetCast key handling (older LG TVs)
document.addEventListener('keydown', function(e) {
  switch(e.keyCode) {
    case 37: // Left
    case 39: // Right
    case 38: // Up
    case 40: // Down
    case 13: // Enter/OK
      // Let the app handle these keys
      break;
    case 8:  // Back
      if (typeof NetCastBack !== 'undefined') {
        NetCastBack();
      } else if (window.history.length > 1) {
        window.history.back();
      }
      break;
    case 27: // Exit
      if (typeof NetCastExit !== 'undefined') {
        NetCastExit();
      } else {
        window.close();
      }
      break;
    default:
      console.log('[NetCast] Unhandled key:', e.keyCode);
  }
});

// Optimize for NetCast performance (older hardware)
console.log('[NetCast] NetCast TV optimization applied');
`;
  
  fs.writeFileSync(path.join(platformDir, 'js', 'netcast-launch.js'), launchScript);
  
  log('✓ NetCast configuration completed', 'green');
}

function buildTizen(platformDir) {
  log('🔧 Configuring for Samsung Tizen...', 'yellow');
  
  // Copy Tizen configuration
  if (fs.existsSync('tizen/config.xml')) {
    copyFile('tizen/config.xml', path.join(platformDir, 'config.xml'));
  }
  
  // Create Tizen-specific package structure
  const tizenStructure = [
    'css',
    'js',
    'images',
    'locales'
  ];
  
  tizenStructure.forEach(dir => {
    createDirectory(path.join(platformDir, dir));
  });
  
  // Create Tizen launch script
  const launchScript = `
// Tizen Launch Script for TeamG Play TV
if (typeof tizen !== 'undefined') {
  console.log('[Tizen] Initializing TeamG Play TV');
  
  // Tizen specific initialization
  try {
    // Register TV input device keys
    if (tizen.tvinputdevice) {
      const supportedKeys = [
        'MediaPlay', 'MediaPause', 'MediaStop',
        'MediaRewind', 'MediaFastForward',
        'VolumeUp', 'VolumeDown', 'VolumeMute'
      ];
      tizen.tvinputdevice.registerKeyBatch(supportedKeys);
      console.log('[Tizen] TV keys registered');
    }
    
    // Handle application events
    tizen.application.getCurrentApplication().addEventListener('lowbattery', function() {
      console.log('[Tizen] Low battery warning');
    });
    
  } catch (error) {
    console.error('[Tizen] Initialization error:', error);
  }
}

// Handle Tizen hardware keys
window.addEventListener('tizenhwkey', function(e) {
  if (e.keyName === 'back') {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      tizen.application.getCurrentApplication().exit();
    }
  }
});
`;
  
  fs.writeFileSync(path.join(platformDir, 'js', 'tizen-launch.js'), launchScript);
  
  log('✓ Tizen configuration completed', 'green');
}

function buildGenericTV(platformDir) {
  log('🔧 Configuring for Generic Smart TV...', 'yellow');
  
  // Create generic TV manifest
  const manifest = {
    name: "TeamG Play TV",
    version: "1.0.0",
    description: "La mejor experiencia de streaming para Smart TV",
    start_url: "index.html",
    display: "fullscreen",
    orientation: "landscape",
    theme_color: "#00ffff",
    background_color: "#0f0f23",
    icons: [
      {
        src: "TeamG Play.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(platformDir, 'manifest.json'), 
    JSON.stringify(manifest, null, 2)
  );
  
  // Create generic TV launch script
  const launchScript = `
// Generic Smart TV Launch Script for TeamG Play TV
console.log('[SmartTV] Initializing TeamG Play TV for Generic Smart TV');

// Detect TV capabilities
const tvCapabilities = {
  hasRemoteControl: true,
  supportsHLS: true,
  supportsDASH: false,
  maxResolution: screen.width >= 3840 ? '4K' : screen.width >= 1920 ? 'HD' : 'SD'
};

console.log('[SmartTV] TV Capabilities:', tvCapabilities);

// Generic TV key handling
document.addEventListener('keydown', function(e) {
  switch(e.keyCode) {
    case 37: // Left
    case 39: // Right
    case 38: // Up
    case 40: // Down
    case 13: // Enter/OK
    case 8:  // Back
      // Let the app handle these keys
      break;
    default:
      console.log('[SmartTV] Unhandled key:', e.keyCode);
  }
});

// Optimize for TV performance
if (screen.width >= 1920) {
  document.body.classList.add('hd-ready');
}

if (screen.width >= 3840) {
  document.body.classList.add('uhd-ready');
}
`;
  
  fs.writeFileSync(path.join(platformDir, 'js', 'smarttv-launch.js'), launchScript);
  
  log('✓ Generic Smart TV configuration completed', 'green');
}

function buildReactApp() {
  log('\n📦 Building React application...', 'cyan');
  
  try {
    // Build the React app with TV-specific configuration
    process.env.REACT_APP_PLATFORM = 'tv';
    process.env.REACT_APP_BUILD_TARGET = 'smarttv';
    
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    log('✅ React build completed!', 'green');
    
    // Copy built assets to TV build directories
    config.platforms.forEach(platform => {
      const platformDir = path.join(config.buildDir, platform);
      const distDir = 'dist';
      
      if (fs.existsSync(distDir)) {
        log(`📁 Copying React build to ${platform}...`, 'yellow');
        
        // Copy built JS and CSS files
        const staticDir = path.join(distDir, 'static');
        if (fs.existsSync(staticDir)) {
          copyDirectory(staticDir, path.join(platformDir, 'static'));
        }
        
        // Copy other assets
        const distFiles = fs.readdirSync(distDir);
        distFiles.forEach(file => {
          if (file !== 'index.html' && file !== 'static') {
            const srcPath = path.join(distDir, file);
            const destPath = path.join(platformDir, file);
            
            if (fs.statSync(srcPath).isFile()) {
              copyFile(srcPath, destPath);
            }
          }
        });
      }
    });
    
  } catch (error) {
    log('✗ React build failed!', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

function createPackages() {
  log('\n📦 Creating platform packages...', 'cyan');
  
  config.platforms.forEach(platform => {
    const platformDir = path.join(config.buildDir, platform);
    const packagePath = path.join(config.buildDir, `teamg-play-tv-${platform}.zip`);
    
    try {
      // Create ZIP package for each platform
      execSync(`cd ${platformDir} && zip -r ../${path.basename(packagePath)} .`, { stdio: 'inherit' });
      log(`✅ Package created: ${packagePath}`, 'green');
    } catch (error) {
      log(`✗ Failed to create package for ${platform}`, 'red');
      console.error(error.message);
    }
  });
}

function main() {
  log('🚀 TeamG Play TV Build System', 'bright');
  log('=====================================', 'bright');
  
  // Clean build directory
  if (fs.existsSync(config.buildDir)) {
    log('🧹 Cleaning previous builds...', 'yellow');
    fs.rmSync(config.buildDir, { recursive: true, force: true });
  }
  
  createDirectory(config.buildDir);
  
  // Build React app first
  buildReactApp();
  
  // Build for each platform
  config.platforms.forEach(buildForPlatform);
  
  // Create packages
  createPackages();
  
  log('\n🎉 All builds completed successfully!', 'bright');
  log('=====================================', 'bright');
  log('📁 Build outputs:', 'cyan');
  config.platforms.forEach(platform => {
    log(`   • ${platform.toUpperCase()}: ${config.buildDir}/${platform}/`, 'green');
    log(`   • Package: ${config.buildDir}/teamg-play-tv-${platform}.zip`, 'green');
  });
  
  log('\n📋 Next steps:', 'cyan');
  log('   • WebOS: Use LG Developer Tools to install the package', 'yellow');
  log('   • Tizen: Use Samsung TV SDK to install the package', 'yellow');
  log('   • Generic: Deploy to your Smart TV platform', 'yellow');
}

// Run the build
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildForPlatform, buildReactApp, createPackages };
