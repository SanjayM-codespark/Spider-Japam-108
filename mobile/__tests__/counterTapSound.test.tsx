/**
 * The counter button has to actually make the click.
 *
 * The service is mocked here rather than exercised for real, because the part
 * worth protecting is the wiring: the sound has to be triggered by the press,
 * alongside the haptic that was already there, and not from somewhere further up
 * the tree where it would fire for other touches.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {CounterButton} from '../src/components';

const mockPlayTapSound = jest.fn();

// The mock has to reach the assertion through require, because a factory is
// hoisted above the const it would otherwise close over.
jest.mock('../src/services/sound', () => ({
  playTapSound: () => mockPlayTapSound(),
}));

let tree: ReactTestRenderer.ReactTestRenderer | undefined;

afterEach(() => {
  if (tree) {
    ReactTestRenderer.act(() => tree?.unmount());
    tree = undefined;
  }
  jest.clearAllMocks();
});

const press = async (onPress = jest.fn()) => {
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <CounterButton onPress={onPress} size={140} strokeWidth={6}>
        <></>
      </CounterButton>,
    );
  });

  const button = tree!.root
    // findAllByType needs the component, not the host element it renders to.
    .findAll(node => typeof node.props.onPress === 'function' && node.props.activeOpacity === 0.85)
    .pop()!;

  await ReactTestRenderer.act(async () => {
    button.props.onPress();
  });

  return onPress;
};

describe('CounterButton', () => {
  it('plays the click on every press', async () => {
    const onPress = await press();

    expect(mockPlayTapSound).toHaveBeenCalledTimes(1);
    // The count still has to happen, not just make a noise.
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the haptic it already had', async () => {
    // CounterButton imports the default export, so the spy has to go on that,
    // not on the module namespace.
    const HapticFeedback = require('react-native-haptic-feedback').default;
    const trigger = jest.fn();
    HapticFeedback.trigger = trigger;

    await press();

    // The click is added to this, not a replacement for it.
    expect(trigger).toHaveBeenCalledWith(
      'impactMedium',
      expect.objectContaining({enableVibrateFallback: true}),
    );
  });

  it('passes the stroke width through to the ring', async () => {
    const ProgressRing = require('../src/components/ProgressRing/ProgressRing').default;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <CounterButton onPress={jest.fn()} size={140} strokeWidth={6}>
          <></>
        </CounterButton>,
      );
    });

    const ring = tree!.root.findAllByType(ProgressRing)[0];
    // CounterButton defaults to 8, drawn for the old 220 circle, so the counter
    // screen has to be able to scale it down.
    expect(ring.props.size).toBe(140);
    expect(ring.props.strokeWidth).toBe(6);
  });
});
