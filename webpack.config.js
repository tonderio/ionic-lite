const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const DeclarationBundlerPlugin = require('types-webpack-bundler');

module.exports = (env, argv) => {
  return {
    mode: 'production',
    entry: './src/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.js',
      library: '@tonder/ionic-lite-sdk',
      libraryTarget: 'umd',
      globalObject: 'this',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    devtool: false,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
              {
                  loader: 'ts-loader',
                  options: {
                    transpileOnly: false
                  }
              },
          ],
          include: [path.resolve(__dirname, 'src')]
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
        }),
      ],
    },
    plugins: [
      new DeclarationBundlerPlugin({
          moduleName:'IonicLiteSdk',
          out:'./index.d.ts',
      })
    ]
  };
};