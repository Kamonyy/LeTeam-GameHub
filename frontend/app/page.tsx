'use client';

import { Gamepad2 } from 'lucide-react';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import OnlinePlayersPanel from '@/components/hub/OnlinePlayersPanel';
import HubArcadeShell from '@/components/hub/arcade/HubArcadeShell';
import HubHero from '@/components/hub/arcade/HubHero';
import GameArcadeCard from '@/components/hub/arcade/GameArcadeCard';
import { useSocket } from '@/hooks/useSocket';
import { GAMES } from '@/lib/hub/games-registry';
import './hub-arcade.css';

export default function HomePage() {
  const { connected, hubPresence } = useSocket();

  return (
    <main className="hub-arcade min-h-screen relative overflow-x-hidden">
      <HubArcadeShell />

      <header className="relative z-40 border-b border-hub-border/80 bg-hub-surface/40 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 hub-enter-hero" style={{ animationDelay: '0ms' }}>
            <Gamepad2 className="w-7 h-7 text-hub-accent shrink-0" />
            <h1 className="text-xl font-bold tracking-tight truncate bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              LeTeam Game Hub
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ConnectionStatus connected={connected} />
            <PlayerNameControl />
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
          <div className="flex-1 min-w-0">
            <HubHero connected={connected} hubPresence={hubPresence} />

            <section className="pb-16">
              <h3 className="text-xs uppercase tracking-[0.3em] text-hub-muted mb-6 font-semibold hub-enter-card" style={{ ['--hub-stagger' as string]: 0 }}>
                Game Cabinets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {GAMES.map((game, index) => (
                  <GameArcadeCard key={game.id} game={game} staggerIndex={index + 1} />
                ))}
              </div>
              <p
                className="text-center lg:text-left text-hub-muted text-sm mt-10 hub-enter-card"
                style={{ ['--hub-stagger' as string]: GAMES.length + 2 }}
              >
                More cabinets dropping soon — the workshop never sleeps.
              </p>
            </section>
          </div>

          <div className="w-full lg:w-72 shrink-0 hub-enter-sidebar">
            <OnlinePlayersPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
