'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import type { LobbyPlayer } from '@/lib/hub/types';
import type { SketchDrawGameState } from '../types';

type WinnerPodiumProps = {
  players: LobbyPlayer[];
  state: SketchDrawGameState;
  isHost: boolean;
  onReturnToLobby?: () => void;
  onExitEveryone?: () => void;
  onLeave?: () => void;
};

type PodiumSlot = {
  player: LobbyPlayer;
  rank: number;
  score: number;
};

export default function WinnerPodium({
  players,
  state,
  isHost,
  onReturnToLobby,
  onExitEveryone,
  onLeave,
}: WinnerPodiumProps) {
  const [visible, setVisible] = useState(false);

  const topThree = useMemo((): PodiumSlot[] => {
    const sorted = [...players].sort(
      (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0)
    );
    return sorted.slice(0, 3).map((player, i) => ({
      player,
      rank: i + 1,
      score: state.scores[player.id] ?? 0,
    }));
  }, [players, state.scores]);

  const ordered = useMemo(() => {
    if (topThree.length < 2) return topThree;
    const first = topThree.find((t) => t.rank === 1);
    const second = topThree.find((t) => t.rank === 2);
    const third = topThree.find((t) => t.rank === 3);
    return [second, first, third].filter(Boolean) as PodiumSlot[];
  }, [topThree]);

  const rest = useMemo(() => {
    const topIds = new Set(topThree.map((t) => t.player.id));
    return [...players]
      .filter((p) => !topIds.has(p.id))
      .sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0))
      .map((player, i) => ({
        player,
        rank: topThree.length + i + 1,
        score: state.scores[player.id] ?? 0,
      }));
  }, [players, state.scores, topThree]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="sketch-podium-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="sketch-confetti" aria-hidden />
      <div className="sketch-splash sketch-splash--left" aria-hidden />
      <div className="sketch-splash sketch-splash--right" aria-hidden />

      <div
        className={clsx(
          'sketch-podium-modal relative z-10 w-full max-w-lg rounded-2xl border border-violet-500/40',
          'bg-stone-950/95 backdrop-blur-md shadow-2xl p-6 sm:p-8',
          visible && 'sketch-podium-modal--in'
        )}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-8 h-8 text-amber-400" />
          <h2 className="text-2xl font-bold sketch-title">Match results</h2>
        </div>
        <p className="text-hub-muted text-center text-sm mb-8">Top artists this round</p>

        <div className="flex items-end justify-center gap-3 min-h-[200px] mb-8">
          {ordered.map((slot) => {
            if (!slot) return null;
            const height =
              slot.rank === 1 ? 'h-32' : slot.rank === 2 ? 'h-24' : 'h-20';
            const delay = slot.rank === 1 ? '0ms' : slot.rank === 2 ? '80ms' : '160ms';

            return (
              <div
                key={slot.player.id}
                className={clsx(
                  'sketch-podium-block flex flex-col items-center w-24 sm:w-28',
                  visible && 'sketch-podium-block--in'
                )}
                style={{ transitionDelay: delay }}
              >
                <div
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2 border-2',
                    slot.rank === 1 && 'border-amber-400 bg-amber-500/20',
                    slot.rank === 2 && 'border-slate-300 bg-slate-400/20',
                    slot.rank === 3 && 'border-orange-600 bg-orange-700/20'
                  )}
                >
                  {slot.player.displayName.slice(0, 1).toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-center truncate w-full mb-0.5">
                  {slot.player.displayName}
                </p>
                <p className="sketch-score-block text-sm font-bold text-violet-200 mb-2">
                  {slot.score} pts
                </p>
                <div
                  className={clsx(
                    'sketch-pedestal w-full rounded-t-lg border-t-4 flex items-end justify-center pb-2 font-mono text-xl font-black text-stone-200',
                    height,
                    slot.rank === 1 && 'sketch-pedestal--gold',
                    slot.rank === 2 && 'sketch-pedestal--silver',
                    slot.rank === 3 && 'sketch-pedestal--bronze'
                  )}
                >
                  {slot.rank}
                </div>
              </div>
            );
          })}
        </div>

        {rest.length > 0 && (
          <ul className="sketch-podium-rest mb-6 max-h-32 overflow-y-auto space-y-1">
            {rest.map((slot) => (
              <li
                key={slot.player.id}
                className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
              >
                <span className="text-stone-400 font-mono text-xs w-6">{slot.rank}.</span>
                <span className="flex-1 truncate font-medium">{slot.player.displayName}</span>
                <span className="font-mono text-xs text-violet-300 tabular-nums">
                  {slot.score} pts
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          {isHost ?
            <>
              <button
                type="button"
                className="hub-btn-primary w-full min-h-[48px]"
                onClick={onReturnToLobby}
              >
                Return to lobby
              </button>
              <button
                type="button"
                className="sketch-exit-btn w-full justify-center"
                onClick={onExitEveryone}
              >
                Exit · send everyone home
              </button>
            </>
          : <button
              type="button"
              className="hub-btn-secondary w-full min-h-[48px]"
              onClick={onLeave}
            >
              Leave to main page
            </button>
          }
        </div>
      </div>
    </div>
  );
}
