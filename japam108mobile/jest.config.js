module.exports = {
  preset: '@react-native/jest-preset',
  // The preset only lets react-native packages through babel, but the
  // navigation stack and most of the native modules this app depends on ship
  // untranspiled ESM. Without these, the first test fails to parse on an
  // `import` statement inside node_modules.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?' +
      '|@react-navigation' +
      '|@notifee' +
      '|@op-engineering' +
      '|react-native-screens' +
      '|react-native-safe-area-context' +
      '|react-native-svg' +
      '|react-native-gesture-handler' +
      '|react-native-reanimated' +
      '|react-native-sound' +
      '|react-native-haptic-feedback' +
      '|react-native-image-picker' +
      ')/)',
  ],
};
