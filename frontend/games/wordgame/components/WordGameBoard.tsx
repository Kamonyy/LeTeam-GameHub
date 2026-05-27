'use client';

import type { WordGameState } from '../types';
import type { LobbyState } from '@/lib/hub/types';
import ScoreCard from './ScoreCard';
import WordSetup from './WordSetup';
import GuessingBoard from './GuessingBoard';
import Scratchpad from './Scratchpad';
import RoundCeremony from './RoundCeremony';
import { useScratchpadNotes } from '../hooks/useScratchpadNotes';
import clsx from 'clsx';

interface WordGameBoardProps {
  gameState: WordGameState;
  lobby: LobbyState;
  playerId: string;
  onSubmitWord: (word: string) => Promise<boolean>;
  onSubmitChampion: (championId: string) => Promise<boolean>;
  onConfirmGuessed: () => Promise<boolean>;
}

export default function WordGameBoard({
  gameState,
  lobby,
  playerId,
  onSubmitWord,
  onSubmitChampion,
  onConfirmGuessed,
}: WordGameBoardProps) {
  const playerNames = Object.fromEntries(
    lobby.players.map((p) => [p.id, p.displayName])
  );
  const opponentId = gameState.playerIds.find((id) => id !== playerId) ?? '';
  const opponentName = playerNames[opponentId] || 'Opponent';

  const { notes, addNote, updateNote, deleteNote } = useScratchpadNotes(
    lobby.roomId,
    playerId
  );

  const guesserName =
    gameState.lastGuesserId != null ?
      playerNames[gameState.lastGuesserId] || 'Player'
    : opponentName;

  const winnerName =
    gameState.winnerId != null ?
      playerNames[gameState.winnerId] || 'Player'
    : undefined;

  const showScratchpad =
    gameState.phase === 'playing' || gameState.phase === 'round_end';

  const wordCategory = gameState.wordCategory ?? 'custom';

  return (
    <div className="sw-animate-ascend-slow space-y-8">
      <ScoreCard
        playerNames={playerNames}
        playerIds={gameState.playerIds}
        scores={gameState.scores}
        myPlayerId={playerId}
        pointsToWin={gameState.pointsToWin}
      />

      <RoundCeremony roundNumber={gameState.roundNumber} />

      <div
        className={clsx(
          'items-start',
          showScratchpad ?
            'grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8 lg:items-stretch'
          :	'max-w-3xl mx-auto w-full'
        )}
      >
        <div
          key={`${gameState.phase}-${gameState.roundNumber}`}
          className="min-w-0 sw-phase-mount"
        >
          {gameState.phase === 'setup' && (
            <WordSetup
              wordCategory={wordCategory}
              iHaveSubmitted={gameState.iHaveSubmitted}
              opponentHasSubmitted={gameState.opponentHasSubmitted}
              opponentName={opponentName}
              myChosenWord={gameState.myChosenWord}
              myChosenChampionId={gameState.myChosenChampionId}
              onSubmitWord={onSubmitWord}
              onSubmitChampion={onSubmitChampion}
            />
          )}

          {(gameState.phase === 'playing' ||
            gameState.phase === 'round_end' ||
            gameState.phase === 'match_over') && (
            <GuessingBoard
              wordCategory={wordCategory}
              myChosenWord={gameState.myChosenWord}
              myChosenChampionId={gameState.myChosenChampionId}
              revealedWord={gameState.revealedWord}
              revealedChampionId={gameState.revealedChampionId}
              phase={gameState.phase}
              opponentName={opponentName}
              guesserName={guesserName}
              winnerName={winnerName}
              pointsToWin={gameState.pointsToWin}
              canConfirmGuessed={gameState.canConfirmGuessed}
              onConfirmGuessed={onConfirmGuessed}
            />
          )}
        </div>

        {showScratchpad && (
          <aside className="w-full lg:sticky lg:top-24 lg:self-start">
            <Scratchpad
              notes={notes}
              onAdd={addNote}
              onUpdate={updateNote}
              onDelete={deleteNote}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
