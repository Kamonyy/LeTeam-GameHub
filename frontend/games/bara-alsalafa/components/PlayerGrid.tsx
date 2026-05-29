'use client';

import { memo, useCallback } from 'react';
import clsx from 'clsx';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import type { LobbyPlayer } from '@/lib/hub/types';
import BaraPlayerSeat from './BaraPlayerSeat';

type VoteCardProps = {
  card: BaraGameState['playerCards'][number];
  index: number;
  playerId: string;
  name: string;
  canVote: boolean;
  showAsRevoteTarget: boolean;
  onVote?: (targetId: string) => void;
};

const VoteCard = memo(function VoteCard({
  card,
  index,
  playerId,
  name,
  canVote,
  showAsRevoteTarget,
  onVote,
}: VoteCardProps) {
  const handleVote = useCallback(() => {
    if (canVote) onVote?.(card.id);
  }, [canVote, card.id, onVote]);

  const isMe = card.id === playerId;

  return (
    <button
      type="button"
      disabled={!canVote}
      onClick={handleVote}
      className={clsx(
        'bara-vote-card-wrap animate-bara-seat-entry',
        canVote && 'bara-vote-card-wrap--pickable',
        card.eliminated && 'bara-vote-card-wrap--out',
        showAsRevoteTarget && 'bara-vote-card-wrap--tie',
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <BaraPlayerSeat
        variant="vote"
        displayName={name}
        isMe={isMe}
        microStatus={card.microStatus}
        eliminated={card.eliminated}
        votePickable={canVote}
        dataSeatId={card.id}
        className="w-full"
      />
    </button>
  );
});

interface PlayerGridProps {
  gameState: BaraGameState;
  players: LobbyPlayer[];
  playerId: string;
  votingActive?: boolean;
  spotlightId?: string | null;
  compact?: boolean;
  /** During interrogation — dim grid copies while cards are in the duel hero */
  duelParticipantIds?: string[];
  onVote?: (targetId: string) => void;
}

function layoutClass(count: number) {
  if (count <= 4) return 'bara-grid--few';
  if (count <= 8) return 'bara-grid--medium';
  return 'bara-grid--dense';
}

function gridAvatarSize(count: number): 'sm' | 'md' | 'lg' {
  if (count >= 9) return 'sm';
  if (count >= 5) return 'md';
  return 'lg';
}

export default function PlayerGrid({
  gameState,
  players,
  playerId,
  votingActive = false,
  spotlightId = null,
  compact = false,
  duelParticipantIds = [],
  onVote,
}: PlayerGridProps) {
  const count = gameState.playerIds.length;
  const nameById = Object.fromEntries(players.map((p) => [p.id, p.displayName]));
  const duelSet = new Set(duelParticipantIds);
  const avatarSize = gridAvatarSize(count);
  const tiedSet = new Set(gameState.tiedPlayerIds);

  if (votingActive) {
    return (
      <div className="bara-vote-cards" dir="rtl">
        {gameState.playerCards.map((card, index) => {
          const canVote =
            gameState.canVote &&
            card.id !== playerId &&
            !card.eliminated &&
            (gameState.phase !== 'revote' || tiedSet.has(card.id));
          const showAsRevoteTarget =
            gameState.phase === 'revote' && tiedSet.has(card.id);
          return (
            <VoteCard
              key={card.id}
              card={card}
              index={index}
              playerId={playerId}
              name={nameById[card.id] ?? 'لاعب'}
              canVote={canVote}
              showAsRevoteTarget={showAsRevoteTarget}
              onVote={onVote}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        compact ? 'bara-player-strip bara-player-strip--compact' : 'bara-player-grid',
        !compact && layoutClass(count)
      )}
      dir="rtl"
    >
      {gameState.playerCards.map((card, index) => {
        const isMe = card.id === playerId;
        const name = nameById[card.id] ?? 'لاعب';
        const inDuel = duelSet.has(card.id);

        return (
          <div
            key={card.id}
            className={clsx(
              'bara-seat-wrap',
              !compact && 'animate-bara-seat-entry',
              inDuel && 'bara-seat-wrap--duel-ghost'
            )}
            style={compact ? undefined : { animationDelay: `${index * 45}ms` }}
          >
            <BaraPlayerSeat
              variant="grid"
              displayName={name}
              isMe={isMe}
              microStatus={card.microStatus}
              eliminated={card.eliminated}
              gridSize={compact ? 'sm' : avatarSize}
              compact={compact}
              dataSeatId={card.id}
              className={clsx(
                'w-full',
                compact && 'bara-seat--compact',
                gameState.currentInterviewerId === card.id &&
                  !inDuel &&
                  'bara-seat--interviewer',
                gameState.currentTargetId === card.id &&
                  !inDuel &&
                  'bara-seat--target',
                spotlightId === card.id && 'bara-seat--spotlight'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
