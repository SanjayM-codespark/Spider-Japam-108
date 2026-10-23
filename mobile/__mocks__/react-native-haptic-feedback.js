/**
 * The real package resolves a TurboModule at import time, which throws under
 * jest because there is no native binary. The app only calls these two
 * functions, so a no-op is enough.
 */
const noop = () => {};

module.exports = {
  __esModule: true,
  default: {
    trigger: noop,
    impactAsync: noop,
    notificationAsync: noop,
    selectionAsync: noop,
  },
  trigger: noop,
  impactAsync: noop,
  notificationAsync: noop,
  selectionAsync: noop,
};
