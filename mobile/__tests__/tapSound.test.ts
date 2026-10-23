/**
 * The click played on every counter tap.
 *
 * CounterButton taps are the hottest interaction in the app, so what matters is
 * what happens across a burst of them: one click rather than twenty, and no
 * reload of the file on the way. A Sound built per tap decodes the clip on the
 * frame where the response is most noticeable, which is easy to write and hard
 * to spot without counting constructions.
 */
const TAP_MIN_INTERVAL_MS = 40;

jest.mock('react-native-sound');

/**
 * Fresh module state per test, because the service caches the loaded clip in a
 * module level variable.
 *
 * The mock is re-required alongside it: resetModules hands the service a new
 * copy of react-native-sound, so the import at the top of this file would be a
 * different constructor and would record nothing.
 */
const setup = () => {
  jest.resetModules();

  /* eslint-disable @typescript-eslint/no-var-requires */
  const mockModule = require('react-native-sound') as {default: jest.Mock};
  const service = require('../src/services/sound') as typeof import('../src/services/sound');
  /* eslint-enable @typescript-eslint/no-var-requires */

  const SoundMock = mockModule.default;
  SoundMock.mockClear();
  SoundMock.mockImplementation(
    (_filename: string, _basePath: unknown, onLoad: (e: unknown, p: unknown) => void) => {
      Promise.resolve().then(() => onLoad(null, {}));
      return {
        play: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        release: jest.fn(),
        setVolume: jest.fn(),
        setCurrentTime: jest.fn(),
        setNumberOfLoops: jest.fn(),
        getCurrentTime: jest.fn(() => Promise.resolve(0)),
        isPlaying: jest.fn(() => false),
      };
    },
  );

  return {
    service,
    SoundMock,
    MAIN_BUNDLE: (mockModule.default as unknown as {MAIN_BUNDLE: string})
      .MAIN_BUNDLE,
  };
};

/** The instance handed back by the most recent construction. */
const lastInstance = (SoundMock: jest.Mock) => {
  const results = SoundMock.mock.results;
  return results[results.length - 1].value as {
    play: jest.Mock;
    stop: jest.Mock;
    setCurrentTime: jest.Mock;
    setVolume: jest.Mock;
  };
};

const constructionCount = (SoundMock: jest.Mock) => SoundMock.mock.calls.length;

/** Lets the deferred load callback run, as it would on a real device. */
const flush = () => Promise.resolve().then(() => Promise.resolve());

/**
 * A fixed clock, set before the first tap.
 *
 * The guard compares against the previous tap, so the tests have to move
 * forward from a known base. Jumping to a small value instead would land before
 * the first tap and read as a huge negative gap, which the guard treats as part
 * of the same burst.
 */
const BASE = 1_700_000_000_000;

const startClock = () => {
  jest.useFakeTimers();
  jest.setSystemTime(BASE);
};

const advance = (ms: number) => {
  jest.setSystemTime(Date.now() + ms);
};

afterEach(() => {
  jest.useRealTimers();
});

