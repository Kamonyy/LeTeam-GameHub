'use client';

import type { WordGameState } from '../types';
import type { LobbyState } from '@/lib/hub/types';
import ScoreCard from './ScoreCard';
import WordSetup from './WordSetup';
import GuessingBoard from './GuessingBoard';
import WordMatchOverModal from './WordMatchOverModal';
import Scratchpad from './Scratchpad';
import RoomSpectatorsNotice from '@/components/hub/RoomSpectatorsNotice';
import RoundCeremony from './RoundCeremony';
import {
  useScratchpadNotes,
  type ScratchpadNote,
} from '../hooks/useScratchpadNotes';
import clsx from 'clsx';
import { useCallback, useEffect, useRef } from 'react';
import { useSocketActions } from '@/hooks/useSocket';
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
  tabFocusActive?: boolean;
  selfTabFocused?: boolean;
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
  tabFocusActive = false,
  selfTabFocused = true,
}: WordGameBoardProps) {
  const playerNames = Object.fromEntries(
    lobby.players.map((p) => [p.id, p.displayName])
  );
  const opponentId = gameState.playerIds.find((id) => id !== playerId) ?? '';
  const opponentName = playerNames[opponentId] || 'Opponent';

  const { syncWordScratchpad } = useSocketActions<{
    syncWordScratchpad: (roundNumber: number, notes: unknown[]) => void;
  }>();

  const handleScratchpadSync = useCallback(
    (roundNumber: number, notes: ScratchpadNote[]) => {
      syncWordScratchpad(roundNumber, notes);
    },
    [syncWordScratchpad]
  );

  const { notes, addNote, updateNote, deleteNote, clearNotes } = useScratchpadNotes(
    lobby.roomId,
    playerId,
    gameState.roundNumber,
    { onSync: handleScratchpadSync }
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
  const prevPhase = useRef(gameState.phase);
  /** Dedupe guess celebration per server state revision (both players get the same update). */
  const lastGuessCelebrationVersion = useRef<number | null>(null);

  useEffect(() => {
    lastGuessCelebrationVersion.current = gameState.stateVersion ?? null;
  }, [lobby.roomId]);

  useEffect(() => {
    if (isLol && gameState.revealedChampionId) {
      audio?.preloadChampion(gameState.revealedChampionId);
    }
  }, [isLol, gameState.revealedChampionId, audio]);

  useEffect(() => {
    const version = gameState.stateVersion;
    if (version == null) return;

    const action = gameState.lastAction;
    const isGuessCelebration =
      (action?.type === 'word_guessed' || action?.type === 'match_won') &&
      (gameState.phase === 'round_end' || gameState.phase === 'match_over');

    if (!isGuessCelebration) return;
    if (lastGuessCelebrationVersion.current === version) return;
    lastGuessCelebrationVersion.current = version;

    const championId =
      action?.championId ?? gameState.revealedChampionId ?? null;
    const category = gameState.wordCategory ?? 'custom';

    audio?.unlock();
    if (category === 'lol-champions' && championId) {
      audio?.playSfx('pickConfirm', 0.7);
      void audio?.playChampionVoice(championId);
    } else {
      audio?.playSfx('pickConfirm', 0.65);
    }
  }, [
    gameState.stateVersion,
    gameState.phase,
    gameState.lastAction,
    gameState.revealedChampionId,
    gameState.wordCategory,
    audio,
  ]);

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

  const showMatchOverModal =
    gameState.phase === 'match_over' && winnerName != null;

  const scoreCard = (
    <ScoreCard
      playerNames={playerNames}
      playerIds={gameState.playerIds}
      scores={gameState.scores}
      myPlayerId={playerId}
      pointsToWin={gameState.pointsToWin}
      align={
        gameState.phase === 'setup' || showScratchpad ? 'center' : 'start'
      }
    />
  );

  const mainColumn = (
    <div
      key={gameState.phase}
      className="min-w-0 sw-phase-mount sw-game-with-scratchpad__main"
    >
      <RoundCeremony
        key={gameState.roundNumber}
        roundNumber={gameState.roundNumber}
      />
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
              opponentChosenWord={gameState.opponentChosenWord}
              opponentChosenChampionId={gameState.opponentChosenChampionId}
              revealedWord={gameState.revealedWord}
              revealedChampionId={gameState.revealedChampionId}
              phase={gameState.phase}
              opponentName={opponentName}
              guesserName={guesserName}
              playerId={playerId}
              playerIds={gameState.playerIds}
              guesserPlayerId={gameState.lastGuesserId}
              assignerPlayerId={
                gameState.lastAction?.type === 'word_guessed' ?
                  gameState.lastAction.creatorId ?? null
                : null
              }
              canConfirmGuessed={gameState.canConfirmGuessed}
              onConfirmGuessed={onConfirmGuessed}
              tabFocusActive={tabFocusActive}
              selfTabFocused={selfTabFocused}
              lobbyPlayers={lobby.players}
            />
          )}
    </div>
  );

  const spectators = lobby.spectators ?? [];
  const hasSpectators = spectators.some((s) => s.connected !== false);

  return (
    <div
      className={clsx(
        'sw-animate-ascend-slow relative',
        !showScratchpad && 'space-y-8'
      )}
    >
      {hasSpectators && (
        <RoomSpectatorsNotice spectators={spectators} className="sw-spectators-watching-notice" />
      )}

      {showScratchpad ?
        <div className="sw-game-with-scratchpad grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-4 lg:gap-5 items-stretch">
          <div className="sw-game-with-scratchpad__scores min-w-0">
            {scoreCard}
          </div>
          {mainColumn}
          <aside className="sw-game-with-scratchpad__aside w-full min-h-0 flex flex-col sw-scratchpad-enter">
            <div className="sw-scratchpad-stack flex flex-col flex-1 min-h-0">
              <Scratchpad
                key={gameState.roundNumber}
                isLol={isLol}
                notes={notes}
                onAdd={addNote}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            </div>
          </aside>
        </div>
      :	<div className="max-w-3xl mx-auto w-full space-y-8">
          {scoreCard}
          {mainColumn}
        </div>
      }

      {showMatchOverModal && (
        <WordMatchOverModal
          wordCategory={wordCategory}
          revealedWord={gameState.revealedWord}
          revealedChampionId={gameState.revealedChampionId}
          myChosenWord={gameState.myChosenWord}
          myChosenChampionId={gameState.myChosenChampionId}
          opponentChosenWord={gameState.opponentChosenWord}
          opponentChosenChampionId={gameState.opponentChosenChampionId}
          opponentName={opponentName}
          guesserPlayerId={gameState.lastGuesserId}
          assignerPlayerId={
            gameState.lastAction?.type === 'word_guessed' ?
              gameState.lastAction.creatorId ?? null
            : gameState.lastAction?.type === 'match_won' ?
              gameState.playerIds.find(
                (id) => id !== gameState.lastAction?.guesserId
              ) ?? null
            : null
          }
          winnerName={winnerName!}
          winnerId={gameState.winnerId}
          myPlayerId={playerId}
          pointsToWin={gameState.pointsToWin}
          scores={gameState.scores}
          playerNames={playerNames}
          playerIds={gameState.playerIds}
          isHost={isHost}
          postMatchBusy={postMatchBusy}
          onHostPlayAgain={onHostPlayAgain}
          onHostReturnToLobby={onHostReturnToLobby}
        />
      )}
    </div>
  );
}
