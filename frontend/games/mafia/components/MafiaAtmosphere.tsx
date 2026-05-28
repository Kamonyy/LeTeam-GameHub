'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import MafiaAtmosphereThemes from './MafiaAtmosphereThemes';

const EMBER_COUNT_FULL = 14;
const EMBER_COUNT_REDUCED = 0;

const EMBERS = Array.from({ length: EMBER_COUNT_FULL }, (_, i) => ({
  id: i,
  left: `${(i * 13 + 10) % 82}%`,
  delay: `${(i * 0.7) % 10}s`,
  duration: `${11 + (i % 5) * 2}s`,
  drift: `${(i % 2 === 0 ? 1 : -1) * (6 + (i % 4) * 4)}px`,
  lift: `${20 + (i % 3) * 8}vh`,
}));

export type MafiaAtmosphereVariant = 'day' | 'night' | 'morning';

interface MafiaAtmosphereProps {
  variant?: MafiaAtmosphereVariant;
  /** Lobby / pre-room / prefers-reduced-motion: static look, no embers. */
  reduced?: boolean;
}

const VARIANT_FADE_MS = 600;

export default function MafiaAtmosphere({
  variant = 'day',
  reduced = false,
}: MafiaAtmosphereProps) {
  const [transitioning, setTransitioning] = useState(false);
  const prevVariant = useRef(variant);
  const displayVariant = reduced ? 'day' : variant;
  const embers = reduced ? EMBERS.slice(0, EMBER_COUNT_REDUCED) : EMBERS;

  useEffect(() => {
    if (reduced) return;
    if (prevVariant.current === variant) return;
    prevVariant.current = variant;
    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), VARIANT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [variant, reduced]);

  return (
    <div
      className={clsx(
        'mf-atmosphere',
        `mf-atmosphere--${displayVariant}`,
        reduced && 'mf-atmosphere--reduced',
        !reduced && transitioning && 'mf-atmosphere--transitioning',
      )}
      aria-hidden
    >
      <div className="mf-atmosphere__texture" />
      <MafiaAtmosphereThemes reduced={reduced} />
      <div className="mf-atmosphere__moonlight" />
      <div className="mf-atmosphere__torch mf-atmosphere__torch--left" />
      <div className="mf-atmosphere__torch mf-atmosphere__torch--right" />
      <div className="mf-atmosphere__fog mf-atmosphere__fog--a" />
      <div className="mf-atmosphere__fog mf-atmosphere__fog--b" />
      <div className="mf-atmosphere__fog mf-atmosphere__fog--c" />
      <div className="mf-atmosphere__vignette" />
      {embers.map((e) => (
        <span
          key={e.id}
          className="mf-ember"
          style={{
            left: e.left,
            bottom: `${6 + (e.id % 5) * 4}%`,
            animationDelay: e.delay,
            animationDuration: e.duration,
            ['--mf-drift' as string]: e.drift,
            ['--mf-lift' as string]: e.lift,
          }}
        />
      ))}
    </div>
  );
}
