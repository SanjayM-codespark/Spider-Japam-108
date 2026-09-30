/**
 * Covers the Sacred Library service: the URLs it builds, how it maps a
 * response, and how it reports a missing entry.
 */
import {
  categoryInitial,
  contentInitial,
  fetchLibrary,
  fetchLibraryContent,
  fetchLibraryContents,
  LibraryCategory,
  LibraryContent,
} from '../src/services/library';
import {ApiError} from '../src/services/api';

const category: LibraryCategory = {
  id: 8,
  name: 'Namavalis',
  description: null,
  icon: '📿',
  image_url: null,
};

const content: LibraryContent = {
  id: 12,
  title: 'Shiva Ashtottara Shatanamavali',
  category_id: 8,
  category_name: 'Namavalis',
  category_icon: '📿',
  category_image_url: null,
  deity: 'Lord Shiva',
  short_description: '108 Names',
  content: 'ॐ नमः शिवाय',
  meaning: 'Salutations to Lord Shiva',
  source: null,
  bead_count: 108,
};

/** Replies with `body` and records the URL that was asked for. */
const replyWith = (body: unknown, status = 200) => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  (globalThis as unknown as {fetch: jest.Mock}).fetch = fetchMock;
  return fetchMock;
};

const urlOf = (fetchMock: jest.Mock): string => fetchMock.mock.calls[0][0];

afterEach(() => {
  jest.clearAllMocks();
});

describe('fetchLibrary', () => {
  it('asks for /library and returns categories with the daily reading', async () => {
    const fetchMock = replyWith({success: true, categories: [category], daily: content});

    const result = await fetchLibrary();

    expect(urlOf(fetchMock)).toMatch(/\/api\/library$/);
    expect(result.categories).toEqual([category]);
    expect(result.daily).toEqual(content);
  });

  it('treats a missing list or daily entry as empty rather than undefined', async () => {
    replyWith({success: true});

    const result = await fetchLibrary();

    expect(result.categories).toEqual([]);
    expect(result.daily).toBeNull();
  });

  it('raises a readable error when the server says it failed', async () => {
    replyWith({success: false, message: 'Not allowed.'});

    await expect(fetchLibrary()).rejects.toThrow('Not allowed.');
  });
});

describe('fetchLibraryContents', () => {
  it('sends no parameters at all when neither filter is set', async () => {
    const fetchMock = replyWith({success: true, contents: [content]});

    const result = await fetchLibraryContents();

    expect(urlOf(fetchMock)).toMatch(/\/api\/library\/contents$/);
    expect(result).toEqual([content]);
  });

  it('sends the category on its own', async () => {
    const fetchMock = replyWith({success: true, contents: []});

    await fetchLibraryContents({categoryId: 8});

    expect(urlOf(fetchMock)).toMatch(/\/api\/library\/contents\?category_id=8$/);
  });

  it('encodes a search term so spaces and symbols cannot break the query', async () => {
    const fetchMock = replyWith({success: true, contents: []});

    await fetchLibraryContents({search: '108 names & ॐ'});

    // No category was asked for, so no category_id should appear at all.
    expect(urlOf(fetchMock)).toMatch(/\/api\/library\/contents\?q=108%20names%20%26%20%E0%A5%90$/);
  });

  it('combines the category and the search term', async () => {
    const fetchMock = replyWith({success: true, contents: []});

    await fetchLibraryContents({categoryId: 8, search: 'shiva'});

    const url = urlOf(fetchMock);
    expect(url).toContain('category_id=8');
    expect(url).toContain('q=shiva');
  });

  it('ignores a blank search instead of sending an empty one', async () => {
    const fetchMock = replyWith({success: true, contents: []});

    await fetchLibraryContents({search: '   '});

    expect(urlOf(fetchMock)).toMatch(/\/api\/library\/contents$/);
  });
});

describe('fetchLibraryContent', () => {
  it('reads one entry by id', async () => {
    const fetchMock = replyWith({success: true, content});

    const result = await fetchLibraryContent(12);

    expect(urlOf(fetchMock)).toMatch(/\/api\/library\/contents\/12$/);
    expect(result).toEqual(content);
  });

  it('turns a 404 into a server error, so a draft cannot be opened', async () => {
    replyWith({success: false, message: 'Content not found.'}, 404);

    await expect(fetchLibraryContent(99)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('label fallbacks', () => {
  it('uses the category icon when there is one', () => {
    expect(categoryInitial(category)).toBe('📿');
  });

  it('falls back to the first letter when a category has no icon', () => {
    expect(categoryInitial({...category, icon: null})).toBe('N');
    expect(categoryInitial({...category, icon: '   '})).toBe('N');
  });

  it('falls back to the title when the entry has no category icon', () => {
    expect(contentInitial(content)).toBe('📿');
    expect(contentInitial({...content, category_icon: null})).toBe('S');
  });
});
