export default {
  external: ['jsep'],
  input: './src/index.mjs',
  output: {
    dir: 'dist',
    entryFileNames: '[name].js',
    exports: 'named',
    format: 'cjs',
    preserveModules: true,
  },
};
