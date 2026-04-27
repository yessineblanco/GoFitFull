module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated must be the last plugin (UI-thread animations, 60/120Hz).
    plugins: ['react-native-reanimated/plugin'],
  };
};

