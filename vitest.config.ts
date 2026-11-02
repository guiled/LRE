import { defineConfig } from "vitest/config";

// ts-unused-exports:disable-next-line
export default defineConfig({
  test: {
    // Automatically clear mock calls, instances, contexts and results before every test
    clearMocks: true,

    // Enable coverage collection
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**"],
      exclude: ["**/*.d.ts", "**/I[A-Z]*.ts", "src/swc/**", "src/index.ts"],
      reportsDirectory: "coverage",
    },

    // Global test APIs without imports (like Jest)
    globals: true,

    // Setup files to run before each test file
    setupFiles: ["./tests/vitest-setup.ts"],

    // Exclude patterns
    exclude: ["node_modules", "out", "build"],

    // Include pattern for test files
    include: ["**/*.test.ts"],
  },
});
