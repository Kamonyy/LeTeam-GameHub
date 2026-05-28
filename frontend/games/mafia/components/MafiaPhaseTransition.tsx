'use client';

import clsx from 'clsx';
import type { MafiaPhaseTransitionView } from '../hooks/useMafiaPhaseTransition';
import MafiaDaySunIcon from './icons/MafiaDaySunIcon';
import MafiaNightMoonIcon from './icons/MafiaNightMoonIcon';

interface MafiaPhaseTransitionProps {
  transition: MafiaPhaseTransitionView | null;
}

export default function MafiaPhaseTransition({
  transition,
}: MafiaPhaseTransitionProps) {
  if (!transition) return null;

  return (
    <div
      key={transition.key}
      className={clsx(
        'mf-phase-transition',
        `mf-phase-transition--${transition.phase}`,
      )}
      role="status"
      aria-live="polite"
      aria-label={transition.label}
    >
      <div className="mf-phase-flash" aria-hidden />
      <div className="mf-phase-banner">
        <span className="mf-phase-banner__icon" aria-hidden>
          {transition.phase === 'night' && (
            <MafiaNightMoonIcon size="lg" />
          )}
          {transition.phase === 'day' && (
            <MafiaDaySunIcon size="lg" variant="day" />
          )}
          {transition.phase === 'morning' && (
            <MafiaDaySunIcon size="lg" variant="morning" />
          )}
          {transition.phase !== 'night' &&
            transition.phase !== 'day' &&
            transition.phase !== 'morning' &&
            transition.icon}
        </span>
        <span className="mf-phase-banner__label font-cinzel">
          {transition.label}
        </span>
      </div>
    </div>
  );
}
