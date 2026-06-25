/**
 * ESLint flat config — JS/TS/Vue/React 统一规则。
 *
 * files 过滤保证各插件只匹配对应扩展名，不使用的框架零开销：
 *   - @typescript-eslint → .ts/.tsx/.mts/.cts
 *   - eslint-plugin-vue   → .vue
 *   - eslint-plugin-react → .tsx/.jsx
 *
 * 依赖：pnpm add -D eslint @eslint/js typescript-eslint \
 *                    eslint-plugin-import-x eslint-plugin-vue \
 *                    eslint-plugin-react eslint-plugin-react-hooks
 */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import pluginImport from 'eslint-plugin-import-x'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const localRules = { rules: { 'no-brace-single-statement': require('./eslint-local-rules/no-brace-single-statement.cjs') } }

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'] },

  js.configs.recommended,

  // ── Vue ──
  ...pluginVue.configs['flat/recommended'],

  // ── React ──
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],

  // ── TS 规则：.ts/.tsx/.mts/.cts（tseslint 做主 parser）──
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: { parser: tseslint.parser },
    rules: {
      ...tseslint.configs.recommended.reduce((acc, c) => c.rules ? { ...acc, ...c.rules } : acc, {}),
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/naming-convention': ['error',
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
        { selector: 'typeAlias', format: ['PascalCase'] },
      ],
    },
  },

  // ── TS 规则：.vue <script lang="ts">（vue-eslint-parser 做主 parser，tseslint 嵌入）──
  {
    files: ['**/*.vue'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/naming-convention': ['error',
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
        { selector: 'typeAlias', format: ['PascalCase'] },
      ],
    },
  },

  // ── 全局规则（所有文件）──
  {
    plugins: { import: pluginImport, 'local-rules': localRules },
    rules: {
      'no-var': 'error',
      'no-console': 'error',
      'eqeqeq': 'error',
      'indent': ['error', 2],
      'brace-style': ['error', 'allman'],
      'no-tabs': 'error',
      'semi': ['error', 'never'],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'curly': ['error', 'all'],
      'nonblock-statement-body-position': ['error', 'below'],
      'local-rules/no-brace-single-statement': 'error',
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'import/no-default-export': 'error',
      'import/no-cycle': ['error', { maxDepth: 5 }],
      'object-curly-newline': ['error', {
        ObjectExpression: { multiline: true, minProperties: 1 },
        ObjectPattern: { multiline: true, minProperties: 3 },
        ImportDeclaration: { multiline: true, minProperties: 3 },
        ExportDeclaration: { multiline: true, minProperties: 1 },
      }],
      'arrow-parens': ['error', 'as-needed'],
      'max-params': ['warn', { max: 3 }],
      'no-restricted-syntax': ['error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use string union type or const object with "as const" instead of enum.'
        },
      ],
    },
  },

  // ── Vue 专项规则 ──
  {
    files: ['**/*.vue'],
    rules: {
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/attributes-order': 'error',
      'vue/html-indent': ['error', 2],
      'vue/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
    },
  },

  // ── React 专项规则 ──
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: { 'react-hooks': pluginReactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-indent': ['error', 2],
      'react/jsx-indent-props': ['error', 2],
      'react/jsx-curly-newline': ['error', {
        singleline: 'consistent',
        multiline: 'consistent',
      }],
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  { files: ['**/*.test.*', '**/*.spec.*'], rules: { 'no-console': 'off', 'max-params': 'off' } },
]
