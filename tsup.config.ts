import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node18',
  bundle: true,
  minify: false,
  sourcemap: false,
  clean: true,
  dts: false,
  platform: 'node',
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