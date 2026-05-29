'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { suppressRoomAutoJoinRef } from '@/lib/hub/room-auto-join';
import { getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import { isLobbyPlayer } from '@/lib/hub/resolveClientIsSpectator';
import { consumeHubGameNavigationIntent } from '@/lib/hub/hubGameNavigation';
import {
  clearCoreSessionActiveRoom,
  readCoreSessionActiveRoom,
} from '@/lib/session/core-session';
import type { LobbyState } from '@/lib/hub/types';

export type RoomJoinOptions = {
  spectate?: boolean;
  /** Auto-join recovery — do not surface toast when the room is gone. */
  suppressError?: boolean;
};

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
  joinRoom: (
    roomId: string,
    displayName: string,
    options?: RoomJoinOptions,
  ) => Promise<boolean>;
  spectateRoom?: (
    roomId: string,
    displayName: string,
    options?: Pick<RoomJoinOptions, 'suppressError'>,
  ) => Promise<boolean>;
  clearError?: () => void;
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
  clearError,
  onAutoJoinLoading,
}: UseRoomAutoJoinOptions) {
  const router = useRouter();
  const openedFromHubRef = useRef<boolean | null>(null);
  if (openedFromHubRef.current === null) {
    openedFromHubRef.current = consumeHubGameNavigationIntent(gameType);
  }
  const storedRoomCode = useMemo(() => {
    const stored = readCoreSessionActiveRoom();
    if (!stored || stored.gameType !== gameType) return null;
    return normalizeRoomCode(stored.roomId);
  }, [gameType]);
  // Hub card navigation opens a fresh lobby — do not resurrect a stale stored room.
  const skipStoredAutoJoin =
    !roomParam && openedFromHubRef.current && !!storedRoomCode;
  const targetRoomCode = roomParam
    ? normalizeRoomCode(roomParam)
    : skipStoredAutoJoin
      ? null
      : storedRoomCode;
  const [joinCode, setJoinCode] = useState(targetRoomCode || '');
  const [autoJoined, setAutoJoined] = useState(false);
  const [inviteJoin, setInviteJoin] = useState(false);

  const joinRoomRef = useRef(joinRoom);
  const spectateRoomRef = useRef(spectateRoom);
  const clearErrorRef = useRef(clearError);
  const onAutoJoinLoadingRef = useRef(onAutoJoinLoading);
  /** Prevents re-entering auto-join for the same room (incl. after failure). */
  const autoJoinAttemptedRef = useRef<string | null>(null);

  joinRoomRef.current = joinRoom;
  spectateRoomRef.current = spectateRoom;
  clearErrorRef.current = clearError;
  onAutoJoinLoadingRef.current = onAutoJoinLoading;

  useEffect(() => {
    autoJoinAttemptedRef.current = null;
  }, [targetRoomCode]);

  useEffect(() => {
    setJoinCode(targetRoomCode || '');
  }, [targetRoomCode]);

  useEffect(() => {
    setInviteJoin(!!roomParam && !hasDisplayName());
  }, [roomParam]);

  useEffect(() => {
    if (!targetRoomCode) {
      setAutoJoined(false);
    }
  }, [targetRoomCode]);

  // Restore ?room= after refresh when the server re-attaches this player.
  useEffect(() => {
    if (!connected || !sessionReady || !reconnectAssessed) return;

    const code = reconnectedRoomId ? normalizeRoomCode(reconnectedRoomId) : null;
    if (!code) return;

    const urlCode = roomParam ? normalizeRoomCode(roomParam) : null;
    if (urlCode === code) return;

    router.replace(
      spectateParam ? `${basePath}?room=${code}&spectate=1` : `${basePath}?room=${code}`,
      { scroll: false },
    );
    setJoinCode(code);
    setAutoJoined(true);
  }, [
    connected,
    sessionReady,
    reconnectAssessed,
    reconnectedRoomId,
    roomParam,
    basePath,
    spectateParam,
    router,
  ]);

  useEffect(() => {
    if (lobby?.gameType === gameType && lobby.roomId) {
      setAutoJoined(true);
    }
  }, [lobby?.gameType, lobby?.roomId, gameType]);

  useEffect(() => {
    if (!connected || !sessionReady || !reconnectAssessed || !targetRoomCode) {
      return;
    }

    const code = targetRoomCode;
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
        '(target room:',
        code,
        ')',
      );
      router.replace(
        spectateParam && reconnectedAsSpectator ?
          `${basePath}?room=${reconnectedCode}&spectate=1`
        : `${basePath}?room=${reconnectedCode}`,
        { scroll: false },
      );
      setJoinCode(reconnectedCode);
      setAutoJoined(true);
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

    if (autoJoinAttemptedRef.current === code) {
      return;
    }
    autoJoinAttemptedRef.current = code;

    let cancelled = false;

    const recoverFromFailedAutoJoin = () => {
      const stored = readCoreSessionActiveRoom();
      if (
        stored?.gameType === gameType &&
        normalizeRoomCode(stored.roomId) === code
      ) {
        clearCoreSessionActiveRoom();
      }
      if (roomParam) {
        router.replace(basePath, { scroll: false });
      }
      setJoinCode('');
      clearErrorRef.current?.();
    };

    const attemptJoin = async () => {
      onAutoJoinLoadingRef.current?.(true);
      const name = getDisplayName();
      const joinOpts = { suppressError: true as const };

      let ok = false;
      if (spectateParam && spectateRoomRef.current) {
        ok = await spectateRoomRef.current(code, name, joinOpts);
        if (!cancelled && ok) {
          router.replace(`${basePath}?room=${code}&spectate=1`, { scroll: false });
        }
      } else {
        ok = await joinRoomRef.current(code, name, joinOpts);
        if (!cancelled && ok) {
          router.replace(`${basePath}?room=${code}`, { scroll: false });
        }
      }

      if (!cancelled) {
        if (ok) {
          setAutoJoined(true);
        } else {
          recoverFromFailedAutoJoin();
          // Mark auto-join finished so the effect does not retry in a loop.
          setAutoJoined(true);
        }
        onAutoJoinLoadingRef.current?.(false);
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
    targetRoomCode,
    roomParam,
    lobby,
    autoJoined,
    inviteJoin,
    spectateParam,
    playerId,
    router,
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
