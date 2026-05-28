'use client';

import { useId } from 'react';
import clsx from 'clsx';
import {
  MAFIA_PHASE_ICON_PX,
  type MafiaPhaseIconSize,
} from './phaseIconSizes';

export type MafiaNightMoonIconSize = MafiaPhaseIconSize;

interface MafiaNightMoonIconProps {
  size?: MafiaNightMoonIconSize;
  className?: string;
}

/** Crescent moon with depth, craters, and stars */
export default function MafiaNightMoonIcon({
  size = 'md',
  className,
}: MafiaNightMoonIconProps) {
  const px = MAFIA_PHASE_ICON_PX[size];
  const uid = useId().replace(/:/g, '');
  const haloId = `mf-moon-halo-${uid}`;
  const bodyId = `mf-moon-body-${uid}`;
  const shadeId = `mf-moon-shade-${uid}`;
  const rimId = `mf-moon-rim-${uid}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('mf-night-moon-icon inline-block shrink-0', className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={haloId} cx="48%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#b8c8f8" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#6a82c8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3a4878" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={bodyId} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e8eeff" />
          <stop offset="72%" stopColor="#a8b8d8" />
          <stop offset="100%" stopColor="#5a6888" />
        </radialGradient>
        <radialGradient id={shadeId} cx="72%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#0c1020" stopOpacity="0.72" />
          <stop offset="55%" stopColor="#1a2240" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#1a2240" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={rimId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#f8fbff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f8fbff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="26" cy="24" r="21" fill={`url(#${haloId})`} />
      <circle cx="26" cy="24" r="15.8" fill={`url(#${bodyId})`} />
      <circle cx="26" cy="24" r="15.8" fill={`url(#${shadeId})`} />
      <path
        d="M 14 12.5 A 15.8 15.8 0 0 0 14 35.5"
        stroke={`url(#${rimId})`}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse
        cx="19.5"
        cy="18.5"
        rx="3.4"
        ry="2.8"
        fill="#5a6888"
        fillOpacity="0.55"
      />
      <ellipse
        cx="20.2"
        cy="17.6"
        rx="2"
        ry="1.5"
        fill="#dce6ff"
        fillOpacity="0.35"
      />
      <ellipse
        cx="27.8"
        cy="29.2"
        rx="2.5"
        ry="2.1"
        fill="#4a5878"
        fillOpacity="0.5"
      />
      <ellipse
        cx="28.3"
        cy="28.4"
        rx="1.3"
        ry="1"
        fill="#c8d4f0"
        fillOpacity="0.3"
      />
      <ellipse
        cx="22.5"
        cy="12.8"
        rx="1.8"
        ry="1.5"
        fill="#6a7898"
        fillOpacity="0.42"
      />
      <ellipse
        cx="23"
        cy="12.2"
        rx="0.9"
        ry="0.7"
        fill="#eef2ff"
        fillOpacity="0.28"
      />
      <path
        d="M17 7.5 L18.4 10.8 L15.2 10.2 Z"
        fill="#f0f4ff"
        fillOpacity="0.95"
      />
      <path
        d="M38 13.5 L38.8 15.2 L37 15.2 Z"
        fill="#d8e4ff"
        fillOpacity="0.8"
      />
      <circle cx="9" cy="31" r="0.7" fill="#c8d4f0" fillOpacity="0.8" />
      <circle cx="40" cy="34" r="0.55" fill="#b0c0e0" fillOpacity="0.65" />
    </svg>
  );
}
