const config = {
  presets: ["@babel/env", "@babel/preset-typescript"],
  plugins: [
    "@babel/proposal-class-properties",
    "@babel/proposal-object-rest-spread",
  ],
};

module.exports = config;
