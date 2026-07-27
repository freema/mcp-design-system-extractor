import { defineConfig } from 'tsup';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  bundle: true,
  minify: false,
  sourcemap: false,
  clean: true,
  dts: false,
  platform: 'node',
  // Single source of truth for the version. It was hardcoded in index.ts and
  // had already drifted (1.1.0 there vs 1.1.1 in package.json).
  define: {
    __PKG_VERSION__: JSON.stringify(pkg.version),
  },
  splitting: false,
  external: [
    'node-html-parser'
  ],
  noExternal: [
    '@modelcontextprotocol/sdk',
    'zod'
  ],
  onSuccess: 'echo "✅ Build completed successfully!"'
});