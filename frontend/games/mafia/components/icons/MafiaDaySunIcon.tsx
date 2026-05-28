'use client';

import { useId } from 'react';
import clsx from 'clsx';
import {
  MAFIA_PHASE_ICON_PX,
  type MafiaPhaseIconSize,
} from './phaseIconSizes';

export type MafiaDaySunIconSize = MafiaPhaseIconSize;
export type MafiaSunVariant = 'day' | 'morning';

interface MafiaDaySunIconProps {
  size?: MafiaDaySunIconSize;
  variant?: MafiaSunVariant;
  className?: string;
}

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function SunRays({ opacity = 1 }: { opacity?: number }) {
  return (
    <g opacity={opacity}>
      {RAY_ANGLES.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 24 24)`}>
          <path
            d="M24 3.5 L25.6 11.5 L24 9.8 L22.4 11.5 Z"
            fill="currentColor"
          />
          <path
            d="M24 36.5 L25.2 30 L24 32 L22.8 30 Z"
            fill="currentColor"
            opacity="0.55"
          />
        </g>
      ))}
    </g>
  );
}

/** Sun with corona, rays, and surface detail — day or sunrise morning variant */
export default function MafiaDaySunIcon({
  size = 'md',
  variant = 'day',
  className,
}: MafiaDaySunIconProps) {
  const px = MAFIA_PHASE_ICON_PX[size];
  const uid = useId().replace(/:/g, '');
  const coronaId = `mf-sun-corona-${uid}`;
  const coreId = `mf-sun-core-${uid}`;
  const skyId = `mf-sun-sky-${uid}`;
  const isMorning = variant === 'morning';

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        'mf-day-sun-icon inline-block shrink-0',
        isMorning && 'mf-day-sun-icon--morning',
        className,
      )}
      aria-hidden
    >
      <defs>
        <radialGradient id={coronaId} cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor={isMorning ? '#ffe8b8' : '#fff4c8'}
            stopOpacity="0.95"
          />
          <stop
            offset="45%"
            stopColor={isMorning ? '#ffb060' : '#ffd050'}
            stopOpacity="0.55"
          />
          <stop
            offset="100%"
            stopColor={isMorning ? '#e87830' : '#f0a020'}
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient id={coreId} cx="42%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor={isMorning ? '#fff0c0' : '#fff8a8'} />
          <stop offset="85%" stopColor={isMorning ? '#f5a030' : '#f8c838'} />
          <stop offset="100%" stopColor={isMorning ? '#d86820' : '#e09018'} />
        </radialGradient>
        {isMorning && (
          <linearGradient id={skyId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff9860" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#c84868" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#281820" stopOpacity="0.85" />
          </linearGradient>
        )}
        {isMorning && (
          <clipPath id={`mf-sun-clip-${uid}`}>
            <rect x="0" y="0" width="48" height="30" />
          </clipPath>
        )}
      </defs>

      {isMorning && (
        <>
          <rect x="0" y="26" width="48" height="22" fill={`url(#${skyId})`} />
          <rect
            x="0"
            y="28.5"
            width="48"
            height="2"
            fill="#ffd8a8"
            fillOpacity="0.45"
          />
        </>
      )}

      <circle
        cx="24"
        cy={isMorning ? 28 : 24}
        r={isMorning ? 20 : 21}
        fill={`url(#${coronaId})`}
      />

      <g
        clipPath={isMorning ? `url(#mf-sun-clip-${uid})` : undefined}
        style={{ color: isMorning ? '#ffc868' : '#ffe878' }}
      >
        <SunRays opacity={isMorning ? 0.85 : 1} />
        <circle
          cx="24"
          cy={isMorning ? 28 : 24}
          r={isMorning ? 9.5 : 10}
          fill={`url(#${coreId})`}
        />
        <ellipse
          cx={isMorning ? 21.5 : 21}
          cy={isMorning ? 26 : 22}
          rx="1.6"
          ry="1.2"
          fill="#e8a820"
          fillOpacity="0.35"
        />
        <ellipse
          cx={isMorning ? 27 : 27.5}
          cy={isMorning ? 30 : 25.5}
          rx="1.2"
          ry="0.95"
          fill="#d88818"
          fillOpacity="0.28"
        />
        <circle
          cx={isMorning ? 20 : 19.5}
          cy={isMorning ? 25 : 21}
          r="1.8"
          fill="#ffffff"
          fillOpacity="0.55"
        />
      </g>
    </svg>
  );
}
