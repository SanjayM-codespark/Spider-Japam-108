/**
 * react-native-sound needs a native module and real audio files. Nothing plays
 * in the test environment, so this stands in for it.
 *
 * The constructor is a jest.fn so tests can count how many times a file is
 * loaded. That matters for the counter click: a Sound built per tap would look
 * identical to one that is reused, except that it reloads and decodes the clip
 * on every press.
 *
 * The load callback is invoked, because otherwise nothing after the constructor
 * is ever exercised and a method called on a later line goes untested.
 */
const buildInstance = () => ({
  play: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  release: jest.fn(),
  setVolume: jest.fn(),
  setCurrentTime: jest.fn(),
  setNumberOfLoops: jest.fn(),
  getCurrentTime: jest.fn(() => Promise.resolve(0)),
  isPlaying: jest.fn(() => false),
});

const Sound = jest.fn((_filename, _basePath, onLoad) => {
  const instance = buildInstance();
  if (typeof onLoad === 'function') {
    // Deferred, as the real module does. Calling back synchronously would run
    // it while `const sound = new Sound(...)` is still being assigned, so the
    // instance would read as undefined inside the callback.
    Promise.resolve().then(() => onLoad(null, {}));
  }
  return instance;
});

Sound.setCategory = jest.fn();

// The real module resolves these to the bundle path on iOS and to the empty
// string on Android, where a bare filename is looked up in res/raw instead.
// Empty matches Android, which is what the tests assert against.
Sound.MAIN_BUNDLE = '';
Sound.DOCUMENT = '';
Sound.LIBRARY = '';
Sound.CACHES = '';

module.exports = {
  __esModule: true,
  default: Sound,
  Sound,
};
