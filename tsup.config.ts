import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/reduce.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2023',
  sourcemap: true,
});
