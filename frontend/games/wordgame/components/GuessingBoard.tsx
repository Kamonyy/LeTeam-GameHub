'use client';

import { useRef, useState } from 'react';
import { Eye, Trophy, CheckCircle, Sparkles } from 'lucide-react';
import WordPanelFrame from './WordPanelFrame';
import ChampionPortrait from './ChampionPortrait';
import type { WordCategory } from '../types';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';
import RoundRevealBoard from './RoundRevealBoard';
import WordTabFocusAlerts from './WordTabFocusAlerts';
import type { LobbyPlayer } from '@/lib/hub/types';

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
  tabFocusActive?: boolean;
  selfTabFocused?: boolean;
  lobbyPlayers?: LobbyPlayer[];
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
  tabFocusActive = false,
  selfTabFocused = true,
  lobbyPlayers = [],
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
      <WordPanelFrame
        panelEnter={false}
        embers={false}
        className="sw-round-reveal-panel sw-animate-reveal sw-panel--round-reveal"
      >
        <header className="sw-round-reveal-panel__head">
          <div className="sw-round-reveal-panel__head-main">
            <div className="sw-victory-icon sw-victory-icon--compact" aria-hidden>
              <Trophy className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h3 className="sw-round-reveal-panel__title">
              {isLol ? 'Champion Revealed' : 'Word Revealed'}
            </h3>
          </div>
          <p className="sw-round-reveal-panel__points-badge">
            <span className="sw-round-reveal-panel__points-name">{guesserName}</span>
            <span className="sw-round-reveal-panel__points-label">earns the point</span>
          </p>
        </header>

        <div className="sw-round-reveal-panel__body">
          <RoundRevealBoard
            compact
            horizontal
            className="sw-round-reveal--in-panel"
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
        </div>

        <footer className="sw-round-reveal-panel__foot">
          <Sparkles className="w-3.5 h-3.5 text-[#c9a227]" aria-hidden />
          <span>Next round approaches…</span>
        </footer>
      </WordPanelFrame>
    );
  }

  return (
    <div className="sw-guessing-board">
      <div className="sw-guessing-board__top sw-stagger">
        <WordPanelFrame
          panelEnter={false}
          className="sw-guessing-intro p-3.5 sm:p-4 sw-accent-cyan"
          embers={false}
        >
          <div className="sw-guessing-intro__row">
            <Eye className="sw-guessing-intro__icon" aria-hidden />
            <div className="sw-guessing-intro__content">
              <h3 className="sw-guessing-intro__title">Guessing Ground</h3>
              <p className="sw-guessing-intro__copy">
                {isLol ?
                  <>
                    Discern the champion{' '}
                    <span className="sw-text-accent font-medium">{opponentName}</span>{' '}
                    chose.
                  </>
                :	<>
                    Discern the word{' '}
                    <span className="sw-text-accent font-medium">{opponentName}</span>{' '}
                    chose.
                  </>}
                {' '}
                Ask on voice; note clues on your scratchpad.
              </p>
            </div>
          </div>
        </WordPanelFrame>

        {tabFocusActive && (
          <WordTabFocusAlerts
            active
            playerId={playerId}
            players={lobbyPlayers}
            selfFocused={selfTabFocused}
            className="sw-focus-alerts--game-slot"
          />
        )}
      </div>

      <div className="space-y-4 sw-stagger sw-guessing-board__panels">
      <WordPanelFrame
        panelEnter={false}
        className="sw-guessing-confirm p-3.5 sm:p-4 sw-accent-ember"
        embers={false}
      >
        <div className="sw-guessing-confirm__head">
          <CheckCircle className="sw-guessing-confirm__icon" aria-hidden />
          <h3 className="sw-guessing-confirm__title">
            {isLol ? `Your champion for ${opponentName}` : `Your word for ${opponentName}`}
          </h3>
        </div>

        {(myChosenWord || myChosenChampionId) && (
          <div className="sw-guessing-confirm__pick">
            <p className="sw-guessing-confirm__pick-label">
              {isLol ? 'You chose' : 'You inscribed'}
            </p>
            {isLol && myChosenChampionId ?
              <div className="sw-guessing-confirm__portrait">
                <ChampionPortrait championId={myChosenChampionId} size="md" />
              </div>
            : myChosenWord ?
              <p className="sw-guessing-confirm__word">{myChosenWord}</p>
            : null}
          </div>
        )}

        <p className="sw-guessing-confirm__hint">
          When <span className="sw-text-accent font-medium">{opponentName}</span>{' '}
          {isLol ? 'guesses aloud' : 'guesses aloud'}, tap confirm for the point.
        </p>

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!canConfirmGuessed || confirming}
          className="sw-btn-confirm sw-btn-confirm--compact"
        >
          {confirming ? 'Confirming…' : isLol ? 'Champion guessed!' : 'Word guessed!'}
        </button>
      </WordPanelFrame>
      </div>
    </div>
  );
}
