'use client';

import ReactionBar from '@/components/engagement/ReactionBar';
import ReactionOverlay from '@/components/engagement/ReactionOverlay';

type RoomEngagementLayerProps = {
  roomId: string | null | undefined;
};

/** Floating reactions + picker when the client is in an active room. */
export default function RoomEngagementLayer({ roomId }: RoomEngagementLayerProps) {
  if (!roomId) return null;

  return (
    <>
      <ReactionOverlay roomId={roomId} />
      <ReactionBar roomId={roomId} />
    </>
  );
}
