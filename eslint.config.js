import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended, // or .configs.recommendedTypeChecked if you want type-aware rules
  prettierConfig, // turns off ESLint rules that conflict with Prettier
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error', // shows Prettier issues as ESLint errors (red squiggles)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Optional: apply only to certain files (great for monorepos)
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.config.{js,ts}',
      'vitest.config.ts',
    ],
  },
  // Typed scene identity: do not parse node ids (for example
  // `node.id.split(':')`); read seriesId/datumIndex/axis from the typed
  // scene fields instead. One selector, on purpose: it is a speed bump,
  // and the required fields are the real fence.
  {
    files: ['packages/**/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name=/^(split|startsWith|match|endsWith)$/][callee.object.property.name='id']",
          message:
            'Do not parse node ids. Read seriesId/datumIndex/axis from typed scene fields.',
        },
      ],
    },
  },
  // Hover: use getAttribute(DATA_*) from shared/dataAttributes; no .dataset (camelCase breaks selectors)
  // Merged with the id-parsing rule above: a second no-restricted-syntax
  // block for these files would replace the first in flat config.
  {
    files: ['packages/renderer-svg/src/hover/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='dataset']",
          message:
            'Use getAttribute(DATA_*) from shared/dataAttributes instead of .dataset in hover.',
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(split|startsWith|match|endsWith)$/][callee.object.property.name='id']",
          message:
            'Do not parse node ids. Read seriesId/datumIndex/axis from typed scene fields.',
        },
      ],
    },
  },
  // Scripts and fixtures use the public package API only (built dist via
  // exports). esbuild would bundle a deep src import, so lint blocks it.
  {
    files: ['scripts/**', 'fixtures/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/*/src/**'],
              message: 'Import from @owlplot/core or @owlplot/renderer-svg.',
            },
          ],
        },
      ],
    },
  }
)