describe('playTapSound', () => {
  it('loads the click only on the first tap, not at startup', async () => {
    const {service, SoundMock} = setup();

    // Nothing is loaded until the first tap, so startup stays quiet and costs
    // nothing for a user who never counts.
    expect(constructionCount(SoundMock)).toBe(0);

    service.playTapSound();
    await flush();

    expect(constructionCount(SoundMock)).toBe(1);
  });

  it('asks for tap.wav from the app bundle', async () => {
    const {service, SoundMock, MAIN_BUNDLE} = setup();

    service.playTapSound();
    await flush();

    // Extension included, matching how the ambient track is loaded.
    expect(SoundMock).toHaveBeenCalledWith(
      'tap.wav',
      MAIN_BUNDLE,
      expect.any(Function),
    );
  });

  it('replays one loaded sound instead of rebuilding it per tap', async () => {
    const {service, SoundMock} = setup();

    startClock();
    service.playTapSound();
    await flush();
    const sound = lastInstance(SoundMock);

    advance(1_000);
    service.playTapSound();
    advance(2_000);
    service.playTapSound();

    // Still one construction across the whole burst. Building a Sound per tap
    // would reload and decode the file on every press.
    expect(constructionCount(SoundMock)).toBe(1);
    expect(sound.play).toHaveBeenCalledTimes(3);
  });

  it('rewinds before replaying so the click is not cut off', async () => {
    const {service, SoundMock} = setup();
    startClock();
    service.playTapSound();
    await flush();
    const sound = lastInstance(SoundMock);

    advance(1_000);
    service.playTapSound();

    // Without a rewind the second tap replays from the end of the clip, which
    // is silence, so the sound appears to work once and then stop.
    expect(sound.stop).toHaveBeenCalled();
    expect(sound.setCurrentTime).toHaveBeenCalledWith(0);
  });

  it('keeps the click quiet under the ambient track', async () => {
    const {service, SoundMock} = setup();

    service.playTapSound();
    await flush();

    // The ambient track runs at 0.6. This one sits under every tap, so it has to
    // stay out of the way of the reading and the recitation.
    expect(lastInstance(SoundMock).setVolume).toHaveBeenCalledWith(0.35);
  });

  it('collapses a burst into a single click', async () => {
    const {service, SoundMock} = setup();

    startClock();
    service.playTapSound();
    // The load has to finish first, otherwise these taps are held by the
    // in-flight guard below and the interval guard is never exercised.
    await flush();
    const sound = lastInstance(SoundMock);

    // A double press, and a bead held against the screen, both land inside the
    // guard window. Two extra clicks would stutter audibly.
    advance(10);
    service.playTapSound();
    advance(5);
    service.playTapSound();

    expect(constructionCount(SoundMock)).toBe(1);
    expect(sound.play).toHaveBeenCalledTimes(1);
  });

  it('does not start a second load while the first is still in flight', async () => {
    const {service, SoundMock} = setup();

    startClock();
    service.playTapSound(); // begins the load
    // A tap landing before the file has loaded must not queue another load, or a
    // fast first count allocates the clip over and over.
    advance(500);
    service.playTapSound();
    advance(600);
    service.playTapSound();

    expect(constructionCount(SoundMock)).toBe(1);

    await flush();
    expect(lastInstance(SoundMock).play).toHaveBeenCalledTimes(1);
  });

  it('still plays a tap that lands after the guard window', async () => {
    const {service, SoundMock} = setup();

    startClock();
    service.playTapSound();
    await flush();
    const sound = lastInstance(SoundMock);

    // Comfortably slower than any deliberate bead pace, so the guard never eats
    // a real tap.
    advance(TAP_MIN_INTERVAL_MS + 1);
    service.playTapSound();

    expect(sound.play).toHaveBeenCalledTimes(2);
  });

  it('stays quiet when the file fails to load', async () => {
    jest.resetModules();
    /* eslint-disable @typescript-eslint/no-var-requires */
    const mockModule = require('react-native-sound') as {default: jest.Mock};
    const {playTapSound} = require('../src/services/sound') as typeof import('../src/services/sound');
    /* eslint-enable @typescript-eslint/no-var-requires */

    mockModule.default.mockImplementation(
      (_name: string, _base: unknown, onLoad: (e: unknown, p: unknown) => void) => {
        // react-native-sound reports a missing asset through the callback rather
        // than throwing, so it has to be handled without taking the tap down.
        Promise.resolve().then(() => onLoad('not found', {}));
        return {
          play: jest.fn(),
          stop: jest.fn(),
          setCurrentTime: jest.fn(),
          setVolume: jest.fn(),
        };
      },
    );

    playTapSound();
    await expect(flush()).resolves.not.toThrow();
  });
});

describe('ambient tone', () => {
  it('keeps playing while the counter is tapped', async () => {
    const {service, SoundMock} = setup();

    startClock();
    service.playAmbientTone();
    service.playTapSound();
    await flush();

    advance(1_000);
    service.playTapSound();

    // The ambient track loops forever and the tap must not disturb it, which is
    // why they are separate instances.
    const names = SoundMock.mock.calls.map(call => call[0]);
    expect(names).toContain('meditation.mp3');
    expect(names).toContain('tap.wav');
    expect(service.playTapSound).not.toBe(service.playAmbientTone);
  });
});
