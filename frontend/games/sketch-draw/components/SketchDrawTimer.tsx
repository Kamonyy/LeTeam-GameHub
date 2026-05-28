'use client';

import clsx from 'clsx';
import { useGameTimer, useGameState } from '@/hooks/useSocket';
import type { SketchDrawGameState } from '../types';

type SketchDrawTimerProps = {
  phase: string;
  fallbackRemainingMs?: number;
  className?: string;
};

export default function SketchDrawTimer({
  phase,
  fallbackRemainingMs = 0,
  className,
}: SketchDrawTimerProps) {
  const sketchDrawTimeTick = useGameTimer();
  const { gameState, lobby } = useGameState();

  const gs = gameState as SketchDrawGameState | null;
  const roomId = lobby?.roomId ?? null;
  const tickMatchesRoom =
    sketchDrawTimeTick &&
    sketchDrawTimeTick.roomId === roomId &&
    sketchDrawTimeTick.phase === phase;

  const remainingMs =
    tickMatchesRoom ? sketchDrawTimeTick.remainingMs
    : gs?.phaseEndsAt != null ? Math.max(0, gs.phaseEndsAt - Date.now())
    : fallbackRemainingMs;

  const secondsLeft = Math.ceil(remainingMs / 1000);

  if (phase !== 'word_select' && phase !== 'drawing') return null;

  return (
    <div
      className={clsx(
        'sketch-timer font-mono text-2xl tabular-nums text-violet-200',
        secondsLeft <= 10 && 'text-amber-400 animate-pulse',
        className
      )}
      aria-live="polite"
    >
      {secondsLeft}s
    </div>
  );
}
