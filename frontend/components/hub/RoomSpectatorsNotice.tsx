'use client';

import { Eye } from 'lucide-react';
import clsx from 'clsx';
import type { LobbySpectator } from '@/lib/hub/types';

type RoomSpectatorsNoticeProps = {
  spectators: LobbySpectator[];
  className?: string;
};

export default function RoomSpectatorsNotice({
  spectators,
  className,
}: RoomSpectatorsNoticeProps) {
  const watching = spectators.filter((s) => s.connected !== false);
  if (watching.length === 0) return null;

  const ariaNames = watching.map((s) => s.displayName).join(', ');

  return (
    <div className={clsx('room-spectators-notice-wrap', className)}>
      <div
        className="room-spectators-notice"
        role="status"
        aria-live="polite"
        aria-label={`Watching: ${ariaNames}`}
      >
        <div className="room-spectators-notice__icon" aria-hidden>
          <Eye className="w-3.5 h-3.5" />
        </div>
        <span className="room-spectators-notice__label">Watching</span>
        <ul className="room-spectators-notice__list">
          {watching.map((s) => (
            <li key={s.id}>
              <span
                className={clsx(
                  'room-spectators-notice__chip',
                  s.connected === false && 'room-spectators-notice__chip--away'
                )}
              >
                {s.displayName}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
