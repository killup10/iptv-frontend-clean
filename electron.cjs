// electron.cjs
const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const isDev = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173';

// Permitir autoplay de audio multimedia y streaming sin interacción previa
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function getMainDebugLogPath() {
  try {
    if (app && typeof app.getPath === 'function') {
      return path.join(app.getPath('userData'), 'electron-main-debug.log');
    }
  } catch {}
  return path.join(__dirname, 'electron-main-debug.log');
}

function logMainDebug(...parts) {
  const message = parts
    .map((part) => {
      if (part instanceof Error) {
        return `${part.stack || part.message}`;
      }
      if (typeof part === 'object') {
        try {
          return JSON.stringify(part);
        } catch {
          return String(part);
        }
      }
      return String(part);
    })
    .join(' ');

  try {
    fs.appendFileSync(getMainDebugLogPath(), `[${new Date().toISOString()}] ${message}\n`);
  } catch {}
}

console.log('[Electron Main] Booting', {
  isDev,
  rendererUrl: DEV_SERVER_URL,
  pid: process.pid,
});
logMainDebug('Booting', { isDev, rendererUrl: DEV_SERVER_URL, pid: process.pid });

process.on('uncaughtException', (error) => {
  console.error('[Electron Main] Uncaught exception:', error);
  logMainDebug('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron Main] Unhandled rejection:', reason);
  logMainDebug('Unhandled rejection', reason);
});

let mainWindow = null;
let mpvProcess = null;
let isPipMode = false;  // Flag para controlar si está en modo PIP
let mpvSocket = null;  // Socket para comunicación IPC con MPV
let mpvSocketConnected = false;
let mpvCurrentVideoId = null;  // Rastrear ID del video actual para auto-play
const MPV_OBSERVE_TIME_POS_ID = 1;
const MPV_OBSERVE_DURATION_ID = 2;
let mpvEndEventSent = false;
let isAppQuitting = false;

function emitMpvEnded(payload = {}) {
  if (mpvEndEventSent) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mpvEndEventSent = true;
  console.log('[MPV Socket] 🎬 ENVIANDO mpv-ended event', payload);
  mainWindow.webContents.send('mpv-ended', {
    videoId: mpvCurrentVideoId || 'unknown',
    duration: mpvVideoDuration || 0,
    finalTime: mpvLastTimePos || 0,
    ...payload
  });
}

// Helper para terminar el proceso de MPV
async function forceKillVLC() {
  // Cerrar socket de MPV si existe
  if (mpvSocket) {
    try {
      mpvSocket.destroy();
      mpvSocket = null;
      mpvSocketConnected = false;
    } catch (err) {
      console.error('[MPV Socket] Error cerrando socket:', err);
    }
  }
  if (mpvEndDetectionTimer) {
    clearTimeout(mpvEndDetectionTimer);
    mpvEndDetectionTimer = null;
  }
  mpvEndEventSent = false;

  return new Promise(resolve => {
    if (!mpvProcess) {
      console.log('[MPV] No hay proceso MPV para detener');
      return resolve();
    }
    
    console.log('[MPV] Iniciando proceso de cierre...');
    const cleanup = () => {
      mpvProcess = null;
      console.log('[MPV] Proceso MPV limpiado correctamente');
      resolve();
    };
    
    const forceTimeout = setTimeout(() => {
      console.log('[MPV] Timeout alcanzado, forzando limpieza');
      cleanup();
    }, 2000);
    
    mpvProcess.once('exit', (code) => {
      console.log(`[MPV] Proceso terminado con código: ${code}`);
      clearTimeout(forceTimeout);
      cleanup();
    });
    
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', mpvProcess.pid.toString(), '/f', '/t']);
      } else {
        mpvProcess.kill('SIGKILL');
      }
    } catch (err) {
      console.error('[MPV] Error al forzar cierre:', err);
      clearTimeout(forceTimeout);
      cleanup();
    }
  });
}

// Variables para rastrear fin de video
let mpvLastTimePos = 0;
let mpvVideoDuration = 0;
let mpvEndDetectionTimer = null;

