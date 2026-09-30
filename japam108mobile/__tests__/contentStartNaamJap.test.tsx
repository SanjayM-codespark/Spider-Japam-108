/**
 * "Start Naam Jap" used to call navigation.navigate('Counter') from a screen
 * that is pushed on the root stack. The tab navigator is registered on that
 * stack as 'Home', so 'Counter' was not a route this screen could reach by
 * name: React Navigation logged "action 'NAVIGATE' was not handled by any
 * navigator" and nothing happened.
 *
 * These tests mount the real nesting, a root stack holding Content plus the tab
 * navigator, and assert the tap actually lands on the Counter tab. A test that
 * only inspected the navigation prop would pass against the broken code,
 * because the old call typechecked and was still dropped at runtime.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {RootStackParamList, TabParamList} from '../src/navigation/types';

jest.mock('../src/database/database', () => ({
  getFavoriteContentIds: jest.fn(async () => []),
  toggleFavoriteContent: jest.fn(async () => true),
  getSetting: jest.fn(async () => null),
  setSetting: jest.fn(async () => undefined),
}));

jest.mock('../src/services/library', () => ({
  fetchLibraryContents: jest.fn(async () => []),
  fetchLibrary: jest.fn(async () => ({categories: [], daily: null})),
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
    meaning: 'We meditate upon the sweetest form of existence',
    source: 'Rigveda 3.62.10',
    bead_count: 108,
  })),
}));

const {default: ContentScreen} = require('../src/screens/ContentScreen/ContentScreen');

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const TabStub: React.FC<{name: string}> = ({name}) => <Text>{name}</Text>;

let tree: ReactTestRenderer.ReactTestRenderer | undefined;

const render = async () => {
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{headerShown: false}}>
          {/* Same name and position as AppNavigator gives the tab navigator. */}
          <Stack.Screen name="Home">
            {() => (
              <Tab.Navigator screenOptions={{headerShown: false}}>
                <Tab.Screen name="Counter" component={() => <TabStub name="Counter" />} />
                <Tab.Screen name="Report" component={() => <TabStub name="Report" />} />
                <Tab.Screen name="Library" component={() => <TabStub name="Library" />} />
                <Tab.Screen name="Settings" component={() => <TabStub name="Settings" />} />
              </Tab.Navigator>
            )}
          </Stack.Screen>
          <Stack.Screen name="Content" component={ContentScreen} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
  });
  // A reading is reached from the Library tab, so it is pushed above Home.
  await ReactTestRenderer.act(async () => {
    navigationRef.navigate('Content', {contentId: 7});
  });
  return tree!;
};

/** Presses the main action and flushes the resulting navigation. */
const startNaamJap = async (renderer: ReactTestRenderer.ReactTestRenderer) => {
  const target = renderer.root.findAllByProps({
    accessibilityLabel: 'Start Naam Jap',
  })[0];
  if (!target) {
    throw new Error('no Start Naam Jap button found');
  }
  await ReactTestRenderer.act(async () => {
    target.props.onPress();
  });
};

/** The focused leaf route, e.g. 'Counter' once the tab has been switched. */
const focusedLeaf = (): string | undefined => navigationRef.getCurrentRoute()?.name;

/** Route names on the root stack, in order. */
const rootRoutes = (): string[] =>
  (navigationRef.getRootState()?.routes ?? []).map(route => route.name);

describe('Start Naam Jap', () => {
  afterEach(() => {
    if (tree) {
      ReactTestRenderer.act(() => tree?.unmount());
      tree = undefined;
    }
  });

  it('opens the counter tab from a reading', async () => {
    const renderer = await render();

    // Precondition: the reading is pushed on the stack, above the tabs.
    expect(focusedLeaf()).toBe('Content');
    expect(rootRoutes()).toEqual(['Home', 'Content']);

    await startNaamJap(renderer);

    // The navigation resolved, rather than being dropped as unhandled.
    expect(focusedLeaf()).toBe('Counter');
  });

  it('leaves the reading rather than stacking another copy of it', async () => {
    const renderer = await render();
    await startNaamJap(renderer);

    // Home is the tab navigator and sits below Content, so reaching the counter
    // should have popped the reading off rather than leaving it buried.
    expect(rootRoutes()).toEqual(['Home']);
  });

  it('hands the counter the reading being viewed', async () => {
    const renderer = await render();
    await startNaamJap(renderer);

    // The counter counts a naam, not a reading, and it cannot fetch this one
    // itself, so the name, the script and the bead count travel with the
    // navigation. Without them the counter would open on the previous naam.
    const tabState = navigationRef
      .getRootState()
      ?.routes.find(route => route.name === 'Home');
    const counterRoute = (tabState as any)?.state?.routes.find(
      (route: any) => route.name === 'Counter',
    );

    expect(counterRoute?.params?.prefill).toEqual({
      contentId: 7,
      name: 'Gayatri Mantra',
      mantra: 'ॐ भूर् भुवः स्वः',
      beadCount: 108,
    });
  });
});
