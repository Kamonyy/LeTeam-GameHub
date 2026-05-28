'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocketConnection } from '@/hooks/useSocket';
import { suppressRoomAutoJoinRef } from '@/lib/hub/room-auto-join';

/** Leave the current room on the server and return to the main hub. */
export function useLeaveToHub() {
  const router = useRouter();
  const { actionsRef } = useSocketConnection();

  return useCallback(async () => {
    suppressRoomAutoJoinRef.current = true;

    const leaveRoom = actionsRef.current.leaveRoom as
      | (() => Promise<void>)
      | undefined;
    const clearError = actionsRef.current.clearError as (() => void) | undefined;

    clearError?.();

    try {
      if (typeof leaveRoom === 'function') {
        await leaveRoom();
      }
      router.replace('/');
    } finally {
      window.setTimeout(() => {
        suppressRoomAutoJoinRef.current = false;
      }, 500);
    }
  }, [actionsRef, router]);
}
