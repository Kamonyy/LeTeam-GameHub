'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { suppressRoomAutoJoinRef } from '@/lib/hub/room-auto-join';
import { getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import { isLobbyPlayer } from '@/lib/hub/resolveClientIsSpectator';
import type { LobbyState } from '@/lib/hub/types';

export interface UseRoomAutoJoinOptions {
  gameType: string;
  gameEnabled: boolean;
  basePath: string;
  roomParam: string | null;
  spectateParam?: boolean;
  connected: boolean;
  sessionReady: boolean;
  reconnectAssessed: boolean;
  reconnectedRoomId?: string | null;
  reconnectedAsSpectator?: boolean;
  hardResetInFlight: boolean;
  lobby: LobbyState | null;
  playerId: string;
  joinRoom: (roomId: string, displayName: string) => Promise<boolean>;
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
  sessionReady,
  reconnectAssessed,
  reconnectedRoomId = null,
  reconnectedAsSpectator = false,
  hardResetInFlight,
  lobby,
  playerId,
  joinRoom,
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
    if (!connected || !sessionReady || !reconnectAssessed || !roomParam) {
      return;
    }

    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    const reconnectedCode =
      reconnectedRoomId ? normalizeRoomCode(reconnectedRoomId) : null;

    // Server re-mapped this socket to the target room — never emit room:join.
    if (reconnectedCode === code) {
      if (spectateParam && !reconnectedAsSpectator && isLobbyPlayer(lobby, playerId)) {
        router.replace(`${basePath}?room=${code}`, { scroll: false });
      }
      setAutoJoined(true);
      return;
    }

    if (reconnectedCode && reconnectedCode !== code) {
      console.warn(
        'Player belongs to an alternate active session:',
        reconnectedCode,
        '(URL room:',
        code,
        ')'
      );
      return;
    }

    // Only attempt room entry when the server confirmed no active attachment.
    if (reconnectedRoomId !== null) {
      return;
    }

    const inTargetRoom =
      lobby?.gameType === gameType &&
      normalizeRoomCode(lobby.roomId) === code;

    if (
      suppressRoomAutoJoinRef.current ||
      !gameEnabled ||
      hardResetInFlight ||
      inviteJoin ||
      inTargetRoom ||
      autoJoined
    ) {
      return;
    }
    if (lobby && lobby.gameType !== gameType) return;

    let cancelled = false;

    const attemptJoin = async () => {
      onAutoJoinLoading?.(true);
      const name = getDisplayName();

      if (spectateParam && spectateRoom) {
        const ok = await spectateRoom(code, name);
        if (!cancelled && ok) {
          router.replace(`${basePath}?room=${code}&spectate=1`, { scroll: false });
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
    sessionReady,
    reconnectAssessed,
    reconnectedRoomId,
    reconnectedAsSpectator,
    hardResetInFlight,
    roomParam,
    lobby,
    autoJoined,
    inviteJoin,
    spectateParam,
    joinRoom,
    spectateRoom,
    playerId,
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
