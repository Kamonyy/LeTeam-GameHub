'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState, useSocketActions, useSocketConnection } from '@/hooks/useSocket';
import { navigateToGameLobby } from '@/lib/hub/navigateToGameLobby';

export function useJoinLobbyByTarget() {
  const router = useRouter();
  const { playerId } = useSocketConnection();
  const { lobby } = useGameState();
  const { joinLobbyByTargetPlayer } = useSocketActions();
  const pendingNavigateRef = useRef<{ roomId: string; gameType: string } | null>(
    null
  );

  /** Fallback if lobby:state arrives after the join ack. */
  useEffect(() => {
    if (!pendingNavigateRef.current || !lobby) return;
    const pending = pendingNavigateRef.current;
    if (lobby.roomId !== pending.roomId) return;
    if (navigateToGameLobby(router, pending.roomId, pending.gameType)) {
      pendingNavigateRef.current = null;
    }
  }, [lobby, router]);

  const joinLobby = useCallback(
    async (targetPlayerId: string) => {
      if (!playerId || targetPlayerId === playerId) return { ok: false as const };

      const res = await joinLobbyByTargetPlayer(targetPlayerId);
      if (res.error) {
        return { ok: false as const, error: res.error };
      }

      const roomId = res.roomId;
      const gameType = res.gameType;
      if (!roomId || !gameType) {
        return { ok: false as const, error: 'Join failed' };
      }

      pendingNavigateRef.current = { roomId, gameType };
      navigateToGameLobby(router, roomId, gameType);

      return { ok: true as const, roomId, gameType };
    },
    [playerId, joinLobbyByTargetPlayer, router]
  );

  return { joinLobby, playerId };
}
