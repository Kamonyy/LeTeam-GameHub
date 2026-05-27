'use client';

import { useState } from 'react';
import { Eye, Trophy, CheckCircle, Crown, Sparkles } from 'lucide-react';
import WordPanelFrame from './WordPanelFrame';
import ChampionPortrait from './ChampionPortrait';
import clsx from 'clsx';
import type { WordCategory } from '../types';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';

interface GuessingBoardProps {
  wordCategory: WordCategory;
  myChosenWord: string | null;
  myChosenChampionId: string | null;
  revealedWord: string | null;
  revealedChampionId: string | null;
  phase: 'playing' | 'round_end' | 'match_over';
  opponentName: string;
  guesserName: string;
  winnerName?: string;
  pointsToWin: number;
  canConfirmGuessed: boolean;
  onConfirmGuessed: () => Promise<boolean>;
}

function RevealContent({
  wordCategory,
  revealedWord,
  revealedChampionId,
  label,
}: {
  wordCategory: WordCategory;
  revealedWord: string;
  revealedChampionId: string | null;
  label: string;
}) {
  const isLol = wordCategory === 'lol-champions' && revealedChampionId;

  return (
    <div className="sw-reveal-box">
      <p className="text-[10px] sw-muted uppercase tracking-[0.25em] mb-3">{label}</p>
      {isLol && (
        <div className="flex justify-center mb-4">
          <ChampionPortrait
            championId={revealedChampionId}
            size="xl"
            showName={false}
            reveal
          />
        </div>
      )}
      <p className={clsx('sw-word-reveal', isLol && 'text-2xl sm:text-3xl')}>
        {revealedWord}
      </p>
    </div>
  );
}

export default function GuessingBoard({
  wordCategory,
  myChosenWord,
  myChosenChampionId,
  revealedWord,
  revealedChampionId,
  phase,
  opponentName,
  guesserName,
  winnerName,
  pointsToWin,
  canConfirmGuessed,
  onConfirmGuessed,
}: GuessingBoardProps) {
  const [confirming, setConfirming] = useState(false);
  const isLol = wordCategory === 'lol-champions';
  const audio = useWordGameAudioOptional();

  const handleConfirm = async () => {
    audio?.unlock();
    setConfirming(true);
    const ok = await onConfirmGuessed();
    if (ok && isLol && myChosenChampionId) {
      audio?.playSfx('pickConfirm', 0.7);
      await audio?.playChampionVoice(myChosenChampionId);
    } else if (ok) {
      audio?.playSfx('pickConfirm', 0.65);
    }
    setConfirming(false);
  };

  if (phase === 'match_over' && winnerName) {
    return (
      <WordPanelFrame className="p-8 sm:p-12 text-center sw-animate-victory">
        <div className="sw-victory-icon mx-auto mb-5">
          <Crown className="w-9 h-9" strokeWidth={1.5} />
        </div>
        <h3 className="sw-heading-lg mb-3 sw-animate-ascend">Victory Claimed</h3>
        <p className="sw-muted text-sm mb-6">
          <span className="sw-text-accent font-semibold">{winnerName}</span> reached{' '}
          {pointsToWin} points first
        </p>
        {revealedWord && (
          <RevealContent
            wordCategory={wordCategory}
            revealedWord={revealedWord}
            revealedChampionId={revealedChampionId}
            label={isLol ? 'Final champion' : 'Final word'}
          />
        )}
      </WordPanelFrame>
    );
  }

  if (phase === 'round_end' && revealedWord) {
    return (
      <WordPanelFrame className="p-8 sm:p-12 text-center sw-animate-reveal">
        <div className="sw-victory-icon mx-auto mb-5">
          <Trophy className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h3 className="sw-heading-lg mb-3">
          {isLol ? 'Champion Revealed' : 'Word Revealed'}
        </h3>
        <p className="sw-muted text-sm mb-8">
          <span className="sw-text-accent font-semibold">{guesserName}</span> earns the point
        </p>
        <RevealContent
          wordCategory={wordCategory}
          revealedWord={revealedWord}
          revealedChampionId={revealedChampionId}
          label={isLol ? 'The champion was' : 'The word was'}
        />
        <p className="text-xs sw-muted mt-8 flex items-center justify-center gap-2 animate-pulse-soft">
          <Sparkles className="w-3.5 h-3.5 text-[#c9a227]" />
          Next round approaches…
        </p>
      </WordPanelFrame>
    );
  }

  return (
    <div className="space-y-6 sw-stagger">
      <WordPanelFrame panelEnter={false} className="p-6 sm:p-8 sw-accent-cyan" embers={false}>
        <div className="flex items-center gap-2 text-[#7ee8ff] mb-3">
          <Eye className="w-5 h-5" />
          <h3 className="sw-heading text-xs">Guessing Ground</h3>
        </div>
        <div className="sw-divider-gold opacity-60" />
        <p className="text-sm sw-muted mt-4 leading-relaxed">
          {isLol ?
            <>Discern the champion <span className="sw-text-accent">{opponentName}</span> chose for you.</>
          :	<>Discern the word <span className="sw-text-accent">{opponentName}</span> chose for you.</>}
          {' '}
          Ask yes/no questions on voice — track clues on your scratchpad.
        </p>
      </WordPanelFrame>

      <WordPanelFrame
        panelEnter={false}
        className={clsx('p-6 sm:p-8', 'sw-accent-ember')}
      >
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-[#ff9f43]" />
          <h3 className="sw-heading text-xs">
            {isLol ? `Your Champion for ${opponentName}` : `Your Word for ${opponentName}`}
          </h3>
        </div>
        <div className="sw-divider-gold opacity-60" />
        {(myChosenWord || myChosenChampionId) && (
          <div className="mt-5 mb-6 px-5 py-4 rounded-lg border border-[rgba(255,107,53,0.25)] bg-[rgba(8,12,24,0.6)]">
            <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-3">
              {isLol ? 'You chose' : 'You inscribed'}
            </p>
            {isLol && myChosenChampionId && (
              <div className="flex justify-center mb-3">
                <ChampionPortrait championId={myChosenChampionId} size="md" />
              </div>
            )}
            {myChosenWord && (
              <p className="text-xl font-semibold sw-text-accent tracking-wide text-center">
                {myChosenWord}
              </p>
            )}
          </div>
        )}
        <p className="text-sm sw-muted mb-6 leading-relaxed">
          When <span className="sw-text-accent">{opponentName}</span>{' '}
          {isLol ? 'guesses your champion aloud' : 'guesses your word aloud'},
          confirm to award the point.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirmGuessed || confirming}
          className="sw-btn-confirm"
        >
          {confirming ? 'Confirming…' : isLol ? 'Champion Guessed!' : 'Word Guessed!'}
        </button>
      </WordPanelFrame>
    </div>
  );
}
