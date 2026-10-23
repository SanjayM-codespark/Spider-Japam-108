/**
 * Backend connection settings for the mobile app.
 *
 * This is the ONLY file you need to touch when the server address changes.
 *
 * PRODUCTION
 * ----------
 * The app talks to the deployed backend over HTTPS:
 *
 *   https://spiderprojects.co.in/api
 *
 * The domain serves the API on the standard HTTPS port (443), so no port is
 * needed and the phone can reach it from any network.
 *
 * LOCAL DEVELOPMENT (optional)
 * ----------------------------
 * To run against the backend on the same Wi-Fi instead, comment out the HTTPS
 * lines below and use the LAN IPv4 of the machine running the backend
 * (e.g. '192.168.1.34'). A phone cannot use "localhost" or "10.0.2.2".
 */

/** Hostname of the backend. No protocol, no trailing slash. */
export const API_HOST = 'spiderprojects.co.in';
// export const API_HOST = '192.168.1.30';

/** Backend port. Only used for local development, not the HTTPS deployment. */
export const API_PORT = 5000;

/** Abort a request after this many ms so the UI never waits forever. */
export const REQUEST_TIMEOUT_MS = 10000;

const USE_LOCAL = __DEV__ && false; // set to true to hit your local backend
const LOCAL_HOST = '192.168.88.15';

export const ORIGIN_URL = USE_LOCAL
  ? `http://${LOCAL_HOST}:${API_PORT}`
  : `https://${API_HOST}/japam108`;

/** Root of the backend API, e.g. http://192.168.1.34:5000/api */
// export const BASE_URL = `http://${API_HOST}:${API_PORT}/api`;
export const BASE_URL = `${ORIGIN_URL}/api`;
// export const BASE_URL = `https://${API_HOST}/api`;

/** Root of the backend server, e.g. http://192.168.1.34:5000 */
// export const ORIGIN_URL = `http://${API_HOST}:${API_PORT}`;
// export const ORIGIN_URL = `https://${API_HOST}`;

/** Human readable host, used in the no-connection message. */
// export const API_ADDRESS = API_HOST;
export const API_ADDRESS = USE_LOCAL ? LOCAL_HOST : API_HOST;

/** Build the full URL for an API path such as '/naams'. */
export const apiUrl = (path: string): string => `${BASE_URL}${path}`;

/**
 * Build the full URL for a file the server stores outside /api, such as a
 * category image saved as '/uploads/abc.png'.
 *
 * Returns null for an empty value so an <Image> can be skipped entirely rather
 * than pointed at the bare origin. An already absolute URL is passed through,
 * which keeps this safe if the column ever holds a full link.
 */
export const assetUrl = (path?: string | null): string | null => {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${ORIGIN_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
