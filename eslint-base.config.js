const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: ['**/node_modules/*', '**/dist/*', '**/.expo/*', '**/ios/*', '**/android/*'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './packages', from: './apps', message: 'Packages cannot import from apps.' },
          ],
        },
      ],
    },
  },
]);
