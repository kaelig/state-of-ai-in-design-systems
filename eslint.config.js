// Flat config. Covers the .mjs and .js this repo actually runs under Node.
//
// No typescript-eslint: it declares `typescript: ">=4.8.4 <6.1.0"` and this repo
// is on TypeScript 7. The only .ts here lives in netlify/edge-functions/ and runs
// on Deno, which `deno lint` understands better than typescript-eslint would.
// Revisit when the peer range admits 7.
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dashboard/**',
      'build/**',
      'node_modules/**',
      '.netlify/**',
      'netlify/edge-functions/**',
      'types/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    // The MCP suite uses node:test globals via imports, but assertions there
    // legitimately shadow outer names; keep the rule set honest rather than noisy.
    files: ['tests/**/*.mjs'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettier,
];
