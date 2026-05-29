'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocketActions } from '@/hooks/useSocket';
import { useGameState } from '@/lib/hub/socket/GameStateContext';
import { useHubLive } from '@/lib/hub/HubLiveContext';
import { getDisplayName, hasDisplayName } from '@/lib/player';
import { buildGameSpectateHref, markHubNavigating } from '@/lib/hub/spectateFromHub';

export function useSpectateRoomFromHub() {
  const router = useRouter();
  const { lobby } = useGameState();
  const { spectateRoom } = useSocketActions();
  const { clearError } = useHubLive();
  const [spectateInFlightRoomId, setSpectateInFlightRoomId] = useState<string | null>(
    null
  );

  const spectateMatch = useCallback(
    async (roomId: string, gameType: string) => {
      clearError();
      if (!hasDisplayName()) {
        return { ok: false as const, error: 'Set your name in the header first' };
      }

      const href = buildGameSpectateHref(roomId, gameType);
      if (!href) {
        return { ok: false as const, error: 'Unknown game type' };
      }

      setSpectateInFlightRoomId(roomId);
      try {
        const ok = await spectateRoom(roomId, getDisplayName().trim());
        if (!ok) {
          return { ok: false as const };
        }
        markHubNavigating();
        router.push(href);
        return { ok: true as const };
      } finally {
        setSpectateInFlightRoomId(null);
      }
    },
    [clearError, spectateRoom, router]
  );

  return {
    spectateMatch,
    spectateInFlightRoomId,
    currentRoomId: lobby?.roomId ?? null,
  };
}
