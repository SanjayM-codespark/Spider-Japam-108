/**
 * The mobile app's view of the Sacred Library.
 *
 * Every call here is a public, unauthenticated read. The backend only serves
 * content that an admin has published inside a category that is still active,
 * so there is no draft filtering to do on the phone and no token to attach.
 */
import {apiRequest, ApiError} from './api';

/** One category tile, as shown in the grid on the library screen. */
export interface LibraryCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
}

/**
 * One content entry.
 *
 * `content` holds the main text and is expected to be the script the admin
 * typed, for example the Devanagari line. `title` is the transliterated name.
 */
export interface LibraryContent {
  id: number;
  title: string;
  category_id: number;
  category_name: string;
  category_icon: string | null;
  category_image_url: string | null;
  deity: string | null;
  short_description: string | null;
  content: string | null;
  meaning: string | null;
  source: string | null;
  /**
   * Beads in one round of japa, set per entry in the admin panel. Also drives
   * the counter, because the naams on the preferences screen are these entries.
   */
  bead_count: number | null;
}

export interface Library {
  categories: LibraryCategory[];
  /** The reading of the day, or null when nothing is published yet. */
  daily: LibraryContent | null;
}

/** Turns a blank optional field into an empty string, so `|| fallback` is safe. */
const text = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * Categories can be saved with only an image and no emoji, so a tile falls back
 * to the first letter of the name rather than rendering an empty box.
 */
export const categoryInitial = (category: Pick<LibraryCategory, 'name' | 'icon'>): string =>
  text(category.icon) || text(category.name).charAt(0).toUpperCase();

/** The same fallback for a content entry, which uses its category's icon. */
export const contentInitial = (content: LibraryContent): string =>
  text(content.category_icon) || text(content.title).charAt(0).toUpperCase();

/**
 * Builds a query string, skipping empty values so the endpoint sees no
 * parameter at all rather than an empty one.
 */
const query = (params: {categoryId?: number; search?: string}): string => {
  const parts: string[] = [];
  if (params.categoryId !== undefined) {
    parts.push(`category_id=${encodeURIComponent(String(params.categoryId))}`);
  }
  const search = text(params.search);
  if (search) {
    parts.push(`q=${encodeURIComponent(search)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
};

/**
 * The library landing screen in one call: the category tiles plus the reading of
 * the day, so the screen renders without a second round trip.
 */
export const fetchLibrary = async (): Promise<Library> => {
  const data = await apiRequest<{
    success: boolean;
    categories?: LibraryCategory[];
    daily?: LibraryContent | null;
    message?: string;
  }>('/library');

  if (!data.success) {
    throw new ApiError('server', data.message || 'The server rejected the request.');
  }

  return {categories: data.categories ?? [], daily: data.daily ?? null};
};

/**
 * A list of published entries, for the category screen and the search box on
 * the landing screen. Both filters are optional; with neither it returns every
 * published entry.
 */
export const fetchLibraryContents = async (params: {
  categoryId?: number;
  search?: string;
} = {}): Promise<LibraryContent[]> => {
  const data = await apiRequest<{
    success: boolean;
    contents?: LibraryContent[];
    message?: string;
  }>(`/library/contents${query(params)}`);

  if (!data.success) {
    throw new ApiError('server', data.message || 'The server rejected the request.');
  }

  return data.contents ?? [];
};

/**
 * One entry for the detail screen. A draft, an entry in an inactive category
 * and an unknown id all come back as a 404, so a draft cannot be opened by
 * guessing its id.
 */
export const fetchLibraryContent = async (id: number): Promise<LibraryContent> => {
  const data = await apiRequest<{
    success: boolean;
    content?: LibraryContent;
    message?: string;
  }>(`/library/contents/${encodeURIComponent(String(id))}`);

  if (!data.success || !data.content) {
    throw new ApiError('server', data.message || 'This content could not be opened.');
  }

  return data.content;
};
