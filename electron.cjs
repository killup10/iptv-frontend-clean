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

    // Construir argumentos para MPV
    const args = [];
    // Usar título simple "mpv" para que nircmd lo encuentre fácilmente
    args.push('--title=mpv');
    args.push('--ontop');
    args.push(`--geometry=${bounds.width}x${bounds.height}+${bounds.x}+${bounds.y}`);
    args.push('--no-border');
    args.push('--force-window=yes');
    args.push('--keep-open=always');
    args.push('--vo=gpu');
    args.push('--gpu-api=d3d11');
    args.push('--hwdec=auto-safe');
    args.push('--cache=yes');
    args.push('--volume=70');
    args.push('--save-position-on-quit');
    
    if (startTime && startTime > 0) {
      args.push(`--start=${Math.floor(startTime)}`);
    }

    args.push('--');
    args.push(url);

    console.log(`[MPV] Lanzando con argumentos:`, args);

    // Lanzar MPV
    mpvProcess = spawn(playerPath, args, {
      cwd: mpvDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      windowsHide: false,
      env: {
        ...process.env,
        MPV_HOME: mpvDir
      }
    });

    // Manejar errores
    mpvProcess.on('error', (err) => {
      const errorMsg = `Error al iniciar MPV: ` + err.message;
      console.error(`[MPV]`, errorMsg);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mpv-error', errorMsg);
      }
    });

    mpvProcess.stderr.on('data', (data) => {
      console.error(`[MPV stderr]:`, data.toString());
    });

    mpvProcess.on('exit', (code, signal) => {
      console.log(`[MPV] Proceso terminado:`, { code, signal });
      mpvProcess = null;
    });

    console.log(`[MPV] Proceso iniciado con PID:`, mpvProcess.pid);
    return { success: true, player: 'MPV' };
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
    if (!mpvProcess) {
      console.warn('[MPV PIP] No hay proceso MPV activo');
      return { success: false, isPipActive: false, error: 'No hay proceso MPV activo' };
    }

    isPipMode = enabled;
    
    console.log('[MPV PIP] ' + (enabled ? 'Activando' : 'Desactivando') + ' modo siempre adelante...');

    if (enabled) {
      try {
        // Usar PowerShell para poner la ventana de MPV siempre adelante
        // PowerShell es nativo en Windows y siempre está disponible
        const { exec } = require('child_process');
        
        // Script PowerShell para poner ventana siempre adelante usando Windows API
        const psScript = `
          [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
          $windows = Get-Process | Where-Object { $_.MainWindowTitle -like '*mpv*' }
          foreach ($window in $windows) {
            if ($window.MainWindowHandle -ne 0) {
              [System.Windows.Forms.SendKeys]::SendWait('');
              $windowHandle = $window.MainWindowHandle
              Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class WindowControl {
                  [DllImport("user32.dll")]
                  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
                  public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
                  public const uint SWP_NOMOVE = 2;
                  public const uint SWP_NOSIZE = 1;
                }
              "@
              [WindowControl]::SetWindowPos($windowHandle, [WindowControl]::HWND_TOPMOST, 0, 0, 0, 0, 3)
            }
          }
        `;
        
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`;
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error('[MPV PIP] Error con PowerShell:', error);
          } else {
            console.log('[MPV PIP] ✓ MPV configurado SIEMPRE ADELANTE');
          }
        });
      } catch (err) {
        console.error('[MPV PIP] Error con PowerShell:', err);
      }
    } else {
      try {
        // Modo normal - usar Alt+Tab para desactivar topmost
        const { exec } = require('child_process');
        
        const psScript = `
          [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
          $windows = Get-Process | Where-Object { $_.MainWindowTitle -like '*mpv*' }
          foreach ($window in $windows) {
            if ($window.MainWindowHandle -ne 0) {
              $windowHandle = $window.MainWindowHandle
              Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class WindowControl {
                  [DllImport("user32.dll")]
                  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
                  public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
                  public const uint SWP_NOMOVE = 2;
                  public const uint SWP_NOSIZE = 1;
                }
              "@
              [WindowControl]::SetWindowPos($windowHandle, [WindowControl]::HWND_NOTOPMOST, 0, 0, 0, 0, 3)
            }
          }
        `;
        
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`;
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error('[MPV PIP] Error al quitar topmost:', error);
          } else {
            console.log('[MPV PIP] ✓ MPV configurado MODO NORMAL');
          }
        });
      } catch (err) {
        console.error('[MPV PIP] Error:', err);
      }
    }

    return { success: true, isPipActive: isPipMode };
  } catch (error) {
    console.error('[MPV PIP] Error:', error);
    return { success: false, isPipActive: isPipMode, error: error.message };
  }
});


