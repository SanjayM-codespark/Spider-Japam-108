/**
 * The mobile app's view of the help pages.
 *
 * These are the entries an admin writes in the admin panel and the app lists
 * under Settings > About & Legal. The row labels on that screen are these
 * titles, so renaming a page in the panel renames it in the app with no update.
 *
 * Every call here is a public, unauthenticated read. The write endpoints live on
 * a separate router behind the admin guard and are deliberately not reachable
 * from the phone.
 */import {apiRequest, ApiError} from './api';

/** One help page, without its body. This is what the Settings list needs. */
export interface HelpSummary {
  id: number;
  title: string;
}

/**
 * One help page including its body, which is what the detail screen renders.
 *
 * `content` is the HTML the admin panel's rich text editor stored, so it is
 * rendered as markup by components/HtmlContent rather than printed as text.
 */
export interface Help extends HelpSummary {
  content: string | null;
  created_at?: string;
}

/**
 * Every help page, newest first.
 *
 * The body is not included: the Settings screen only needs a label per row, and
 * a page is only fetched once it is actually opened.
 */
export const fetchHelps = async (): Promise<HelpSummary[]> => {
  const data = await apiRequest<{
    success: boolean;
    helps?: HelpSummary[];
    message?: string;
  }>('/helps');

  if (!data.success) {
    throw new ApiError('server', data.message || 'The server rejected the request.');
  }

  return data.helps ?? [];
};

/** One help page, for the screen that shows it. */
export const fetchHelp = async (id: number): Promise<Help> => {
  const data = await apiRequest<{
    success: boolean;
    help?: Help;
    message?: string;
  }>(`/helps/${encodeURIComponent(String(id))}`);

  if (!data.success || !data.help) {
    throw new ApiError('server', data.message || 'This page could not be opened.');
  }

  return data.help;
};
