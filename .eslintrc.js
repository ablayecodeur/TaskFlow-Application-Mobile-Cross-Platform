module.exports = {
  extends: ['expo', 'eslint:recommended'],
  plugins: [],
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
