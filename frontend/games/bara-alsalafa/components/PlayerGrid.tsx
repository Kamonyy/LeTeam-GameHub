'use client';

import clsx from 'clsx';
import type { BaraGameState, BaraMicroStatus } from '@/games/bara-alsalafa/types';
import type { LobbyPlayer } from '@/lib/hub/types';

const MICRO_LABELS: Record<BaraMicroStatus, string> = {
  waiting_reveal: 'لم يكشف',
  role_revealed: 'كشف الدور',
  thinking: 'يُفكر',
  voted: 'صوّت',
};

interface PlayerGridProps {
  gameState: BaraGameState;
  players: LobbyPlayer[];
  playerId: string;
  votingActive?: boolean;
  spotlightId?: string | null;
  compact?: boolean;
  onVote?: (targetId: string) => void;
}

function layoutClass(count: number) {
  if (count <= 4) return 'bara-grid--few';
  if (count <= 8) return 'bara-grid--medium';
  return 'bara-grid--dense';
}

function avatarClass(count: number) {
  if (count >= 9) return 'w-12 h-12 text-sm';
  if (count >= 5) return 'w-16 h-16 text-base';
  return 'w-20 h-20 text-lg';
}

export default function PlayerGrid({
  gameState,
  players,
  playerId,
  votingActive = false,
  spotlightId = null,
  compact = false,
  onVote,
}: PlayerGridProps) {
  const count = gameState.playerIds.length;
  const nameById = Object.fromEntries(players.map((p) => [p.id, p.displayName]));

  return (
    <div
      className={clsx(
        compact ? 'bara-player-strip' : 'bara-player-grid',
        !compact && layoutClass(count),
        votingActive && 'bara-player-grid--voting'
      )}
      dir="rtl"
    >
      {gameState.playerCards.map((card, index) => {
        const isMe = card.id === playerId;
        const name = nameById[card.id] ?? 'لاعب';
        const initial = name.charAt(0).toUpperCase();
        const canClickVote =
          votingActive &&
          gameState.canVote &&
          card.id !== playerId &&
          !card.eliminated &&
          (gameState.phase !== 'revote' ||
            gameState.tiedPlayerIds.includes(card.id));

        return (
          <button
            key={card.id}
            type="button"
            disabled={!canClickVote}
            onClick={() => canClickVote && onVote?.(card.id)}
            className={clsx(
              'bara-seat',
              !compact && 'glass-card animate-bara-seat-entry',
              compact && 'bara-seat--compact',
              isMe && 'bara-seat--me',
              card.eliminated && 'bara-seat--eliminated',
              spotlightId === card.id && 'bara-seat--spotlight',
              canClickVote && 'bara-seat--vote-target cursor-crosshair',
              gameState.currentInterviewerId === card.id && 'bara-seat--interviewer',
              gameState.currentTargetId === card.id && 'bara-seat--target'
            )}
            style={compact ? undefined : { animationDelay: `${index * 45}ms` }}
          >
            {canClickVote && <span className="bara-vote-crosshair" aria-hidden />}
            <div
              className={clsx(
                'bara-avatar rounded-full flex items-center justify-center font-bold border-2',
                compact ? 'w-11 h-11 text-sm' : avatarClass(count),
                isMe ?
                  'border-rose-400/60 bg-rose-500/15'
                : 'border-white/15 bg-white/5'
              )}
            >
              {initial}
            </div>
            <p className="bara-seat__name text-sm font-semibold truncate max-w-[7rem]">{name}</p>
            <span
              className={clsx(
                'bara-pill text-[10px] px-2 py-0.5 rounded-full',
                card.microStatus === 'role_revealed' && 'bara-pill--revealed',
                card.microStatus === 'waiting_reveal' && 'bara-pill--waiting',
                card.microStatus === 'voted' && 'bara-pill--voted',
                card.microStatus === 'thinking' && 'bara-pill--thinking'
              )}
            >
              {MICRO_LABELS[card.microStatus]}
            </span>
            {isMe && <span className="text-[10px] text-hub-muted">(أنت)</span>}
          </button>
        );
      })}
    </div>
  );
}
