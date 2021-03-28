export default {
  external: ['jsep'],
  input: './src/index.mjs',
  output: {
    dir: 'dist',
    exports: 'default',
    format: 'cjs',
    entryFileNames: '[name].cjs',
    preserveModules: true,
  },
};
