'use client';

import { useMemo, type RefObject } from 'react';
import clsx from 'clsx';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import type { LobbyState } from '@/lib/hub/types';
import BaraPlayerSeat from './BaraPlayerSeat';
import { useBaraDuelFly } from '@/games/bara-alsalafa/hooks/useBaraDuelFly';

interface InterrogationDuelHeroProps {
  gameState: BaraGameState;
  lobby: LobbyState;
  playerId: string;
  boardRef: RefObject<HTMLDivElement | null>;
}

function playerMeta(
  lobby: LobbyState,
  gameState: BaraGameState,
  id: string
) {
  const card = gameState.playerCards.find((c) => c.id === id);
  const displayName =
    lobby.players.find((p) => p.id === id)?.displayName ?? 'لاعب';
  return {
    displayName,
    microStatus: card?.microStatus ?? 'thinking',
    eliminated: card?.eliminated ?? false,
  };
}

export default function InterrogationDuelHero({
  gameState,
  lobby,
  playerId,
  boardRef,
}: InterrogationDuelHeroProps) {
  const interviewerId = gameState.currentInterviewerId;
  const targetId = gameState.currentTargetId;

  const duelKey =
    interviewerId && targetId ? `${interviewerId}:${targetId}` : null;

  const { askerSlotRef, answererSlotRef, landed, flying } = useBaraDuelFly(
    duelKey,
    interviewerId,
    targetId,
    boardRef
  );

  const asker = useMemo(
    () => (interviewerId ? playerMeta(lobby, gameState, interviewerId) : null),
    [lobby, gameState, interviewerId]
  );
  const answerer = useMemo(
    () => (targetId ? playerMeta(lobby, gameState, targetId) : null),
    [lobby, gameState, targetId]
  );

  const isMyTurn = interviewerId === playerId;
  const cardsBlended = landed;

  if (!asker || !answerer || !interviewerId || !targetId) return null;

  return (
    <div
      className={clsx(
        'bara-interrogation-hero',
        flying && 'bara-interrogation-hero--flying',
        cardsBlended && 'bara-interrogation-hero--landed'
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="bara-interrogation-hero__title">جولة السؤال</p>

      <div className="bara-interrogation-hero__arena">
        <div
          ref={askerSlotRef}
          className={clsx(
            'bara-interrogation-hero__slot',
            'bara-interrogation-hero__slot--asker',
            !cardsBlended && flying && 'bara-interrogation-hero__slot--waiting'
          )}
        >
          <BaraPlayerSeat
            variant="hero"
            role="asker"
            displayName={asker.displayName}
            isMe={interviewerId === playerId}
            microStatus={asker.microStatus}
            eliminated={asker.eliminated}
            landAnimating={cardsBlended}
          />
        </div>

        <div className="bara-interrogation-hero__bridge" aria-hidden>
          <span className="bara-interrogation-hero__bridge-glow" />
          <span className="bara-interrogation-hero__bridge-arrow">←</span>
          <span className="bara-interrogation-hero__bridge-label">يسأل</span>
        </div>

        <div
          ref={answererSlotRef}
          className={clsx(
            'bara-interrogation-hero__slot',
            'bara-interrogation-hero__slot--answerer',
            !cardsBlended && flying && 'bara-interrogation-hero__slot--waiting'
          )}
        >
          <BaraPlayerSeat
            variant="hero"
            role="answerer"
            displayName={answerer.displayName}
            isMe={targetId === playerId}
            microStatus={answerer.microStatus}
            eliminated={answerer.eliminated}
            landAnimating={cardsBlended}
          />
        </div>
      </div>

      {isMyTurn && (
        <span className="bara-interrogation-hero__you">دورك للسؤال</span>
      )}

      <p className="bara-interrogation-hero__sr-only">
        {asker.displayName} يسأل {answerer.displayName}
      </p>
    </div>
  );
}
