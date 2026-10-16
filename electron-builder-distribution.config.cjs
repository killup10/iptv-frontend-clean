const config = require('./electron-builder.config.cjs');

module.exports = {
  ...config,
  directories: {
    ...config.directories,
    output: 'release_distribution_20261013'
  }
};
