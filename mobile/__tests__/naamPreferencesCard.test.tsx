/**
 * Guards the Naam Preferences card redesign.
 *
 * The old card looked dated for three concrete reasons that are easy to
 * reintroduce: it used emoji as its icon buttons, it drew the selection state
 * with a hollow circle and a dot, and it pulled every colour from the
 * hardcoded light `Colors` constant so the screen ignored the app theme.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Naam} from '../src/database/database';
import {ThemeProvider} from '../src/context/ThemeContext';
import {darkColors, lightColors} from '../src/theme/colors';
import {RootStackParamList} from '../src/navigation/types';
import LibraryHeader from '../src/components/LibraryHeader/LibraryHeader';

jest.mock('../src/database/database', () => ({
  getAllNaams: jest.fn(async () => []),
  selectNaam: jest.fn(async () => undefined),
  deleteNaam: jest.fn(async () => undefined),
  getSetting: jest.fn(async () => '1'),
  setSetting: jest.fn(async () => undefined),
}));

jest.mock('../src/services/api', () => ({
  ApiError: class ApiError extends Error {},
  syncNaamsFromBackend: jest.fn(async () => ({success: true, naams: []})),
}));

const {default: NaamPreferencesScreen} = require('../src/screens/NaamPreferences/NaamPreferences');

const Stack = createNativeStackNavigator<RootStackParamList>();

const naam = (overrides: Partial<Naam> = {}): Naam => ({
  id: 1,
  name: 'Gayatri Mantra',
  mantra: 'Om Bhur Bhuvah',
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
  ...overrides,
});

const allText = (node: unknown): string => {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(allText).join('');
  }
  if (typeof node === 'object' && 'children' in node) {
    return allText((node as {children: unknown}).children);
  }
  return '';
};

let tree: ReactTestRenderer.ReactTestRenderer | undefined;

/** Renders in dark mode, which ThemeProvider reads through the settings mock. */
const render = async (rows: Naam[]) => {
  const api = require('../src/services/api');
  api.syncNaamsFromBackend.mockResolvedValue({success: true, naams: rows});

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="NaamPreferences" component={NaamPreferencesScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>,
    );
  });
  return tree!;
};

afterEach(() => {
  if (tree) {
    ReactTestRenderer.act(() => tree?.unmount());
    tree = undefined;
  }
});

const cardsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAllByProps({accessibilityRole: 'radio'}, {deep: false});

/**
 * `deep: false` is required here. A default deep search walks into the
 * bottom sheet and the modals, which render lazily and reach for a navigation
 * context that the hidden overlays do not have.
 */
const labelled = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) =>
  renderer.root.findAllByProps({accessibilityLabel: label}, {deep: false});

const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flatten).filter(Boolean));
  }
  return (style ?? {}) as Record<string, unknown>;
};

const textNode = (renderer: ReactTestRenderer.ReactTestRenderer, value: string) =>
  renderer.root.findAllByType(Text).find(node => String(node.props.children) === value);

describe('NaamPreferencesScreen card', () => {
  it('leads the card with the bead count', async () => {
    const text = allText((await render([naam({bead_count: 108})])).toJSON());

    // The badge shows the number, and the line under the name spells out "mala".
    expect(text).toContain('108');
    expect(text).toContain('1 mala = 108 beads');
  });

  it('marks the selected naam with a check rather than a hollow dot', async () => {
    const selected = cardsOf(await render([naam({is_selected: 1})]));
    const unselected = cardsOf(await render([naam({is_selected: 0})]));

    expect(selected[0].props.accessibilityState).toEqual({selected: true});
    expect(unselected[0].props.accessibilityState).toEqual({selected: false});
  });

  it('does not use emoji for the action buttons', async () => {
    const text = allText((await render([naam({is_default: 0})])).toJSON());

    // The old card drew the gear and bin as text glyphs.
    expect(text).not.toContain('\u2699');
    expect(text).not.toContain('\uD83D\uDDD1');
  });

  it('labels the read-only admin naams instead of leaving a gap', async () => {
    const renderer = await render([naam({is_default: 1})]);

    expect(allText(renderer.toJSON())).toContain('From admin');
    // Edit and delete are absent for a naam the user does not own.
    expect(labelled(renderer, 'Edit Gayatri Mantra')).toHaveLength(0);
    expect(labelled(renderer, 'Delete Gayatri Mantra')).toHaveLength(0);
  });

  it('offers edit and delete only for naams added on the phone', async () => {
    const renderer = await render([naam({is_default: 0})]);

    expect(labelled(renderer, 'Edit Gayatri Mantra')).toHaveLength(1);
    expect(labelled(renderer, 'Delete Gayatri Mantra')).toHaveLength(1);
  });

  it('shows the goal row for a local naam and hides it for an admin one', async () => {
    const local = allText((await render([naam({is_default: 0, daily_goal: 16})])).toJSON());
    expect(local).toContain('Daily');
    expect(local).toContain('16m');

    const admin = allText((await render([naam({is_default: 1})])).toJSON());
    expect(admin).not.toContain('Monthly');
  });

  it('announces each card as a radio so selection is readable aloud', async () => {
    const card = cardsOf(await render([naam()]))[0];

    expect(card.props.accessibilityLabel).toBe('Gayatri Mantra');
    expect(card.props.accessibilityState).toEqual({selected: true});
  });

  it('offers a back control, which the old screen did not have', async () => {
    const renderer = await render([naam()]);

    // The screen is pushed on the stack with the native header hidden, so
    // without this the only way out was the Android back gesture.
    expect(labelled(renderer, 'Go back')).toHaveLength(1);
  });

  it('keeps the add button inside the top bar', async () => {
    const renderer = await render([naam()]);
    const bar = renderer.root.findByType(SafeAreaView).findAllByType(View)[0];
    const addButton = labelled(renderer, 'Add a naam')[0];

    // The bar is a row, so a fixed width on the add button must be reserved
    // rather than left to the title. When it was not, the button was pushed
    // off the right edge and Android clipped it away.
    expect(flatten(bar.props.style).flexDirection).toBe('row');
    expect(flatten(bar.props.style).paddingRight).toBeGreaterThan(0);

    // Pressable takes style as a callback, so resolve it the way RN does.
    const resolved = addButton.props.style;
    const addStyle = flatten(
      typeof resolved === 'function' ? resolved({pressed: false}) : resolved,
    );
    expect(typeof addStyle.width).toBe('number');
    expect(addStyle.width).toBeGreaterThan(0);

    // The title holder flexes, so the title truncates instead of pushing the
    // button past the edge.
    const holder = renderer.root.findByType(LibraryHeader).parent;
    expect(holder).not.toBeNull();
    expect(flatten(holder?.props.style).flex).toBe(1);
  });
});

describe('NaamPreferencesScreen theming', () => {
  it('follows the app theme instead of the hardcoded light palette', async () => {
    const renderer = await render([naam()]);
    const safeArea = renderer.root.findByType(SafeAreaView);

    // The old screen read the `Colors` constant, which is lightColors, so it
    // stayed light in dark mode. The stylesheet is now built from the theme.
    expect(flatten(safeArea.props.style).backgroundColor).toBe(darkColors.background);
    expect(darkColors.background).not.toBe(lightColors.background);
  });

  it('colours the card text from the theme', async () => {
    const renderer = await render([naam()]);
    const title = textNode(renderer, 'Gayatri Mantra');

    expect(title).toBeDefined();
    expect(flatten(title!.props.style).color).toBe(darkColors.primaryTextColor);
  });
});
