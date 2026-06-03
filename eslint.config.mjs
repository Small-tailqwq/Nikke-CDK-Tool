import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
})

export default [
  ...compat.config({
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
  }),
]
