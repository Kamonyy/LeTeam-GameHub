import { getGameEntry } from '@/lib/hub/games-registry';
import { markHubGameNavigation } from '@/lib/hub/hubGameNavigation';
import { ensureTrailingSlashPath } from '@/lib/hub/pathname';

export type GameLobbyNavigatorOptions = {
  replace?: boolean;
};

/** Central gate for hub-initiated navigation into a game room route. */
export type GameLobbyNavigator = (
  href: string,
  options?: GameLobbyNavigatorOptions,
) => void;

export function buildGameLobbyHref(
  roomId: string,
  gameType: string,
): string | null {
  const entry = getGameEntry(gameType);
  if (!entry) return null;
  const code = roomId.toUpperCase();
  const base = ensureTrailingSlashPath(entry.href);
  return `${base}?room=${encodeURIComponent(code)}`;
}

/**
 * Navigate to the game route for an active room (lobby or in-progress).
 * Pass `useViewNavigator()` (or `router.push`) as the navigator driver.
 */
export function navigateToGameLobby(
  navigator: GameLobbyNavigator,
  roomId: string,
  gameType: string,
): boolean {
  const href = buildGameLobbyHref(roomId, gameType);
  if (!href) return false;

  markHubGameNavigation(gameType);
  navigator(href);
  return true;
}
