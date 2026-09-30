/**
 * The main action on a reading used to sit at the end of the text inside the
 * ScrollView, so on a long entry it was below the fold with no way to tell.
 * It is now pinned to the foot of the screen.
 *
 * These tests assert the button is a sibling of the ScrollView rather than a
 * descendant, which is the only thing that keeps it on screen while the
 * reading scrolls.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from '../src/navigation/types';

jest.mock('../src/database/database', () => ({
  getFavoriteContentIds: jest.fn(async () => []),
  toggleFavoriteContent: jest.fn(async () => true),
  getSetting: jest.fn(async () => null),
  setSetting: jest.fn(async () => undefined),
}));

jest.mock('../src/services/library', () => ({
  fetchLibraryContents: jest.fn(async () => []),
  fetchLibrary: jest.fn(async () => ({categories: [], daily: null})),
  // The screen falls back to this when the entry has no image.
  contentInitial: (content: {category_icon: string | null; title: string}) =>
    (content.category_icon ?? content.title).charAt(0).toUpperCase(),
  fetchLibraryContent: jest.fn(async () => ({
    id: 7,
    title: 'Gayatri Mantra',
    category_id: 1,
    category_name: 'Mantras',
    category_icon: null,
    category_image_url: null,
    deity: 'Savitur',
    short_description: 'The most recited mantra',
    content: 'ॐ भूर् भुवः स्वः',
    // Deliberately long, so the reading is taller than the screen.
    meaning: 'We meditate upon the sweetest form of existence'.repeat(12),
    source: 'Rigveda 3.62.10',
    bead_count: 108,
  })),
}));

const {default: ContentScreen} = require('../src/screens/ContentScreen/ContentScreen');

const Stack = createNativeStackNavigator<RootStackParamList>();

let tree: ReactTestRenderer.ReactTestRenderer | undefined;

const render = async () => {
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen
            name="Content"
            component={ContentScreen}
            initialParams={{contentId: 7}}
          />
        </Stack.Navigator>
      </NavigationContainer>,
    );
  });
  return tree!;
};

afterEach(() => {
  if (tree) {
    ReactTestRenderer.act(() => tree?.unmount());
    tree = undefined;
  }
  jest.clearAllMocks();
});

const button = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) =>
  renderer.root
    .findAllByProps({accessibilityLabel: label}, {deep: false})
    .concat(renderer.root.findAllByProps({accessibilityLabel: label}))
    [0];

const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flatten).filter(Boolean));
  }
  return (style ?? {}) as Record<string, unknown>;
};

/** True when `node` has `ancestor` somewhere above it. */
const isInside = (node: unknown, ancestor: unknown): boolean => {
  let current = node as {parent: unknown} | null;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent as {parent: unknown} | null;
  }
  return false;
};

/** The nearest ancestor whose style has a `borderTopWidth`, i.e. the footer. */
const footerOf = (renderer: ReactTestRenderer.ReactTestRenderer) => {
  let node: any = button(renderer, 'Start Naam Jap');
  while (node) {
    if (flatten(node.props?.style).borderTopWidth !== undefined) {
      return node;
    }
    node = node.parent;
  }
  throw new Error('no footer found above the main action');
};

describe('ContentScreen footer', () => {
  it('keeps the main action out of the scrolling content', async () => {
    const renderer = await render();
    const scroll = renderer.root.findByType(ScrollView);

    // Being a descendant of the ScrollView is what put the button below the
    // fold on a long reading.
    expect(isInside(button(renderer, 'Start Naam Jap'), scroll)).toBe(false);
  });

  it('puts the main action in a bar beside the ScrollView, not inside it', async () => {
    const renderer = await render();
    const safeArea = renderer.root.findAllByType(SafeAreaView)[0];
    const scroll = renderer.root.findByType(ScrollView);
    const footer = footerOf(renderer);

    // Both sit directly under the screen, so the bar is laid out below the
    // ScrollView and stays put while the reading scrolls.
    expect(isInside(scroll, safeArea)).toBe(true);
    expect(isInside(footer, safeArea)).toBe(true);
    expect(isInside(footer, scroll)).toBe(false);
  });

  it('keeps both actions out of the scrolling content', async () => {
    const renderer = await render();
    const scroll = renderer.root.findByType(ScrollView);

    // Save used to be the last thing in the ScrollView, so on a long reading
    // it sat below the fold and read as missing.
    expect(isInside(button(renderer, 'Start Naam Jap'), scroll)).toBe(false);
    expect(isInside(button(renderer, 'Save this reading'), scroll)).toBe(false);
  });

  it('lays the two actions out on one horizontal line at the same size', async () => {
    const renderer = await render();
    const save = button(renderer, 'Save this reading');
    const primary = button(renderer, 'Start Naam Jap');
    const row = save.parent;

    expect(row).toBe(primary.parent);
    expect(flatten(row?.props.style).flexDirection).toBe('row');

    // Both grow by the same factor, so each takes half the row and neither
    // reads as more important by being wider.
    const saveStyle = flatten(save.props.style({pressed: false}));
    const primaryStyle = flatten(primary.props.style({pressed: false}));
    expect(saveStyle.flex).toBe(1);
    expect(primaryStyle.flex).toBe(1);

    // Same height too, so the two line up rather than one sitting taller.
    expect(saveStyle.paddingVertical).toBe(primaryStyle.paddingVertical);
    expect(saveStyle.borderRadius).toBe(primaryStyle.borderRadius);
  });

  it('gives both buttons the same padding on every side', async () => {
    const renderer = await render();
    const saveStyle = flatten(button(renderer, 'Save this reading').props.style({pressed: false}));
    const primaryStyle = flatten(
      button(renderer, 'Start Naam Jap').props.style({pressed: false}),
    );

    // Save carried horizontal padding while the main action had none, which
    // left its icon and label sitting closer to the edges of the button.
    expect(primaryStyle.paddingHorizontal).toBe(saveStyle.paddingHorizontal);
    expect(primaryStyle.paddingVertical).toBe(saveStyle.paddingVertical);
  });

  it('keeps the bar off the screen edge on a device with no home indicator', async () => {
    const renderer = await render();
    const footerStyle = flatten(footerOf(renderer).props.style);

    // The safe area inset can be zero, so the bar carries its own padding.
    expect(footerStyle.paddingBottom).toBeGreaterThan(0);
    expect(footerStyle.paddingHorizontal).toBeGreaterThan(0);
  });

  it('reserves the safe area at the foot for the bar', async () => {
    const renderer = await render();
    const safeArea = renderer.root.findAllByType(SafeAreaView)[0];

    // Without 'bottom' the button would sit under the home indicator.
    expect(safeArea.props.edges).toContain('bottom');
  });

  it('separates the bar from the reading so text does not run into it', async () => {
    const renderer = await render();
    const footerStyle = flatten(footerOf(renderer).props.style);

    expect(footerStyle.borderTopWidth).toBe(1);
    expect(footerStyle.backgroundColor).toBeTruthy();
  });
});
