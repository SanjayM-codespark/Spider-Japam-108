/**
 * Store links used when sharing the app, and as the fallback when the backend
 * cannot be reached.
 *
 * The real values come from the admin panel (settings table) and are fetched at
 * runtime by src/services/invite.ts. These constants are what the app ships
 * with, so the Invite sheet always has a working link on a fresh install and
 * while the backend is unreachable.
 *
 * Update these two links once the app is published, and the admin panel value
 * wins as soon as it is filled in there.
 */

/** Shown in the share message when the backend has no app_name yet. */
export const FALLBACK_APP_NAME = 'Japam108';

/**
 * The version shown on the About screen.
 *
 * Kept next to the app name so the version and the name are changed together.
 * It lives here rather than being read from package.json because the About
 * screen must still render a version when the backend cannot be reached, and
 * this constant is never behind a network request.
 */
export const APP_VERSION = '1.0.0';

/** Android install link (Google Play). */
export const FALLBACK_PLAY_STORE_LINK =
  'https://play.google.com/store/apps/details?id=your.package.name';

/** iOS install link (App Store). */
export const FALLBACK_APP_STORE_LINK =
  'https://apps.apple.com/app/id0000000000';
