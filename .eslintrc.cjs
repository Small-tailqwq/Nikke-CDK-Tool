/* Basic ESLint config for Vue 3 + TypeScript friendly (JS files ok). */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-prettier',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'vue/multi-word-component-names': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
}
