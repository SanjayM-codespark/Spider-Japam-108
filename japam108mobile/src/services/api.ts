/**
 * Everything the mobile app needs to talk to the backend server.
 *
 * The address itself lives in one place: src/config/apiConfig.ts
 */
import {API_ADDRESS, apiUrl, REQUEST_TIMEOUT_MS} from '../config/apiConfig';
import {Naam, selectNaam, upsertRemoteNaams} from '../database/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A published Sacred Library entry as returned by the public library endpoint,
 * which is where the naams on the preferences screen come from.
 *
 * This is a local copy of the fields needed rather than an import from
 * services/library.ts: that module already imports this one, so importing back
 * would make the two a cycle.
 */
export interface BackendNaamContent {
  id: number;
  title: string;
  content: string | null;
  bead_count: number | null;
}

export type ApiErrorKind = 'offline' | 'timeout' | 'server' | 'parse' | 'unknown';

export class ApiError extends Error {
  kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

/**
 * A message safe to show the user for anything a screen caught.
 *
 * ApiError already carries a written out explanation for each failure kind, so
 * those are preferred; a plain Error falls back to its own text and anything
 * else gets a generic line rather than rendering "[object Object]".
 */
export const errorMessage = (err: unknown): string => {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Something went wrong.';
};

/**
 * Public app settings from the `settings` table, filled in from the admin
 * panel. Only the fields the phone needs are listed here; the endpoint also
 * returns payment and ad keys, which stay server side.
 */
export interface BackendAppSettings {
  app_name: string;
  playstore_link: string;
  app_store_link: string;
}

export interface NaamSyncResult {
  success: boolean;
  /** Human readable reason, safe to show in the UI. */
  message: string;
  kind?: ApiErrorKind;
  /** Naams coming from the admin panel, present when success is true. */
  naams?: Naam[];
}

// ---------------------------------------------------------------------------
// Request logging (development builds only)
// ---------------------------------------------------------------------------

/**
 * How much of a response body is printed before it is cut short. A list of the
 * whole library can reach hundreds of kilobytes, so the full body never reaches
 * the console; the note keeps a count of what was left out.
 */
const LOG_BODY_LIMIT = 800;

/** Serialize a response body for the console, truncated to the limit above. */
const logBody = (value: unknown): string => {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    return String(value);
  }
  if (text.length <= LOG_BODY_LIMIT) {
    return text;
  }
  return `${text.slice(0, LOG_BODY_LIMIT)} ... (+${text.length - LOG_BODY_LIMIT} chars not shown)`;
};

/**
 * The endpoint name, without the leading slash or the query string, so the
 * console reads `library/contents` rather than `/api/library/contents?q=...`.
 * A trailing numeric segment is the id of one resource and is kept as `:id`.
 */
const apiCallName = (path: string): string =>
  path
    .split('?')[0]
    .replace(/^\/+/, '')
    .replace(/\/\d+$/, '/:id');

/**
 * The parameters of the call.
 *
 * A query string is unwrapped into {key: value}, and a trailing numeric path
 * segment is reported as `id`, because that is the only way these GETs name a
 * single resource: /library/contents/16 opens entry 16, /helps/3 page 3.
 */
const apiCallParams = (path: string): Record<string, string> => {
  const [route = '', query = ''] = path.split('?');
  const params: Record<string, string> = {};

  const id = /\/(\d+)$/.exec(route)?.[1];
  if (id) {
    params.id = id;
  }

  for (const part of query.split('&')) {
    if (!part) {
      continue;
    }
    const [rawKey = '', rawValue = ''] = part.split('=');
    params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
  }

  return params;
};

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

/**
 * Shared GET helper: applies the request timeout and turns every failure mode
 * into an ApiError. Exported so other services (the Sacred Library) reuse the
 * same behaviour instead of repeating it.
 *
 * Every call is logged in development: the endpoint name, the parameters and
 * the response. The log is stripped out of release builds by the __DEV__
 * guard, so it never ships to a store.
 */
