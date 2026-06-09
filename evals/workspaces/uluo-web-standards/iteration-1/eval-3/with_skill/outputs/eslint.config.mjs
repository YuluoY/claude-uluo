/**
 * ESLint flat config — JS-only, mirrors uluo-web-standards MUST rules.
 * Created locally because the skill config's local-rules plugin has a CJS/ESM
 * compatibility issue outside the skill's own directory.
 */
import js from '@eslint/js'
import pluginImport from 'eslint-plugin-import-x'

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'] 
  },

  js.configs.recommended,

  {
    plugins: {
      import: pluginImport 
    },
    rules: {
      'no-var': 'error',
      'no-console': 'error',
      'eqeqeq': ['error', 'smart'],
      'indent': ['error', 2],
      'brace-style': ['error', 'allman'],
      'no-tabs': 'error',
      'semi': ['error', 'never'],
      'no-empty': ['error', {
        allowEmptyCatch: false 
      }],
      'curly': ['error', 'multi-line'],
      'nonblock-statement-body-position': ['error', 'below'],
      'max-lines': ['error', {
        max: 500, skipBlankLines: true, skipComments: true 
      }],
      'import/no-default-export': 'error',
      'import/no-cycle': ['error', {
        maxDepth: 5 
      }],
      'object-curly-newline': ['error', {
        ObjectExpression: {
          multiline: true, minProperties: 1 
        },
        ObjectPattern: {
          multiline: true, minProperties: 3 
        },
        ImportDeclaration: {
          multiline: true, minProperties: 3 
        },
        ExportDeclaration: {
          multiline: true, minProperties: 1 
        },
      }],
      'arrow-parens': ['error', 'as-needed'],
      'max-params': ['warn', {
        max: 3 
      }],
    },
  },

  {
    files: ['**/*.test.*', '**/*.spec.*'],
    rules: {
      'no-console': 'off',
      'max-params': 'off',
    },
  },
  {
    files: ['eslint.config.*'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
]
