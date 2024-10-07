const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./app.js",
  output: {
    filename: "./bundle.js",
    path: path.resolve(__dirname, "."),
  },
  resolve: {
    fallback: {
      buffer: require.resolve("buffer/"), // Polyfill buffer
      process: require.resolve("process/browser"), // Polyfill process
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"], // Provide Buffer globally
      process: "process/browser", // Provide process globally
    }),
    new webpack.DefinePlugin({
      'process.env.AWS_ACCESS_KEY_ID': JSON.stringify(process.env.AWS_ACCESS_KEY_ID),
      'process.env.AWS_SECRET_ACCESS_KEY': JSON.stringify(process.env.AWS_SECRET_ACCESS_KEY),
      'process.env.AWS_SESSION_TOKEN': JSON.stringify(process.env.AWS_SESSION_TOKEN),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "/"),
    },
    port: 3000,
  },
  mode: "development",
};
