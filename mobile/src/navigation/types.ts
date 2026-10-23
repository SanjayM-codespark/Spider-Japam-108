import {NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  /** Sign-in for an existing account, reached from the welcome screen. */
  Login: undefined;
  /** Account creation, reached from the login screen. */
  Register: undefined;
  /** Password reset request, reached from the login screen. */
  ForgotPassword: undefined;
  /**
   * The tab navigator. It takes a nested screen so a page pushed on this stack
   * can jump straight to a tab, which is how "Start Naam Jap" on a reading
   * reaches the counter.
   */
  Home: NavigatorScreenParams<TabParamList>;
  NaamPreferences: undefined;
  /** One category in the Sacred Library, reached from the category grid. */
  Category: {categoryId: number; categoryName: string};
  /** Subcategories within a category. */
  Subcategory: {categoryId: number; categoryName: string; subcategoryId: number; subcategoryName: string};
  /** One reading, reached from a category list or a search result. */
  Content: {contentId: number};
  /** Readings saved on this phone, reached from the counter's chanting menu. */
  Saved: undefined;
  /** "About <app name>", the fixed row in Settings > About & Legal. */
  About: undefined;
  /**
   * One help page written in the admin panel and listed under
   * Settings > About & Legal. `title` is carried through so the header is right
   * before the body arrives.
   */
  Help: {helpId: number; title: string};
};

/**
 * A reading handed to the counter by "Start Naam Jap". The counter shows
 * whatever naam is selected, so it turns this into a naam of its own and counts
 * that, which is why the whole reading travels rather than just its id.
 */
export type CounterPrefill = {
  contentId: number;
  name: string;
  mantra: string;
  beadCount: number;
};

export type TabParamList = {
  Counter: {prefill?: CounterPrefill} | undefined;
  Report: undefined;
  Library: undefined;
  Settings: undefined;
};
