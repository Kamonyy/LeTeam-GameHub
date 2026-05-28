'use client';

import { useId } from 'react';
import clsx from 'clsx';
import type { MafiaPhaseIconSize } from './phaseIconSizes';

export type MafiaNightMoonIconSize = MafiaPhaseIconSize;

/** Slightly larger than shared phase icons so moon detail stays readable in the log. */
const MOON_ICON_PX: Record<MafiaPhaseIconSize, number> = {
  xs: 22,
  sm: 26,
  md: 40,
  lg: 64,
};

interface MafiaNightMoonIconProps {
  size?: MafiaNightMoonIconSize;
  className?: string;
}

/** Full moon — single disc with limb shading (no crescent mask). */
export default function MafiaNightMoonIcon({
  size = 'md',
  className,
}: MafiaNightMoonIconProps) {
  const px = MOON_ICON_PX[size];
  const uid = useId().replace(/:/g, '');
  const haloId = `mf-moon-halo-${uid}`;
  const bodyId = `mf-moon-body-${uid}`;
  const clipId = `mf-moon-clip-${uid}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      className={clsx('mf-night-moon-icon inline-block shrink-0', className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b8c8f0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3a4878" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={bodyId} cx="42%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e8eeff" />
          <stop offset="72%" stopColor="#a8b8d8" />
          <stop offset="92%" stopColor="#6a7898" />
          <stop offset="100%" stopColor="#4a5878" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="26" cy="24" r="16" />
        </clipPath>
      </defs>

      <circle cx="26" cy="24" r="21" fill={`url(#${haloId})`} />

      <g fill="#e8eeff">
        <circle cx="9" cy="10" r="1.1" opacity="0.85" />
        <circle cx="39" cy="12" r="0.9" opacity="0.7" />
        <circle cx="8" cy="32" r="0.75" opacity="0.65" />
        <circle cx="40" cy="34" r="0.6" opacity="0.55" />
      </g>

      <circle
        cx="26"
        cy="24"
        r="16"
        fill={`url(#${bodyId})`}
        stroke="#e8eeff"
        strokeOpacity="0.35"
        strokeWidth="0.75"
      />

      <g clipPath={`url(#${clipId})`} opacity="0.92">
        <ellipse cx="19" cy="18" rx="3.2" ry="2.6" fill="#5a6888" />
        <ellipse cx="28" cy="30" rx="2.6" ry="2.1" fill="#4a5878" />
        <ellipse cx="23" cy="12" rx="1.9" ry="1.5" fill="#6a7898" />
        <ellipse cx="30" cy="20" rx="1.4" ry="1.1" fill="#526080" />
        <ellipse cx="24" cy="27" rx="2" ry="1.5" fill="#5a6888" />
        <ellipse cx="32" cy="15" rx="1.2" ry="1" fill="#526080" />
      </g>
    </svg>
  );
}
