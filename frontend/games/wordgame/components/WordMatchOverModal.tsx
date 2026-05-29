'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, DoorOpen, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { WordCategory } from '../types';
import RoundRevealBoard from './RoundRevealBoard';

interface WordMatchOverModalProps {
  wordCategory: WordCategory;
  revealedWord: string | null;
  revealedChampionId: string | null;
  myChosenWord: string | null;
  myChosenChampionId: string | null;
  opponentChosenWord: string | null;
  opponentChosenChampionId: string | null;
  opponentName: string;
  winnerName: string;
  winnerId: string | null;
  myPlayerId: string;
  pointsToWin: number;
  scores: Record<string, number>;
  playerNames: Record<string, string>;
  playerIds: string[];
  guesserPlayerId: string | null;
  assignerPlayerId?: string | null;
  isHost: boolean;
  postMatchBusy?: boolean;
  onHostPlayAgain?: () => void;
  onHostReturnToLobby?: () => void;
}

export default function WordMatchOverModal({
  wordCategory,
  revealedWord,
  revealedChampionId,
  myChosenWord,
  myChosenChampionId,
  opponentChosenWord,
  opponentChosenChampionId,
  opponentName,
  winnerName,
  winnerId,
  myPlayerId,
  pointsToWin,
  scores,
  playerNames,
  playerIds,
  guesserPlayerId,
  assignerPlayerId,
  isHost,
  postMatchBusy = false,
  onHostPlayAgain,
  onHostReturnToLobby,
}: WordMatchOverModalProps) {
  const [mounted, setMounted] = useState(false);
  const isLol = wordCategory === 'lol-champions';
  const iWon = winnerId === myPlayerId;
  const guesserName =
    guesserPlayerId != null ?
      playerNames[guesserPlayerId] || 'Player'
    : winnerName;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const content = (
    <div className="sw-match-over-overlay" role="presentation">
      <div
        className="sw-match-over-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sw-match-over-title"
      >
        <header className="sw-match-over-header">
          <div className="sw-victory-icon mx-auto mb-3" aria-hidden>
            <Crown className="w-9 h-9" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] sw-muted uppercase tracking-[0.25em] mb-1">
            Match finished
          </p>
          <h2 id="sw-match-over-title" className="sw-heading-lg mb-2">
            {iWon ? 'Victory is yours' : 'Match complete'}
          </h2>
          <p className="sw-muted text-sm leading-relaxed">
            <span className="sw-text-accent font-semibold">{winnerName}</span>
            {iWon ?
              <> reached {pointsToWin} points first</>
            : <> won the match ({pointsToWin} points to win)</>}
          </p>
        </header>

        <ul className="sw-match-over-scores" aria-label="Final scores">
          {playerIds.map((id) => (
            <li
              key={id}
              className={clsx(
                'sw-match-over-scores__row',
                id === winnerId && 'sw-match-over-scores__row--winner'
              )}
            >
              <span className="sw-match-over-scores__name">
                {playerNames[id] || 'Player'}
                {id === myPlayerId && (
                  <span className="sw-muted font-normal"> (you)</span>
                )}
              </span>
              <span className="sw-match-over-scores__pts tabular-nums font-semibold">
                {scores[id] ?? 0}
              </span>
            </li>
          ))}
        </ul>

        {revealedWord && (
          <RoundRevealBoard
            className="sw-match-over-reveals"
            wordCategory={wordCategory}
            revealedWord={revealedWord}
            revealedChampionId={revealedChampionId}
            myChosenWord={myChosenWord}
            myChosenChampionId={myChosenChampionId}
            opponentChosenWord={opponentChosenWord}
            opponentChosenChampionId={opponentChosenChampionId}
            opponentName={opponentName}
            guesserName={guesserName}
            playerId={myPlayerId}
            playerIds={playerIds}
            guesserPlayerId={guesserPlayerId ?? winnerId}
            assignerPlayerId={assignerPlayerId}
          />
        )}

        <footer className="sw-match-over-footer">
          {isHost ?
            <>
              <p className="text-xs sw-muted mb-3">
                Choose what happens next for the room.
              </p>
              <div className="sw-match-over-actions__buttons">
                <button
                  type="button"
                  className="sw-btn-primary sw-match-over-actions__btn"
                  disabled={postMatchBusy}
                  onClick={() => onHostPlayAgain?.()}
                >
                  {postMatchBusy ?
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                  : <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />}
                  <span>{postMatchBusy ? 'Starting…' : 'Play again'}</span>
                </button>
                <button
                  type="button"
                  className="sw-btn-secondary sw-match-over-actions__btn"
                  disabled={postMatchBusy}
                  onClick={() => onHostReturnToLobby?.()}
                >
                  <DoorOpen className="w-4 h-4 shrink-0" aria-hidden />
                  <span>Return to lobby</span>
                </button>
              </div>
            </>
          : <p className="text-sm sw-muted sw-match-over-waiting">
              <Sparkles
                className="w-4 h-4 shrink-0 text-[#c9a227]"
                aria-hidden
              />
              <span>
                Waiting for the lobby host to start a rematch or return to the
                lobby…
              </span>
            </p>
          }
        </footer>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