// Función para conectar al socket IPC de MPV y escuchar cambios de time-pos y eventos de fin de video
function setupMPVSocketListener(pipePath = '\\\\.\\pipe\\mpv-socket') {
  console.log('[MPV Socket] Iniciando conexión a socket:', pipePath);
  
  return new Promise((resolve, reject) => {
    try {
      mpvSocket = net.createConnection(pipePath);
      
      let buffer = '';
      
      mpvSocket.on('connect', () => {
        mpvSocketConnected = true;
        console.log('[MPV Socket] ✓ Conectado al servidor IPC de MPV');
        
        // Observar time-pos para detectar progreso
        const observeTimeCommand = {
          command: ['observe_property', MPV_OBSERVE_TIME_POS_ID, 'time-pos']
        };
        mpvSocket.write(JSON.stringify(observeTimeCommand) + '\n');
        
        // Observar duration para saber cuándo está cerca del final
        const observeDurationCommand = {
          command: ['observe_property', MPV_OBSERVE_DURATION_ID, 'duration']
        };
        mpvSocket.write(JSON.stringify(observeDurationCommand) + '\n');
        
        console.log('[MPV Socket] Observando properties: time-pos, duration');
        resolve();
      });
      
      mpvSocket.on('data', (data) => {
        buffer += data.toString();
        
        // Procesar líneas completadas (terminadas en \n)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Guardar línea incompleta
        
        lines.forEach(line => {
          if (!line.trim()) return;
          
          try {
            const event = JSON.parse(line);
            
            // Detectar cambios de propiedades
            if (event.event === 'property-change') {
              const { id, name, data: eventData } = event;
              const isTimePosEvent = name === 'time-pos' || id === MPV_OBSERVE_TIME_POS_ID;
              const isDurationEvent = name === 'duration' || id === MPV_OBSERVE_DURATION_ID;
              
              if (isTimePosEvent && eventData !== null && eventData !== undefined) {
                const timePos = parseFloat(eventData) || 0;
                mpvLastTimePos = timePos;
                
                // Enviar al frontend cada cambio de time-pos
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('mpv-time-pos', timePos);
                }
                
                // Detectar fin de video una sola vez por reproducción.
                if (mpvVideoDuration > 0 && timePos >= mpvVideoDuration - 1.5 && !mpvEndEventSent) {
                  console.log('[MPV Socket] ✓ VIDEO CASI TERMINADO - time-pos:', timePos, 'duration:', mpvVideoDuration);
                  
                  // Enviar evento de fin con un pequeño delay para asegurar que se alcanzó el final
                  if (mpvEndDetectionTimer) clearTimeout(mpvEndDetectionTimer);
                  mpvEndDetectionTimer = setTimeout(() => {
                    emitMpvEnded({
                      duration: mpvVideoDuration,
                      finalTime: timePos,
                      source: 'duration-threshold'
                    });
                    mpvEndDetectionTimer = null;
                  }, 500);
                }
              }
              
              if (isDurationEvent && eventData !== null && eventData !== undefined) {
                mpvVideoDuration = parseFloat(eventData) || 0;
                console.debug('[MPV Socket] Duración del video:', mpvVideoDuration);
              }
            }

            // Fallback robusto: MPV notifica fin real del archivo aunque duration/time-pos no sean confiables.
            if (event.event === 'end-file') {
              const reason = String(event.reason || '').toLowerCase();
              if (reason === 'eof') {
                emitMpvEnded({
                  reason,
                  source: 'end-file'
                });
              } else {
                console.log('[MPV Socket] end-file recibido sin EOF, no se auto-avanza:', reason || 'sin reason');
              }
            }
          } catch (err) {
            // Ignorar líneas que no sean JSON válido
            if (line.trim() && !line.includes('Received')) {
              console.debug('[MPV Socket] Línea recibida (no JSON):', line.substring(0, 100));
            }
          }
        });
      });
      
      mpvSocket.on('error', (err) => {
        console.warn('[MPV Socket] Error de conexión:', err.message);
        mpvSocketConnected = false;
        try { mpvSocket.destroy(); } catch {}
        reject(err);
      });
      
      mpvSocket.on('close', () => {
        console.log('[MPV Socket] Conexión cerrada');
        mpvSocketConnected = false;
      });
      
      // Timeout de 2 segundos para conexión inicial
      setTimeout(() => {
        if (!mpvSocketConnected) {
          console.warn('[MPV Socket] Timeout en conexión, continuando sin socket');
          try { mpvSocket?.destroy(); } catch {}
          reject(new Error('Timeout conectando al socket'));
        }
      }, 2000);
      
    } catch (err) {
      console.error('[MPV Socket] Error general:', err);
      mpvSocketConnected = false;
      reject(err);
    }
  });
}

