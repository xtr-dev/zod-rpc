import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        FileReader: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        Math: 'readonly',
        event: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  }
];