/**
 * Backend connection settings for the mobile app.
 *
 * This is the ONLY file you need to touch when the server address changes.
 *
 * REAL DEVICE (this app is tested on a physical phone, not the emulator)
 * ---------------------------------------------------------------------
 * A phone cannot use "localhost" (that points at the phone itself) or
 * "10.0.2.2" (that alias only exists inside the Android emulator).
 * Use the LAN IPv4 address of the computer that runs the backend.
 *
 *   1. Start the backend:            cd backend && npm start
 *   2. Find this computer's IP:      ipconfig  ->  "IPv4 Address"
 *   3. Put that IP in API_HOST below, e.g. '192.168.1.34'
 *   4. Phone and computer must be on the SAME Wi-Fi network.
 *
 * If the IP changes when the router reconnects, update API_HOST again.
 */

/** LAN IPv4 of the machine running the backend. No protocol, no trailing slash. */
export const API_HOST = '192.168.1.34';

/** Backend port. Must match PORT in the backend .env (defaults to 5000). */
export const API_PORT = 5000;

/** Abort a request after this many ms so the UI never waits forever. */
export const REQUEST_TIMEOUT_MS = 10000;

/** Root of the backend API, e.g. http://192.168.1.34:5000/api */
export const BASE_URL = `http://${API_HOST}:${API_PORT}/api`;

/** Root of the backend server, e.g. http://192.168.1.34:5000 */
export const ORIGIN_URL = `http://${API_HOST}:${API_PORT}`;

/** Human readable "host:port", used in the no-connection message. */
export const API_ADDRESS = `${API_HOST}:${API_PORT}`;

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