function createMainWindow() {
  console.log('[Electron Main] Creating main window...');
  logMainDebug('Creating main window');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true, 
      nodeIntegration: false, 
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
    show: false
  });

  // Quitar el menú por defecto (File, Edit, View, etc)
  mainWindow.removeMenu();

  // Permitir reproducción de audio/video de YouTube sin bloqueo de Origin ni X-Frame-Options
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*'] },
    (details, callback) => {
      details.requestHeaders['Origin'] = 'https://www.youtube.com';
      details.requestHeaders['Referer'] = 'https://www.youtube.com/';
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*'] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers['x-frame-options'];
      delete headers['X-Frame-Options'];
      delete headers['content-security-policy'];
      delete headers['Content-Security-Policy'];
      callback({ cancel: false, responseHeaders: headers });
    }
  );

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron Main] Renderer loaded successfully.');
    logMainDebug('Renderer loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron Main] Renderer failed to load:', {
      errorCode,
      errorDescription,
      validatedURL,
    });
    logMainDebug('Renderer failed to load', { errorCode, errorDescription, validatedURL });
  });

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL).catch((error) => {
      console.error('[Electron Main] Failed to load development URL:', error);
      logMainDebug('Failed to load development URL', error);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html')).catch((error) => {
      console.error('[Electron Main] Failed to load production index.html:', error);
      logMainDebug('Failed to load production index.html', error);
    });
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Electron Main] Window ready to show.');
    logMainDebug('Window ready to show');
    mainWindow.show();
  });

  mainWindow.on('close', () => {
    if (!mpvProcess && !mpvSocket) {
      return;
    }

    forceKillVLC().catch((err) => {
      console.error('[Window] Error al detener MPV en cierre:', err);
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildRequestUrl(url, params = {}) {
  const finalUrl = new URL(url);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => finalUrl.searchParams.append(key, String(item)));
      return;
    }

    finalUrl.searchParams.set(key, String(value));
  });

  return finalUrl.toString();
}

function shouldSendRequestBody(method) {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  return normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD';
}

function normalizeResponseBody(rawText, contentType, responseType) {
  if (!rawText) {
    return null;
  }

  const expectsText = responseType === 'text';
  const isJsonResponse = String(contentType || '').toLowerCase().includes('application/json');

  if (!expectsText && isJsonResponse) {
    try {
      return JSON.parse(rawText);
    } catch (error) {
      logMainDebug('Failed to parse JSON response body', error);
    }
  }

  return rawText;
}

