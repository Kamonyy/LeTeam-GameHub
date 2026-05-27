'use client';

import Link from 'next/link';
import { Gamepad2, Zap, ArrowRight, Clock } from 'lucide-react';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import OnlinePlayersPanel from '@/components/hub/OnlinePlayersPanel';
import { useSocket } from '@/hooks/useSocket';
import { GAMES } from '@/lib/hub/games-registry';
import clsx from 'clsx';

export default function HomePage() {
  const { connected } = useSocket();

  return (
    <main className="min-h-screen">
      <header className="border-b border-hub-border bg-hub-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Gamepad2 className="w-7 h-7 text-hub-accent shrink-0" />
            <h1 className="text-xl font-bold tracking-tight truncate">LeTeam Game Hub</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ConnectionStatus connected={connected} />
            <PlayerNameControl />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <div className="flex-1 min-w-0">
            <section className="text-center lg:text-left py-6 lg:py-10 mb-8">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Play together, instantly
              </h2>
              <p className="text-hub-muted text-lg max-w-xl mx-auto lg:mx-0 mb-8">
                Real-time multiplayer games in your browser. Create a room, share the code, and play.
              </p>
              <div className="flex justify-center lg:justify-start gap-8 text-sm text-hub-muted">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-hub-accent" />
                  Low latency
                </span>
              </div>
            </section>

            <section className="pb-12 lg:pb-20">
              <h3 className="text-sm uppercase tracking-wider text-hub-muted mb-6">Games</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GAMES.map((game) => {
                  const cardClass = clsx(
                    'group card transition-all duration-300',
                    game.active ?
                      'hover:border-hub-accent/50 hover:shadow-lg hover:shadow-hub-accent/5'
                    :	'opacity-75 cursor-not-allowed border-hub-border',
                  );

                  const inner = (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-hub-accent/15 flex items-center justify-center text-2xl">
                          {game.icon ?? '🎮'}
                        </div>
                        {game.active ?
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hub-success/15 text-hub-success">
                            Live
                          </span>
                        :	<span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hub-border/80 text-hub-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Soon
                          </span>
                        }
                      </div>
                      <h4
                        className={clsx(
                          'text-xl font-semibold mb-2 transition-colors',
                          game.active && 'group-hover:text-hub-accent',
                        )}
                      >
                        {game.name}
                      </h4>
                      <p className="text-hub-muted text-sm mb-3 leading-snug">{game.tagline}</p>
                      {!game.active && game.disabledReason && (
                        <p className="text-xs text-hub-warning mb-3">{game.disabledReason}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-hub-muted">{game.players} players</span>
                        {game.active && (
                          <span className="flex items-center gap-1 text-sm text-hub-accent font-medium group-hover:gap-2 transition-all">
                            Play
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </>
                  );

                  return game.active ?
                      <Link key={game.id} href={game.href} className={cardClass}>
                        {inner}
                      </Link>
                    :	<div key={game.id} className={cardClass} aria-disabled>
                        {inner}
                      </div>;
                })}
              </div>
              <p className="text-center lg:text-left text-hub-muted text-sm mt-10">
                More games coming soon.
              </p>
            </section>
          </div>

          <div className="w-full lg:w-72 shrink-0">
            <OnlinePlayersPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
