/**
 * The naam and the script share a scroll region that takes the space left over
 * by the counter below. Three things are easy to break:
 *
 *  - putting the counter inside that region, so a long script scrolls the
 *    button the user needs to tap off the screen;
 *  - capping the script again, which puts the reading back in a fixed 88px box;
 *  - measuring the wrong box, because ScrollView counts
 *    contentContainerStyle padding in onContentSizeChange. A script that fits
 *    would then report itself as overflowing and the view would scroll for
 *    nothing.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {ScrollView, Text, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Naam} from '../src/database/database';
import {TabParamList} from '../src/navigation/types';

jest.mock('../src/database/database', () => ({
  getSelectedNaam: jest.fn(async () => null),
  getAllNaams: jest.fn(async () => []),
  saveNaamCount: jest.fn(async () => undefined),
  recordSession: jest.fn(async () => undefined),
  resetDailyCount: jest.fn(async () => undefined),
  formatDateKey: jest.fn(() => '2026-01-01'),
  getStreak: jest.fn(async () => 0),
  getDailyCounts: jest.fn(async () => []),
  addNaamLog: jest.fn(async () => undefined),
  selectNaamForContent: jest.fn(async () => 1),
  getSetting: jest.fn(async () => null),
  setSetting: jest.fn(async () => undefined),
  getNaamJapReminders: jest.fn(async () => []),
  addNaamJapReminder: jest.fn(async () => 0),
}));

jest.mock('../src/services/api', () => ({
  syncNaamsOnLaunch: jest.fn(async () => ({success: true})),
  syncNaamsFromBackend: jest.fn(async () => ({success: true, naams: []})),
}));

jest.mock('react-native-image-picker', () => ({launchImageLibrary: jest.fn()}));

const {default: CounterScreen} = require('../src/screens/CounterScreen/CounterScreen');
const {CounterButton, CustomText} = require('../src/components');

const MAX_LINES = 10;

const Tab = createBottomTabNavigator<TabParamList>();

const SHORT_MANTRA = 'Om Bhur Bhuvah';
const LONG_MANTRA =
  'Om Bhur Bhuvah Svaha, Om Bhur Bhuvah Svaha, Om Bhur Bhuvah Svaha, ' +
  'Om Bhur Bhuvah Svaha, Om Bhur Bhuvah Svaha, Om Bhur Bhuvah Svaha.';

const naam = (mantra: string): Naam => ({
  id: 1,
  name: 'Gayatri Mantra',
  mantra,
  bead_count: 108,
  daily_goal: 0,
  weekly_goal: 0,
  monthly_goal: 0,
  yearly_goal: 0,
  is_selected: 1,
  is_default: 1,
  count: 0,
  total_beads: 0,
  remote_id: 4,
  content_id: null,
  created_at: '2026-01-01',
});

let tree: ReactTestRenderer.ReactTestRenderer | undefined;

/** The script the tree was last rendered with, used to find its scroll box. */
let currentMantra = '';

const render = async (mantra: string) => {
  const db = require('../src/database/database');
  db.getSelectedNaam.mockResolvedValue(naam(mantra));
  currentMantra = mantra;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      // CounterScreen calls navigation.setOptions, so it needs a navigator.
      <NavigationContainer>
        <Tab.Navigator screenOptions={{headerShown: false}}>
          <Tab.Screen name="Counter" component={CounterScreen} />
        </Tab.Navigator>
      </NavigationContainer>,
    );
  });
  return tree!;
};

/**
 * The ScrollView that holds the script.
 *
 * Anchored on the script text, which only this box contains. Matching on
 * maxHeight alone is not enough: the log and settings sheets are always in the
 * tree and have scroll views of their own.
 */
const contentScroll = (renderer: ReactTestRenderer.ReactTestRenderer) => {
  const found = renderer.root
    .findAllByType(ScrollView)
    .find(node =>
      node
        .findAllByType(CustomText)
        .some(child => String(child.props.children) === currentMantra),
    );

  if (!found) {
    throw new Error('no ScrollView found wrapping the mantra');
  }
  return found;
};

