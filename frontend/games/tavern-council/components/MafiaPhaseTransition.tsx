'use client';

import clsx from 'clsx';
import type { MafiaPhaseTransitionView } from '../hooks/useMafiaPhaseTransition';

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
        'tc-phase-transition',
        `tc-phase-transition--${transition.phase}`
      )}
      role="status"
      aria-live="polite"
      aria-label={transition.label}
    >
      <div className="tc-phase-flash" aria-hidden />
      <div className="tc-phase-banner">
        <span className="tc-phase-banner__icon" aria-hidden>
          {transition.icon}
        </span>
        <span className="tc-phase-banner__label tc-font-display">
          {transition.label}
        </span>
      </div>
    </div>
  );
}
