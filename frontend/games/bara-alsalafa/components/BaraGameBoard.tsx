'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Target, SkipForward } from 'lucide-react';
import {
  BARA_DEFEND_MS,
  BARA_INTERROGATION_MS,
} from '@shared/games/bara-alsalafa/timing.js';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import type { LobbyState } from '@/lib/hub/types';
import PlayerGrid from './PlayerGrid';
import RevealCard from './RevealCard';
import CountdownRing from './CountdownRing';

interface BaraGameBoardProps {
  gameState: BaraGameState;
  lobby: LobbyState;
  playerId: string;
  isHost: boolean;
  onReveal: () => Promise<boolean>;
  onAdvanceInterrogation: () => Promise<boolean>;
  onVote: (targetId: string) => Promise<boolean>;
  onGuess: (guess: string) => Promise<boolean>;
}

function displayName(lobby: LobbyState, id: string) {
  return lobby.players.find((p) => p.id === id)?.displayName ?? 'لاعب';
}

const PHASE_LABELS: Record<string, string> = {
  reveal: 'كشف الأدوار',
  interrogation: 'استجواب',
  defend: 'دفاع سريع',
  voting: 'تصويت',
  revote: 'إعادة تصويت',
  outcast_guess: 'تخمين برا السالفة',
  round_end: 'نهاية الجولة',
  match_over: 'نهاية المباراة',
};

export default function BaraGameBoard({
  gameState,
  lobby,
  playerId,
  onReveal,
  onAdvanceInterrogation,
  onVote,
  onGuess,
}: BaraGameBoardProps) {
  const [revealing, setRevealing] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [submittingGuess, setSubmittingGuess] = useState(false);

  const phase = gameState.phase;
  const isCalm =
    phase === 'reveal' || phase === 'interrogation' || phase === 'defend';
  const isIntense =
    phase === 'voting' ||
    phase === 'revote' ||
    phase === 'outcast_guess' ||
    (phase === 'round_end' && gameState.roundOutcome?.type === 'wrong_accusation');

  const votingActive = phase === 'voting' || phase === 'revote';
  const spotlightId =
    phase === 'outcast_guess' || phase === 'round_end' ?
      (gameState.eliminatedThisRound ?? gameState.outcastId)
    : null;

  const handleReveal = async () => {
    setRevealing(true);
    await onReveal();
    setRevealing(false);
  };

  const handleGuess = async () => {
    if (!guessInput.trim()) return;
    setSubmittingGuess(true);
    await onGuess(guessInput.trim());
    setSubmittingGuess(false);
  };

  const interviewerName =
    gameState.currentInterviewerId ?
      displayName(lobby, gameState.currentInterviewerId)
    : null;
  const targetName =
    gameState.currentTargetId ?
      displayName(lobby, gameState.currentTargetId)
    : null;

  const isReveal = phase === 'reveal';

  return (
    <div
      className={clsx(
        'bara-board',
        isReveal && 'bara-board--reveal',
        isCalm && 'bara-board--calm',
        isIntense && 'bara-board--intense',
        phase === 'round_end' &&
          gameState.roundOutcome?.type === 'outcast_stole_win' &&
          'animate-bara-shake'
      )}
      dir="rtl"
    >
      <header className="bara-board__head">
        <div className="bara-board__meta">
          <span className="bara-board__round">الجولة {gameState.roundNumber}</span>
          <span className="bara-board__dot" aria-hidden />
          <span className="bara-board__phase">{PHASE_LABELS[phase] ?? phase}</span>
        </div>
        <p className="bara-board__category">
          فئة الجولة: <strong>{gameState.categoryName}</strong>
        </p>
        {gameState.selectedCategoryCount > 1 && (
          <p className="bara-board__categories-extra">
            الفئات المفعّلة ({gameState.selectedCategoryCount}):{' '}
            {gameState.categoryNamesSummary}
          </p>
        )}
      </header>

      {phase === 'interrogation' && interviewerName && targetName && (
        <div className="bara-interrogation-hero" role="status">
          <span className="bara-interrogation-hero__who">{interviewerName}</span>
          <span className="bara-interrogation-hero__arrow" aria-hidden>
            ←
          </span>
          <span className="bara-interrogation-hero__who bara-interrogation-hero__who--target">
            {targetName}
          </span>
          {gameState.currentInterviewerId === playerId && (
            <span className="bara-interrogation-hero__you">دورك للسؤال</span>
          )}
        </div>
      )}

      {phase === 'defend' && (
        <p className="bara-phase-callout bara-phase-callout--warn">
          دفاع سريع بين المتعادلين:{' '}
          {gameState.tiedPlayerIds.map((id) => displayName(lobby, id)).join(' · ')}
        </p>
      )}

      {votingActive && (
        <div className="bara-phase-callout bara-phase-callout--vote">
          <Target className="w-5 h-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">صوّت سراً — اختر من تشتبه به</p>
            <p className="text-xs opacity-80 tabular-nums">
              {gameState.votesCast} / {gameState.votesExpected} أصوات
            </p>
          </div>
        </div>
      )}

      <div
        className={clsx(
          'bara-board__main',
          isReveal && 'bara-board__main--reveal'
        )}
      >
        <section className="bara-board__stage" aria-label="منطقة اللعب">
          {isReveal && (
            <RevealCard
              gameState={gameState}
              onReveal={() => void handleReveal()}
              revealing={revealing}
            />
          )}

          {phase === 'interrogation' && (
            <div className="bara-stage-panel">
              <CountdownRing
                phaseEndsAt={gameState.phaseEndsAt}
                totalMs={BARA_INTERROGATION_MS}
                label="وقت السؤال (١:٣٠)"
              />
              {gameState.canAdvanceInterrogation && (
                <button
                  type="button"
                  onClick={() => void onAdvanceInterrogation()}
                  className="bara-btn-secondary bara-skip-btn"
                >
                  <SkipForward className="w-4 h-4" aria-hidden />
                  تخطي السؤال
                </button>
              )}
            </div>
          )}

          {phase === 'defend' && (
            <div className="bara-stage-panel">
              <CountdownRing
                phaseEndsAt={gameState.phaseEndsAt}
                totalMs={BARA_DEFEND_MS}
                label="وقت الدفاع"
              />
            </div>
          )}

          {phase === 'outcast_guess' && gameState.canGuess && (
            <div className="bara-guess-panel">
              <h3 className="bara-guess-panel__title">
                كُشفت! خمّن الكلمة السرية لتسرق الفوز
              </h3>
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                className="bara-input bara-guess-panel__input"
                placeholder="اكتب تخمينك"
                dir="rtl"
                autoFocus
              />
              <button
                type="button"
                onClick={() => void handleGuess()}
                disabled={submittingGuess || !guessInput.trim()}
                className="bara-btn-primary w-full"
              >
                {submittingGuess ? 'جاري الإرسال…' : 'أرسل التخمين'}
              </button>
            </div>
          )}

          {phase === 'round_end' && gameState.roundOutcome && (
            <RoundOutcomePanel gameState={gameState} lobby={lobby} />
          )}

          {phase === 'match_over' && (
            <div className="bara-outcome-card bara-outcome-card--win">
              <p className="bara-outcome-card__title">انتهت المباراة!</p>
              {gameState.winnerId && (
                <p className="bara-outcome-card__body">
                  الفائز:{' '}
                  <strong>{displayName(lobby, gameState.winnerId)}</strong>
                </p>
              )}
              <p className="bara-outcome-card__hint">
                الكلمة كانت: {gameState.revealedSecretWord}
              </p>
            </div>
          )}
        </section>

        <section className="bara-board__seats" aria-label="اللاعبون">
          {isReveal && (
            <h2 className="bara-board__seats-label">حالة الكشف</h2>
          )}
          <PlayerGrid
            gameState={gameState}
            players={lobby.players}
            playerId={playerId}
            votingActive={votingActive}
            spotlightId={spotlightId}
            compact={isReveal}
            onVote={(id) => void onVote(id)}
          />
        </section>
      </div>

      <footer className="bara-board__scores">
        {Object.entries(gameState.scores).map(([id, score]) => (
          <span
            key={id}
            className={clsx(
              'bara-score-chip',
              id === playerId && 'bara-score-chip--me'
            )}
          >
            <span className="bara-score-chip__name">{displayName(lobby, id)}</span>
            <span className="bara-score-chip__pts">{score}</span>
          </span>
        ))}
      </footer>
    </div>
  );
}

