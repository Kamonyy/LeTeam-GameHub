'use client';

import { useEffect, useRef, useState } from 'react';
import type { OnlinePlayerGroup } from './groupOnlinePlayers';
import type { OnlinePlayer } from './types';

const ENTER_MS = 520;
const EXIT_MS = 380;
const FLASH_MS = 700;

type PlayerSnapshot = {
  status: OnlinePlayer['status'];
  roomId: string | null;
};

export type ExitingPresenceRow = {
  key: string;
  player: OnlinePlayer;
  groupKey: string;
  hostId?: string;
};

function snapshotPlayer(p: OnlinePlayer): PlayerSnapshot {
  return { status: p.status, roomId: p.roomId ?? null };
}

function groupSignature(group: OnlinePlayerGroup): string {
  if (group.kind === 'hub') {
    return `hub:${group.players.map((p) => p.id).sort().join(',')}`;
  }
  return `room:${group.roomId}:${group.status}:${group.players.map((p) => p.id).sort().join(',')}`;
}

export function usePresenceListAnimations(
  players: OnlinePlayer[],
  groups: OnlinePlayerGroup[]
) {
  const prevPlayersListRef = useRef<OnlinePlayer[]>([]);
  const prevPlayersRef = useRef<Map<string, PlayerSnapshot>>(new Map());
  const prevGroupsRef = useRef<Map<string, string>>(new Map());
  const prevTotalRef = useRef(0);
  const exitTimersRef = useRef<Map<string, number>>(new Map());

  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(() => new Set());
  const [statusFlashKeys, setStatusFlashKeys] = useState<Set<string>>(() => new Set());
  const [groupFlashKeys, setGroupFlashKeys] = useState<Set<string>>(() => new Set());
  const [groupEnterKeys, setGroupEnterKeys] = useState<Set<string>>(() => new Set());
  const [exitingRows, setExitingRows] = useState<ExitingPresenceRow[]>([]);
  const [countPulse, setCountPulse] = useState(false);
  const [listBump, setListBump] = useState(false);

  useEffect(() => {
    const prevMap = prevPlayersRef.current;
    const nextMap = new Map(players.map((p) => [p.id, snapshotPlayer(p)]));

    const joined: string[] = [];
    const statusChanged: string[] = [];
    const leftIds: string[] = [];

    for (const [id, snap] of nextMap) {
      const old = prevMap.get(id);
      if (!old) joined.push(id);
      else if (old.status !== snap.status || old.roomId !== snap.roomId) {
        statusChanged.push(id);
      }
    }

    for (const id of prevMap.keys()) {
      if (!nextMap.has(id)) leftIds.push(id);
    }

    if (joined.length > 0) {
      setEnteringKeys((s) => {
        const n = new Set(s);
        joined.forEach((id) => n.add(id));
        return n;
      });
      window.setTimeout(() => {
        setEnteringKeys((s) => {
          const n = new Set(s);
          joined.forEach((id) => n.delete(id));
          return n;
        });
      }, ENTER_MS);
    }

    if (statusChanged.length > 0) {
      setStatusFlashKeys((s) => {
        const n = new Set(s);
        statusChanged.forEach((id) => n.add(id));
        return n;
      });
      window.setTimeout(() => {
        setStatusFlashKeys((s) => {
          const n = new Set(s);
          statusChanged.forEach((id) => n.delete(id));
          return n;
        });
      }, FLASH_MS);
    }

    if (leftIds.length > 0) {
      const ghosts: ExitingPresenceRow[] = leftIds.map((id) => {
        const fromPrev = prevPlayersListRef.current.find((p) => p.id === id);
        const snap = prevMap.get(id);
        const player: OnlinePlayer =
          fromPrev ??
          ({
            id,
            displayName: 'Player',
            status: snap?.status ?? 'hub',
            inviteable: false,
            roomId: snap?.roomId,
          } as OnlinePlayer);

        const groupKey =
          player.roomId && player.status !== 'hub' ?
            `room:${player.roomId}`
          : 'hub-solo';

        return {
          key: `exit-${id}`,
          player,
          groupKey,
          hostId: undefined,
        };
      });

      setExitingRows((rows) => [...rows, ...ghosts]);

      for (const id of leftIds) {
        const existing = exitTimersRef.current.get(id);
        if (existing) window.clearTimeout(existing);
        const t = window.setTimeout(() => {
          exitTimersRef.current.delete(id);
          setExitingRows((rows) => rows.filter((r) => r.player.id !== id));
        }, EXIT_MS);
        exitTimersRef.current.set(id, t);
      }
    }

    const nextGroupSigs = new Map<string, string>();
    for (const g of groups) {
      const gKey = g.kind === 'hub' ? 'hub-solo' : `room:${g.roomId}`;
      nextGroupSigs.set(gKey, groupSignature(g));
    }

    const newGroups: string[] = [];
    const updatedGroups: string[] = [];
    for (const [gKey, sig] of nextGroupSigs) {
      const oldSig = prevGroupsRef.current.get(gKey);
      if (oldSig === undefined) newGroups.push(gKey);
      else if (oldSig !== sig) updatedGroups.push(gKey);
    }

    if (newGroups.length > 0) {
      setGroupEnterKeys((s) => {
        const n = new Set(s);
        newGroups.forEach((k) => n.add(k));
        return n;
      });
      window.setTimeout(() => {
        setGroupEnterKeys((s) => {
          const n = new Set(s);
          newGroups.forEach((k) => n.delete(k));
          return n;
        });
      }, ENTER_MS);
    }

    if (updatedGroups.length > 0) {
      setGroupFlashKeys((s) => {
        const n = new Set(s);
        updatedGroups.forEach((k) => n.add(k));
        return n;
      });
      window.setTimeout(() => {
        setGroupFlashKeys((s) => {
          const n = new Set(s);
          updatedGroups.forEach((k) => n.delete(k));
          return n;
        });
      }, FLASH_MS);
    }

    if (prevTotalRef.current !== players.length && prevMap.size > 0) {
      setCountPulse(true);
      setListBump(true);
      const t = window.setTimeout(() => {
        setCountPulse(false);
        setListBump(false);
      }, 480);
      prevPlayersRef.current = nextMap;
      prevGroupsRef.current = nextGroupSigs;
      prevTotalRef.current = players.length;
      return () => window.clearTimeout(t);
    }

    prevPlayersListRef.current = players;
    prevPlayersRef.current = nextMap;
    prevGroupsRef.current = nextGroupSigs;
    prevTotalRef.current = players.length;
  }, [players, groups]);

  useEffect(() => {
    return () => {
      for (const t of exitTimersRef.current.values()) window.clearTimeout(t);
      exitTimersRef.current.clear();
    };
  }, []);

  return {
    enteringKeys,
    statusFlashKeys,
    groupFlashKeys,
    groupEnterKeys,
    exitingRows,
    countPulse,
    listBump,
  };
}
