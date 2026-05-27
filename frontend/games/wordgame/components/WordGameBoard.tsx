'use client';

import type { WordGameState } from '../types';
import type { LobbyState } from '@/lib/hub/types';
import ScoreCard from './ScoreCard';
import WordSetup from './WordSetup';
import GuessingBoard from './GuessingBoard';
import Scratchpad from './Scratchpad';
import { useScratchpadNotes } from '../hooks/useScratchpadNotes';

interface WordGameBoardProps {
  gameState: WordGameState;
  lobby: LobbyState;
  playerId: string;
  onSubmitWord: (word: string) => Promise<boolean>;
  onConfirmGuessed: () => Promise<boolean>;
}

export default function WordGameBoard({
  gameState,
  lobby,
  playerId,
  onSubmitWord,
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
    gameState.lastGuesserId != null
      ? playerNames[gameState.lastGuesserId] || 'Player'
      : opponentName;

  return (
    <div className="animate-fade-in space-y-6">
      <ScoreCard
        playerNames={playerNames}
        playerIds={gameState.playerIds}
        scores={gameState.scores}
        myPlayerId={playerId}
      />

      <p className="text-center text-xs text-hub-muted uppercase tracking-widest">
        Round {gameState.roundNumber}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="min-w-0">
          {gameState.phase === 'setup' && (
            <WordSetup
              iHaveSubmitted={gameState.iHaveSubmitted}
              opponentHasSubmitted={gameState.opponentHasSubmitted}
              opponentName={opponentName}
              onSubmit={onSubmitWord}
            />
          )}

          {(gameState.phase === 'playing' || gameState.phase === 'round_end') && (
            <GuessingBoard
              targetWordLength={gameState.targetWordLength}
              revealedWord={gameState.revealedWord}
              phase={gameState.phase}
              opponentName={opponentName}
              guesserName={guesserName}
              canConfirmGuessed={gameState.canConfirmGuessed}
              onConfirmGuessed={onConfirmGuessed}
            />
          )}
        </div>

        {(gameState.phase === 'playing' || gameState.phase === 'round_end') && (
          <Scratchpad
            notes={notes}
            onAdd={addNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
          />
        )}
      </div>
    </div>
  );
}
