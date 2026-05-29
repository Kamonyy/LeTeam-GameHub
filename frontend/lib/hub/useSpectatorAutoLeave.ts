'use client';

import { useEffect, useRef } from 'react';
import { useLeaveToHub } from '@/lib/hub/useLeaveToHub';
import type { LobbyState } from '@/lib/hub/types';

type UseSpectatorAutoLeaveOptions = {
  /** Current room lobby (any game). */
  lobby: Pick<LobbyState, 'status' | 'roomId'> | null | undefined;
  /** True when this client is watching, not playing. */
  isSpectator: boolean;
};

/**
 * Sends spectators back to the hub when the room leaves active play
 * (match ended, returned to lobby, etc.). Allows waiting in lobby before start.
 */
export function useSpectatorAutoLeave({
  lobby,
  isSpectator,
}: UseSpectatorAutoLeaveOptions) {
  const leaveToHub = useLeaveToHub();
  const sawPlayingRef = useRef(false);
  const leaveScheduledRef = useRef(false);

  useEffect(() => {
    if (!isSpectator || !lobby?.roomId) {
      sawPlayingRef.current = false;
      leaveScheduledRef.current = false;
      return;
    }

    if (lobby.status === 'playing') {
      sawPlayingRef.current = true;
      return;
    }

    const shouldLeave =
      sawPlayingRef.current || lobby.status === 'finished';

    if (!shouldLeave || leaveScheduledRef.current) return;

    leaveScheduledRef.current = true;
    void leaveToHub();
  }, [isSpectator, lobby?.roomId, lobby?.status, leaveToHub]);
}
