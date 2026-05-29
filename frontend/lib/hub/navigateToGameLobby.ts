import { getGameEntry } from '@/lib/hub/games-registry';
import { HUB_NAVIGATING_KEY } from '@/lib/session/core-session';

export function buildGameLobbyHref(
  roomId: string,
  gameType: string
): string | null {
  const entry = getGameEntry(gameType);
  if (!entry) return null;
  const code = roomId.toUpperCase();
  return `${entry.href}?room=${encodeURIComponent(code)}`;
}

/** Navigate to the game route for an active room (lobby or in-progress). */
export function navigateToGameLobby(
  router: { push: (href: string) => void },
  roomId: string,
  gameType: string
): boolean {
  const href = buildGameLobbyHref(roomId, gameType);
  if (!href) return false;
  try {
    sessionStorage.setItem(HUB_NAVIGATING_KEY, '1');
  } catch {
    /* ignore */
  }
  router.push(href);
  return true;
}
