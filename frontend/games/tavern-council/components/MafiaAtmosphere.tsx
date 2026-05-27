'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 13 + 5) % 92}%`,
  delay: `${(i * 0.65) % 14}s`,
  duration: `${11 + (i % 6) * 2}s`,
  drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 6)}px`,
}));

export type MafiaAtmosphereVariant = 'day' | 'night' | 'morning';

interface MafiaAtmosphereProps {
  variant?: MafiaAtmosphereVariant;
}

const VARIANT_FADE_MS = 600;

export default function MafiaAtmosphere({
  variant = 'day',
}: MafiaAtmosphereProps) {
  const [transitioning, setTransitioning] = useState(false);
  const prevVariant = useRef(variant);

  useEffect(() => {
    if (prevVariant.current === variant) return;
    prevVariant.current = variant;
    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), VARIANT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [variant]);

  return (
    <div
      className={clsx(
        'tc-atmosphere',
        `tc-atmosphere--${variant}`,
        transitioning && 'tc-atmosphere--transitioning'
      )}
      aria-hidden
    >
      <div className="tc-atmosphere__runes" />
      <div className="tc-atmosphere__moon" />
      <div className="tc-atmosphere__brazier" />
      <div className="tc-atmosphere__fog" />
      <div className="tc-atmosphere__vignette" />
      {EMBERS.map((e) => (
        <span
          key={e.id}
          className="tc-ember"
          style={{
            left: e.left,
            bottom: `${(e.id % 5) * 6}%`,
            animationDelay: e.delay,
            animationDuration: e.duration,
            ['--tc-drift' as string]: e.drift,
          }}
        />
      ))}
    </div>
  );
}
