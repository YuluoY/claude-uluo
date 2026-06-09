import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'] },

  js.configs.recommended,

  {
    files: ['**/*.ts'],
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

  {
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
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
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
          message: 'Use string union type or const object with "as const" instead of enum.',
        },
      ],
    },
  },
]
