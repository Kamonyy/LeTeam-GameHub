'use client';

import { useContext, useEffect } from 'react';
import { RoomReactionFeedContext } from '@/lib/engagement/RoomReactionFeedContext';
import type { RoomReactionBroadcast } from '@/lib/engagement/reactionCatalog';

export function useRoomReactionFeed(
  listener: (payload: RoomReactionBroadcast) => void,
): void {
  const subscribe = useContext(RoomReactionFeedContext);
  if (!subscribe) return;

  useEffect(() => {
    return subscribe(listener);
  }, [subscribe, listener]);
}
