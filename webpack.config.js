const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  const plugins = [
    new webpack.DefinePlugin({
      'process.env.BASE_URL': JSON.stringify(process.env.BASE_URL),
    })
  ];
  if (!isProduction) {
    plugins.push(new HtmlWebpackPlugin({
      template: 'src/index.html'
    }));
  }

  return {
    devtool: 'inline-source-map',
    mode: isProduction ? 'production' : 'development',
    entry: isProduction ? './src/index.ts': './src/index-dev.js',
    output: {
      path: path.resolve(__dirname, 'v1'),
      filename: isProduction ? 'bundle.min.js' : 'bundle.js',
      library: 'TonderSdk',
      libraryTarget: 'umd',
      globalObject: 'this',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    devtool: isProduction ? false : 'inline-source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 8080,
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.tsx?$/,
          use: [
              {
                  loader: 'ts-loader',
              },
          ],
          include: [path.resolve(__dirname, 'src')],
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
    plugins: plugins,
    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
        }),
      ],
    },
  };
};