ipcMain.handle('teamg-http-request', async (_event, requestConfig = {}) => {
  const method = String(requestConfig.method || 'GET').toUpperCase();
  const timeoutMs = Number(requestConfig.timeout || 30000);
  const url = buildRequestUrl(requestConfig.url, requestConfig.params);
  const headers = { ...(requestConfig.headers || {}) };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };

    if (shouldSendRequestBody(method) && requestConfig.data !== undefined) {
      const isJsonBody =
        typeof requestConfig.data === 'object' &&
        requestConfig.data !== null &&
        !Buffer.isBuffer(requestConfig.data) &&
        !(requestConfig.data instanceof ArrayBuffer);

      if (isJsonBody) {
        if (!fetchOptions.headers['Content-Type'] && !fetchOptions.headers['content-type']) {
          fetchOptions.headers['Content-Type'] = 'application/json';
        }
        fetchOptions.body = JSON.stringify(requestConfig.data);
      } else {
        fetchOptions.body = requestConfig.data;
      }
    }

    logMainDebug('Electron HTTP request', { method, url });
    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const responseData = normalizeResponseBody(
      responseText,
      response.headers.get('content-type'),
      requestConfig.responseType,
    );

    return {
      status: response.status,
      data: responseData,
      headers: responseHeaders,
    };
  } catch (error) {
    const errorCode = error?.name === 'AbortError' ? 'ECONNABORTED' : (error?.code || 'ERR_NETWORK');
    logMainDebug('Electron HTTP request failed', { method, url, error: error?.message || String(error) });
    return {
      __teamgHttpError: true,
      message: error?.message || 'Electron HTTP request failed',
      code: errorCode,
      response: error?.response,
    };
  } finally {
    clearTimeout(timeoutId);
  }
});

const ytMusicCache = new Map();
const YT_MUSIC_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PIPED_FALLBACKS = [
  'https://pipedapi.adminforge.de',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.leptons.xyz',
];
const INVIDIOUS_FALLBACKS = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://yt.artemislena.eu',
  'https://iv.melmac.space',
];

