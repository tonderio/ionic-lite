const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  const plugins = [];
  if (!isProduction) {
    plugins.push(new HtmlWebpackPlugin({
      template: 'src/index.html'
    }));
  }

  return {
    mode: isProduction ? 'production' : 'development',
    entry: isProduction ? './src/index.js': './src/index-dev.js',
    output: {
      path: path.resolve(__dirname, 'v1'),
      filename: isProduction ? 'bundle.min.js' : 'bundle.js',
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