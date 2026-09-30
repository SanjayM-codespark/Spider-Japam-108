/**
 * Everything the Invite Friends flow needs: which store link to share, the
 * message around it, and the two ways to send it (native share sheet, clipboard).
 *
 * Kept out of the component so the link and the copy can be tested, reused by
 * a future home screen share button, or changed without touching UI code.
 */
import {Platform, Share, Clipboard} from 'react-native';
import {
  FALLBACK_APP_NAME,
  FALLBACK_APP_STORE_LINK,
  FALLBACK_PLAY_STORE_LINK,
} from '../config/appLinks';
import {fetchAppSettings} from './api';

/** What the Invite sheet renders: the app name, the link and the full message. */
export interface InvitePayload {
  appName: string;
  /** The store link that matches the phone's platform. */
  installLink: string;
  message: string;
  /**
   * True when the backend could not be reached and the bundled fallbacks are
   * being used. The sheet shows a small note so a placeholder link left in the
   * admin panel is not mistaken for a real one.
   */
  usedFallback: boolean;
}

/** Pick the Play Store link on Android and the App Store link on iOS. */
export const storeLinkForPlatform = (
  playStoreLink: string,
  appStoreLink: string,
): string => (Platform.OS === 'ios' ? appStoreLink : playStoreLink);

/**
 * Build the text that goes into the share sheet.
 *
 * The link is the last line on purpose: several apps (WhatsApp, Gmail) trim
 * long trailing text, and the link is the only part that has to survive.
 */
export const buildInviteMessage = (appName: string, installLink: string): string =>
  [
    `I'm counting my naam jap with ${appName}. It makes my daily practice simple, and my streak actually sticks.`,
    '',
    `Grab it here: ${installLink}`,
  ].join('\n');

/** True when the link is still one of the placeholders from appLinks.ts. */
const isPlaceholderLink = (link: string): boolean =>
  link === FALLBACK_PLAY_STORE_LINK || link === FALLBACK_APP_STORE_LINK;

/**
 * Load the invite content, preferring the app name and store link configured in
 * the admin panel.
 *
 * Never rejects: sharing the app must still work when the phone is offline or
 * on a different network than the backend, which is the normal case for this
 * app since the backend address is a LAN IP. When the request fails, or the
 * panel leaves a field blank, the value from src/config/appLinks.ts is used.
 */
export const getInvitePayload = async (): Promise<InvitePayload> => {
  let appName = FALLBACK_APP_NAME;
  let playStoreLink = '';
  let appStoreLink = '';
  let reachedBackend = false;

  try {
    const settings = await fetchAppSettings();
    appName = settings.app_name || FALLBACK_APP_NAME;
    playStoreLink = settings.playstore_link;
    appStoreLink = settings.app_store_link;
    reachedBackend = true;
  } catch {
    // Offline, wrong LAN IP or server down: the bundled links keep the flow
    // usable, which matters because the backend address is a LAN IP.
  }

  const installLink = storeLinkForPlatform(
    playStoreLink || FALLBACK_PLAY_STORE_LINK,
    appStoreLink || FALLBACK_APP_STORE_LINK,
  );

  return {
    appName,
    installLink,
    message: buildInviteMessage(appName, installLink),
    usedFallback: !reachedBackend || isPlaceholderLink(installLink),
  };
};

/**
 * Open the system share sheet with the invite message.
 *
 * Resolves to false when the user dismissed the sheet, so the caller can leave
 * the copy-link option as the next step instead of showing a success alert for
 * something that did not happen.
 */
export const shareInvite = async (payload: InvitePayload): Promise<boolean> => {
  try {
    const result = await Share.share(
      {
        message: payload.message,
        title: `Invite a friend to ${payload.appName}`,
      },
      {subject: `Join me on ${payload.appName}`},
    );
    return result.action === Share.sharedAction;
  } catch {
    // Some Android devices throw instead of showing the sheet when no app can
    // handle a text share. Falling back to the clipboard keeps the flow usable.
    Clipboard.setString(payload.message);
    return false;
  }
};

/** Put the invite message on the clipboard, for pasting into any chat app. */
export const copyInviteLink = (payload: InvitePayload): void => {
  Clipboard.setString(payload.message);
};
