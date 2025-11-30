// electron.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let mpvProcess = null;
let isPipMode = false;  // Flag para controlar si está en modo PIP

// Helper para terminar el proceso de MPV
async function forceKillVLC() {
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

const isDev = process.env.NODE_ENV === 'development';

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

  // Quitar el menú por defecto (File, Edit, View, etc)
  mainWindow.removeMenu();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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
ipcMain.handle('mpv-embed-play', async (_, { url, bounds, startTime, title = 'TeamG Play' }) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'MainWindow no existe' };
    }

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
    // Usar título simple "mpv" para que nircmd lo encuentre fácilmente
    args.push('--title=mpv');
    args.push('--ontop');
    
    // Validar bounds antes de usarlos
    if (bounds && bounds.width && bounds.height && bounds.x !== undefined && bounds.y !== undefined) {
      const w = Math.max(1, parseInt(bounds.width) || 1280);
      const h = Math.max(1, parseInt(bounds.height) || 720);
      const x = Math.max(0, parseInt(bounds.x) || 0);
      const y = Math.max(0, parseInt(bounds.y) || 0);
      args.push(`--geometry=${w}x${h}+${x}+${y}`);
    }
    
    args.push('--no-border');
    args.push('--force-window=immediate');
    args.push('--keep-open=yes');
    args.push('--vo=gpu');
    args.push('--gpu-api=d3d11');
    args.push('--hwdec=auto-safe');
    args.push('--cache=yes');
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
      return { success: false, error: errorMsg };
    }

    // Manejar errores del proceso
    mpvProcess.on('error', (err) => {
      const errorMsg = `Error al iniciar MPV: ${err.message}`;
      console.error(`[MPV ERROR]`, errorMsg);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mpv-error', errorMsg);
      }
      mpvProcess = null;
    });

    mpvProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[MPV stdout]:`, output);
    });

    mpvProcess.stderr.on('data', (data) => {
      const stderr = data.toString().trim();
      if (stderr) {
        console.warn(`[MPV stderr]:`, stderr);
      }
    });

    mpvProcess.on('exit', (code, signal) => {
      console.log(`[MPV] Proceso terminado - código: ${code}, señal: ${signal}`);
      
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


