'use client';

import { useState } from 'react';
import { Eye, Trophy, CheckCircle } from 'lucide-react';

interface GuessingBoardProps {
  targetWordLength: number;
  revealedWord: string | null;
  phase: 'playing' | 'round_end';
  opponentName: string;
  guesserName: string;
  canConfirmGuessed: boolean;
  onConfirmGuessed: () => Promise<boolean>;
}

function MaskedWord({ length }: { length: number }) {
  if (length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center w-10 h-12 sm:w-12 sm:h-14 rounded-lg
                     bg-hub-bg/80 border-2 border-hub-border text-xl font-mono text-hub-muted
                     shadow-inner"
        >
          _
        </span>
      ))}
    </div>
  );
}

export default function GuessingBoard({
  targetWordLength,
  revealedWord,
  phase,
  opponentName,
  guesserName,
  canConfirmGuessed,
  onConfirmGuessed,
}: GuessingBoardProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirmGuessed();
    setConfirming(false);
  };

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
        <p className="text-sm text-hub-muted mb-6">
          Guess the word <span className="text-gray-200">{opponentName}</span>{' '}
          chose for you. Ask questions on voice chat — they answer yes/no.
        </p>
        <MaskedWord length={targetWordLength} />
        <p className="text-xs text-hub-muted text-center mt-4">
          {targetWordLength} character{targetWordLength !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="word-panel p-6 sm:p-8 border-2 border-hub-accent/40 bg-hub-accent/5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-hub-accent" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Opponent&apos;s Word Status
          </h3>
        </div>
        <p className="text-sm text-hub-muted mb-5">
          When <span className="text-gray-200">{opponentName}</span> guesses the
          word you chose for them on voice chat, press the button to award them a
          point.
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
