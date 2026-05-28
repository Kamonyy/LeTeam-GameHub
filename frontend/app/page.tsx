'use client';

import { Gamepad2 } from 'lucide-react';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import OnlinePlayersPanel from '@/components/hub/OnlinePlayersPanel';
import HubArcadeShell from '@/components/hub/arcade/HubArcadeShell';
import HubHero from '@/components/hub/arcade/HubHero';
import GameArcadeCard from '@/components/hub/arcade/GameArcadeCard';
import ErrorToast from '@/components/shared/ErrorToast';
import { useHubLive } from '@/lib/hub/HubLiveContext';
import { GAMES } from '@/lib/hub/games-registry';
import './hub-arcade.css';

export default function HomePage() {
  const { connected, hubPresence, error, clearError } = useHubLive();
  const liveGames = GAMES.filter((game) => game.active);
  const soonGames = GAMES.filter((game) => !game.active);

  return (
    <main className="hub-arcade min-h-dvh relative overflow-x-hidden">
      <HubArcadeShell />

      <header className="relative z-40 border-b border-hub-border/80 bg-hub-surface/40 glass-blur-md sticky top-0 pt-safe-top">
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
        <div className="flex flex-col gap-10 lg:gap-12">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 lg:items-stretch">
            <HubHero connected={connected} hubPresence={hubPresence} />

            <div className="w-full lg:w-72 shrink-0 hub-enter-sidebar flex flex-col min-h-[260px] lg:min-h-0">
              <OnlinePlayersPanel />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <section className="pb-12">
              <h3
                className="text-xs uppercase tracking-[0.3em] text-hub-success mb-6 font-semibold hub-enter-card"
                style={{ ['--hub-stagger' as string]: 0 }}
              >
                Live now
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {liveGames.map((game, index) => (
                  <GameArcadeCard
                    key={game.id}
                    game={game}
                    staggerIndex={index + 1}
                  />
                ))}
              </div>
            </section>

            {soonGames.length > 0 && (
              <section className="pb-12 pt-4 border-t border-hub-border/40">
                <h3
                  className="text-xs uppercase tracking-[0.3em] text-hub-muted mb-6 font-semibold hub-enter-card"
                  style={{ ['--hub-stagger' as string]: liveGames.length + 1 }}
                >
                  Coming soon
                </h3>
                <p
                  className="text-hub-muted text-sm mb-6 hub-enter-card"
                  style={{ ['--hub-stagger' as string]: liveGames.length + 2 }}
                >
                  In the workshop — not playable yet.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {soonGames.map((game, index) => (
                    <GameArcadeCard
                      key={game.id}
                      game={game}
                      staggerIndex={liveGames.length + index + 3}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <ErrorToast message={error} onDismiss={clearError} />
    </main>
  );
}
