#!/usr/bin/env node
// Copies required MPV binaries (D3DCompiler_47.dll, libmpv-2.dll) from a private folder into ./mpv
const fs = require('fs');
const path = require('path');

const REQUIRED = ['D3DCompiler_47.dll', 'libmpv-2.dll'];

// Resolve source directory from environment or common fallback locations
function resolveSourceDir() {
  const env = process.env.MPV_BIN_DIR;
  if (env && fs.existsSync(env)) return path.resolve(env);

  const candidates = [
    path.resolve(process.cwd(), '..', 'mpv-binaries'),
    path.resolve(process.cwd(), 'mpv-binaries'),
    path.resolve(process.cwd(), '..', '..', 'mpv-binaries')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function copyFiles(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const missing = [];
  for (const file of REQUIRED) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (!fs.existsSync(src)) {
      missing.push(file);
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> ${dest}`);
  }
  return missing;
}

async function main() {
  const src = resolveSourceDir();
  if (!src) {
    console.error('No se encontró una carpeta de binarios MPV. Define MPV_BIN_DIR env var o coloca los binarios en ../mpv-binaries');
    process.exit(2);
  }

  const dest = path.resolve(process.cwd(), 'mpv');
  console.log('Using MPV binaries from:', src);
  console.log('Target mpv dir:', dest);

  const missing = copyFiles(src, dest);
  if (missing.length) {
    console.error('Faltan los siguientes archivos en la carpeta de origen:', missing.join(', '));
    process.exit(3);
  }

  console.log('MPV binaries prepared successfully.');
}

main().catch(err => {
  console.error('Error preparando binarios MPV:', err);
  process.exit(1);
});
