const { spawn } = require('child_process');
const electronBinary = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const electronArgs = args.length > 0 ? args : ['.'];

const child = spawn(electronBinary, electronArgs, {
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('close', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (code && code !== 0) {
    console.error(`[run-electron-dev] Electron exited with code ${code}`);
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[run-electron-dev] Failed to launch Electron:', error);
  process.exit(1);
});
