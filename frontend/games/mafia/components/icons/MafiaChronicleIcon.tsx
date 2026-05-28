'use client';

import MafiaDaySunIcon from './MafiaDaySunIcon';
import MafiaNightMoonIcon, { type MafiaNightMoonIconSize } from './MafiaNightMoonIcon';

export type MafiaChronicleIconSize = MafiaNightMoonIconSize;

const PHASE_ICONS: Record<string, '🌙' | '☀️' | '🌅'> = {
  moon: '🌙',
  sun: '☀️',
  morning: '🌅',
};

/** Renders detailed phase SVGs for chronicle / log emojis */
export function MafiaChronicleIcon({
  icon,
  className,
  size = 'xs',
}: {
  icon: string;
  className?: string;
  size?: MafiaChronicleIconSize;
}) {
  if (icon === PHASE_ICONS.moon) {
    return <MafiaNightMoonIcon size={size} className={className} />;
  }
  if (icon === PHASE_ICONS.sun) {
    return <MafiaDaySunIcon size={size} variant="day" className={className} />;
  }
  if (icon === PHASE_ICONS.morning) {
    return (
      <MafiaDaySunIcon size={size} variant="morning" className={className} />
    );
  }
  return (
    <span className={className} aria-hidden>
      {icon}
    </span>
  );
}

export { PHASE_ICONS };
