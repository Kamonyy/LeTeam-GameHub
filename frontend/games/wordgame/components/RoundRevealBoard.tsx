'use client';

import clsx from 'clsx';
import type { WordCategory } from '../types';
import { assignmentKey, assignmentOwnerPlayerId } from '../lib/assignmentKey';
import { getRevealCaption, revealSideHeading } from '../lib/revealLabels';
import RevealCard from './RevealCard';

export interface RoundRevealBoardProps {
  wordCategory: WordCategory;
  revealedWord: string;
  revealedChampionId: string | null;
  myChosenWord: string | null;
  myChosenChampionId: string | null;
  opponentChosenWord: string | null;
  opponentChosenChampionId: string | null;
  opponentName: string;
  guesserName: string;
  playerId: string;
  playerIds: string[];
  guesserPlayerId: string | null;
  assignerPlayerId?: string | null;
  className?: string;
  /** Tighter layout for in-game round-end panel */
  compact?: boolean;
  /** Answer and other picks in a row (with compact) */
  horizontal?: boolean;
}

export default function RoundRevealBoard({
  wordCategory,
  revealedWord,
  revealedChampionId,
  myChosenWord,
  myChosenChampionId,
  opponentChosenWord,
  opponentChosenChampionId,
  opponentName,
  guesserName,
  playerId,
  playerIds,
  guesserPlayerId,
  assignerPlayerId,
  className,
  compact = false,
  horizontal = false,
}: RoundRevealBoardProps) {
  const isLol = wordCategory === 'lol-champions';
  const opponentId = playerIds.find((id) => id !== playerId) ?? playerIds[0];

  const revealedKey = assignmentKey(revealedWord, revealedChampionId);
  const myKey = assignmentKey(myChosenWord, myChosenChampionId);
  const opponentKey = assignmentKey(opponentChosenWord, opponentChosenChampionId);

  const showMyPick = Boolean(
    myKey &&
      myKey !== revealedKey &&
      (myChosenWord || myChosenChampionId)
  );
  const showOpponentPick = Boolean(
    opponentKey &&
      opponentKey !== revealedKey &&
      opponentKey !== myKey &&
      (opponentChosenWord || opponentChosenChampionId)
  );

  const assignmentCtx = {
    viewerPlayerId: playerId,
    playerIds,
    myChosenWord,
    myChosenChampionId,
    opponentChosenWord,
    opponentChosenChampionId,
    guesserPlayerId,
    assignerPlayerId,
  };

  const revealedOwnerId = assignmentOwnerPlayerId(
    revealedWord,
    revealedChampionId,
    assignmentCtx
  );

  const labelOpts = {
    isLol,
    opponentName,
    guesserName,
    viewerPlayerId: playerId,
    guesserPlayerId,
  };

  const sideCards: Array<{
    key: string;
    heading: string;
    ownerPlayerId: string;
    word: string;
    championId: string | null;
    caption: string;
  }> = [];

  if (showOpponentPick) {
    sideCards.push({
      key: 'opponent',
      heading: revealSideHeading('opponent-assignment', opponentName, isLol),
      ownerPlayerId: opponentId,
      word: opponentChosenWord!,
      championId: opponentChosenChampionId,
      caption: getRevealCaption('opponent-assignment', {
        ...labelOpts,
        ownerPlayerId: opponentId,
      }),
    });
  }

  if (showMyPick) {
    sideCards.push({
      key: 'mine',
      heading: revealSideHeading('my-assignment', opponentName, isLol),
      ownerPlayerId: playerId,
      word: myChosenWord!,
      championId: myChosenChampionId,
      caption: getRevealCaption('my-assignment', {
        ...labelOpts,
        ownerPlayerId: playerId,
      }),
    });
  }

  const answerSection = (
    <section className="sw-round-reveal__answer" aria-label="Correct answer">
      <p className="sw-round-reveal__eyebrow">Correct answer</p>
      <RevealCard
        wordCategory={wordCategory}
        word={revealedWord}
        championId={revealedChampionId}
        ownerPlayerId={revealedOwnerId}
        viewerPlayerId={playerId}
        playerIds={playerIds}
        layout="hero"
        compact={compact}
        caption={getRevealCaption('guessed', {
          ...labelOpts,
          ownerPlayerId: revealedOwnerId,
        })}
      />
    </section>
  );

  const othersSection =
    sideCards.length > 0 ?
      <section className="sw-round-reveal__others" aria-label="Other picks this round">
        <p className="sw-round-reveal__eyebrow">Other picks this round</p>
        <div
          className={clsx(
            'sw-round-reveal__grid',
            sideCards.length === 2 && 'sw-round-reveal__grid--duo',
          )}
        >
          {sideCards.map((card) => (
            <div key={card.key} className="sw-round-reveal__slot">
              <h4
                className={clsx(
                  'sw-round-reveal__slot-heading',
                  card.key === 'mine' ?
                    'sw-round-reveal__slot-heading--you'
                  : 'sw-round-reveal__slot-heading--them',
                )}
              >
                {card.heading}
              </h4>
              <RevealCard
                wordCategory={wordCategory}
                word={card.word}
                championId={card.championId}
                ownerPlayerId={card.ownerPlayerId}
                viewerPlayerId={playerId}
                playerIds={playerIds}
                layout="side"
                compact={compact}
                caption={card.caption}
              />
            </div>
          ))}
        </div>
      </section>
    : null;

  return (
    <div
      className={clsx(
        'sw-round-reveal',
        compact && 'sw-round-reveal--compact',
        compact && horizontal && 'sw-round-reveal--horizontal',
        className,
      )}
    >
      {horizontal ?
        <>
          {othersSection}
          {answerSection}
        </>
      : <>
          {answerSection}
          {othersSection}
        </>}
    </div>
  );
}