/** The naams name, matched on CustomText because the host Text never sees `variant`. */
const titleText = (renderer: ReactTestRenderer.ReactTestRenderer) => {
  const found = renderer.root
    .findAllByType(CustomText)
    .find(node => node.props.variant === 'heading');

  if (!found) {
    throw new Error('no naam name found in the counter');
  }
  return found;
};

/** The counting button, by the ring size it is given. */
const counterButton = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType(CounterButton)
    .find(node => typeof node.props.size === 'number');

afterEach(() => {
  if (tree) {
    ReactTestRenderer.act(() => tree?.unmount());
    tree = undefined;
  }
  jest.clearAllMocks();
});

describe('CounterScreen reading area', () => {
  it('leaves the counter outside the scrolling region', async () => {
    const renderer = await render(LONG_MANTRA);
    const scroll = contentScroll(renderer);

    // The counter is the primary action, so it has to stay put while the script
    // is being scrolled past.
    expect(
      scroll.findAllByType(CounterButton).filter(n => n.props.size),
    ).toHaveLength(0);
    expect(counterButton(renderer)).toBeDefined();
  });

  it('sets the name below the shared heading size', async () => {
    const title = titleText(await render(SHORT_MANTRA));

    const style = title.props.style as {fontSize?: number};
    // The shared heading variant is 26 and is used by the settings and library
    // screens. The counter overrides it locally, because a 26px label over a
    // 16px script costs the script a line and a half of the reading area.
    expect(style.fontSize).toBeLessThan(26);
  });

  it('caps the reading box instead of giving it all the spare height', async () => {
    const style = contentScroll(await render(LONG_MANTRA)).props.style as {
      maxHeight?: number;
      flex?: number;
      flexShrink?: number;
    };

    // This used to be flex: 1, which claimed every spare pixel. With a one line
    // script that left a tall empty box and pushed the counter to the bottom of
    // the page. Hugs the content instead, capped, and gives way on short screens.
    expect(style.flex).toBeUndefined();
    expect(style.flexShrink).toBe(1);
    expect(style.maxHeight).toBe(MAX_LINES * 22);
  });

  it('allows far more of the script than the old four line cap', async () => {
    const style = contentScroll(await render(LONG_MANTRA)).props.style as {
      maxHeight?: number;
    };

    // Ten lines against the four this replaced, which was tight enough that
    // most mantras had to scroll.
    expect(style.maxHeight! / 22).toBeGreaterThan(4);
  });

  it('keeps the counter group centred rather than pinned to the bottom', async () => {
    const renderer = await render(SHORT_MANTRA);
    const container = renderer.root
      .findAllByType(View)
      .map(n => n.props.style as {justifyContent?: string} | undefined)
      .find(s => s?.justifyContent !== undefined);

    // justifyContent: flex-end here is what left the counter sitting at the
    // very bottom with the script stranded above it.
    expect(container!.justifyContent).toBe('center');
  });

  it('keeps the ring numbers in proportion to the ring', async () => {
    const renderer = await render(SHORT_MANTRA);
    const size = counterButton(renderer)!.props.size as number;

    // Scoped to the ring's own children. The top bar title is a subheading too,
    // so a screen wide search finds the wrong one.
    const inside = counterButton(renderer)!.findAllByType(CustomText);
    const count = inside.find(n => n.props.variant === 'counter')!;
    const target = inside.find(n => n.props.variant === 'subheading')!;
    const countSize = (count.props.style as {fontSize: number}).fontSize;
    const targetSize = (target.props.style as {fontSize: number}).fontSize;

    // The shared variants are 70 and 18, sized for the old 220 circle. On the
    // smaller ring they were left nearly as wide as the circle itself, so both
    // are overridden and derived from the ring instead of being fixed.
    expect(countSize).toBeLessThan(70);
    expect(targetSize).toBeLessThan(18);

    // And they must stay in proportion to the ring, not merely be smaller. The
    // ratios are the ones the original 220 circle was designed with, so the
    // pair looks the same, only smaller.
    expect(countSize / size).toBeCloseTo(0.32, 1);
    expect(targetSize / size).toBeCloseTo(0.09, 1);
    expect(countSize).toBeGreaterThan(targetSize);
  });

  it('keeps the name still while the script scrolls', async () => {
    const renderer = await render(LONG_MANTRA);
    const scroll = contentScroll(renderer);
    const title = titleText(renderer);

    // The name is not something you read through, it is what tells you which
    // mantra you are on. Scrolling it away with the script loses that, so it has
    // to sit outside the scrolling box.
    expect(scroll.findAllByType(CustomText)).not.toContain(title);
    expect(scroll.findAll(n => n.props.variant === 'heading')).toHaveLength(0);

    // And it is still on screen, not traded away for the scrolling behaviour.
    expect(title.props.children).toBe('Gayatri Mantra');
  });

  it('still renders the name when there is no script to scroll', async () => {
    const renderer = await render('');
    const title = titleText(renderer);

    // The scroll box is only rendered when there is a script, so a naam with an
    // empty mantra must not take the heading down with it.
    expect(title.props.children).toBe('Gayatri Mantra');
  });

  it('keeps the counter smaller than it used to be', async () => {
    const button = counterButton(await render(SHORT_MANTRA));

    // Was a fixed 220. It shrinks with the screen but stays within a band, so
    // it does not dominate the reading nor become too small to tap.
    expect(button!.props.size).toBeLessThanOrEqual(170);
    expect(button!.props.size).toBeGreaterThanOrEqual(130);
  });

  it('keeps the full text in the tree rather than truncating it', async () => {
    const renderer = await render(LONG_MANTRA);
    const text = renderer.root
      .findAllByType(Text)
      .find(node => String(node.props.children) === LONG_MANTRA);

    expect(text).toBeDefined();
    expect(text!.props.numberOfLines).toBeUndefined();
  });

  it('shows the scroll indicator only once the script outgrows the space', async () => {
    const renderer = await render(LONG_MANTRA);
    const scroll = contentScroll(renderer);
    const viewport = 200;

    await ReactTestRenderer.act(async () => {
      scroll.props.onLayout({
        nativeEvent: {layout: {height: viewport}},
      });
    });

    await ReactTestRenderer.act(async () => {
      scroll.props.onContentSizeChange(0, viewport + 1);
    });

    // An indicator that is always on reads as "there is more" when there is
    // not, so it is driven by the measurement.
    expect(contentScroll(renderer).props.showsVerticalScrollIndicator).toBe(
      true,
    );

    await ReactTestRenderer.act(async () => {
      contentScroll(renderer).props.onContentSizeChange(0, viewport);
    });

    expect(contentScroll(renderer).props.showsVerticalScrollIndicator).toBe(
      false,
    );
  });

  it('thins the ring stroke in proportion to the ring', async () => {
    const button = counterButton(await render(SHORT_MANTRA));
    const size = button!.props.size as number;
    const stroke = button!.props.strokeWidth as number;

    // The default is 8, drawn for the old 220 circle. At 8 on a 140 circle the
    // band is nearly twice as thick as a proportion, and the band is what reads
    // as the buttons size, so the smaller ring still looked unchanged.
    expect(stroke).toBeLessThan(8);
    expect(stroke / size).toBeCloseTo(0.04, 1);
  });

  it('measures text height alone, not the padding around it', async () => {
    const renderer = await render(SHORT_MANTRA);
    const scroll = contentScroll(renderer);

    // No contentContainerStyle padding at all. Had the vertical space been
    // padding on the content, onContentSizeChange would include it and a one
    // line script would measure as overflowing its own box.
    expect(scroll.props.contentContainerStyle).toBeUndefined();
  });
});
