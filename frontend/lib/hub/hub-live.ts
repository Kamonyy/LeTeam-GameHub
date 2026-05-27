import type { HubPresenceState, LobbyState } from './types';

/** Compare hub lounge snapshots for React state bail-out. */
export function hubPresenceEqual(
  a: HubPresenceState,
  b: HubPresenceState
): boolean {
  if (a === b) return true;
  if (a.total !== b.total) return false;
  const ap = a.players ?? [];
  const bp = b.players ?? [];
  if (ap.length !== bp.length) return false;
  for (let i = 0; i < ap.length; i++) {
    if (
      ap[i].id !== bp[i].id ||
      ap[i].displayName !== bp[i].displayName ||
      !!ap[i].isYou !== !!bp[i].isYou
    ) {
      return false;
    }
  }
  return true;
}

/** Shallow lobby compare — enough for live player list / host / settings UI. */
export function lobbyStateEqual(a: LobbyState | null, b: LobbyState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.roomId !== b.roomId ||
    a.hostId !== b.hostId ||
    a.status !== b.status ||
    a.gameType !== b.gameType ||
    !!a.isSpectator !== !!b.isSpectator
  ) {
    return false;
  }
  const aPlayers = a.players ?? [];
  const bPlayers = b.players ?? [];
  if (aPlayers.length !== bPlayers.length) return false;
  for (let i = 0; i < aPlayers.length; i++) {
    const p = aPlayers[i];
    const q = bPlayers[i];
    if (
      p.id !== q.id ||
      p.displayName !== q.displayName ||
      p.connected !== q.connected
    ) {
      return false;
    }
  }
  const aSpec = a.spectators ?? [];
  const bSpec = b.spectators ?? [];
  if (aSpec.length !== bSpec.length) return false;
  for (let i = 0; i < aSpec.length; i++) {
    const p = aSpec[i];
    const q = bSpec[i];
    if (
      p.id !== q.id ||
      p.displayName !== q.displayName ||
      p.connected !== q.connected
    ) {
      return false;
    }
  }
  return JSON.stringify(a.settings) === JSON.stringify(b.settings);
}
