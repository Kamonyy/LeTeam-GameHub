'use client';

import clsx from 'clsx';

interface ScoreProgressBarProps {
  label: string;
  score: number;
  cap: number;
  highlight?: boolean;
  teamColor?: 'blue' | 'amber';
}

export default function ScoreProgressBar({
  label,
  score,
  cap,
  highlight = false,
  teamColor,
}: ScoreProgressBarProps) {
  const pct = Math.min(100, (score / cap) * 100);
  const urgent = score >= cap * 0.75;

  return (
    <div
      className={clsx(
        'flex-1 min-w-[120px] max-w-[200px] px-3 py-2 rounded-lg border transition-all duration-300',
        highlight
          ? 'border-hub-accent/50 bg-hub-accent/10'
          : 'border-hub-border bg-hub-surface/80'
      )}
    >
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-xs font-medium text-hub-text-secondary truncate">{label}</span>
        <span className="text-xs font-mono text-hub-muted shrink-0">
          {score}/{cap}
        </span>
      </div>
      <div className="h-2 rounded-full bg-hub-border overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            teamColor === 'blue' && 'bg-gradient-to-r from-blue-600 to-blue-400',
            teamColor === 'amber' && 'bg-gradient-to-r from-amber-600 to-amber-400',
            !teamColor && urgent && 'bg-gradient-to-r from-hub-warning to-amber-300',
            !teamColor && !urgent && 'bg-gradient-to-r from-hub-accent-dim to-hub-accent'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
