module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-hooks'],
  ignorePatterns: ['dist/', 'node_modules/', '.vercel/', 'coverage/'],
  rules: {
    // Existing camera/browser APIs and AI responses use dynamic shapes.
    // Keep strict tsc checks; a full typing migration is separate from deployment cleanup.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
};
