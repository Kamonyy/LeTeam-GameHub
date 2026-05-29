'use client';

import { Eye } from 'lucide-react';

type WordSpectatorBannerProps = {
  roomId: string;
  onLeave: () => void;
};

export default function WordSpectatorBanner({
  roomId,
  onLeave,
}: WordSpectatorBannerProps) {
  return (
    <div
      className="sw-spectator-banner sw-animate-ascend"
      role="status"
      aria-label={`Spectating room ${roomId}`}
    >
      <div className="sw-spectator-banner__icon" aria-hidden>
        <Eye className="w-3.5 h-3.5" />
      </div>
      <p className="sw-spectator-banner__text min-w-0">
        <span className="sw-spectator-banner__label">Spectating</span>
        <span className="font-mono font-semibold text-[#fff8e7] tracking-widest">
          {roomId}
        </span>
      </p>
      <button
        type="button"
        onClick={onLeave}
        className="sw-spectator-banner__leave shrink-0"
      >
        Stop
      </button>
    </div>
  );
}
