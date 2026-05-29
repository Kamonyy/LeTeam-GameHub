'use client';

import { createContext, type ReactNode } from 'react';
import type { RoomReactionBroadcast } from '@/lib/engagement/reactionCatalog';

export type RoomReactionSubscribe = (
  listener: (payload: RoomReactionBroadcast) => void,
) => () => void;

export const RoomReactionFeedContext = createContext<RoomReactionSubscribe | null>(
  null,
);

type RoomReactionFeedProviderProps = {
  subscribe: RoomReactionSubscribe;
  children: ReactNode;
};

export function RoomReactionFeedProvider({
  subscribe,
  children,
}: RoomReactionFeedProviderProps) {
  return (
    <RoomReactionFeedContext.Provider value={subscribe}>
      {children}
    </RoomReactionFeedContext.Provider>
  );
}
