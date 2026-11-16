/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache(true);

  return {
    // The React Compiler is turned on in app.config.ts (`experiments.reactCompiler`); the preset reads it.
    presets: ['babel-preset-expo'],
    plugins: [
      // Unistyles finds which theme values each StyleSheet uses and links the styles to the
      // components, so native code can update them without a re-render (ADR 0002).
      // `root` is the folder it processes. Route files in `app/` are thin and have no styles.
      // The plugin turns itself off when NODE_ENV is "test"; Jest uses the mock in src/test.
      ['react-native-unistyles/plugin', { root: 'src' }],
    ],
  };
};
