import { getGameEntry } from './games-registry';
import type { OnlinePlayer, OnlinePlayerStatus } from './types';

export type OnlinePlayerRoomGroup = {
  kind: 'room';
  roomId: string;
  status: 'lobby' | 'playing';
  gameType: string;
  hostId: string;
  players: OnlinePlayer[];
};

export type OnlinePlayerHubGroup = {
  kind: 'hub';
  players: OnlinePlayer[];
};

export type OnlinePlayerGroup = OnlinePlayerRoomGroup | OnlinePlayerHubGroup;

export function presenceDotClass(status: OnlinePlayerStatus): string {
  switch (status) {
    case 'playing':
      return 'hub-presence-dot--playing';
    case 'lobby':
      return 'hub-presence-dot--lobby';
    default:
      return 'hub-presence-dot--hub';
  }
}

export function gameLabelForPresence(gameType: string | null | undefined): string {
  if (!gameType) return 'Game';
  return getGameEntry(gameType)?.name ?? gameType;
}

export function groupOnlinePlayers(players: OnlinePlayer[]): OnlinePlayerGroup[] {
  const hubPlayers: OnlinePlayer[] = [];
  const byRoom = new Map<string, OnlinePlayer[]>();

  for (const player of players) {
    if (player.status === 'hub' || !player.roomId) {
      hubPlayers.push(player);
      continue;
    }
    const list = byRoom.get(player.roomId) ?? [];
    list.push(player);
    byRoom.set(player.roomId, list);
  }

  const groups: OnlinePlayerGroup[] = [];

  const roomGroups: OnlinePlayerRoomGroup[] = [...byRoom.entries()].map(
    ([roomId, roomPlayers]) => {
      const first = roomPlayers[0]!;
      const hostId = first.hostId ?? '';
      const status: 'lobby' | 'playing' =
        first.status === 'playing' ? 'playing' : 'lobby';
      const sorted = [...roomPlayers].sort((a, b) => {
        if (a.id === hostId) return -1;
        if (b.id === hostId) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      return {
        kind: 'room',
        roomId,
        status,
        gameType: first.gameType ?? 'unknown',
        hostId,
        players: sorted,
      };
    }
  );

  roomGroups.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'playing' ? -1 : 1;
    }
    return a.roomId.localeCompare(b.roomId);
  });

  groups.push(...roomGroups);

  if (hubPlayers.length > 0) {
    hubPlayers.sort((a, b) => a.displayName.localeCompare(b.displayName));
    groups.push({ kind: 'hub', players: hubPlayers });
  }

  return groups;
}
