'use client';

import { useEffect, useMemo, useState } from 'react';
import { Zap, Radio } from 'lucide-react';
import type { HubPresenceState } from '@/lib/hub/types';
interface HubHeroProps {
  connected: boolean;
  hubPresence: HubPresenceState;
}

export default function HubHero({ connected, hubPresence }: HubHeroProps) {
  const [tick, setTick] = useState(0);

  const messages = useMemo(() => {
    const list: string[] = [];
    const activeGames = ['Secret Word', 'برا السالفة'];
    if (hubPresence.total > 0) {
      list.push(
        `• ${hubPresence.total} ${hubPresence.total === 1 ? 'player' : 'players'} in the arcade lounge`
      );
      const others = hubPresence.players.filter((p) => !p.isYou).slice(0, 2);
      others.forEach((p, i) => {
        const game = activeGames[i % activeGames.length];
        list.push(`• ${p.displayName} is in the lounge — ${game} awaits`);
      });
    } else if (connected) {
      list.push('• The lounge is quiet — be the first to deal a room');
    } else {
      list.push('• Connecting to the live hub…');
    }
    list.push('• 2 live games ready — Secret Word & برا السالفة');
    list.push('• Dominoes returns soon — polish in the workshop');
    list.push('• Create a room, share the code, play in seconds');
    return list;
  }, [connected, hubPresence]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 4200);
    return () => window.clearInterval(id);
  }, []);

  const statusText = messages[tick % messages.length];

  return (
    <section className="hub-enter-hero text-center lg:text-left py-8 lg:py-12 mb-10">
      <p className="text-xs uppercase tracking-[0.35em] text-hub-muted mb-4 font-medium">
        Digital Arcade Lounge
      </p>
      <h2 className="hub-hero-title text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
        Play together, instantly
      </h2>
      <p className="text-hub-muted text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
        Real-time multiplayer in your browser. Pick a cabinet, summon friends, and jump in.
      </p>

      <div className="hub-ticker-pill inline-flex items-center gap-3 px-4 py-2.5 rounded-full max-w-full">
        <span className="hub-ticker-dot relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-hub-success opacity-60 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-hub-success" />
        </span>
        <span className="flex items-center gap-2 text-sm text-gray-300 min-w-0">
          <Radio className="w-3.5 h-3.5 text-hub-accent shrink-0" aria-hidden />
          <span key={tick} className="hub-ticker-text truncate">
            {statusText}
          </span>
        </span>
      </div>

      <div className="flex justify-center lg:justify-start gap-8 text-sm text-hub-muted mt-8">
        <span className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-hub-accent" />
          Low latency sockets
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-hub-success animate-pulse" />
          Live hub
        </span>
      </div>
    </section>
  );
}
