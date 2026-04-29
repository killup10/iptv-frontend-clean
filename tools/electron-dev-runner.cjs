const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const viteArgs = [
  path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host',
  '127.0.0.1',
  '--port',
  '5173',
  '--strictPort',
];
const electronArgs = [path.join(projectRoot, 'tools', 'run-electron-dev.cjs'), '.'];

function spawnNode(args, extraEnv = {}) {
  return spawn(process.execPath, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ...extraEnv,
    },
    stdio: 'inherit',
    windowsHide: false,
  });
}

function waitForExit(child, name) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${name} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${name} exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

function isServerReady() {
  return new Promise((resolve) => {
    const request = http.get('http://127.0.0.1:5173', (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => resolve(false));
  });
}

async function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function run() {
  console.log('[electron:dev] Preparing MPV...');
  await waitForExit(spawnNode([path.join(projectRoot, 'tools', 'setup-dev-mpv.js')], { NODE_ENV: process.env.NODE_ENV || 'development' }), 'setup-dev-mpv');

  let viteChild = null;
  const serverAlreadyRunning = await isServerReady();

  if (serverAlreadyRunning) {
    console.log('[electron:dev] Reusing existing dev server at http://127.0.0.1:5173');
  } else {
    console.log('[electron:dev] Starting Vite dev server on http://127.0.0.1:5173');
    viteChild = spawnNode(viteArgs);

    const serverReady = await waitForServer();
    if (!serverReady) {
      if (viteChild && !viteChild.killed) {
        viteChild.kill();
      }
      throw new Error('Vite did not become ready on http://127.0.0.1:5173');
    }
  }

  console.log('[electron:dev] Launching Electron...');
  const electronChild = spawnNode(electronArgs);

  const cleanup = () => {
    if (viteChild && !viteChild.killed) {
      viteChild.kill();
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  electronChild.once('exit', () => {
    cleanup();
  });

  await waitForExit(electronChild, 'electron');
}

run().catch((error) => {
  console.error('[electron:dev]', error.message);
  process.exit(1);
});
