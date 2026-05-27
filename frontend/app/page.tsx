'use client';

import Link from 'next/link';
import { Gamepad2, Zap, ArrowRight } from 'lucide-react';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';
import { GAMES } from '@/lib/hub/games-registry';

export default function HomePage() {
  const { connected } = useSocket();

  return (
    <main className="min-h-screen">
      <header className="border-b border-hub-border bg-hub-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-7 h-7 text-hub-accent" />
            <h1 className="text-xl font-bold tracking-tight">LeTeam Game Hub</h1>
          </div>
          <ConnectionStatus connected={connected} />
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Play together, instantly
        </h2>
        <p className="text-hub-muted text-lg max-w-xl mx-auto mb-8">
          Real-time multiplayer games in your browser. Create a room, share the code, and play.
        </p>
        <div className="flex justify-center gap-8 text-sm text-hub-muted">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-hub-accent" />
            Low latency
          </span>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h3 className="text-sm uppercase tracking-wider text-hub-muted mb-6">Games</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="group card hover:border-hub-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-hub-accent/5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-hub-accent/15 flex items-center justify-center text-2xl">
                  {game.icon ?? '🎮'}
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hub-success/15 text-hub-success">
                  Live
                </span>
              </div>
              <h4 className="text-xl font-semibold mb-2 group-hover:text-hub-accent transition-colors">
                {game.name}
              </h4>
              <p className="text-hub-muted text-sm mb-4">{game.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-hub-muted">{game.players} players</span>
                <span className="flex items-center gap-1 text-sm text-hub-accent font-medium group-hover:gap-2 transition-all">
                  Play
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-center text-hub-muted text-sm mt-10">More games coming soon.</p>
      </section>
    </main>
  );
}
