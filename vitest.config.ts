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
      // Today's real numbers, not an aspiration. 80 was configured but never
      // enforced (CI ran `vitest run`, so it never loaded), and the honest
      // figure with every source file measured is ~5%. These are a floor that
      // stops further slippage; the follow-up test work raises them.
      thresholds: {
        branches: 4,
        functions: 5,
        lines: 5,
        statements: 5,
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