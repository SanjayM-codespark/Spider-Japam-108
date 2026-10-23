/**
 * "Start Naam Jap" on a reading hands the counter that reading. The counter
 * takes no reading of its own, so it turns the prefill into a naam and selects
 * it. Two things are easy to get wrong:
 *
 *  - reading the current selection before applying the prefill, which leaves the
 *    counter showing the previous naam;
 *  - leaving the prefill on the route, which re-applies an old reading every
 *    time the user comes back to the tab and overrides the naam they just
 *    picked by hand.
 *
 * The database mock is stateful on purpose: selecting a reading changes what the
 * next read returns, so these tests can only pass if the screen reads after it
 * has applied, which is the behaviour the user sees.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {CounterPrefill, TabParamList} from '../src/navigation/types';

const PREVIOUS_MANTRA = 'Om Bhur Bhuvah Svaha';
const PREFILL_MANTRA = 'ॐ भूर् भुवः स्वः';

/**
 * When the selection is actually made, and when the screen reads it back.
 *
 * 'select' is recorded after the helper has resolved, not when it was called,
 * because that is the moment the new naam becomes real. Recording it on call
 * would make the test pass whatever the order.
 */
const mockOrder: string[] = [];

/** What the counter would show if the prefill were ignored. */
let mockNaam: any = {
  id: 1,
  name: 'Previous Naam',
  mantra: PREVIOUS_MANTRA,
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
};

jest.mock('../src/database/database', () => ({
  getSelectedNaam: jest.fn(async () => {
    mockOrder.push('read');
    return mockNaam;
  }),
  getAllNaams: jest.fn(async () => [mockNaam]),
  saveNaamCount: jest.fn(async () => undefined),
  recordSession: jest.fn(async () => undefined),
  resetDailyCount: jest.fn(async () => undefined),
  formatDateKey: jest.fn(() => '2026-01-01'),
  getStreak: jest.fn(async () => 0),
  getDailyCounts: jest.fn(async () => []),
  addNaamLog: jest.fn(async () => undefined),
  selectNaamForContent: jest.fn(async (input: any) => {
    // The real helper awaits SQLite, so the selection only changes on a later
    // microtask. Modelling that is the whole point: applying it synchronously
    // would hide a read that happens too early.
    await Promise.resolve();
    // What the real helper does: make the naam and select it, so the next read
    // sees the new selection.
    mockNaam = {
      ...mockNaam,
      id: 3,
      name: input.name,
      mantra: input.mantra,
      bead_count: input.beadCount,
      content_id: input.contentId,
    };
    mockOrder.push('select');
    return mockNaam.id;
  }),
  getSetting: jest.fn(async () => null),
  setSetting: jest.fn(async () => undefined),
  getNaamJapReminders: jest.fn(async () => []),
  addNaamJapReminder: jest.fn(async () => 0),
}));

jest.mock('../src/services/api', () => ({
  ApiError: class ApiError extends Error {},
  syncNaamsOnLaunch: jest.fn(async () => ({success: true})),
  syncNaamsFromBackend: jest.fn(async () => ({success: true, naams: []})),
}));

// The counter reads the signed-in token only for its optional server sync. These
// tests cover the prefill flow, so keep the auth module graph out of them.
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({user: null, token: null, restoring: false}),
}));

jest.mock('react-native-image-picker', () => ({launchImageLibrary: jest.fn()}));

const {default: CounterScreen} = require('../src/screens/CounterScreen/CounterScreen');
const {selectNaamForContent} = require('../src/database/database');

const Tab = createBottomTabNavigator<TabParamList>();
const navigationRef = createNavigationContainerRef<TabParamList>();

const PREFILL: CounterPrefill = {
  contentId: 7,
  name: 'Gayatri Mantra',
  mantra: PREFILL_MANTRA,
  beadCount: 1008,
};

let tree: ReactTestRenderer.ReactTestRenderer | undefined;

const render = async (prefill?: CounterPrefill) => {
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <NavigationContainer ref={navigationRef}>
        <Tab.Navigator screenOptions={{headerShown: false}}>
          <Tab.Screen
            name="Counter"
            component={CounterScreen}
            initialParams={prefill ? {prefill} : undefined}
          />
        </Tab.Navigator>
      </NavigationContainer>,
    );
  });
  return tree!;
};

/** Every string rendered on the screen, joined, for substring checks. */
const shownText = (renderer: ReactTestRenderer.ReactTestRenderer): string =>
  renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter((child: unknown): child is string => typeof child === 'string')
    .join(' ');

beforeEach(() => {
  mockNaam = {
    id: 1,
    name: 'Previous Naam',
    mantra: PREVIOUS_MANTRA,
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
  };
});

afterEach(() => {
  if (tree) {
    ReactTestRenderer.act(() => tree?.unmount());
    tree = undefined;
  }
  mockOrder.length = 0;
  jest.clearAllMocks();
});

describe('CounterScreen prefill', () => {
  it('turns the reading into a naam and selects it', async () => {
    await render(PREFILL);

    expect(selectNaamForContent).toHaveBeenCalledWith({
      contentId: 7,
      name: 'Gayatri Mantra',
      mantra: 'ॐ भूर् भुवः स्वः',
      beadCount: 1008,
    });
  });

  it('reads the selection back only after the reading has been applied', async () => {
    await render(PREFILL);

    // Reading first would leave the counter on the previous naam. The focus
    // effect happens to run a second time after the prefill is consumed, which
    // papers over this, so the order is asserted directly rather than left to
    // the rendered result.
    expect(mockOrder.indexOf('select')).toBeLessThan(mockOrder.indexOf('read'));
  });

  it('shows the reading it was given, not the naam it had before', async () => {
    const renderer = await render(PREFILL);

    // The bug this guards: reading the selection before applying the prefill
    // leaves the counter on the previous naam, which is what the user reported.
    const text = shownText(renderer);
    expect(text).toContain('Gayatri Mantra');
    expect(text).toContain(PREFILL_MANTRA);
    expect(text).not.toContain(PREVIOUS_MANTRA);
  });

  it('consumes the prefill so returning to the tab does not re-apply it', async () => {
    await render(PREFILL);

    // Left on the route, every later focus would re-apply this reading and
    // override whatever naam the user picked in the meantime.
    expect(navigationRef.getCurrentRoute()?.params?.prefill).toBeUndefined();
  });

  it('leaves the current naam alone when the tab is opened on its own', async () => {
    const renderer = await render();

    // Switching to the counter from the tab bar must not change which naam is
    // being counted.
    expect(selectNaamForContent).not.toHaveBeenCalled();
    expect(shownText(renderer)).toContain(PREVIOUS_MANTRA);
  });
});
