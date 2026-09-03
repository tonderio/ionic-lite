const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');
const replace = require('@rollup/plugin-replace');
const packageJson = require('./package.json');

module.exports = {
  input: './src/index.ts',
  output:
  {
    dir: 'dist',
    format: 'es',
    plugins: [terser()]
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        '__SDK_NAME__': JSON.stringify(packageJson.name),
        '__SDK_VERSION__': JSON.stringify(packageJson.version)
      }
    }),
    typescript({
      exclude: ["tests/**", "jest.config.ts"]
    })
  ],
  external: ["skyflow-js", "crypto-js"]
};