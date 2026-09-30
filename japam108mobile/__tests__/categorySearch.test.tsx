/**
 * Regression cover for the category search box.
 *
 * Clearing the search used to leave the last filtered result on screen while
 * the empty message reported that the category had nothing published, which is
 * the opposite of the truth. Two more faults came from the same code: a request
 * already on the wire could overwrite a newer list, and pull to refresh threw
 * away the term that was still in the box.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TextInput} from 'react-native';
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
  fetchLibraryContent: jest.fn(async () => ({})),
}));

const {default: CategoryScreen} = require('../src/screens/CategoryScreen/CategoryScreen');
const {fetchLibraryContents} = require('../src/services/library');

const Stack = createNativeStackNavigator<RootStackParamList>();

const content = (id: number, title: string) => ({
  id,
  title,
  category_id: 1,
  category_name: 'Mantras',
  category_icon: null,
  category_image_url: null,
  deity: null,
  short_description: null,
  content: null,
  meaning: null,
  source: null,
  bead_count: 108,
});

const ALL = [content(1, 'Gayatri Mantra'), content(2, 'Saraswati')];
const MATCH = [ALL[0]];

/** The search input is the only text input on the screen. */
const searchInput = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findByType(TextInput);

let tree: ReactTestRenderer.ReactTestRenderer | undefined;

const render = async () => {
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen
            name="Category"
            component={CategoryScreen}
            initialParams={{categoryId: 1, categoryName: 'Mantras'}}
          />
        </Stack.Navigator>
      </NavigationContainer>,
    );
  });
  return tree!;
};

/** Types into the box and waits out the 300ms debounce. */
const type = async (renderer: ReactTestRenderer.ReactTestRenderer, value: string) => {
  await ReactTestRenderer.act(async () => {
    searchInput(renderer).props.onChangeText(value);
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(300);
  });
};

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

beforeEach(() => {
  jest.useFakeTimers();
  fetchLibraryContents.mockImplementation(async ({search}: {search?: string}) => {
    if (!search) {
      return ALL;
    }
    return search.toLowerCase().includes('gayatri') ? MATCH : [];
  });
});

afterEach(() => {
  if (tree) {
    ReactTestRenderer.act(() => tree?.unmount());
    tree = undefined;
  }
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('CategoryScreen search', () => {
  it('loads the whole category on mount', async () => {
    const renderer = await render();

    expect(fetchLibraryContents).toHaveBeenCalledWith({categoryId: 1});
    expect(allText(renderer.toJSON())).toContain('Gayatri Mantra');
  });

  it('does not fetch the same list twice on mount', async () => {
    await render();

    // The search effect also runs on mount with an empty term. It must not
    // repeat the load the mount effect has already done.
    expect(fetchLibraryContents).toHaveBeenCalledTimes(1);
  });

  it('filters as the user types', async () => {
    const renderer = await render();
    await type(renderer, 'gayatri');

    expect(fetchLibraryContents).toHaveBeenLastCalledWith({categoryId: 1, search: 'gayatri'});
    expect(allText(renderer.toJSON())).toContain('Gayatri Mantra');
    expect(allText(renderer.toJSON())).not.toContain('Saraswati');
  });

  it('brings the whole category back when the box is cleared', async () => {
    const renderer = await render();
    await type(renderer, 'saraswati');
    expect(allText(renderer.toJSON())).not.toContain('Saraswati');

    // This is the reported bug: clearing used to leave the filtered list, and
    // with an empty term in the box the screen said nothing was published.
    await type(renderer, '');

    expect(fetchLibraryContents).toHaveBeenLastCalledWith({categoryId: 1});
    expect(allText(renderer.toJSON())).toContain('Saraswati');
    expect(allText(renderer.toJSON())).not.toContain('nothing published yet');
  });

  it('recovers when the last term matched nothing', async () => {
    const renderer = await render();
    await type(renderer, 'zzz');
    expect(allText(renderer.toJSON())).toContain('matches "zzz"');

    await type(renderer, '');
    expect(allText(renderer.toJSON())).toContain('Saraswati');
  });

  it('does not refetch when the box is already empty', async () => {
    const renderer = await render();
    const before = fetchLibraryContents.mock.calls.length;

    await type(renderer, '');
    expect(fetchLibraryContents).toHaveBeenCalledTimes(before);
  });

  it('debounces a burst of keystrokes into one request', async () => {
    const renderer = await render();
    const before = fetchLibraryContents.mock.calls.length;

    await ReactTestRenderer.act(async () => {
      searchInput(renderer).props.onChangeText('g');
    });
    await ReactTestRenderer.act(async () => {
      searchInput(renderer).props.onChangeText('ga');
    });
    await ReactTestRenderer.act(async () => {
      searchInput(renderer).props.onChangeText('gayatri');
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(fetchLibraryContents.mock.calls.length - before).toBe(1);
    expect(fetchLibraryContents).toHaveBeenLastCalledWith({categoryId: 1, search: 'gayatri'});
  });

  it('keeps a cleared box when a stale response lands late', async () => {
    const renderer = await render();

    // A request for "gayatri" goes out, then the user clears the box before
    // the response arrives. clearTimeout cannot stop a request already on the
    // wire, so the late answer must not replace the restored list.
    let releaseStale: (value: unknown[]) => void = () => {};
    fetchLibraryContents.mockImplementationOnce(async ({search}: {search?: string}) => {
      if (search) {
        return new Promise<unknown[]>(resolve => {
          releaseStale = resolve;
        });
      }
      return ALL;
    });

    await type(renderer, 'gayatri');
    await type(renderer, ''); // restores the full list

    await ReactTestRenderer.act(async () => {
      releaseStale([ALL[0]]);
    });

    expect(allText(renderer.toJSON())).toContain('Saraswati');
  });
});
