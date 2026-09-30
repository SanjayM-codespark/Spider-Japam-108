import Sound from 'react-native-sound';

let current: Sound | null = null;

export const playAmbientTone = (): void => {
  if (current) {
    return;
  }
  Sound.setCategory('Playback');
  const sound = new Sound('meditation.mp3', Sound.MAIN_BUNDLE, error => {
    if (error) {
      return;
    }
    sound.setNumberOfLoops(-1);
    sound.setVolume(0.6);
    sound.play();
    current = sound;
  });
};

export const stopAmbientTone = (): void => {
  if (!current) {
    return;
  }
  current.stop();
  current.release();
  current = null;
};

/**
 * The click played on every counter tap.
 *
 * Loaded once and kept, rather than built per tap. A counter tap is the hottest
 * interaction in the app, and constructing a Sound each time would load and
 * decode the file on the one frame where the response is most noticeable.
 * Until the first tap there is no cost at all, so nothing is loaded at startup.
 */
let tap: Sound | null = null;
let tapLoading = false;

/**
 * Taps closer together than this only make one click.
 *
 * Holds a bead against the screen rather than tapping it, and a stray double
 * press, otherwise produce a stutter that sounds like a fault. Well under the
 * fastest sensible bead pace, so it never swallows a deliberate tap.
 */
const TAP_MIN_INTERVAL_MS = 40;

let lastTapAt = 0;

export const playTapSound = (): void => {
  const now = Date.now();
  if (now - lastTapAt < TAP_MIN_INTERVAL_MS) {
    return;
  }
  lastTapAt = now;

  if (tap) {
    // Rewind before replaying, or the click is cut off on the second tap and
    // silent after the first few.
    tap.stop();
    tap.setCurrentTime(0);
    tap.play();
    return;
  }

  // A tap can land while the first load is still in flight. Queue it, or the
  // first tap is silent and it is not clear whether the sound works at all.
  if (tapLoading) {
    return;
  }
  tapLoading = true;

  Sound.setCategory('Ambient', true);
  const sound = new Sound('tap.wav', Sound.MAIN_BUNDLE, error => {
    tapLoading = false;
    if (error) {
      return;
    }
    // Kept well under the ambient track's 0.6. This sits under every tap, so it
    // has to stay out of the way of the reading and of the recitation.
    sound.setVolume(0.35);
    sound.play();
    tap = sound;
  });
};