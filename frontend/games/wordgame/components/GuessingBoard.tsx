'use client';

import { useState } from 'react';
import { Eye, Trophy, CheckCircle, Crown } from 'lucide-react';

interface GuessingBoardProps {
  myChosenWord: string | null;
  revealedWord: string | null;
  phase: 'playing' | 'round_end' | 'match_over';
  opponentName: string;
  guesserName: string;
  winnerName?: string;
  pointsToWin: number;
  canConfirmGuessed: boolean;
  onConfirmGuessed: () => Promise<boolean>;
}

export default function GuessingBoard({
  myChosenWord,
  revealedWord,
  phase,
  opponentName,
  guesserName,
  winnerName,
  pointsToWin,
  canConfirmGuessed,
  onConfirmGuessed,
}: GuessingBoardProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirmGuessed();
    setConfirming(false);
  };

  if (phase === 'match_over' && winnerName) {
    return (
      <div className="word-panel p-8 text-center animate-overlay-pop">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/15 mb-4">
          <Crown className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-2xl font-black text-amber-100 mb-2 tracking-wide">
          MATCH WON!
        </h3>
        <p className="text-hub-muted text-sm mb-4">
          <span className="text-gray-200">{winnerName}</span> reached {pointsToWin}{' '}
          points first
        </p>
        {revealedWord && (
          <div className="inline-block px-8 py-4 rounded-xl bg-hub-bg/60 border border-amber-400/30">
            <p className="text-xs text-hub-muted uppercase tracking-widest mb-2">
              Last word
            </p>
            <p className="text-3xl font-bold text-white tracking-wide">{revealedWord}</p>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'round_end' && revealedWord) {
    return (
      <div className="word-panel p-8 text-center animate-overlay-pop">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/15 mb-4">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-2xl font-black text-amber-100 mb-2 tracking-wide">
          WORD GUESSED!
        </h3>
        <p className="text-hub-muted text-sm mb-6">
          <span className="text-gray-200">{guesserName}</span> got it — +1 point
        </p>
        <div className="inline-block px-8 py-4 rounded-xl bg-hub-bg/60 border border-amber-400/30">
          <p className="text-xs text-hub-muted uppercase tracking-widest mb-2">
            The word was
          </p>
          <p className="text-3xl font-bold text-white tracking-wide">{revealedWord}</p>
        </div>
        <p className="text-xs text-hub-muted mt-6 animate-pulse-soft">
          Next round starting…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="word-panel p-6 sm:p-8">
        <div className="flex items-center gap-2 text-emerald-400/90 mb-2">
          <Eye className="w-5 h-5" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Your Guessing Board
          </h3>
        </div>
        <p className="text-sm text-hub-muted">
          Guess the word <span className="text-gray-200">{opponentName}</span>{' '}
          chose for you. Ask yes/no questions on voice chat — they answer out loud.
          Use the scratchpad to track your clues.
        </p>
      </div>

      <div className="word-panel p-6 sm:p-8 border-2 border-hub-accent/40 bg-hub-accent/5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-hub-accent" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Your Word for {opponentName}
          </h3>
        </div>
        {myChosenWord && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-hub-bg/60 border border-hub-border">
            <p className="text-xs text-hub-muted uppercase tracking-widest mb-1">
              You chose
            </p>
            <p className="text-xl font-bold text-white">{myChosenWord}</p>
          </div>
        )}
        <p className="text-sm text-hub-muted mb-5">
          When <span className="text-gray-200">{opponentName}</span> guesses your
          word on voice chat, press the button to award them a point.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirmGuessed || confirming}
          className="w-full py-4 px-6 rounded-xl font-bold text-lg tracking-wide
                     bg-gradient-to-r from-hub-accent to-blue-500
                     hover:from-hub-accent-dim hover:to-blue-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-lg shadow-hub-accent/20
                     hover:scale-[1.02] active:scale-[0.98]"
        >
          {confirming ? 'Confirming…' : 'Word Guessed!'}
        </button>
      </div>
    </div>
  );
}
