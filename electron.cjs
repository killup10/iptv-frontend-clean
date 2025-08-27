// electron.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

let mainWindow = null;
let mpvProcess = null;
let mpvIpcSocket = null;
// Helper para terminar de forma confiable el proceso de MPV
async function forceKillMpv() {
  return new Promise(resolve => {
    if (!mpvProcess) {
      console.log('[MPV] No hay proceso MPV para detener');
      return resolve();
    }
    
    console.log('[MPV] Iniciando proceso de cierre forzado...');
    const cleanup = () => {
      if (mpvIpcSocket) {
        mpvIpcSocket.destroy();
        mpvIpcSocket = null;
      }
      mpvProcess = null;
      console.log('[MPV] Proceso MPV limpiado correctamente');
      resolve();
    };
    
    // Configurar timeout de respaldo
    const forceTimeout = setTimeout(() => {
      console.log('[MPV] Timeout alcanzado, forzando limpieza');
      cleanup();
    }, 2000); // 2 segundos máximo
    
    mpvProcess.once('exit', (code) => {
      console.log(`[MPV] Proceso terminado con código: ${code}`);
      clearTimeout(forceTimeout);
      cleanup();
    });
    
    try {
      if (process.platform === 'win32') {
        console.log('[MPV] Usando taskkill para Windows...');
        spawn('taskkill', ['/pid', mpvProcess.pid.toString(), '/f', '/t']);
      } else {
        console.log('[MPV] Usando SIGKILL para Unix...');
        mpvProcess.kill('SIGKILL');
      }
    } catch (err) {
      console.error('[MPV] Error al forzar cierre:', err);
      clearTimeout(forceTimeout);
      cleanup();
    }
  });
}
const isDev = process.env.NODE_ENV === 'development';
function getMpvIpcPath() {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\mpv-socket-${process.pid}`;
  }
  return path.join(app.getPath('temp'), `mpv-socket-${process.pid}`);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true, 
      nodeIntegration: false, 
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Manejar redimensionado de la ventana principal
  let resizeTimeout = null;
  mainWindow.on('resize', () => {
    if (mpvProcess) {
      // Debounce para evitar muchas actualizaciones
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        try {
          const bounds = mainWindow.getBounds();
          const nircmd = path.join(isDev ? __dirname : process.resourcesPath, 'nircmd', 'nircmd.exe');
          if (require('fs').existsSync(nircmd)) {
            spawn(nircmd, ['win', 'setsize', 'title', 'TeamG Play', bounds.width.toString(), bounds.height.toString()]);
          }
        } catch (err) {
          console.error('[Window] Error al redimensionar MPV:', err);
        }
      }, 100);
    }
  });

  // Manejar minimizado/restaurado de la ventana principal
  mainWindow.on('minimize', () => {
    if (mpvProcess) {
      try {
        // Minimizar MPV usando comando nircmd
        const nircmd = path.join(isDev ? __dirname : process.resourcesPath, 'nircmd', 'nircmd.exe');
        if (require('fs').existsSync(nircmd)) {
          spawn(nircmd, ['win', 'min', 'title', 'TeamG Play']);
        } else {
          console.warn('[Window] nircmd.exe no encontrado para minimizar MPV');
        }
      } catch (err) {
        console.error('[Window] Error al minimizar MPV:', err);
      }
    }
  });

  mainWindow.on('restore', () => {
    if (mpvProcess) {
      try {
        // Restaurar MPV usando comando nircmd
        const nircmd = path.join(isDev ? __dirname : process.resourcesPath, 'nircmd', 'nircmd.exe');
        if (require('fs').existsSync(nircmd)) {
          spawn(nircmd, ['win', 'normal', 'title', 'TeamG Play']);
        } else {
          console.warn('[Window] nircmd.exe no encontrado para restaurar MPV');
        }
      } catch (err) {
        console.error('[Window] Error al restaurar MPV:', err);
      }
    }
  });

  mainWindow.on('close', (event) => {
    if (mpvProcess) {
      try {
        mpvProcess.kill();
        console.log('[Window] MPV detenido correctamente');
      } catch (err) {
        console.error('[Window] Error al detener MPV:', err);
      } finally {
        mpvProcess = null;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// -----------------------------------------------------------
// IPC: reproducir video con MPV
// -----------------------------------------------------------
ipcMain.handle('mpv-embed-play', async (_, { url, bounds }) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'MainWindow no existe' };
    }

    // 1) Si ya había un MPV corriendo, lo detenemos
    if (mpvProcess) {
      try {
        await forceKillMpv();
        console.log('[MPV] Proceso anterior detenido correctamente');
      } catch (err) {
        console.error('[MPV] Error al detener proceso anterior:', err);
      
      }
    }

    // 2) Iniciar MPV
    const initMPV = async () => {
      try {
        if (!mainWindow || mainWindow.isDestroyed()) {
          throw new Error('La ventana principal no está disponible');
        }

        // 3) Ruta a mpv.exe y verificación
        const mpvDir = isDev ? path.join(__dirname, 'mpv') : path.join(process.resourcesPath, 'mpv');
        const mpvBinPath = path.join(mpvDir, 'mpv.exe');
        
        if (!require('fs').existsSync(mpvBinPath)) {
          console.error('[MPV] Ejecutable no encontrado en:', mpvBinPath);
          console.error('[MPV] Contenido del directorio:', require('fs').readdirSync(mpvDir));
          throw new Error(`MPV no encontrado en: ${mpvBinPath}`);
        }
        
        // Verificar DLLs necesarias
        const requiredDlls = ['D3DCompiler_47.dll', 'libmpv-2.dll'];
        for (const dll of requiredDlls) {
          const dllPath = path.join(mpvDir, dll);
          if (!require('fs').existsSync(dllPath)) {
            console.error(`[MPV] DLL requerida no encontrada: ${dll} en ${dllPath}`);
            throw new Error(`DLL requerida no encontrada: ${dll}`);
          }
        }
        
        console.log('[MPV] Usando ejecutable:', mpvBinPath);

        // 4) Construir argumentos de MPV
        const args = [];
                const ipcPath = getMpvIpcPath();

        
        // Configuración mínima necesaria
        args.push('--title=TeamG Play');       // Título de la ventana
        args.push(`--geometry=${bounds.width}x${bounds.height}+${bounds.x}+${bounds.y}`);
        args.push('--no-border');              // Sin bordes
        args.push('--force-window=yes');       // Forzar ventana
        args.push('--no-terminal');            // No mostrar terminal
        args.push('--keep-open=always');       // Mantener abierto
        args.push('--vo=gpu');                 // Salida de video GPU
        args.push('--gpu-api=d3d11');         // API de GPU
        args.push('--hwdec=auto-safe');       // Decodificación por hardware
        args.push('--cache=yes');             // Habilitar caché
        args.push(`--input-ipc-server=${ipcPath}`);

        // URL del video
        args.push('--');  // Separador para evitar confusión con URLs que empiezan con guión
        args.push(url);

        console.log('[main] Lanzando mpv.exe con args:', args);

        // 5) Lanzar mpv.exe como proceso separado
        mpvProcess = spawn(mpvBinPath, args, {
          cwd: path.dirname(mpvBinPath),
          stdio: ['pipe', 'pipe', 'pipe'],  // Capturar stdin, stdout y stderr
          detached: false,
          windowsHide: false,  // Mostrar ventana en Windows
          env: {
            ...process.env,
            MPV_HOME: mpvDir  // Asegurar que MPV encuentra sus archivos de configuración
          }
        });

        // Variable para capturar el último error
        let lastError = '';

        // Esperar a que MPV esté listo y capturar salida
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout esperando a que MPV inicie'));
          }, 5000); // 5 segundos máximo

          // Resolver cuando el proceso inicie
          mpvProcess.on('spawn', () => {
            console.log('[MPV] Proceso iniciado correctamente');
            clearTimeout(timeout);
            
            // Conectar al socket IPC de MPV para observar el tiempo de reproducci\xC3\xB3n
            try {
              mpvIpcSocket = net.createConnection(ipcPath, () => {
                const msg = JSON.stringify({ command: ['observe_property', 1, 'time-pos'] }) + '\n';
                mpvIpcSocket.write(msg);
              });
              mpvIpcSocket.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                  if (!line.trim()) return;
                  try {
                    const parsed = JSON.parse(line);
                    if (parsed.event === 'property-change' && parsed.name === 'time-pos') {
                      if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('mpv-time-pos', parsed.data);
                      }
                    }
                  } catch (err) {
                    console.error('[MPV IPC] Error parsing:', err);
                  }
                });
              });
              mpvIpcSocket.on('error', err => {
                console.error('[MPV IPC] Socket error:', err);
              });
              mpvIpcSocket.on('close', () => {
                mpvIpcSocket = null;
              });
            } catch (ipcErr) {
              console.error('[MPV IPC] No se pudo conectar al socket:', ipcErr);
            }
            resolve();
          });

          // Manejar error de proceso
          mpvProcess.on('error', (err) => {
            const errorMsg = 'Error al iniciar MPV: ' + err.message;
            console.error('[MPV]', errorMsg);
            mainWindow.webContents.send('mpv-error', errorMsg);
            clearTimeout(timeout);
            reject(new Error(errorMsg));
          });
          mpvProcess.stderr.on('data', (data) => {
            const error = data.toString();
            
            // Ignorar mensajes no críticos
            if (error.includes('fontconfig') || 
                error.includes('cannot connect to server') ||
                error.includes('Failed to load module') ||
                error.includes('[cplayer] ')) {
              return;
            }

            // Guardar el último error para diagnóstico
            lastError = error;

            // Detectar errores críticos
            const criticalErrors = [
              'cannot open file',
              'failed to open',
              'failed to load',
              'error loading',
              'failed to initialize',
              'could not open',
              'failed to connect',
              'connection refused',
              'connection timeout',
              'protocol error',
              'unsupported protocol',
              'no video',
              'no demuxer',
              'no decoder',
              'playback error',
              'failed to get stream',
              'failed to parse',
              'failed to read'
            ];

            if (criticalErrors.some(e => error.toLowerCase().includes(e))) {
              const errorMsg = 'Error de reproducción: ' + error.trim();
              console.error('[MPV]', errorMsg);
              mainWindow.webContents.send('mpv-error', errorMsg);
            } else {
              console.error('[MPV stderr]:', error);
            }
          });

          // Capturar salida para logs y diagnóstico
          mpvProcess.stdout.on('data', (data) => {
            console.log('[MPV stdout]:', data.toString());
          });
        });

        // Función helper para enviar errores al renderer
        const sendMpvError = (error) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mpv-error', error);
          }
        };

        mpvProcess.on('error', (err) => {
          const errorMsg = err.message || 'Error desconocido al iniciar MPV';
          console.error('[MPV Error]:', errorMsg);
          sendMpvError(errorMsg);
        });

          // Manejador de salida del proceso
          mpvProcess.on('exit', (code, signal) => {
            let exitMsg = '';
            if (code === 1) {
              // Incluir el último error conocido en el mensaje
              exitMsg = `MPV no pudo reproducir el contenido. ${lastError ? 'Error: ' + lastError.trim() : 'Verifique la URL o el formato del video.'}`;
            } else if (code === null && signal) {
              exitMsg = `MPV fue terminado por la señal: ${signal}`;
            } else if (code !== 0) {
              exitMsg = `MPV se cerró con código: ${code}`;
            } else {
              exitMsg = 'MPV se cerró normalmente';
            }
            
            console.log('[MPV Exit]:', exitMsg, { code, signal, lastError });
            
            if (code !== 0) {
              sendMpvError(exitMsg);
            }
            
            if (mpvIpcSocket) {
              mpvIpcSocket.destroy();
              mpvIpcSocket = null;
            }
            mpvProcess = null;
          });
      } catch (err) {
        const errorMsg = err.message || 'Error desconocido al inicializar MPV';
        console.error('[MPV Init Error]:', errorMsg);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('mpv-error', errorMsg);
        }
        throw err;
      }
    };

    await initMPV();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// -----------------------------------------------------------
// IPC: detener MPV
// -----------------------------------------------------------
ipcMain.handle('mpv-embed-stop', async () => {
  try {
    if (mpvProcess) {
      await forceKillMpv();
      console.log('[MPV] Proceso detenido correctamente');
    }
    
    return { success: true };
  } catch (error) {
    console.error('[MPV] Error al detener el proceso:', error);
    return { success: false, error: error.message };
  }
});
