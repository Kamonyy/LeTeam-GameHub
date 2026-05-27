'use client';

import { useState } from 'react';
import { Eye, Trophy, CheckCircle, Crown, Sparkles } from 'lucide-react';
import WordPanelFrame from './WordPanelFrame';
import clsx from 'clsx';

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
      <WordPanelFrame className="p-8 sm:p-12 text-center animate-overlay-pop">
        <div className="sw-victory-icon mx-auto mb-5">
          <Crown className="w-9 h-9" strokeWidth={1.5} />
        </div>
        <h3 className="sw-heading-lg mb-3">Victory Claimed</h3>
        <p className="sw-muted text-sm mb-6">
          <span className="sw-text-accent font-semibold">{winnerName}</span> reached{' '}
          {pointsToWin} points first
        </p>
        {revealedWord && (
          <div className="sw-reveal-box">
            <p className="text-[10px] sw-muted uppercase tracking-[0.25em] mb-2">Final word</p>
            <p className="sw-word-reveal text-2xl sm:text-3xl">{revealedWord}</p>
          </div>
        )}
      </WordPanelFrame>
    );
  }

  if (phase === 'round_end' && revealedWord) {
    return (
      <WordPanelFrame className="p-8 sm:p-12 text-center animate-overlay-pop">
        <div className="sw-victory-icon mx-auto mb-5">
          <Trophy className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h3 className="sw-heading-lg mb-3">Word Revealed</h3>
        <p className="sw-muted text-sm mb-8">
          <span className="sw-text-accent font-semibold">{guesserName}</span> earns the point
        </p>
        <div className="sw-reveal-box">
          <p className="text-[10px] sw-muted uppercase tracking-[0.25em] mb-2">The word was</p>
          <p className="sw-word-reveal">{revealedWord}</p>
        </div>
        <p className="text-xs sw-muted mt-8 flex items-center justify-center gap-2 animate-pulse-soft">
          <Sparkles className="w-3.5 h-3.5 text-[#c9a227]" />
          Next round approaches…
        </p>
      </WordPanelFrame>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <WordPanelFrame className="p-6 sm:p-8 sw-accent-cyan" embers={false}>
        <div className="flex items-center gap-2 text-[#7ee8ff] mb-3">
          <Eye className="w-5 h-5" />
          <h3 className="sw-heading text-xs">Guessing Ground</h3>
        </div>
        <div className="sw-divider-gold opacity-60" />
        <p className="text-sm sw-muted mt-4 leading-relaxed">
          Discern the word <span className="sw-text-accent">{opponentName}</span> chose for you.
          Ask yes/no questions on voice — track clues on your scratchpad.
        </p>
      </WordPanelFrame>

      <WordPanelFrame className={clsx('p-6 sm:p-8', 'sw-accent-ember')}>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-[#ff9f43]" />
          <h3 className="sw-heading text-xs">Your Word for {opponentName}</h3>
        </div>
        <div className="sw-divider-gold opacity-60" />
        {myChosenWord && (
          <div className="mt-5 mb-6 px-5 py-4 rounded-lg border border-[rgba(255,107,53,0.25)] bg-[rgba(8,12,24,0.6)]">
            <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-2">You inscribed</p>
            <p className="text-xl font-semibold sw-text-accent tracking-wide">{myChosenWord}</p>
          </div>
        )}
        <p className="text-sm sw-muted mb-6 leading-relaxed">
          When <span className="sw-text-accent">{opponentName}</span> guesses your word aloud,
          confirm to award the point.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirmGuessed || confirming}
          className="sw-btn-confirm"
        >
          {confirming ? 'Confirming…' : 'Word Guessed!'}
        </button>
      </WordPanelFrame>
    </div>
  );
}
