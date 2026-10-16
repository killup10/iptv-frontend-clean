const config = require('./electron-builder.config.cjs');

module.exports = {
  ...config,
  directories: {
    ...config.directories,
    output: 'release_electron_v1514'
  }
};
