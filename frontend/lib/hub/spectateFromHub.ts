import { getGameEntry, isGameActive } from '@/lib/hub/games-registry';
import { HUB_NAVIGATING_KEY } from '@/lib/session/core-session';
import type { OnlinePlayerRoomGroup } from '@/lib/hub/groupOnlinePlayers';

/** Matches RoomManager.spectateRoom allowlist + hub-active games. */
const SPECTATE_GAME_TYPES = new Set(['wordgame', 'dominoes']);

export function canSpectateGameFromHub(gameType: string | null | undefined): boolean {
  if (!gameType || !SPECTATE_GAME_TYPES.has(gameType)) return false;
  return isGameActive(gameType);
}

export function buildGameSpectateHref(
  roomId: string,
  gameType: string
): string | null {
  const entry = getGameEntry(gameType);
  if (!entry) return null;
  const code = roomId.toUpperCase();
  return `${entry.href}?room=${encodeURIComponent(code)}&spectate=1`;
}

/**
 * Show "Spectate" on hub presence for in-progress matches the viewer is not part of.
 */
export function canShowSpectateForPresenceGroup(
  group: OnlinePlayerRoomGroup,
  options: {
    selfPlayerId?: string;
    /** Active lobby room from socket (player or spectator). */
    currentRoomId?: string | null;
  }
): boolean {
  const { selfPlayerId, currentRoomId } = options;
  if (!selfPlayerId) return false;
  if (group.status !== 'playing') return false;
  if (!canSpectateGameFromHub(group.gameType)) return false;
  if (group.players.some((p) => p.id === selfPlayerId)) return false;
  if (currentRoomId) return false;
  return true;
}

export function markHubNavigating(): void {
  try {
    sessionStorage.setItem(HUB_NAVIGATING_KEY, '1');
  } catch {
    /* ignore */
  }
}
