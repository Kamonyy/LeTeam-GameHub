'use client';

import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
}

export default function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
        connected
          ? 'text-hub-success border-hub-success/30 bg-hub-success/10'
          : 'text-hub-warning border-hub-warning/30 bg-hub-warning/10 animate-pulse-soft'
      }`}
    >
      {connected ? (
        <>
          <Wifi className="w-3 h-3" />
          Connected
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Reconnecting…
        </>
      )}
    </div>
  );
}
