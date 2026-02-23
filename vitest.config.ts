import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['**/packages/renderer-svg/**/*.{test,spec}.ts'],
          name: 'renderer-svg',
          environment: 'jsdom',
          setupFiles: ['./packages/renderer-svg/vitest.setup.ts'],
        },
      },
      {
        test: {
          include: ['**/packages/core/**/*.{test,spec}.ts'],
          name: 'core',
          environment: 'node',
        },
      },
      {
        test: {
          include: ['**/apps/svg-playground/**/*.{test,spec}.ts'],
          name: 'svg-playground',
          environment: 'node',
        },
      },
    ],
    include: ['**/test/**/*.{test,spec}.ts', '**/*.{test,spec}.ts'],
    globals: true,
  },
})
