'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Paintbrush, MessageCircle, Check } from 'lucide-react';
import type { LobbyPlayer } from '@/lib/hub/types';
import type { SketchDrawGameState } from '../types';

type LeaderboardSidebarProps = {
  players: LobbyPlayer[];
  state: SketchDrawGameState;
  playerId: string;
};

function rankBorder(rank: number) {
  if (rank === 1) return 'sketch-rank--gold';
  if (rank === 2) return 'sketch-rank--silver';
  if (rank === 3) return 'sketch-rank--bronze';
  return '';
}

export default function LeaderboardSidebar({
  players,
  state,
  playerId,
}: LeaderboardSidebarProps) {
  const sorted = useMemo(() => {
    return [...players].sort(
      (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0)
    );
  }, [players, state.scores]);

  const solvedSet = useMemo(
    () => new Set(state.solvedThisRound ?? []),
    [state.solvedThisRound]
  );

  return (
    <aside className="sketch-leaderboard w-56 lg:w-64 shrink-0 border-r border-stone-800 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-stone-800">
        <h3 className="text-sm font-bold uppercase tracking-wide text-stone-300">
          Leaderboard
        </h3>
        <p className="text-[10px] text-stone-500 mt-0.5">
          {state.phase === 'match_over' ?
            'Final scores'
          : `Round ${state.roundNumber}/${state.totalRounds}`}
        </p>
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-2">
        {sorted.map((p, index) => {
          const rank = index + 1;
          const isDrawer = p.id === state.currentDrawerId;
          const isYou = p.id === playerId;
          const score = state.scores[p.id] ?? 0;
          const solved = solvedSet.has(p.id);

          return (
            <li
              key={p.id}
              className={clsx(
                'sketch-rank-card relative rounded-lg px-3 py-2.5 border',
                rankBorder(rank),
                isYou && 'ring-1 ring-violet-500/50'
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={clsx(
                    'shrink-0 font-mono text-sm font-bold tabular-nums',
                    rank <= 3 ? 'text-lg' : 'text-stone-500'
                  )}
                >
                  {rank <= 3 ?
                    ['🥇', '🥈', '🥉'][rank - 1]
                  : `${rank}.`}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate flex-1">
                      {p.displayName}
                    </p>
                    {solved && (
                      <span
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                        title="Guessed correctly"
                        aria-label="Guessed correctly"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-violet-300 tabular-nums">{score} pts</p>
                </div>
              </div>

              <span
                className={clsx(
                  'mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                  isDrawer ?
                    'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40'
                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                )}
              >
                {isDrawer ?
                  <>
                    <Paintbrush className="w-3 h-3" />
                    رَسام
                  </>
                : <>
                    <MessageCircle className="w-3 h-3" />
                    خَمّن
                  </>
                }
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
