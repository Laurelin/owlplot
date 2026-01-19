import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    environment: "node",
    include: ["**/test/**/*.{test,spec}.ts", "**/*.{test,spec}.ts"],
    globals: true
  }
});