function RoundOutcomePanel({
  gameState,
  lobby,
}: {
  gameState: BaraGameState;
  lobby: LobbyState;
}) {
  const outcome = gameState.roundOutcome!;
  const name = (id: string) =>
    lobby.players.find((p) => p.id === id)?.displayName ?? 'لاعب';

  if (outcome.type === 'wrong_accusation') {
    return (
      <div className="bara-outcome-card bara-outcome-card--danger animate-bara-shake">
        <p className="bara-outcome-card__title">وقع الاختيار على شخص خطأ!</p>
        <p className="bara-outcome-card__body">
          {outcome.eliminatedId && name(outcome.eliminatedId)} كان من الداخلين
        </p>
        <p className="bara-outcome-card__hint">
          نقاط لـ {gameState.outcastId && name(gameState.outcastId)} (برا السالفة)
        </p>
        {gameState.revealedSecretWord && (
          <p className="bara-outcome-card__word">الكلمة: {gameState.revealedSecretWord}</p>
        )}
      </div>
    );
  }

  if (outcome.type === 'outcast_stole_win') {
    return (
      <div className="bara-outcome-card bara-outcome-card--gold animate-bara-explosion">
        <p className="bara-outcome-card__title">سرق برا السالفة الفوز!</p>
        <p className="bara-outcome-card__hint">التخمين: {outcome.guess}</p>
      </div>
    );
  }

  if (outcome.type === 'insiders_win') {
    return (
      <div className="bara-outcome-card bara-outcome-card--success">
        <p className="bara-outcome-card__title">فوز الداخلين!</p>
        <p className="bara-outcome-card__hint">
          الكلمة: {outcome.secretWord ?? gameState.revealedSecretWord}
        </p>
      </div>
    );
  }

  return null;
}
