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
import { useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';

interface WordGameBoardProps {
  gameState: WordGameState;
  lobby: LobbyState;
  playerId: string;
  onSubmitWord: (word: string) => Promise<boolean>;
  onSubmitChampion: (championId: string) => Promise<boolean>;
  onConfirmGuessed: () => Promise<boolean>;
  isHost?: boolean;
  postMatchBusy?: boolean;
  onHostPlayAgain?: () => void;
  onHostReturnToLobby?: () => void;
}

export default function WordGameBoard({
  gameState,
  lobby,
  playerId,
  onSubmitWord,
  onSubmitChampion,
  onConfirmGuessed,
  isHost = false,
  postMatchBusy = false,
  onHostPlayAgain,
  onHostReturnToLobby,
}: WordGameBoardProps) {
  const playerNames = Object.fromEntries(
    lobby.players.map((p) => [p.id, p.displayName])
  );
  const opponentId = gameState.playerIds.find((id) => id !== playerId) ?? '';
  const opponentName = playerNames[opponentId] || 'Opponent';

  const { notes, addNote, updateNote, deleteNote, clearNotes } = useScratchpadNotes(
    lobby.roomId,
    playerId,
    gameState.roundNumber
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
  const isLol = wordCategory === 'lol-champions';
  const audio = useWordGameAudioOptional();
  const { wordGuessedCelebration } = useSocket();
  const prevPhase = useRef(gameState.phase);

  useEffect(() => {
    if (!wordGuessedCelebration) return;
    const isLolCelebration =
      wordGuessedCelebration.wordCategory === 'lol-champions';
    audio?.unlock();
    if (isLolCelebration && wordGuessedCelebration.championId) {
      audio?.playSfx('pickConfirm', 0.7);
      void audio?.playChampionVoice(wordGuessedCelebration.championId);
    } else {
      audio?.playSfx('pickConfirm', 0.65);
    }
  }, [wordGuessedCelebration, audio]);

  useEffect(() => {
    const phase = gameState.phase;
    const was = prevPhase.current;
    prevPhase.current = phase;

    if (phase === 'playing' && was === 'setup') {
      audio?.playSfx('splashForward', 0.55);
    }
    if (
      isLol &&
      phase === 'round_end' &&
      was === 'playing' &&
      gameState.revealedChampionId
    ) {
      audio?.playSfx('cardSelect', 0.6);
    }
    if (phase === 'match_over' && was !== 'match_over') {
      audio?.playSfx('roundFinalize', 0.65);
    }

    if (was === 'playing' && (phase === 'round_end' || phase === 'match_over')) {
      clearNotes();
    }
  }, [
    gameState.phase,
    gameState.revealedChampionId,
    isLol,
    audio,
    clearNotes,
  ]);

  return (
    <div className="sw-animate-ascend-slow space-y-8">
      <ScoreCard
        playerNames={playerNames}
        playerIds={gameState.playerIds}
        scores={gameState.scores}
        myPlayerId={playerId}
        pointsToWin={gameState.pointsToWin}
      />

      <RoundCeremony
        key={gameState.roundNumber}
        roundNumber={gameState.roundNumber}
      />

      <div
        className={clsx(
          'items-start',
          showScratchpad ?
            'sw-game-with-scratchpad grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8'
          :	'max-w-3xl mx-auto w-full'
        )}
      >
        <div key={gameState.phase} className="min-w-0 sw-phase-mount">
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
              isHost={isHost}
              postMatchBusy={postMatchBusy}
              onHostPlayAgain={onHostPlayAgain}
              onHostReturnToLobby={onHostReturnToLobby}
            />
          )}
        </div>

        {showScratchpad && (
          <aside className="sw-game-with-scratchpad__aside w-full flex flex-col min-h-0 sw-scratchpad-enter">
            <Scratchpad
              key={gameState.roundNumber}
              isLol={isLol}
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
