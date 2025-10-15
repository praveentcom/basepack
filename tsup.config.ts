import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  target: 'node22',
  sourcemap: true,
  clean: true,
  minify: false,
  skipNodeModulesBundle: true,
});

