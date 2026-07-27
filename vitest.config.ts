import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      // lcov is what Codecov consumes — without it CI has nothing to upload.
      reporter: ['text', 'json', 'html', 'lcov'],
      // Measure every source file, not just the ones a test happened to
      // import, so the denominator cannot shrink into a flattering number.
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'tests/**',
        'scripts/**',
      ],
      // Today's real numbers, not an aspiration — a ratchet that stops
      // slippage. What is left uncovered is `src/index.ts` (the stdio wiring)
      // and `puppeteer-client.ts`, which needs a real browser; both belong in
      // an integration suite rather than here.
      thresholds: {
        branches: 84,
        functions: 78,
        lines: 88,
        statements: 87,
      },
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});