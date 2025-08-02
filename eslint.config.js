import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  // Base ESLint recommended rules
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // Browser/Web APIs
        fetch: 'readonly',
        AbortSignal: 'readonly',
        EventTarget: 'readonly',
        Event: 'readonly',
        WebSocket: 'readonly',
        URL: 'readonly',
        MessageEvent: 'readonly',

        // WebRTC APIs
        RTCPeerConnection: 'readonly',
        RTCDataChannel: 'readonly',
        RTCConfiguration: 'readonly',
        RTCSessionDescriptionInit: 'readonly',
        RTCIceCandidateInit: 'readonly',
        RTCIceCandidate: 'readonly',
        RTCPeerConnectionState: 'readonly',
        RTCIceServer: 'readonly',
        RTCIceTransportPolicy: 'readonly',
        RTCBundlePolicy: 'readonly',
        RTCPeerConnectionIceEvent: 'readonly',
        RTCDataChannelEvent: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Base ESLint rules
      'no-unused-vars': 'off',
      'no-redeclare': 'off', // Turn off for TypeScript function overloads
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-redeclare': 'off', // Allow TypeScript function overloads
    },
  },

  // Test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.js.map',
      '*.d.ts.map',
      'docs/**',
      'bin/**',
      'examples/**/dist/**',
      '.prettierrc.js',
      'jest.config.js',
      'fix-esm-imports.js',
    ],
  },
];
