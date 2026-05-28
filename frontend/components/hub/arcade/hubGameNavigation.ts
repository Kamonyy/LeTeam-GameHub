import { HUB_NAVIGATING_KEY } from '@/lib/session/core-session';

export function markHubGameNavigation(gameId: string) {
  try {
    sessionStorage.setItem(HUB_NAVIGATING_KEY, gameId);
  } catch {
    /* ignore private mode */
  }
}
