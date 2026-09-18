import path from 'path';
import { defineConfig } from 'vitest/config';

// environment: 'node' is deliberate — src/core must stay framework/DOM free,
// and running its tests under node (not jsdom) enforces that.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      exclude: ['src/core/**/*.test.ts', 'src/core/index.ts', 'src/core/types.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
