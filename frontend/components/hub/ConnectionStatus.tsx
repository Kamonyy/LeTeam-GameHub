'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ConnectionStatusVariant = 'word' | 'mafia' | 'hub' | 'bara' | 'default';

interface ConnectionStatusProps {
  connected: boolean;
  variant?: ConnectionStatusVariant;
  connectedLabel?: string;
  reconnectingLabel?: string;
}

export default function ConnectionStatus({
  connected,
  variant = 'default',
  connectedLabel,
  reconnectingLabel,
}: ConnectionStatusProps) {
  if (variant === 'word') {
    return (
      <div className={connected ? 'sw-connected' : 'sw-connected sw-connected--off'}>
        {connected ?
          <>
            <span className="sw-connected__dot" aria-hidden />
            <Wifi className="w-3 h-3" />
            {connectedLabel ?? 'Connected'}
          </>
        : <>
            <WifiOff className="w-3 h-3" />
            {reconnectingLabel ?? 'Reconnecting'}
          </>
        }
      </div>
    );
  }

  if (variant === 'mafia') {
    return (
      <Badge
        variant={connected ? 'jade' : 'rust'}
        role="status"
        className="gap-1.5 px-3 py-1 font-cinzel text-[0.7rem] uppercase tracking-widest max-[959px]:px-2 max-[959px]:py-1.5"
      >
        {connected ?
          <Wifi className="h-3.5 w-3.5" aria-hidden />
        : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
        <span className="max-[400px]:sr-only max-[959px]:text-[0.65rem]">
          {connected ?
            (connectedLabel ?? 'Connected')
          : (reconnectingLabel ?? 'Reconnecting')}
        </span>
      </Badge>
    );
  }

  const labels =
    variant === 'bara' ?
      {
        on: connectedLabel ?? 'متصل',
        off: reconnectingLabel ?? 'جاري إعادة الاتصال…',
      }
    : {
        on: connectedLabel ?? 'Connected',
        off: reconnectingLabel ?? 'Reconnecting…',
      };

  const toneClass =
    variant === 'bara' ?
      connected ?
        'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : 'text-amber-300 border-amber-500/30 bg-amber-500/10 animate-pulse-soft'
    : connected ?
      'text-hub-success border-hub-success/30 bg-hub-success/10'
    : 'text-hub-warning border-hub-warning/30 bg-hub-warning/10 animate-pulse-soft';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        toneClass
      )}
      role="status"
    >
      {connected ?
        <>
          <Wifi className="w-3 h-3" />
          {labels.on}
        </>
      : <>
          <WifiOff className="w-3 h-3" />
          {labels.off}
        </>
      }
    </div>
  );
}
