'use client';

import { useCallback } from 'react';
import { useSocketConnection } from '@/hooks/useSocket';
import { suppressRoomAutoJoinRef } from '@/lib/hub/room-auto-join';
import { useViewNavigator } from '@/lib/hub/ViewTransitionProvider';

/** Leave the current room on the server and return to the main hub. */
export function useLeaveToHub() {
  const navigateWithTransition = useViewNavigator();
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
      navigateWithTransition('/', { replace: true });
    } finally {
      window.setTimeout(() => {
        suppressRoomAutoJoinRef.current = false;
      }, 500);
    }
  }, [actionsRef, navigateWithTransition]);
}
