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
      // add your custom rules here, e.g.:
      // '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
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
  }
)
