import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
    fileParallelism: false, // API tests share one test database, so run files one after another
    testTimeout: 20000,
  },
});