export const apiRequest = async <T>(path: string): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const name = apiCallName(path);

  if (__DEV__) {
    console.log(`[API] GET ${name}`, {params: apiCallParams(path), url: apiUrl(path)});
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'GET',
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });
  } catch (err) {
    // fetch only rejects on a network-level failure, which on a real device
    // almost always means the server is unreachable or the configured IP is wrong.
    const aborted = err instanceof Error && err.name === 'AbortError';
    const failure = aborted
      ? new ApiError('timeout', 'The server took too long to respond.')
      : new ApiError(
          'offline',
          `Cannot reach the server at ${API_ADDRESS}. Check that the phone is on the same Wi-Fi and the IP in src/config/apiConfig.ts is correct.`,
        );
    if (__DEV__) {
      console.warn(`[API] GET ${name} failed: ${failure.message}`);
    }
    throw failure;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (__DEV__) {
      console.warn(`[API] GET ${name} -> ${response.status} (${response.statusText || 'no status text'})`);
    }
    throw new ApiError('server', `Server returned ${response.status}.`);
  }

  try {
    const data = (await response.json()) as T;
    if (__DEV__) {
      console.log(`[API] GET ${name} -> ${response.status}`, logBody(data));
    }
    return data;
  } catch {
    if (__DEV__) {
      console.warn(`[API] GET ${name} -> ${response.status} but the body could not be read`);
    }
    throw new ApiError('parse', 'The server sent a response the app could not read.');
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the public app settings (app name and store links) managed in the
 * admin panel. Used to build the invite message, so the link and the app name
 * can be corrected from the panel without shipping an app update.
 *
 * Rejects with an ApiError on failure; callers fall back to the constants in
 * src/config/appLinks.ts.
 */
export const fetchAppSettings = async (): Promise<BackendAppSettings> => {
  const data = await apiRequest<{
    success: boolean;
    settings?: Partial<BackendAppSettings>;
    message?: string;
  }>('/settings');

  if (!data.success) {
    throw new ApiError('server', data.message || 'The server rejected the request.');
  }

  return {
    app_name: data.settings?.app_name ?? '',
    playstore_link: data.settings?.playstore_link ?? '',
    app_store_link: data.settings?.app_store_link ?? '',
  };
};

/**
 * Fetch the published Sacred Library entries the admin panel manages, which are
 * the naams offered on the preferences screen.
 *
 * The endpoint only serves published entries inside active categories, so no
 * draft filtering is needed here. Rejects with an ApiError on any failure, so
 * callers branch on `err.kind` instead of parsing message strings.
 */
export const fetchNaamsFromBackend = async (): Promise<BackendNaamContent[]> => {
  const data = await apiRequest<{
    success: boolean;
    contents?: BackendNaamContent[];
    message?: string;
  }>('/library/contents');

  if (!data.success) {
    throw new ApiError('server', data.message || 'The server rejected the request.');
  }

  return data.contents ?? [];
};

/**
 * Load the naams from the backend and return them in the same shape the
 * Naam Preferences screen already renders, so the screen keeps its design and
 * only changes where the data comes from.
 *
 * The rows are also written to the local SQLite `naam` table because the rest
 * of the app (counter, reports, streaks) keeps its own state there: which naam
 * is selected, how many beads were counted, the daily log. Writing keeps that
 * local state attached to the right naam instead of re-creating it.
 *
 * Backend naams are stored with is_default = 1, which is what the screen uses
 * to treat them as admin naams that cannot be edited or deleted on the phone.
 * Naams the user created themselves (remote_id IS NULL) are left untouched.
 *
 * The goals are all zero because the admin panel has no goal fields for content;
 * the preferences screen hides that row for these rows rather than showing
 * empty goals.
 *
 * If nothing is selected yet, the first synced naam is selected, so the counter
 * always has something to count.
 */
export const syncNaamsFromBackend = async (): Promise<NaamSyncResult> => {
  try {
    const remoteNaams = await fetchNaamsFromBackend();

    const naams = await upsertRemoteNaams(
      remoteNaams.map(remote => ({
        remoteId: remote.id,
        name: remote.title,
        mantra: remote.content || '',
        beadCount: remote.bead_count ?? 108,
        dailyGoal: 0,
        weeklyGoal: 0,
        monthlyGoal: 0,
        yearlyGoal: 0,
      })),
    );

    if (naams.length > 0 && !naams.some(naam => naam.is_selected === 1)) {
      const fallback =
        naams.find(naam => naam.remote_id !== null) ??
        naams[0];
      await selectNaam(fallback.id);
      return {
        success: true,
        message: `Loaded ${remoteNaams.length} naam(s) from the server.`,
        naams: naams.map(naam =>
          naam.id === fallback.id ? {...naam, is_selected: 1} : naam,
        ),
      };
    }

    return {
      success: true,
      message: `Loaded ${remoteNaams.length} naam(s) from the server.`,
      naams,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof ApiError ? err.message : 'Something went wrong.',
      kind: err instanceof ApiError ? err.kind : 'unknown',
    };
  }
};

let launchSync: Promise<NaamSyncResult> | null = null;

/**
 * Run the backend sync once per app launch and hand the same promise to every
 * caller.
 *
 * The app kicks this off at startup so the naams are already in the local
 * table by the time the counter screen reads them. Screens that need the naams
 * await this instead of firing their own request, which keeps a fresh install
 * from showing an empty counter and avoids a request on every tab switch.
 */
export const syncNaamsOnLaunch = (): Promise<NaamSyncResult> => {
  if (!launchSync) {
    launchSync = syncNaamsFromBackend();
  }
  return launchSync;
};
