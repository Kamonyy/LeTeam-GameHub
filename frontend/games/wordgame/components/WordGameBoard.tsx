'use client';

import type { WordGameState } from '../types';
import type { LobbyState } from '@/lib/hub/types';
import ScoreCard from './ScoreCard';
import WordSetup from './WordSetup';
import GuessingBoard from './GuessingBoard';
import WordMatchOverModal from './WordMatchOverModal';
import Scratchpad from './Scratchpad';
import WordTabFocusAlerts from './WordTabFocusAlerts';
import RoundCeremony from './RoundCeremony';
import { useScratchpadNotes } from '../hooks/useScratchpadNotes';
import clsx from 'clsx';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

  const mainColumnRef = useRef<HTMLDivElement>(null);
  const lockedScratchpadHeightRef = useRef<number | null>(null);
  const [lockedScratchpadPx, setLockedScratchpadPx] = useState<number | null>(
    null
  );

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
    lockedScratchpadHeightRef.current = null;
    setLockedScratchpadPx(null);
  }, [gameState.roundNumber, showScratchpad]);

  const layoutReadyToLockScratchpad =
    gameState.phase === 'round_end' ||
    (gameState.phase === 'playing' &&
      Boolean(gameState.myChosenChampionId || gameState.myChosenWord));

  /** Lock scratchpad to the main game column height (desktop) — notes scroll inside. */
  useEffect(() => {
    if (!showScratchpad || !layoutReadyToLockScratchpad) {
      lockedScratchpadHeightRef.current = null;
      setLockedScratchpadPx(null);
      return;
    }
    const el = mainColumnRef.current;
    if (!el) return;

    let cancelled = false;

    const tryLock = () => {
      if (cancelled || lockedScratchpadHeightRef.current != null) return;
      if (typeof window === 'undefined' || window.innerWidth < 1024) return;
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height < 280) return;
      lockedScratchpadHeightRef.current = height;
      setLockedScratchpadPx(height);
    };

    tryLock();
    const timer = window.setTimeout(tryLock, 120);
    const observer = new ResizeObserver(() => {
      if (lockedScratchpadHeightRef.current == null) tryLock();
    });
    observer.observe(el);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [
    showScratchpad,
    layoutReadyToLockScratchpad,
    gameState.phase,
    gameState.roundNumber,
    gameState.myChosenChampionId,
    gameState.myChosenWord,
    wordCategory,
  ]);

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

  return (
    <div className="sw-animate-ascend-slow space-y-8 relative">
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
          showScratchpad && 'sw-game-with-scratchpad',
          showScratchpad && lockedScratchpadPx != null && 'sw-game-with-scratchpad--height-locked',
          showScratchpad ?
            'grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8 items-start'
          :	'max-w-3xl mx-auto w-full'
        )}
        style={
          lockedScratchpadPx ?
            ({
              '--sw-scratchpad-locked-height': `${lockedScratchpadPx}px`,
            } as CSSProperties)
          : undefined
        }
      >
        <div
          ref={mainColumnRef}
          key={gameState.phase}
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
            />
          )}
        </div>

        {showScratchpad && (
          <aside className="sw-game-with-scratchpad__aside w-full min-h-0 flex flex-col sw-scratchpad-enter">
            <WordTabFocusAlerts
              active={tabFocusActive}
              playerId={playerId}
              players={lobby.players}
              selfFocused={selfTabFocused}
            />
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
