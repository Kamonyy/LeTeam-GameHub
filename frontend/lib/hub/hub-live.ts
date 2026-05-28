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
    const p = ap[i];
    const q = bp[i];
    if (
      p.displayName !== q.displayName ||
      !!p.isYou !== !!q.isYou ||
      (p.id !== undefined && q.id !== undefined && p.id !== q.id)
    ) {
      return false;
    }
  }
  return true;
}

function settingsEqual(
  a: LobbyState['settings'],
  b: LobbyState['settings']
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;

  const ar = a as unknown as Record<string, unknown>;
  const br = b as unknown as Record<string, unknown>;

  const aIds = ar.categoryPackageIds;
  const bIds = br.categoryPackageIds;
  if (Array.isArray(aIds) || Array.isArray(bIds)) {
    if (!Array.isArray(aIds) || !Array.isArray(bIds)) return false;
    if (aIds.length !== bIds.length) return false;
    for (let i = 0; i < aIds.length; i++) {
      if (aIds[i] !== bIds[i]) return false;
    }
  } else if (ar.categoryPackageId !== br.categoryPackageId) {
    return false;
  }

  const keys = new Set([...Object.keys(ar), ...Object.keys(br)]);
  for (const k of keys) {
    if (k === 'categoryPackageIds' || k === 'categoryPackageId') continue;
    if (ar[k] !== br[k]) return false;
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
    a.minPlayers !== b.minPlayers ||
    a.maxPlayers !== b.maxPlayers ||
    !!a.devBotsEnabled !== !!b.devBotsEnabled
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
      p.connected !== q.connected ||
      (p.tabFocused !== false) !== (q.tabFocused !== false) ||
      !!p.isBot !== !!q.isBot
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
  return settingsEqual(a.settings, b.settings);
}
