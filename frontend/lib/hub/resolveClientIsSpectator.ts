import type { LobbyState } from '@/lib/hub/types';

/**
 * Room players always take precedence over spectator list / URL state.
 */
export function resolveClientIsSpectator(
  lobby: Pick<LobbyState, 'players' | 'spectators' | 'isSpectator'> | null | undefined,
  playerId: string | null | undefined
): boolean {
  if (!playerId || !lobby) return false;
  if (lobby.players?.some((p) => p.id === playerId)) return false;
  if (lobby.isSpectator === true) return true;
  return !!lobby.spectators?.some((s) => s.id === playerId);
}

export function isLobbyPlayer(
  lobby: Pick<LobbyState, 'players'> | null | undefined,
  playerId: string | null | undefined
): boolean {
  return !!playerId && !!lobby?.players?.some((p) => p.id === playerId);
}
