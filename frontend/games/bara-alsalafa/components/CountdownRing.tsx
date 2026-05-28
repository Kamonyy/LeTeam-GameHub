'use client';

import { useEffect, useState } from 'react';

interface CountdownRingProps {
  phaseEndsAt: number | null;
  totalMs: number;
  label?: string;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return String(s);
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
  const display = formatRemaining(remaining);
  const urgent = progress < 0.2;

  return (
    <div className="bara-countdown" aria-live="polite">
      <div className="bara-countdown__ring">
        <svg className="bara-countdown__svg" viewBox="0 0 96 96" aria-hidden>
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
            stroke={urgent ? '#f43f5e' : '#fb7185'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="bara-countdown__arc"
          />
        </svg>
        <span className="bara-countdown__value tabular-nums">{display}</span>
      </div>
      <span className="bara-countdown__label">{label}</span>
    </div>
  );
}