// Extrae videoIds en orden de relevancia parseando los bloques videoRenderer
// de ytInitialData (salta Shorts, directos y próximos estrenos).
function extractYouTubeIdsFromHtml(html, maxCandidates = 6) {
  const found = [];
  const push = (id) => {
    if (/^[a-zA-Z0-9_-]{11}$/.test(id) && !found.includes(id)) found.push(id);
  };
  const vrRegex = /"videoRenderer":\s*\{"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let m;
  while ((m = vrRegex.exec(html)) !== null && found.length < maxCandidates) {
    const window = html.slice(m.index, m.index + 2500);
    if (window.includes('/shorts/') || window.includes('"style":"SHORTS"')) continue;
    if (window.includes('"style":"UPCOMING"') || window.includes('upcomingEventData')) continue;
    push(m[1]);
  }
  if (found.length === 0) {
    const generic = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
    while ((m = generic.exec(html)) !== null && found.length < maxCandidates) push(m[1]);
  }
  return found;
}

async function resolveYouTubeViaPiped(query) {
  for (const inst of PIPED_FALLBACKS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(inst + '/search?q=' + encodeURIComponent(query + ' audio') + '&filter=videos', {
        headers: { Accept: 'application/json', 'User-Agent': 'TeamGPlay/1.0' },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.items || [];
      const video = items.find((v) => v.url && v.url.includes('/watch?v='));
      const idMatch = video ? String(video.url).match(/v=([a-zA-Z0-9_-]{11})/) : null;
      if (idMatch) return idMatch[1];
    } catch {}
  }
  return null;
}

async function resolveYouTubeViaInvidious(query) {
  for (const inst of INVIDIOUS_FALLBACKS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(inst + '/api/v1/search?q=' + encodeURIComponent(query + ' audio') + '&type=video', {
        headers: { Accept: 'application/json', 'User-Agent': 'TeamGPlay/1.0' },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data[0] && data[0].videoId) return data[0].videoId;
    } catch {}
  }
  return null;
}

ipcMain.handle('music-get-youtube-id', async (_event, query) => {
  if (!query) return null;
  const cleanQuery = String(query).trim();
  const cached = ytMusicCache.get(cleanQuery);
  if (cached && (Date.now() - cached.ts) < YT_MUSIC_CACHE_TTL_MS) {
    return cached.id;
  }
  if (ytMusicCache.size > 2000) {
    const oldest = ytMusicCache.keys().next().value;
    ytMusicCache.delete(oldest);
  }
  // 1) HTML de YouTube con parseo de relevancia (sp=EgIQAQ== => solo videos)
  try {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(cleanQuery + ' audio') + '&sp=EgIQAQ%253D%253D';
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const html = await res.text();
      // consent/bot-wall: sin resultados reales -> pasar a fallbacks
      if (!html.includes('consent.youtube.com') && html.length > 50000) {
        const ids = extractYouTubeIdsFromHtml(html);
        if (ids.length > 0) {
          ytMusicCache.set(cleanQuery, { id: ids[0], ts: Date.now() });
          return ids[0];
        }
      }
    }
  } catch (err) {
    console.warn('[Electron Main] Error searching YouTube HTML:', err && err.message);
  }
  // 2) Piped / 3) Invidious como respaldo (sin CORS desde main)
  const fallbackId = (await resolveYouTubeViaPiped(cleanQuery)) || (await resolveYouTubeViaInvidious(cleanQuery));
  if (fallbackId) {
    ytMusicCache.set(cleanQuery, { id: fallbackId, ts: Date.now() });
    return fallbackId;
  }
  return null;
});

app.on('before-quit', (event) => {
  if (isAppQuitting) {
    return;
  }

  isAppQuitting = true;

  if (!mpvProcess && !mpvSocket && !mpvEndDetectionTimer) {
    return;
  }

  event.preventDefault();
  forceKillVLC()
    .catch((err) => {
      console.error('[App] Error cerrando MPV antes de salir:', err);
    })
    .finally(() => {
      app.quit();
    });
});

app.on('ready', () => {
  console.log('[Electron Main] App ready event received.');
  logMainDebug('App ready event received');
});

app.whenReady().then(createMainWindow).catch((error) => {
  console.error('[Electron Main] app.whenReady failed:', error);
  logMainDebug('app.whenReady failed', error);
  app.exit(1);
});

app.on('window-all-closed', () => {
  console.log('[Electron Main] window-all-closed');
  logMainDebug('window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('[Electron Main] activate');
  logMainDebug('activate');
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// -----------------------------------------------------------
// IPC: reproducir video con MPV
// -----------------------------------------------------------
ipcMain.handle('mpv-embed-play', async (_, { url, bounds, startTime, title = 'TeamG Play', videoId = null }) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'MainWindow no existe' };
    }

    // Guardar ID del video actual para cuando termine
    mpvCurrentVideoId = videoId;
    mpvLastTimePos = 0;
    mpvVideoDuration = 0;
    mpvEndEventSent = false;
    if (mpvEndDetectionTimer) {
      clearTimeout(mpvEndDetectionTimer);
      mpvEndDetectionTimer = null;
    }
    console.log('[MPV] VideoId guardado para auto-play:', mpvCurrentVideoId);

    // Si ya había un MPV corriendo, lo detenemos
    if (mpvProcess) {
      try {
        await forceKillVLC();
        console.log('[MPV] Proceso anterior detenido');
      } catch (err) {
        console.error('[MPV] Error al detener proceso anterior:', err);
      }
    }

    const fs = require('fs');
    let playerPath = null;
    let playerName = 'MPV';

    // Usar MPV empaquetado
    const mpvDir = isDev ? path.join(__dirname, 'mpv') : path.join(process.resourcesPath, 'mpv');
    const mpvBinPath = path.join(mpvDir, 'mpv.exe');
    
    if (!fs.existsSync(mpvBinPath)) {
      return { success: false, error: 'MPV no encontrado en: ' + mpvBinPath };
    }
    playerPath = mpvBinPath;
    console.log('[PLAYER] Usando MPV empaquetado:', mpvBinPath);

    // Validar URL
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'URL inválida o no proporcionada' };
    }

    // Construir argumentos para MPV
    const args = [];
    const safeMediaTitle = (String(title || 'TeamG Play'))
      .replace(/[\r\n\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180) || 'TeamG Play';
    // Usar título simple "mpv" para que nircmd lo encuentre fácilmente
    args.push('--title=mpv');
    args.push(`--force-media-title=${safeMediaTitle}`);
    args.push('--ontop');
    
    // NUEVO: Añadir socket IPC para monitorear time-pos
    args.push('--input-ipc-server=\\\\.\\pipe\\mpv-socket');
    
    // Validar bounds antes de usarlos
    if (bounds && bounds.width && bounds.height && bounds.x !== undefined && bounds.y !== undefined) {
      let w = Math.max(1, parseInt(bounds.width) || 1280);
      let h = Math.max(1, parseInt(bounds.height) || 720);
      let x = parseInt(bounds.x) || 0;
      let y = parseInt(bounds.y) || 0;

      if (mainWindow && !mainWindow.isDestroyed()) {
        const winBounds = mainWindow.getContentBounds();
        x += (winBounds.x || 0);
        y += (winBounds.y || 0);
      }
      x = Math.max(0, x);
      y = Math.max(0, y);
      args.push(`--geometry=${w}x${h}+${x}+${y}`);
    }
    
    args.push('--no-border');
    args.push('--force-window=immediate');
    args.push('--idle=yes');
    args.push('--keep-open=always');
    args.push('--vo=gpu');
    args.push('--gpu-api=d3d11');
    args.push('--hwdec=auto-safe');
    args.push('--cache=yes');
    args.push('--ytdl=no');
    args.push('--demuxer-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=5');
    args.push('--stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=5');
    args.push('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TeamGPlay-Desktop/1.5.11 mpv');
    args.push('--http-header-fields=x-teamg-client: electron');
    args.push('--volume=70');
    args.push('--osc=yes');
    args.push('--input-default-bindings=yes');
    
    if (startTime && startTime > 0) {
      const startSec = Math.max(0, Math.floor(Number(startTime)) || 0);
      args.push(`--start=${startSec}`);
    }

    args.push('--');
    args.push(url);

    console.log(`[MPV] Lanzando con argumentos:`, args);
    console.log(`[MPV] URL: ${url}, StartTime: ${startTime}`);
    logMainDebug('[MPV launch]', { url, startTime, args });

    // Lanzar MPV con try-catch
    try {
      mpvProcess = spawn(playerPath, args, {
        cwd: mpvDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: false,
        env: {
          ...process.env,
          MPV_HOME: mpvDir
        }
      });
    } catch (spawnErr) {
      const errorMsg = `Error al hacer spawn de MPV: ${spawnErr.message}`;
      console.error(`[MPV]`, errorMsg);
      logMainDebug('[MPV spawn error]', errorMsg);
      return { success: false, error: errorMsg };
    }

    // Manejar errores del proceso
    mpvProcess.on('error', (err) => {
      const errorMsg = `Error al iniciar MPV: ${err.message}`;
      console.error(`[MPV ERROR]`, errorMsg);
      logMainDebug('[MPV process error]', errorMsg);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mpv-error', errorMsg);
      }
      mpvProcess = null;
    });

    mpvProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[MPV stdout]:`, output);
        logMainDebug('[MPV stdout]', output);
      }
    });

    mpvProcess.stderr.on('data', (data) => {
      const stderr = data.toString().trim();
      if (stderr) {
        console.warn(`[MPV stderr]:`, stderr);
        logMainDebug('[MPV stderr]', stderr);
      }
    });

    mpvProcess.on('exit', (code, signal) => {
      console.log(`[MPV] Proceso terminado - código: ${code}, señal: ${signal}`);
      logMainDebug(`[MPV] Proceso terminado - código: ${code}, señal: ${signal}`, { url });
      mpvEndEventSent = false;
      
      // Notificar al frontend que MPV se cerró para que guarde el progreso
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mpv-closed', { code, signal, url });
      }
      
      mpvProcess = null;
    });

    mpvProcess.on('close', (code) => {
      console.log(`[MPV] Handle cerrado con código:`, code);
    });

    console.log(`[MPV] Proceso iniciado con PID: ${mpvProcess.pid}`);
    
    // NUEVO: Intentar conectar al socket IPC de MPV después de iniciarlo
    // Esperar un pequeño delay para que MPV inicie el servidor socket
    let socketConnectAttempts = 0;
    const maxAttempts = 10;
    const attemptInterval = 300; // 300ms entre intentos
    
    const tryConnectSocket = () => {
      socketConnectAttempts++;
      console.log(`[MPV Socket] Intento ${socketConnectAttempts}/${maxAttempts} de conectar...`);
      
      setupMPVSocketListener('\\\\.\\pipe\\mpv-socket')
        .then(() => {
          console.log('[MPV] ✓ Socket IPC establecido exitosamente, escuchando time-pos');
        })
        .catch((err) => {
          if (socketConnectAttempts < maxAttempts) {
            console.warn(`[MPV Socket] Intento ${socketConnectAttempts} falló, reintentando...`);
            setTimeout(tryConnectSocket, attemptInterval);
          } else {
            console.warn('[MPV] No se pudo conectar al socket IPC después de múltiples intentos:', err.message);
          }
        });
    };
    
    // Comenzar intentos después de 500ms
    setTimeout(tryConnectSocket, 500);
    
    return { success: true, player: 'MPV', pid: mpvProcess.pid };
  } catch (error) {
    console.error('[PLAYER] Error general:', error);
    return { success: false, error: error.message };
  }
});

// -----------------------------------------------------------
// IPC: detener MPV
// -----------------------------------------------------------
ipcMain.handle('mpv-embed-stop', async () => {
  try {
    if (mpvProcess) {
      await forceKillVLC();
      console.log('[MPV] Proceso detenido correctamente');
    }
    return { success: true };
  } catch (error) {
    console.error('[MPV] Error al detener el proceso:', error);
    return { success: false, error: error.message };
  }
});

// -----------------------------------------------------------
// IPC: Actualizar bounds de MPV en tiempo real (resize/scroll)
// -----------------------------------------------------------
ipcMain.on('mpv-embed-update-bounds', (_event, { bounds } = {}) => {
  if (!mpvSocket || !mpvSocketConnected || !bounds) return;
  try {
    let w = Math.max(1, parseInt(bounds.width) || 1280);
    let h = Math.max(1, parseInt(bounds.height) || 720);
    let x = parseInt(bounds.x) || 0;
    let y = parseInt(bounds.y) || 0;
    if (mainWindow && !mainWindow.isDestroyed()) {
      const winBounds = mainWindow.getContentBounds();
      x += (winBounds.x || 0);
      y += (winBounds.y || 0);
    }
    x = Math.max(0, x);
    y = Math.max(0, y);
    const geomCmd = JSON.stringify({ command: ['set_property', 'geometry', `${w}x${h}+${x}+${y}`] }) + '\n';
    mpvSocket.write(geomCmd);
  } catch (err) {
    console.warn('[MPV] Error actualizando bounds por socket:', err.message);
  }
});

// -----------------------------------------------------------
// IPC: Configurar modo Picture-in-Picture (PIP) para MPV
// -----------------------------------------------------------
ipcMain.handle('mpv-set-pip-floating', async (_, { enabled }) => {
  try {
    if (!mpvProcess || !mpvProcess.pid) {
      console.warn('[MPV PIP] No hay proceso MPV activo');
      return { success: false, isPipActive: false, error: 'No hay proceso MPV activo' };
    }

    isPipMode = enabled;
    
    console.log('[MPV PIP] ' + (enabled ? 'Activando' : 'Desactivando') + ' modo siempre adelante...');

    if (enabled) {
      try {
        // Usar PowerShell para poner la ventana de MPV siempre adelante
        const { exec } = require('child_process');
        
        // Script PowerShell más simple y estable
        const psScript = `
          Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class WindowControl {
              [DllImport("user32.dll", SetLastError = true)]
              public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
              
              public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
              public const uint SWP_NOMOVE = 2;
              public const uint SWP_NOSIZE = 1;
            }
          "@
          
          try {
            $process = Get-Process -Name mpv -ErrorAction SilentlyContinue
            if ($process) {
              $windowHandle = $process.MainWindowHandle
              if ($windowHandle -ne [IntPtr]::Zero) {
                [WindowControl]::SetWindowPos($windowHandle, [WindowControl]::HWND_TOPMOST, 0, 0, 0, 0, 3)
                Write-Host "MPV window set to topmost"
              }
            }
          } catch {
            Write-Error $_.Exception.Message
          }
        `;
        
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`;
        exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
          if (error) {
            console.warn('[MPV PIP] Warning - PowerShell error:', error.message);
          } else {
            console.log('[MPV PIP] ✓ MPV configurado SIEMPRE ADELANTE');
          }
        });
      } catch (err) {
        console.error('[MPV PIP] Error con PowerShell:', err.message);
      }
    } else {
      try {
        const { exec } = require('child_process');
        
        // Script PowerShell para desactivar topmost
        const psScript = `
          Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class WindowControl {
              [DllImport("user32.dll", SetLastError = true)]
              public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
              
              public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
              public const uint SWP_NOMOVE = 2;
              public const uint SWP_NOSIZE = 1;
            }
          "@
          
          try {
            $process = Get-Process -Name mpv -ErrorAction SilentlyContinue
            if ($process) {
              $windowHandle = $process.MainWindowHandle
              if ($windowHandle -ne [IntPtr]::Zero) {
                [WindowControl]::SetWindowPos($windowHandle, [WindowControl]::HWND_NOTOPMOST, 0, 0, 0, 0, 3)
                Write-Host "MPV window set to normal"
              }
            }
          } catch {
            Write-Error $_.Exception.Message
          }
        `;
        
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`;
        exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
          if (error) {
            console.warn('[MPV PIP] Warning - PowerShell error:', error.message);
          } else {
            console.log('[MPV PIP] ✓ MPV configurado MODO NORMAL');
          }
        });
      } catch (err) {
        console.error('[MPV PIP] Error:', err.message);
      }
    }

    return { success: true, isPipActive: isPipMode };
  } catch (error) {
    console.error('[MPV PIP] Error general:', error);
    return { success: false, isPipActive: isPipMode, error: error.message };
  }
});

// -----------------------------------------------------------
// IPC: Resolver ID de YouTube para canciones completas en TeamG Music
// -----------------------------------------------------------
const electronYtCache = new Map();

ipcMain.handle('music-get-youtube-id', async (_event, query) => {
  if (!query || typeof query !== 'string') return null;
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  const cacheKey = cleanQuery.toLowerCase();
  if (electronYtCache.has(cacheKey)) {
    return electronYtCache.get(cacheKey);
  }

  console.log('[Electron Music] Resolviendo YouTube ID para:', cleanQuery);

  // 1. Backend oficial con x-app-version: 1.5.12
  try {
    const res = await fetch(`https://api.teamg.store/api/music/resolve?title=${encodeURIComponent(cleanQuery)}`, {
      headers: {
        'Accept': 'application/json',
        'x-app-version': '1.5.12'
      },
      timeout: 10000
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.youtubeId) {
        console.log('[Electron Music] ✓ Resuelto vía backend:', data.youtubeId);
        electronYtCache.set(cacheKey, data.youtubeId);
        return data.youtubeId;
      }
    }
  } catch (err) {
    console.warn('[Electron Music] Falló backend resolve:', err.message);
  }

  // 2. Scraping directo de YouTube desde Node.js (sin restricciones de CORS)
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery + ' audio')}&sp=EgIQAQ%253D%253D`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept': 'text/html'
      },
      timeout: 10000
    });
    if (res.ok) {
      const html = await res.text();
      const vrRegex = /"videoRenderer":\s*\{"videoId":"([a-zA-Z0-9_-]{11})"/g;
      let m;
      while ((m = vrRegex.exec(html)) !== null) {
        const id = m[1];
        const idx = m.index;
        const snippet = html.slice(idx, idx + 2000);
        if (snippet.includes('SHORTS') || snippet.includes('/shorts/')) continue;
        console.log('[Electron Music] ✓ Resuelto vía scraping directo:', id);
        electronYtCache.set(cacheKey, id);
        return id;
      }
      const genericRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
      const mGen = genericRegex.exec(html);
      if (mGen && mGen[1]) {
        console.log('[Electron Music] ✓ Resuelto vía fallback:', mGen[1]);
        electronYtCache.set(cacheKey, mGen[1]);
        return mGen[1];
      }
    }
  } catch (err) {
    console.warn('[Electron Music] Falló scraping directo:', err.message);
  }

  return null;
});


