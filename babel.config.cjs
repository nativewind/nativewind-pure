const ReactCompilerConfig = {
  target: "18",
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "@babel/preset-env",
      "@babel/preset-typescript",
      ["@babel/preset-react", { runtime: "automatic" }],
    ],
    plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
  };
};
