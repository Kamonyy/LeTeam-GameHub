'use client';

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  emojiForReactionId,
  ROOM_REACTION_CATALOG,
  type RoomReactionBroadcast,
  type RoomReactionId,
} from '@/lib/engagement/reactionCatalog';
import {
  triggerProceduralPing,
} from '@/lib/engagement/reactionSound';
import { useRoomReactionFeed } from '@/lib/engagement/useRoomReactionFeed';

type Burst = {
  id: string;
  reactionId: string;
  leftPct: number;
};

const BURST_MS = 1200;

type ReactionOverlayProps = {
  roomId: string;
};

export default function ReactionOverlay({ roomId }: ReactionOverlayProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const onBroadcast = useCallback(
    (data: RoomReactionBroadcast) => {
      if (data.roomId !== roomId) return;

      const uniqueId = `${data.timestamp}-${data.senderId}-${Math.random().toString(36).slice(2, 8)}`;
      const leftPct = 10 + Math.random() * 80;

      setBursts((prev) => [...prev, { id: uniqueId, reactionId: data.reactionId, leftPct }]);

      if (data.type === 'sound') {
        const entry = ROOM_REACTION_CATALOG[data.reactionId as RoomReactionId];
        if (entry?.soundKey) {
          triggerProceduralPing(entry.soundKey);
        }
      }

      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== uniqueId));
      }, BURST_MS);
    },
    [roomId],
  );

  useRoomReactionFeed(onBroadcast);

  if (bursts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-[55]"
      aria-hidden
    >
      {bursts.map((burst) => {
        const emoji = emojiForReactionId(burst.reactionId) ?? '✨';
        return (
          <span
            key={burst.id}
            className={clsx(
              'absolute bottom-16 text-4xl sm:text-5xl drop-shadow-lg select-none',
              !reducedMotion && 'animate-reaction-float',
              reducedMotion && 'opacity-90',
            )}
            style={{ left: `${burst.leftPct}%`, transform: reducedMotion ? 'translateY(-120px)' : undefined }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}
