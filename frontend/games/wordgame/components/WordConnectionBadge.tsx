'use client';

import { Wifi, WifiOff } from 'lucide-react';

interface WordConnectionBadgeProps {
  connected: boolean;
}

export default function WordConnectionBadge({ connected }: WordConnectionBadgeProps) {
  return (
    <div className={connected ? 'sw-connected' : 'sw-connected sw-connected--off'}>
      {connected ?
        <>
          <span className="sw-connected__dot" aria-hidden />
          <Wifi className="w-3 h-3" />
          Connected
        </>
      :	<>
          <WifiOff className="w-3 h-3" />
          Reconnecting
        </>
      }
    </div>
  );
}
