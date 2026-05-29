import { HUB_NAVIGATING_KEY } from '@/lib/session/core-session';

export { HUB_NAVIGATING_KEY };

export function markHubGameNavigation(gameId: string) {
  try {
    sessionStorage.setItem(HUB_NAVIGATING_KEY, gameId);
  } catch {
    /* ignore private mode */
  }
}

/** Read hub navigation hint without clearing (e.g. loading splash). */
export function peekHubGameNavigationIntent(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(HUB_NAVIGATING_KEY);
  } catch {
    return null;
  }
}

/**
 * One-shot: true when the user opened this game from the hub arcade card
 * (fresh lobby intent — skip resurrecting a stale stored room).
 */
export function consumeHubGameNavigationIntent(gameType: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = sessionStorage.getItem(HUB_NAVIGATING_KEY);
    if (stored !== gameType) return false;
    sessionStorage.removeItem(HUB_NAVIGATING_KEY);
    return true;
  } catch {
    return false;
  }
}
