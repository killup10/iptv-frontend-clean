#!/usr/bin/env node

/**
 * Script para compilar VERSIÓN TV INDEPENDIENTE
 * Usa la carpeta android-tv/ que es completamente separada de android/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TV_CONFIG = path.join(__dirname, '..', 'capacitor-tv.config.json');
const MAIN_CONFIG = path.join(__dirname, '..', 'capacitor.config.json');
const BACKUP_CONFIG = path.join(__dirname, '..', 'capacitor.config.json.backup');

function setupTVConfig() {
  try {
    // Hacer backup del capacitor.config.json original
    if (fs.existsSync(MAIN_CONFIG)) {
      fs.copyFileSync(MAIN_CONFIG, BACKUP_CONFIG);
      console.log('✓ Backup de configuración creado');
    }

    // Leer el config TV
    let tvConfig = fs.readFileSync(TV_CONFIG, 'utf8');

    // Asegurar que:
    // 1. webDir sea dist-tv (para syncronizar desde ahí)
    // 2. El proyecto apunte a android-tv/ (carpeta independiente)
    tvConfig = tvConfig.replace('"webDir": "dist"', '"webDir": "dist-tv"');

    // Si existe un campo "projectDir", asegurar que sea android-tv
    if (!tvConfig.includes('"android": {')) {
      tvConfig = tvConfig.replace('"plugins"', '"android": {\n    "path": "android-tv"\n  },\n  "plugins"');
    }

    fs.writeFileSync(MAIN_CONFIG, tvConfig);
    console.log('✓ Configuración TV activada (carpeta: android-tv/, webDir: dist-tv)');
  } catch (error) {
    console.error('✗ Error al activar configuración TV:', error.message);
    process.exit(1);
  }
}

function restoreConfig() {
  try {
    // Restaurar el backup
    if (fs.existsSync(BACKUP_CONFIG)) {
      fs.copyFileSync(BACKUP_CONFIG, MAIN_CONFIG);
      fs.unlinkSync(BACKUP_CONFIG);
      console.log('✓ Configuración original restaurada');
    }
  } catch (error) {
    console.error('✗ Error al restaurar configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar según parámetro
const args = process.argv.slice(2);
if (args.includes('--restore')) {
  restoreConfig();
} else {
  setupTVConfig();
}
