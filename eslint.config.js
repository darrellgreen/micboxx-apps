const baseConfig = require('./eslint-base.config.js');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  ...baseConfig,
  {
    plugins: {
      import: importPlugin,
    },
  },
];
