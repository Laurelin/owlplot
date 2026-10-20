import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['**/packages/renderer-svg/**/*.{test,spec}.ts'],
          exclude: ['**/packages/renderer-svg/**/serialize/**'],
          name: 'renderer-svg',
          environment: 'jsdom',
          setupFiles: ['./packages/renderer-svg/vitest.setup.ts'],
        },
      },
      {
        test: {
          include: [
            '**/packages/renderer-svg/**/serialize/**/*.{test,spec}.ts',
          ],
          name: 'renderer-svg-serialize',
          environment: 'node',
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
      {
        test: {
          include: ['fixtures/**/*.{test,spec}.ts'],
          name: 'fixtures',
          environment: 'node',
        },
      },
      {
        test: {
          include: ['**/test/**/*.{test,spec}.ts'],
          name: 'exports',
          environment: 'node',
        },
      },
    ],
    globals: true,
  },
})
