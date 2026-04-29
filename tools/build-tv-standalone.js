#!/usr/bin/env node

/**
 * Build script for the fully independent Android TV app.
 * It only uses android-tv/ and does not touch android/.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const distTvDir = path.join(projectRoot, 'dist-tv');
const androidTvDir = path.join(projectRoot, 'android-tv');
const assetsDir = path.join(androidTvDir, 'app', 'src', 'main', 'assets', 'public');
const isReleaseBuild = process.argv.includes('--release');
const buildVariant = isReleaseBuild ? 'release' : 'debug';
const gradleTask = isReleaseBuild ? 'assembleRelease' : 'assembleDebug';

console.log(`Building TeamG Play TV (${buildVariant.toUpperCase()})...\n`);

function copyAssets() {
  console.log('Copying assets to android-tv/app/src/main/assets/public...');

  try {
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    } else {
      fs.rmSync(assetsDir, { recursive: true, force: true });
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    if (!fs.existsSync(distTvDir)) {
      throw new Error('dist-tv does not exist. Run npm run build:tv first.');
    }

    const files = fs.readdirSync(distTvDir);
    files.forEach((file) => {
      const src = path.join(distTvDir, file);
      const dest = path.join(assetsDir, file);

      if (fs.statSync(src).isDirectory()) {
        copyDirectory(src, dest);
      } else {
        fs.copyFileSync(src, dest);
      }
    });

    const tvIndexPath = path.join(assetsDir, 'tv-index.html');
    const indexPath = path.join(assetsDir, 'index.html');
    if (fs.existsSync(tvIndexPath)) {
      fs.copyFileSync(tvIndexPath, indexPath);
      console.log('OK tv-index.html normalized as index.html for Capacitor/Android TV');
    }

    console.log('OK assets copied successfully\n');
  } catch (error) {
    console.error('Error copying assets:', error.message);
    process.exit(1);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach((file) => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

function normalizeCommandOutput(output) {
  return typeof output === 'string' ? output : output?.toString() || '';
}

function printCommandOutput(output) {
  if (output) {
    process.stdout.write(output);
  }
}

function clearBrokenGradleDistribution(commandOutput) {
  const match = commandOutput.match(
    /Cannot find JAR '.*?' required by module '.*?' using classpath or distribution directory '([^']+)'/
  );

  if (!match) {
    return false;
  }

  const distributionDir = match[1].trim();
  const cacheDir = path.dirname(distributionDir);

  if (!fs.existsSync(cacheDir)) {
    return false;
  }

  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.warn(`Removed corrupted Gradle distribution cache: ${cacheDir}`);
  return true;
}

function prepareReleaseGradleAssetsWorkaround() {
  if (!isReleaseBuild) {
    return;
  }

  const releaseAssetsDir = path.join(
    androidTvDir,
    'app',
    'build',
    'intermediates',
    'assets',
    'release',
    'mergeReleaseAssets',
    'public'
  );

  fs.mkdirSync(releaseAssetsDir, { recursive: true });
}

function executeGradleBuild() {
  const gradlewPath = path.join(androidTvDir, 'gradlew.bat');
  const gradleArgs = isReleaseBuild
    ? `${gradleTask} --rerun-tasks --no-build-cache`
    : gradleTask;
  const cmd = `cd "${androidTvDir}" && ${gradlewPath} ${gradleArgs}`;
  const output = execSync(cmd, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });

  printCommandOutput(output);
}

function buildGradle() {
  console.log('Building Gradle project in android-tv/...');

  try {
    prepareReleaseGradleAssetsWorkaround();
    executeGradleBuild();
    console.log('OK Gradle build successful\n');
  } catch (error) {
    const stdout = normalizeCommandOutput(error.stdout);
    const stderr = normalizeCommandOutput(error.stderr);
    const commandOutput = `${stdout}\n${stderr}\n${error.message}`;

    printCommandOutput(stdout);
    printCommandOutput(stderr);

    if (clearBrokenGradleDistribution(commandOutput)) {
      console.warn('Retrying Gradle build after clearing wrapper cache...');

      try {
        executeGradleBuild();
        console.log('OK Gradle build successful after cache repair\n');
        return;
      } catch (retryError) {
        const retryStdout = normalizeCommandOutput(retryError.stdout);
        const retryStderr = normalizeCommandOutput(retryError.stderr);

        printCommandOutput(retryStdout);
        printCommandOutput(retryStderr);
        throw new Error(`Gradle build failed after cache repair: ${retryError.message}`);
      }
    }

    throw new Error(`Gradle build failed: ${error.message}`);
  }
}

function showAPKLocation() {
  const apkName = isReleaseBuild ? 'app-release.apk' : 'app-debug.apk';
  const apkPath = path.join(androidTvDir, 'app', 'build', 'outputs', 'apk', buildVariant, apkName);

  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK not found after build: ${apkPath}`);
  }

  console.log('APK location:');
  console.log(`  ${apkPath}`);
  console.log('\nTo install on emulator:');
  console.log(`  adb install -r "${apkPath}"`);
  console.log(`\nTeamG Play TV ${buildVariant} build completed.`);
}

try {
  copyAssets();
  buildGradle();
  showAPKLocation();
} catch (error) {
  console.error('\nBuild failed:', error.message);
  process.exit(1);
}
