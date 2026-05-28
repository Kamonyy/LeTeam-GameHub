'use client';

import type { LobbyPlayer } from '@/lib/hub/types';
import type { SketchDrawGameState } from '../types';

type RoundResultsProps = {
  state: SketchDrawGameState;
  players: LobbyPlayer[];
  playerId: string;
};

export default function RoundResults({ state, players, playerId }: RoundResultsProps) {
  const breakdown = state.lastRoundBreakdown;
  const sorted = [...players].sort(
    (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0)
  );

  return (
    <div className="sketch-results-panel">
      {state.phase === 'round_end' && breakdown?.secretWord && (
        <p className="text-center text-lg mb-4">
          The word was:{' '}
          <span className="font-bold text-violet-300">{breakdown.secretWord}</span>
        </p>
      )}
      {state.phase === 'match_over' && (
        <h2 className="text-xl font-bold text-center mb-4 sketch-splatter-title">
          Match over!
        </h2>
      )}
      <ul className="space-y-2">
        {sorted.map((p, i) => (
          <li
            key={p.id}
            className={`flex justify-between items-center rounded-lg px-4 py-2 border ${
              p.id === playerId ? 'border-violet-500/50 bg-violet-500/10' : 'border-hub-border'
            }`}
          >
            <span>
              {i + 1}. {p.displayName}
              {p.id === state.winnerId && state.phase === 'match_over' ? ' 👑' : ''}
            </span>
            <span className="font-mono font-semibold">{state.scores[p.id] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
