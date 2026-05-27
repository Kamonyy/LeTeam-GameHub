'use client';

import { useEffect, useState } from 'react';

interface CountdownRingProps {
  phaseEndsAt: number | null;
  totalMs: number;
  label?: string;
}

export default function CountdownRing({
  phaseEndsAt,
  totalMs,
  label = 'الوقت المتبقي',
}: CountdownRingProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, phaseEndsAt - Date.now()));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  if (remaining == null) return null;

  const progress = Math.min(1, remaining / totalMs);
  const circumference = 2 * Math.PI * 42;
  const dash = circumference * progress;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="flex flex-col items-center gap-2" aria-live="polite">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke={progress < 0.25 ? '#ef4444' : '#34d399'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-200"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums">
          {seconds}
        </span>
      </div>
      <span className="text-xs text-hub-muted">{label}</span>
    </div>
  );
}
