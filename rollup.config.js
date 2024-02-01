const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');

module.exports = {
  input: './src/index.ts',
  output: {
    dir: 'dist',
    format: 'es',
    plugins: [terser()]
  },
  plugins: [
    typescript({
      exclude: ["tests/**", "jest.config.ts"]
    })
  ],
  external: ["skyflow-js", "crypto-js"]
};