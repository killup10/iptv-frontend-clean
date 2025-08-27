// ⚠️ vlc-wrapper.js (poner en la raíz, al lado de electron.cjs)

const ffi = require('ffi-napi');
const ref = require('ref-napi');
const path = require('path');

// --- Definición de tipos para ffi ---
const voidPtr = ref.refType(ref.types.void);

// 1) Cargar libvlc.dll (o .so/.dylib según plataforma):
//    En Windows asumimos que en desarrollo tienes carpeta: ./vlc/libvlc.dll
//    En producción empaquetada podrías tenerlo en process.resourcesPath+'/vlc/'
let libvlcPath;
if (process.platform === 'win32') {
  // Desarrollo: usar ruta relativa
  libvlcPath = path.join(__dirname, 'vlc', 'libvlc.dll');
} else if (process.platform === 'linux') {
  libvlcPath = 'libvlc.so'; // O ruta absoluta si lo empaquetas
} else if (process.platform === 'darwin') {
  libvlcPath = '/Applications/VLC.app/Contents/MacOS/lib/libvlc.dylib';
}

const libvlc = ffi.Library(libvlcPath, {
  // libvlc_new(int argc, const char *const *argv)
  'libvlc_new': [ voidPtr, [ 'int', 'pointer' ] ],
  // libvlc_media_new_location(libvlc_instance_t *, const char *mrl)
  'libvlc_media_new_location': [ voidPtr, [ voidPtr, 'string' ] ],
  // libvlc_media_player_new_from_media(libvlc_media_t *)
  'libvlc_media_player_new_from_media': [ voidPtr, [ voidPtr ] ],
  // libvlc_media_player_set_hwnd(libvlc_media_player_t *, void *drawable)
  //   En Windows recibe el HWND (int en 32-bit, o pointer en 64-bit). Con ref-napi basta con pasar un Buffer de 8 bytes.
  'libvlc_media_player_set_hwnd': [ 'void', [ voidPtr, 'pointer' ] ],
  // libvlc_media_player_play(libvlc_media_player_t *)
  'libvlc_media_player_play': [ 'int', [ voidPtr ] ],
  // libvlc_media_player_stop(libvlc_media_player_t *)
  'libvlc_media_player_stop': [ 'void', [ voidPtr ] ],
  // libvlc_media_player_release(libvlc_media_player_t *)
  'libvlc_media_player_release': [ 'void', [ voidPtr ] ],
  // libvlc_media_release(libvlc_media_t *)
  'libvlc_media_release': [ 'void', [ voidPtr ] ],
  // libvlc_release(libvlc_instance_t *)
  'libvlc_release': [ 'void', [ voidPtr ] ],
});

// Objeto para mantener referencias (para no liberar antes de tiempo):
let _vlcInstance = null;
let _vlcPlayer = null;
let _vlcMedia = null;

function initVLC(argsArray = []) {
  // argsArray: por ejemplo ['--no-xlib'], o ['--quiet'], etc.
  const argc = argsArray.length;
  // Crear un buffer de punteros a strings
  const argvBuffer = Buffer.alloc((argc + 1) * ref.sizeof.pointer);
  for (let i = 0; i < argc; i++) {
    const strBuf = Buffer.from(argsArray[i] + '\0', 'utf8');
    argvBuffer.writePointer(strBuf, i * ref.sizeof.pointer);
  }
  argvBuffer.writePointer(ref.NULL, argc * ref.sizeof.pointer);

  _vlcInstance = libvlc.libvlc_new(argc, argvBuffer);
  if (_vlcInstance.isNull()) {
    throw new Error('No se pudo inicializar libVLC');
  }
}

function playURLInHWND(mediaUrl, hwndBuffer) {
  if (!_vlcInstance) {
    initVLC([ '--quiet' ]);
  }

  // 1) Crea media desde la URL
  _vlcMedia = libvlc.libvlc_media_new_location(_vlcInstance, mediaUrl);
  if (_vlcMedia.isNull()) {
    throw new Error(`No se pudo crear media para: ${mediaUrl}`);
  }

  // 2) Crea media player a partir del media
  _vlcPlayer = libvlc.libvlc_media_player_new_from_media(_vlcMedia);
  if (_vlcPlayer.isNull()) {
    throw new Error('No se pudo crear media player');
  }

  // 3) Asocia el HWND (o drawable) al reproductor
  //    hwndBuffer debe ser un Buffer con el puntero nativo a la ventana (HWND en Windows).
  libvlc.libvlc_media_player_set_hwnd(_vlcPlayer, hwndBuffer);

  // 4) Iniciar la reproducción
  const result = libvlc.libvlc_media_player_play(_vlcPlayer);
  if (result !== 0) {
    throw new Error(`libvlc_media_player_play devolvió código ${result}`);
  }
}

function stopPlayback() {
  if (_vlcPlayer) {
    libvlc.libvlc_media_player_stop(_vlcPlayer);
    libvlc.libvlc_media_player_release(_vlcPlayer);
    _vlcPlayer = null;
  }
  if (_vlcMedia) {
    libvlc.libvlc_media_release(_vlcMedia);
    _vlcMedia = null;
  }
}

function releaseVLC() {
  stopPlayback();
  if (_vlcInstance) {
    libvlc.libvlc_release(_vlcInstance);
    _vlcInstance = null;
  }
}

module.exports = {
  initVLC,
  playURLInHWND,
  stopPlayback,
  releaseVLC,
};
