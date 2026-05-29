'use client';

import type { WordGameState } from '../types';
import type { LobbyState } from '@/lib/hub/types';
import ScoreCard from './ScoreCard';
import RoundCeremony from './RoundCeremony';
import WordPanelFrame from './WordPanelFrame';
import RevealCard from './RevealCard';
import SpectatorScratchpads from './SpectatorScratchpads';
import SpectatorAssignments from './SpectatorAssignments';
import { assignmentOwnerPlayerId } from '../lib/assignmentKey';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';

interface WordGameSpectatorBoardProps {
  gameState: WordGameState;
  lobby: LobbyState;
}

export default function WordGameSpectatorBoard({
  gameState,
  lobby,
}: WordGameSpectatorBoardProps) {
  const playerNames = Object.fromEntries(
    lobby.players.map((p) => [p.id, p.displayName])
  );
  const submissionStatus =
    gameState.submissionStatus ??
    Object.fromEntries(gameState.playerIds.map((id) => [id, false]));
  const wordCategory = gameState.wordCategory ?? 'custom';
  const isLol = wordCategory === 'lol-champions';
  const showScratchpads =
    gameState.phase === 'playing' || gameState.phase === 'round_end';
  const scratchpadsByPlayer = gameState.scratchpadsByPlayer ?? {};
  const assignmentsForGuesser = gameState.assignmentsForGuesser ?? {};
  const showAssignments =
    gameState.phase !== 'setup' &&
    Object.keys(assignmentsForGuesser).length > 0;

  const guesserName =
    gameState.lastGuesserId != null ?
      playerNames[gameState.lastGuesserId] || 'Player'
    : null;

  const revealedOwnerId =
    gameState.revealedWord ?
      assignmentOwnerPlayerId(gameState.revealedWord, gameState.revealedChampionId, {
        viewerPlayerId: gameState.playerIds[0],
        playerIds: gameState.playerIds,
        myChosenWord: null,
        myChosenChampionId: null,
        opponentChosenWord: null,
        opponentChosenChampionId: null,
        guesserPlayerId: gameState.lastGuesserId,
        assignerPlayerId:
          gameState.lastAction?.type === 'word_guessed' ?
            gameState.lastAction.creatorId ?? null
          : null,
      })
    : gameState.playerIds[0];

  return (
    <div
      className={clsx(
        'sw-animate-ascend-slow w-full',
        showScratchpads ?
          'sw-spectator-with-scratchpads max-w-6xl mx-auto space-y-4'
        :	'max-w-3xl mx-auto space-y-4'
      )}
    >
      <ScoreCard
        playerNames={playerNames}
        playerIds={gameState.playerIds}
        scores={gameState.scores}
        myPlayerId=""
        pointsToWin={gameState.pointsToWin}
        submissionStatus={
          gameState.phase === 'setup' ? submissionStatus : undefined
        }
        align="center"
      />

      <div className="min-w-0 sw-phase-mount space-y-6">
        <RoundCeremony roundNumber={gameState.roundNumber} />

        {gameState.phase === 'setup' && (
          <WordPanelFrame className="p-4 sm:p-5" embers={false} panelEnter={false}>
            <p className="text-[10px] uppercase tracking-widest sw-muted mb-3">
              Submission tracker
            </p>
            <ul className="space-y-2">
              {gameState.playerIds.map((id) => {
                const done = !!submissionStatus[id];
                return (
                  <li
                    key={id}
                    className={clsx(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
                      done ?
                        'border-[#c9a227]/40 bg-[#c9a227]/10'
                      :	'border-white/10 bg-black/20'
                    )}
                  >
                    <span className="text-sm font-medium text-[#fff8e7] truncate">
                      {playerNames[id] || 'Player'}
                    </span>
                    <span
                      className={clsx(
                        'text-[10px] uppercase tracking-wider font-semibold shrink-0',
                        done ? 'text-[#f0d78c]' : 'sw-muted'
                      )}
                    >
                      {done ?
                        isLol ?
                          'Champion locked'
                        :	'Word locked'
                      :	'Choosing…'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </WordPanelFrame>
        )}

        {showAssignments && (
          <SpectatorAssignments
            playerIds={gameState.playerIds}
            playerNames={playerNames}
            assignmentsForGuesser={assignmentsForGuesser}
            wordCategory={wordCategory}
          />
        )}

        {showScratchpads && (
          <SpectatorScratchpads
            playerIds={gameState.playerIds}
            playerNames={playerNames}
            scratchpadsByPlayer={scratchpadsByPlayer}
            isLol={isLol}
          />
        )}

        {gameState.phase === 'round_end' && gameState.revealedWord && (
          <WordPanelFrame
            className="p-4 sm:p-5 sw-accent-ember sw-round-reveal-panel"
            embers={false}
            panelEnter={false}
          >
            <RevealCard
              wordCategory={wordCategory}
              word={gameState.revealedWord}
              championId={gameState.revealedChampionId}
              ownerPlayerId={revealedOwnerId ?? gameState.playerIds[0]}
              viewerPlayerId={gameState.playerIds[0]}
              playerIds={gameState.playerIds}
              caption={
                guesserName ?
                  `${guesserName} guessed this assignment`
                :	'Round answer'
              }
              layout="hero"
              compact
            />
            <p className="sw-round-reveal-panel__next animate-pulse-soft mt-4">
              <Sparkles className="w-3 h-3 text-[#c9a227] inline-block mr-1" aria-hidden />
              Next round approaches…
            </p>
          </WordPanelFrame>
        )}
      </div>
    </div>
  );
}
