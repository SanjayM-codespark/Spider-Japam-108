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
  is_default?: boolean;
  category_id?: number;
  category_name?: string;
}

export type ApiErrorKind = 'offline' | 'timeout' | 'server' | 'parse' | 'unknown';

export class ApiError extends Error {
  kind: ApiErrorKind;
  /** The parsed response body, when the server sent one with a failure. */
  data?: unknown;
  /** HTTP status of the response, when the request reached the server. */
  status?: number;

  constructor(kind: ApiErrorKind, message: string, data?: unknown, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.data = data;
    this.status = status;
  }
}

/**
 * Shown whenever the server answers with a failure the backend did not write a
 * message for (a 404 from a misrouted deployment, a 502 from the proxy, ...).
 * The raw "Server returned 404." is not something a user can act on, so every
 * screen gets this line instead; the server's own `message` still wins when it
 * sent one, since that one is written for the user (e.g. "Invalid email or
 * password.").
 */
export const SERVER_UNREACHABLE_MESSAGE =
  "We're having trouble connecting to the server. Please try again later.";

/** Failure text for a non-2xx response: the server's message, else the line above. */
const serverFailureMessage = (serverMessage?: string | null): string =>
  serverMessage || SERVER_UNREACHABLE_MESSAGE;

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
export const apiRequest = async <T>(path: string, token?: string): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const name = apiCallName(path);

  if (__DEV__) {
    console.log(`[API] GET ${name}`, {
      params: apiCallParams(path),
      url: apiUrl(path),
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    });
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      signal: controller.signal,
    });
  } catch (err) {
    // fetch only rejects on a network-level failure, which on a real device
    // almost always means the device has no internet or the server is down.
    const aborted = err instanceof Error && err.name === 'AbortError';
    const failure = aborted
      ? new ApiError('timeout', 'The server took too long to respond.')
      : new ApiError(
          'offline',
          `Cannot reach the server at ${API_ADDRESS}. Check the internet connection and try again.`,
        );
    if (__DEV__) {
      console.warn(`[API] GET ${name} failed: ${failure.message}`);
    }
    throw failure;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Read the body the same way the POST helper does so a written out server
    // message reaches the user; a non-JSON error page becomes null.
    let data: {message?: string} | null = null;
    try {
      data = (await response.json()) as {message?: string};
    } catch {
      data = null;
    }
    if (__DEV__) {
      console.warn(`[API] GET ${name} -> ${response.status} (${response.statusText || 'no status text'})`, logBody(data));
    }
    throw new ApiError('server', serverFailureMessage(data?.message), data, response.status);
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
 * Shared POST helper for the account endpoints (register, login). It mirrors
 * apiRequest's timeout and logging, but sends a JSON body and, unlike a GET,
 * reads the response body even on a non-2xx status: the server answers a
 * rejected register or login with a written out `message` (and `errors`), and
 * that text is what the form needs to show the user.
 *
 * An optional bearer token is attached when the endpoint is authenticated.
 * Rejects with an ApiError carrying the server's message where one is given.
 */
export const apiPost = async <T>(
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const name = apiCallName(path);

  if (__DEV__) {
    console.log(`[API] POST ${name}`, {
      url: apiUrl(path),
      body,
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    });
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    const failure = aborted
      ? new ApiError('timeout', 'The server took too long to respond.')
      : new ApiError(
          'offline',
          `Cannot reach the server at ${API_ADDRESS}. Check the internet connection and try again.`,
        );
    if (__DEV__) {
      console.warn(`[API] POST ${name} failed: ${failure.message}`);
    }
    throw failure;
  } finally {
    clearTimeout(timer);
  }

  // Parsed regardless of the status code so the server's own message can be
  // surfaced; a body that is not JSON becomes null rather than throwing.
  let data: (T & {message?: string}) | null = null;
  try {
    data = (await response.json()) as T & {message?: string};
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (__DEV__) {
      console.warn(`[API] POST ${name} -> ${response.status}`, logBody(data));
    }
    throw new ApiError(
      'server',
      serverFailureMessage(data?.message),
      data,
      response.status,
    );
  }

  if (__DEV__) {
    console.log(`[API] POST ${name} -> ${response.status}`, logBody(data));
  }

  if (data === null) {
    throw new ApiError('parse', 'The server sent a response the app could not read.');
  }

  return data;
};

/**
 * Shared DELETE helper for authenticated endpoints (e.g., delete account).
 * Mirrors apiPost's timeout, logging, and error handling.
 */
export const apiDelete = async <T>(
  path: string,
  token?: string,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const name = apiCallName(path);

  if (__DEV__) {
    console.log(`[API] DELETE ${name}`, {
      url: apiUrl(path),
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    });
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    const failure = aborted
      ? new ApiError('timeout', 'The server took too long to respond.')
      : new ApiError(
          'offline',
          `Cannot reach the server at ${API_ADDRESS}. Check the internet connection and try again.`,
        );
    if (__DEV__) {
      console.warn(`[API] DELETE ${name} failed: ${failure.message}`);
    }
    throw failure;
  } finally {
    clearTimeout(timer);
  }

  let data: (T & {message?: string}) | null = null;
  try {
    data = (await response.json()) as T & {message?: string};
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (__DEV__) {
      console.warn(`[API] DELETE ${name} -> ${response.status}`, logBody(data));
    }
    throw new ApiError(
      'server',
      serverFailureMessage(data?.message),
      data,
      response.status,
    );
  }

  if (__DEV__) {
    console.log(`[API] DELETE ${name} -> ${response.status}`, logBody(data));
  }

  if (data === null) {
    throw new ApiError('parse', 'The server sent a response the app could not read.');
  }

  return data;
};

/**
 * Shared PUT helper for authenticated endpoints (e.g., update profile).
 * Mirrors apiPost's timeout, logging, and error handling.
 */
export const apiPut = async <T>(
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const name = apiCallName(path);

  if (__DEV__) {
    console.log(`[API] PUT ${name}`, {
      url: apiUrl(path),
      body,
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    });
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    const failure = aborted
      ? new ApiError('timeout', 'The server took too long to respond.')
      : new ApiError(
          'offline',
          `Cannot reach the server at ${API_ADDRESS}. Check the internet connection and try again.`,
        );
    if (__DEV__) {
      console.warn(`[API] PUT ${name} failed: ${failure.message}`);
    }
    throw failure;
  } finally {
    clearTimeout(timer);
  }

  let data: (T & {message?: string}) | null = null;
  try {
    data = (await response.json()) as T & {message?: string};
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (__DEV__) {
      console.warn(`[API] PUT ${name} -> ${response.status}`, logBody(data));
    }
    throw new ApiError(
      'server',
      serverFailureMessage(data?.message),
      data,
      response.status,
    );
  }

  if (__DEV__) {
    console.log(`[API] PUT ${name} -> ${response.status}`, logBody(data));
  }

  if (data === null) {
    throw new ApiError('parse', 'The server sent a response the app could not read.');
  }

  return data;
};

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

    // Filter to only include Mantra category contents
    const mantraNaams = remoteNaams.filter(n => n.category_name === 'Mantras');

    const naams = await upsertRemoteNaams(
      mantraNaams.map(remote => ({
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
      // Prefer the default content if one exists, otherwise fall back to first admin naam
      const defaultNaam = naams.find(n => {
        const remote = mantraNaams.find(r => r.id === n.remote_id);
        return remote?.is_default === true;
      });
      const fallback = defaultNaam ?? naams.find(naam => naam.remote_id !== null) ?? naams[0];
      await selectNaam(fallback.id);
      return {
        success: true,
        message: `Loaded ${mantraNaams.length} mantra(s) from the server.`,
        naams: naams.map(naam =>
          naam.id === fallback.id ? {...naam, is_selected: 1} : naam,
        ),
      };
    }

    return {
      success: true,
      message: `Loaded ${mantraNaams.length} mantra(s) from the server.`,
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

// --- User Naams Sync ---

export interface UserNaam {
  id: number;
  user_id: number;
  name: string;
  mantra: string;
  bead_count: number;
  daily_goal: number;
  weekly_goal: number;
  monthly_goal: number;
  yearly_goal: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchUserNaams = async (token: string): Promise<UserNaam[]> => {
  const data = await apiRequest<{
    success: boolean;
    mantras?: UserNaam[];
    message?: string;
  }>('/auth/mantras', token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to fetch user mantras.');
  }

  return data.mantras ?? [];
};

export const createUserNaam = async (token: string, input: {
  name: string;
  mantra: string;
  bead_count: number;
  daily_goal: number;
  weekly_goal: number;
  monthly_goal: number;
  yearly_goal: number;
  is_default?: boolean;
}): Promise<UserNaam> => {
  const data = await apiPost<{
    success: boolean;
    mantra?: UserNaam;
    message?: string;
  }>('/auth/mantras', input, token);

  if (!data.success || !data.mantra) {
    throw new ApiError('server', data.message || 'Failed to create user mantra.');
  }

  return data.mantra;
};

export const updateUserNaam = async (token: string, id: number, input: {
  name?: string;
  mantra?: string;
  bead_count?: number;
  daily_goal?: number;
  weekly_goal?: number;
  monthly_goal?: number;
  yearly_goal?: number;
  is_default?: boolean;
}): Promise<UserNaam> => {
  const data = await apiPost<{
    success: boolean;
    message?: string;
  }>(`/auth/mantras/${id}`, input, token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to update user mantra.');
  }

  return { id, ...input } as UserNaam;
};

export const deleteUserNaam = async (token: string, id: number): Promise<void> => {
  const data = await apiDelete<{
    success: boolean;
    message?: string;
  }>(`/auth/mantras/${id}`, token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to delete user mantra.');
  }
};

export const setUserNaamDefault = async (token: string, id: number): Promise<void> => {
  const data = await apiPost<{
    success: boolean;
    message?: string;
  }>(`/auth/mantras/${id}/default`, {}, token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to set default mantra.');
  }
};

export interface UserNaamSyncResult {
  success: boolean;
  message: string;
  kind?: ApiErrorKind;
  naams?: UserNaam[];
}

export const syncUserNaams = async (token: string): Promise<UserNaamSyncResult> => {
  try {
    const remoteNaams = await fetchUserNaams(token);

    // Sync to local database
    const { syncUserNaamsFromServer } = await import('../database/database');
    await syncUserNaamsFromServer(remoteNaams);

    return {
      success: true,
      message: `Synced ${remoteNaams.length} user mantra(s) from the server.`,
      naams: remoteNaams,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof ApiError ? err.message : 'Something went wrong.',
      kind: err instanceof ApiError ? err.kind : 'unknown',
    };
  }
};

// --- Bead counts and meditation sessions ---

/**
 * Which id space a count's `naam_id` points at: 'admin' for a Sacred Library
 * mantra (the id is the content id), 'user' for a mantra the account created
 * (the id is the user_naams id). The server keeps the two apart with this.
 */
export type CountSource = 'admin' | 'user';

/** One daily bead-count row from the server. */
export interface ServerCountRow {
  source: CountSource;
  naam_id: number;
  date: string;
  count: number;
}

/** One day's summed meditation time from the server. */
export interface ServerSessionRow {
  date: string;
  total_seconds: number;
}

/**
 * The server identity of a local naam. A naam the device created but has not
 * pushed to the server yet (remote_id is null) has none, so its counts cannot
 * be stored remotely.
 */
export const naamServerRef = (
  naam: Pick<Naam, 'user_id' | 'remote_id'>,
): {source: CountSource; naamId: number} | null => {
  if (naam.remote_id === null) {
    return null;
  }
  return {
    source: naam.user_id !== null ? 'user' : 'admin',
    naamId: naam.remote_id,
  };
};

/**
 * Record beads for one mantra on one date.
 *
 * Default mode "add" adds `amount` (default 1) to the day's total, which is what
 * a bead tap sends. mode "set" overwrites the total, used to mirror a reset or a
 * manual log.
 */
export const recordCountOnServer = async (
  token: string,
  input: {
    source: CountSource;
    naamId: number;
    date: string;
    amount?: number;
    mode?: 'add' | 'set';
  },
): Promise<void> => {
  const data = await apiPost<{success: boolean; message?: string}>(
    '/auth/counts',
    {
      source: input.source,
      naam_id: input.naamId,
      date: input.date,
      count: input.amount,
      mode: input.mode,
    },
    token,
  );

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to record count.');
  }
};

/** Clear the caller's bead counts for one date. */
export const resetCountsOnServer = async (
  token: string,
  date: string,
): Promise<void> => {
  const data = await apiPost<{success: boolean; message?: string}>(
    '/auth/counts/reset',
    {date},
    token,
  );

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to reset counts.');
  }
};

/** Daily bead counts for a date range, one row per mantra per day. */
export const fetchCountsFromServer = async (
  token: string,
  start: string,
  end: string,
): Promise<ServerCountRow[]> => {
  const data = await apiRequest<{
    success: boolean;
    counts?: ServerCountRow[];
    message?: string;
  }>(`/auth/counts?start=${start}&end=${end}`, token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to fetch counts.');
  }

  return data.counts ?? [];
};

/** Lifetime bead total for one mantra, used to restore the counter. */
export interface ServerCountTotal {
  source: CountSource;
  naam_id: number;
  total: number;
}

/**
 * Lifetime bead totals per mantra, one row per mantra the account has counted.
 * The counter uses this to show the same count, malas and all-naams figures on
 * a device that has no counting history of its own.
 */
export const fetchCountTotalsFromServer = async (
  token: string,
): Promise<ServerCountTotal[]> => {
  const data = await apiRequest<{
    success: boolean;
    totals?: ServerCountTotal[];
    message?: string;
  }>('/auth/counts/totals', token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to fetch count totals.');
  }

  return data.totals ?? [];
};

/**
 * The account's current streak for one mantra, in consecutive days. Derived on
 * the server from the stored daily counts, so it survives a reinstall and is the
 * same on every device. `today` is the device's own date, since the counts are
 * stamped with it and the server's date can differ across timezones.
 */
export const fetchStreakFromServer = async (
  token: string,
  ref: {source: CountSource; naamId: number},
  today?: string,
): Promise<number> => {
  const suffix = today ? `&today=${today}` : '';
  const data = await apiRequest<{
    success: boolean;
    streak?: number;
    message?: string;
  }>(`/auth/streak?source=${ref.source}&naam_id=${ref.naamId}${suffix}`, token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to fetch streak.');
  }

  return data.streak ?? 0;
};

/**
 * Record one meditation session. When `ref` is given the time is attributed to
 * that mantra, so the timer report can be filtered per mantra; without it the
 * session counts only towards the all-mantras view.
 */
export const recordSessionOnServer = async (
  token: string,
  durationSeconds: number,
  date?: string,
  ref?: {source: CountSource; naamId: number},
): Promise<void> => {
  const data = await apiPost<{success: boolean; message?: string}>(
    '/auth/sessions',
    {
      date,
      duration_seconds: Math.round(durationSeconds),
      source: ref?.source,
      naam_id: ref?.naamId,
    },
    token,
  );

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to record session.');
  }
};

/**
 * Meditation time per day for a date range. Passing `ref` sums only that
 * mantra's sessions; omitting it sums every session.
 */
export const fetchSessionsFromServer = async (
  token: string,
  start: string,
  end: string,
  ref?: {source: CountSource; naamId: number},
): Promise<ServerSessionRow[]> => {
  const filter = ref ? `&source=${ref.source}&naam_id=${ref.naamId}` : '';
  const data = await apiRequest<{
    success: boolean;
    sessions?: ServerSessionRow[];
    message?: string;
  }>(`/auth/sessions?start=${start}&end=${end}${filter}`, token);

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to fetch sessions.');
  }

  return data.sessions ?? [];
};

export const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
  const data = await apiPost<{
    success: boolean;
    message?: string;
  }>('/auth/forgot-password', { email });

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to send reset email.');
  }

  return { success: true, message: data.message || 'A password reset link has been sent to your email.' };
};

export const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
  const data = await apiPost<{
    success: boolean;
    message?: string;
  }>('/auth/reset-password', { token, password });

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to reset password.');
  }

  return { success: true, message: data.message || 'Password has been reset.' };
};
