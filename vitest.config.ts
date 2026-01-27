import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        testMatch: ["**/packages/renderer-svg/**/*.{test,spec}.ts"],
        name: "renderer-svg",
        environment: "jsdom",
        setupFiles: ["<rootDir>/packages/renderer-svg/vitest.setup.ts"],
      },
      {
        testMatch: ["**/packages/core/**/*.{test,spec}.ts"],
        name: "core",
        environment: "node",
      },
    ],
    include: ["**/test/**/*.{test,spec}.ts", "**/*.{test,spec}.ts"],
    globals: true
  }
});
