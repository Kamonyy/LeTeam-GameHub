'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { suppressRoomAutoJoinRef } from '@/lib/hub/room-auto-join';
import { getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import type { LobbyState } from '@/lib/hub/types';

export interface UseRoomAutoJoinOptions {
  gameType: string;
  gameEnabled: boolean;
  basePath: string;
  roomParam: string | null;
  spectateParam?: boolean;
  connected: boolean;
  hardResetInFlight: boolean;
  lobby: LobbyState | null;
  playerId: string;
  joinRoom: (roomId: string, displayName: string) => Promise<boolean>;
  joinRoomOrSpectate?: (
    roomId: string,
    displayName: string
  ) => Promise<{ ok: boolean; spectating: boolean }>;
  spectateRoom?: (roomId: string, displayName: string) => Promise<boolean>;
  onAutoJoinLoading?: (loading: boolean) => void;
}

export function useRoomAutoJoin({
  gameType,
  gameEnabled,
  basePath,
  roomParam,
  spectateParam = false,
  connected,
  hardResetInFlight,
  lobby,
  playerId: _playerId,
  joinRoom,
  joinRoomOrSpectate,
  spectateRoom,
  onAutoJoinLoading,
}: UseRoomAutoJoinOptions) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState(roomParam || '');
  const [autoJoined, setAutoJoined] = useState(false);
  const [inviteJoin, setInviteJoin] = useState(false);

  useEffect(() => {
    setJoinCode(roomParam || '');
  }, [roomParam]);

  useEffect(() => {
    setInviteJoin(!!roomParam && !hasDisplayName());
  }, [roomParam]);

  useEffect(() => {
    if (!roomParam) {
      setAutoJoined(false);
    }
  }, [roomParam]);

  useEffect(() => {
    if (lobby?.gameType === gameType && lobby.roomId) {
      setAutoJoined(true);
    }
  }, [lobby?.gameType, lobby?.roomId, gameType]);

  useEffect(() => {
    if (
      suppressRoomAutoJoinRef.current ||
      !gameEnabled ||
      !connected ||
      hardResetInFlight ||
      !roomParam ||
      lobby?.gameType === gameType ||
      autoJoined ||
      inviteJoin
    ) {
      return;
    }
    if (lobby && lobby.gameType !== gameType) return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    let cancelled = false;

    const attemptJoin = async () => {
      onAutoJoinLoading?.(true);
      const name = getDisplayName();
      if (spectateParam && spectateRoom) {
        const ok = await spectateRoom(code, name);
        if (!cancelled && ok) {
          router.replace(`${basePath}?room=${code}&spectate=1`, { scroll: false });
        }
      } else if (joinRoomOrSpectate) {
        const result = await joinRoomOrSpectate(code, name);
        if (!cancelled && result.ok) {
          const query = result.spectating ? `?room=${code}&spectate=1` : `?room=${code}`;
          router.replace(`${basePath}${query}`, { scroll: false });
        }
      } else {
        const ok = await joinRoom(code, name);
        if (!cancelled && ok) {
          router.replace(`${basePath}?room=${code}`, { scroll: false });
        }
      }
      if (!cancelled) {
        setAutoJoined(true);
        onAutoJoinLoading?.(false);
      }
    };

    void attemptJoin();
    return () => {
      cancelled = true;
    };
  }, [
    gameType,
    gameEnabled,
    basePath,
    connected,
    hardResetInFlight,
    roomParam,
    lobby,
    autoJoined,
    inviteJoin,
    spectateParam,
    joinRoom,
    joinRoomOrSpectate,
    spectateRoom,
    router,
    onAutoJoinLoading,
  ]);

  return {
    autoJoined,
    setAutoJoined,
    inviteJoin,
    setInviteJoin,
    joinCode,
    setJoinCode,
  };
}
