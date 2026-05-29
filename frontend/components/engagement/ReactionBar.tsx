'use client';

import clsx from 'clsx';
import {
  ROOM_REACTION_CATALOG,
  ROOM_REACTION_IDS,
  type RoomReactionId,
  type RoomReactionType,
} from '@/lib/engagement/reactionCatalog';
import { unlockReactionAudio } from '@/lib/engagement/reactionSound';
import { useSocket } from '@/hooks/useSocket';

type ReactionBarProps = {
  roomId: string;
  className?: string;
};

export default function ReactionBar({ roomId, className }: ReactionBarProps) {
  const { sendRoomReaction, connected } = useSocket();

  const fire = (reactionId: RoomReactionId, type: RoomReactionType) => {
    unlockReactionAudio();
    sendRoomReaction(roomId, reactionId, type);
  };

  return (
    <div
      className={clsx(
        'fixed bottom-0 inset-x-0 z-[56] flex justify-center pointer-events-none',
        'pb-[max(0.35rem,env(safe-area-inset-bottom))] px-2',
        className,
      )}
      role="toolbar"
      aria-label="Room reactions"
    >
      <div
        className={clsx(
          'pointer-events-auto flex flex-nowrap items-center justify-center gap-0.5',
          'mx-auto mb-1.5 px-1 py-0.5 rounded-xl',
          'border border-hub-border/70 bg-hub-surface/92 glass-blur-sm shadow-md',
        )}
      >
        {ROOM_REACTION_IDS.map((id) => {
          const entry = ROOM_REACTION_CATALOG[id];
          return (
            <button
              key={id}
              type="button"
              disabled={!connected}
              title={`${entry.label} (right-click for sound)`}
              aria-label={entry.label}
              className={clsx(
                'h-8 w-8 shrink-0 rounded-lg text-lg leading-none',
                'flex items-center justify-center',
                'transition-transform hover:scale-105 active:scale-95',
                'disabled:opacity-40 disabled:pointer-events-none',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-hub-accent',
              )}
              onClick={() => fire(id, 'emoji')}
              onContextMenu={(e) => {
                e.preventDefault();
                fire(id, 'sound');
              }}
            >
              {entry.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
