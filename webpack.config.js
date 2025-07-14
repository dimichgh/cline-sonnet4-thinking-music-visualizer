const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/renderer/app.ts',
  target: 'electron-renderer',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: [
          path.resolve(__dirname, 'src/renderer'),
          path.resolve(__dirname, 'src/shared')
        ],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.renderer.json'
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|wav|mp3)$/i,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@audio': path.resolve(__dirname, 'src/renderer/audio'),
      '@visualization': path.resolve(__dirname, 'src/renderer/visualization'),
      '@ui': path.resolve(__dirname, 'src/renderer/ui')
    },
    fallback: {
      "events": require.resolve("events/")
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html'
    }),
    new webpack.ProvidePlugin({
      global: 'globalThis'
    })
  ],
  optimization: {
    minimize: process.env.NODE_ENV === 'production'
  },
  externals: {
    electron: 'commonjs electron'
  },
  node: {
    __dirname: false,
    __filename: false
  }
};
