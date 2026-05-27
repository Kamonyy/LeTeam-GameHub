'use client';

import { Eye } from 'lucide-react';

type SpectatorBannerProps = {
  roomId: string;
  onLeave: () => void;
};

export default function SpectatorBanner({ roomId, onLeave }: SpectatorBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 mb-6 rounded-xl border border-violet-500/30 bg-violet-950/40 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-500/20 shrink-0">
          <Eye className="w-4 h-4 text-violet-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-100">Spectator mode</p>
          <p className="text-xs text-hub-muted truncate">
            Watching room{' '}
            <span className="font-mono font-bold text-white tracking-widest">{roomId}</span>
            {' '}— hands hidden
          </p>
        </div>
      </div>
      <button type="button" onClick={onLeave} className="btn-secondary text-sm py-2 shrink-0">
        Stop watching
      </button>
    </div>
  );
}
