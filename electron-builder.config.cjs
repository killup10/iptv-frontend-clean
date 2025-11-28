// electron-builder.config.cjs
/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.teamg.play.desktop",
  productName: "TeamG Play Desktop",
  asar: true,
  asarUnpack: [
    "mpv/**"
  ],
  directories: {
    buildResources: "assets_electron",
    output: "release_electron"
  },
  files: [
    "dist/**/*",
    "assets/**/*",
    "electron.cjs",
    "preload.cjs",
    "package.json"
  ],
  extraResources: [
    {
      from: "mpv",
      to: "mpv",
      filter: ["**/*"]
    }
  ],
  afterPack: "./afterPackHook.cjs",
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.ico"
  },
  mac: {
    target: "dmg",
    icon: "assets/icon.png",
    category: "public.app-category.entertainment"
  },
  linux: {
    target: "AppImage",
    icon: "assets/icon.png",
    category: "AudioVideo;Player;Video;"
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    installerIcon: "assets/icon.ico",
    uninstallerIcon: "assets/icon.ico"
  }
};
