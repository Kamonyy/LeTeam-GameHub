'use client';

import { Loader2 } from 'lucide-react';

interface GameLobbyPendingOverlayProps {
  message: string;
  className?: string;
}

/** Covers a lobby form while create/join is in flight. */
export default function GameLobbyPendingOverlay({
  message,
  className = '',
}: GameLobbyPendingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-[rgba(6,8,16,0.78)] backdrop-blur-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="w-7 h-7 animate-spin text-hub-accent" aria-hidden />
      <p className="text-sm font-medium text-gray-100">{message}</p>
    </div>
  );
}
