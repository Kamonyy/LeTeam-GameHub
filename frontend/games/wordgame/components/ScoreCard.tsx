'use client';

import clsx from 'clsx';

interface ScoreCardProps {
  playerNames: Record<string, string>;
  playerIds: string[];
  scores: Record<string, number>;
  myPlayerId: string;
}

export default function ScoreCard({
  playerNames,
  playerIds,
  scores,
  myPlayerId,
}: ScoreCardProps) {
  return (
    <div className="flex gap-4 justify-center animate-fade-in">
      {playerIds.map((id, index) => {
        const isMe = id === myPlayerId;
        return (
          <div
            key={id}
            className={clsx(
              'flex-1 max-w-[200px] px-5 py-4 rounded-xl border text-center transition-all duration-300',
              isMe
                ? 'border-hub-accent/50 bg-hub-accent/10 shadow-lg shadow-hub-accent/5'
                : 'border-hub-border bg-hub-surface/80'
            )}
          >
            <p className="text-xs text-hub-muted uppercase tracking-wider mb-1">
              Player {index + 1}
              {isMe && ' · You'}
            </p>
            <p className="text-sm font-medium text-gray-200 truncate mb-2">
              {playerNames[id] || 'Player'}
            </p>
            <p className="text-4xl font-black tabular-nums text-white">
              {scores[id] ?? 0}
            </p>
            <p className="text-[10px] text-hub-muted mt-1">session points</p>
          </div>
        );
      })}
    </div>
  );
}
