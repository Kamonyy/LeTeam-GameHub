'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Crown, Sparkles, Trophy } from 'lucide-react';
import type { LobbyState } from '@/lib/hub/types';
import type { SketchDrawGameState } from '../types';
import DrawingBoard from './DrawingBoard';

type MatchEndStageProps = {
  lobby: LobbyState;
  state: SketchDrawGameState;
  playerId: string;
};

export default function MatchEndStage({
  lobby,
  state,
  playerId,
}: MatchEndStageProps) {
  const sorted = useMemo(
    () =>
      [...lobby.players].sort(
        (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0)
      ),
    [lobby.players, state.scores]
  );

  const winner = sorted[0];
  const isYouWinner = winner?.id === playerId;

  return (
    <div className="sketch-match-end flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="sketch-match-end__hero shrink-0">
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <Sparkles className="w-5 h-5 text-fuchsia-400 animate-pulse" />
          <h2 className="text-xl sm:text-2xl font-bold sketch-title">Match complete!</h2>
          <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
        </div>
        {winner && (
          <p className="text-center mt-2 text-sm sm:text-base">
            <Crown className="w-4 h-4 inline text-amber-400 -mt-0.5 mr-1" />
            <span className="font-semibold text-amber-200">{winner.displayName}</span>
            <span className="text-hub-muted"> wins with </span>
            <span className="font-mono font-bold text-violet-200 tabular-nums">
              {state.scores[winner.id] ?? 0} pts
            </span>
            {isYouWinner && (
              <span className="block text-fuchsia-300 text-xs mt-1 font-medium">
                That&apos;s you — nice work!
              </span>
            )}
          </p>
        )}
        {state.revealedWord && (
          <p className="text-center text-sm text-hub-muted mt-2">
            Final word:{' '}
            <span className="font-bold text-violet-300 tracking-wide">
              {state.revealedWord}
            </span>
          </p>
        )}
      </div>

      <div className="sketch-match-end__canvas flex-1 min-h-[140px] rounded-xl overflow-hidden border border-violet-500/25 shadow-lg shadow-violet-900/20">
        <DrawingBoard
          isDrawer={false}
          canDraw={false}
          canvasBuffer={state.canvasBuffer}
          canvasBufferVersion={state.canvasBufferVersion}
          tool="brush"
          color="#1a1a2e"
          size={8}
          onStrokeBatch={() => {}}
        />
      </div>

      <div className="sketch-match-end__standings shrink-0 max-h-[min(28dvh,220px)] overflow-y-auto rounded-xl border border-hub-border bg-hub-surface/80 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wide text-stone-300">
            Final standings
          </h3>
        </div>
        <ol className="space-y-1.5">
          {sorted.map((p, i) => {
            const rank = i + 1;
            const score = state.scores[p.id] ?? 0;
            const isYou = p.id === playerId;
            return (
              <li
                key={p.id}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                  rank === 1 && 'bg-amber-500/10 border border-amber-500/30',
                  rank === 2 && 'bg-slate-400/5 border border-slate-500/20',
                  rank === 3 && 'bg-orange-600/10 border border-orange-600/25',
                  rank > 3 && 'border border-transparent',
                  isYou && 'ring-1 ring-violet-500/40'
                )}
              >
                <span className="w-6 text-center shrink-0 font-mono text-xs tabular-nums text-stone-500">
                  {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}.`}
                </span>
                <span className="flex-1 truncate font-medium">{p.displayName}</span>
                <span className="font-mono text-xs text-violet-300 tabular-nums shrink-0">
                  {score} pts
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
