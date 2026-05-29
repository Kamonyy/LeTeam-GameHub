'use client';

import { useRef, useState } from 'react';
import { Eye, Trophy, CheckCircle, Sparkles } from 'lucide-react';
import WordPanelFrame from './WordPanelFrame';
import ChampionPortrait from './ChampionPortrait';
import clsx from 'clsx';
import type { WordCategory } from '../types';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';
import RoundRevealBoard from './RoundRevealBoard';

interface GuessingBoardProps {
  wordCategory: WordCategory;
  myChosenWord: string | null;
  myChosenChampionId: string | null;
  opponentChosenWord: string | null;
  opponentChosenChampionId: string | null;
  revealedWord: string | null;
  revealedChampionId: string | null;
  phase: 'playing' | 'round_end' | 'match_over';
  opponentName: string;
  guesserName: string;
  playerId: string;
  playerIds: string[];
  guesserPlayerId: string | null;
  assignerPlayerId?: string | null;
  canConfirmGuessed: boolean;
  onConfirmGuessed: () => Promise<boolean>;
}

export default function GuessingBoard({
  wordCategory,
  myChosenWord,
  myChosenChampionId,
  opponentChosenWord,
  opponentChosenChampionId,
  revealedWord,
  revealedChampionId,
  phase,
  opponentName,
  guesserName,
  playerId,
  playerIds,
  guesserPlayerId,
  assignerPlayerId,
  canConfirmGuessed,
  onConfirmGuessed,
}: GuessingBoardProps) {
  const [confirming, setConfirming] = useState(false);
  const isLol = wordCategory === 'lol-champions';
  const audio = useWordGameAudioOptional();

  const confirmLockRef = useRef(false);

  const handleConfirm = async () => {
    if (!canConfirmGuessed || confirming || confirmLockRef.current) return;
    confirmLockRef.current = true;
    audio?.unlock();
    setConfirming(true);
    await onConfirmGuessed();
    confirmLockRef.current = false;
    setConfirming(false);
  };

  if (phase === 'match_over') {
    return null;
  }

  if (phase === 'round_end' && revealedWord) {
    return (
      <WordPanelFrame className="p-6 sm:p-8 text-center sw-animate-reveal sw-panel--round-reveal">
        <div className="sw-victory-icon mx-auto mb-4">
          <Trophy className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h3 className="sw-heading-lg mb-2">
          {isLol ? 'Champion Revealed' : 'Word Revealed'}
        </h3>
        <p className="sw-muted text-sm mb-6">
          <span className="sw-text-accent font-semibold">{guesserName}</span> earns the point
        </p>

        <RoundRevealBoard
          wordCategory={wordCategory}
          revealedWord={revealedWord}
          revealedChampionId={revealedChampionId}
          myChosenWord={myChosenWord}
          myChosenChampionId={myChosenChampionId}
          opponentChosenWord={opponentChosenWord}
          opponentChosenChampionId={opponentChosenChampionId}
          opponentName={opponentName}
          guesserName={guesserName}
          playerId={playerId}
          playerIds={playerIds}
          guesserPlayerId={guesserPlayerId}
          assignerPlayerId={assignerPlayerId}
        />

        <p className="text-xs sw-muted mt-6 flex items-center justify-center gap-2 animate-pulse-soft">
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
            {isLol && myChosenChampionId ?
              <div className="flex justify-center">
                <ChampionPortrait championId={myChosenChampionId} size="md" />
              </div>
            : myChosenWord ?
              <p className="text-xl font-semibold sw-text-accent tracking-wide text-center">
                {myChosenWord}
              </p>
            : null}
          </div>
        )}
        <p className="text-sm sw-muted mb-6 leading-relaxed">
          When <span className="sw-text-accent">{opponentName}</span>{' '}
          {isLol ? 'guesses your champion aloud' : 'guesses your word aloud'},
          confirm to award the point.
        </p>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!canConfirmGuessed || confirming}
          className="sw-btn-confirm"
        >
          {confirming ? 'Confirming…' : isLol ? 'Champion Guessed!' : 'Word Guessed!'}
        </button>
      </WordPanelFrame>
    </div>
  );
}
