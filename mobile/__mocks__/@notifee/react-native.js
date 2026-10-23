/**
 * Notifee's native module is unavailable under jest. The counter screen only
 * asks for permission and displays a notification, so empty stubs are enough
 * for the app tree to mount.
 */
module.exports = {
  __esModule: true,
  default: {
    requestPermission: jest.fn(async () => ({authorizationStatus: 1})),
    createChannel: jest.fn(async () => 'default'),
    displayNotification: jest.fn(async () => undefined),
    cancelNotification: jest.fn(async () => undefined),
    getInitialNotification: jest.fn(async () => null),
    onForegroundEvent: jest.fn(() => () => {}),
    onBackgroundEvent: jest.fn(() => {}),
    createTriggerNotification: jest.fn(async () => undefined),
    cancelTriggerNotifications: jest.fn(async () => undefined),
  },
  AndroidImportance: {LOW: 2, DEFAULT: 3, HIGH: 4},
  EventType: {DELIVERED: 4, DISMISSED: 3, PRESS: 1},
  AuthorizationStatus: {DENIED: 0, AUTHORIZED: 1},
  AndroidImportance_: {LOW: 2, DEFAULT: 3, HIGH: 4},
};
