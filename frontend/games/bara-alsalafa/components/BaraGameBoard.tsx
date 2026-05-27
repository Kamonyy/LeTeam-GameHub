'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { FastForward, Target } from 'lucide-react';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import type { LobbyState } from '@/lib/hub/types';
import PlayerGrid from './PlayerGrid';
import RevealCard from './RevealCard';
import CountdownRing from './CountdownRing';
import CheatSheetDrawer from './CheatSheetDrawer';

const INTERROGATION_MS = 45_000;
const DEFEND_MS = 30_000;

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

export default function BaraGameBoard({
  gameState,
  lobby,
  playerId,
  isHost,
  onReveal,
  onAdvanceInterrogation,
  onVote,
  onGuess,
}: BaraGameBoardProps) {
  const [revealing, setRevealing] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [submittingGuess, setSubmittingGuess] = useState(false);

  const phase = gameState.phase;
  const isEmerald =
    phase === 'reveal' || phase === 'interrogation' || phase === 'defend';
  const isCrimson =
    phase === 'voting' ||
    phase === 'revote' ||
    phase === 'outcast_guess' ||
    (phase === 'round_end' && gameState.roundOutcome?.type === 'wrong_accusation');

  const votingActive = phase === 'voting' || phase === 'revote';
  const spotlightId =
    phase === 'outcast_guess' || phase === 'round_end' ?
      gameState.eliminatedThisRound ?? gameState.outcastId
    :	null;

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

  return (
    <div
      className={clsx(
        'bara-board min-h-[calc(100vh-5rem)] rounded-2xl border transition-colors duration-500 p-4 md:p-8',
        isEmerald && 'bara-board--emerald',
        isCrimson && 'bara-board--crimson',
        phase === 'round_end' &&
          gameState.roundOutcome?.type === 'outcast_stole_win' &&
          'animate-bara-shake'
      )}
      dir="rtl"
    >
      {(phase === 'interrogation' || phase === 'defend') && (
        <CheatSheetDrawer
          categoryName={gameState.categoryName}
          words={gameState.cheatSheetWords}
        />
      )}

      <header className="text-center mb-6 space-y-2">
        <p className="text-xs uppercase tracking-widest text-hub-muted">
          الجولة {gameState.roundNumber} · فئة الجولة: {gameState.categoryName}
        </p>
        {gameState.selectedCategoryCount > 1 && (
          <p className="text-[11px] text-hub-muted max-w-lg mx-auto">
            الفئات المفعّلة ({gameState.selectedCategoryCount}): {gameState.categoryNamesSummary}
          </p>
        )}
        {phase === 'interrogation' && gameState.currentInterviewerId && (
          <div className="bara-interrogation-banner animate-fade-in">
            <span>
              {displayName(lobby, gameState.currentInterviewerId)} يسأل{' '}
              {displayName(lobby, gameState.currentTargetId ?? '')}
            </span>
          </div>
        )}
        {phase === 'defend' && (
          <div className="bara-defend-banner animate-fade-in">
            دفاع سريع! أعيدوا التصويت بين المتعادلين (
            {gameState.tiedPlayerIds.map((id) => displayName(lobby, id)).join(' · ')})
          </div>
        )}
        {votingActive && (
          <div className="bara-voting-banner flex flex-col items-center gap-2">
            <Target className="w-6 h-6 text-hub-danger animate-pulse" />
            <span>صوّت سراً — اختر من تشتبه به</span>
            <span className="text-sm text-hub-muted tabular-nums">
              {gameState.votesCast}/{gameState.votesExpected} أصوات مُقفلة
            </span>
          </div>
        )}
      </header>

      <div className="bara-board-layout grid gap-8 lg:grid-cols-[1fr_minmax(280px,360px)_1fr] items-start">
        <div className="lg:col-span-3">
          <PlayerGrid
            gameState={gameState}
            players={lobby.players}
            playerId={playerId}
            votingActive={votingActive}
            spotlightId={spotlightId}
            onVote={(id) => void onVote(id)}
          />
        </div>

        <div className="lg:col-start-2 flex flex-col items-center gap-6">
          {phase === 'reveal' && (
            <RevealCard
              gameState={gameState}
              onReveal={() => void handleReveal()}
              revealing={revealing}
            />
          )}

          {phase === 'interrogation' && (
            <div className="flex flex-col items-center gap-4">
              <CountdownRing
                phaseEndsAt={gameState.phaseEndsAt}
                totalMs={INTERROGATION_MS}
                label="ثوانٍ للسؤال"
              />
              {isHost && (
                <button
                  type="button"
                  onClick={() => void onAdvanceInterrogation()}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <FastForward className="w-4 h-4" />
                  تخطي للسؤال التالي
                </button>
              )}
            </div>
          )}

          {phase === 'defend' && (
            <CountdownRing
              phaseEndsAt={gameState.phaseEndsAt}
              totalMs={DEFEND_MS}
              label="وقت الدفاع"
            />
          )}

          {phase === 'outcast_guess' && gameState.canGuess && (
            <div className="card w-full max-w-md border-amber-500/40 bg-amber-950/30 animate-overlay-pop">
              <h3 className="text-lg font-bold text-amber-200 mb-2">
                لقد كشفوك! خمن الكلمة السرية لتسرق الفوز
              </h3>
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                className="input-field normal-case tracking-normal mb-4"
                placeholder="اكتب تخمينك"
                dir="rtl"
                autoFocus
              />
              <button
                type="button"
                onClick={() => void handleGuess()}
                disabled={submittingGuess || !guessInput.trim()}
                className="btn-primary w-full"
              >
                {submittingGuess ? 'جاري الإرسال…' : 'أرسل التخمين'}
              </button>
            </div>
          )}

          {phase === 'round_end' && gameState.roundOutcome && (
            <RoundOutcomePanel
              gameState={gameState}
              lobby={lobby}
            />
          )}

          {phase === 'match_over' && (
            <div className="card text-center animate-overlay-pop max-w-md">
              <p className="text-2xl font-bold text-hub-success mb-2">انتهت المباراة!</p>
              {gameState.winnerId && (
                <p className="text-lg">
                  الفائز:{' '}
                  <span className="text-white font-semibold">
                    {displayName(lobby, gameState.winnerId)}
                  </span>
                </p>
              )}
              <p className="text-sm text-hub-muted mt-4">
                الكلمة كانت: {gameState.revealedSecretWord}
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        {Object.entries(gameState.scores).map(([id, score]) => (
          <span
            key={id}
            className={clsx(
              'px-3 py-1 rounded-full border',
              id === playerId ?
                'border-hub-accent/50 bg-hub-accent/10'
              :	'border-hub-border bg-hub-surface/50'
            )}
          >
            {displayName(lobby, id)}: {score}
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
      <div className="card max-w-md border-hub-danger/50 bg-red-950/40 text-center animate-bara-shake">
        <p className="text-xl font-black text-hub-danger mb-2">
          وقع الاختيار على شخص خطأ!
        </p>
        <p className="text-sm text-hub-muted">
          {outcome.eliminatedId && name(outcome.eliminatedId)} كان من الداخلين
        </p>
        <p className="mt-3 text-hub-success">
          نقاط إضافية لـ {gameState.outcastId && name(gameState.outcastId)} (برا السالفة)
        </p>
        {gameState.revealedSecretWord && (
          <p className="mt-2 text-white font-semibold">
            الكلمة: {gameState.revealedSecretWord}
          </p>
        )}
      </div>
    );
  }

  if (outcome.type === 'outcast_stole_win') {
    return (
      <div className="card max-w-md border-amber-400/60 bg-amber-950/50 text-center animate-bara-explosion">
        <p className="text-2xl font-black text-amber-300">سرق برا السالفة الفوز!</p>
        <p className="text-sm mt-2">التخمين: {outcome.guess}</p>
      </div>
    );
  }

  if (outcome.type === 'insiders_win') {
    return (
      <div className="card max-w-md border-emerald-500/40 bg-emerald-950/40 text-center">
        <p className="text-2xl font-bold text-emerald-300">فوز الداخلين!</p>
        <p className="text-sm text-hub-muted mt-2">
          الكلمة الصحيحة: {outcome.secretWord ?? gameState.revealedSecretWord}
        </p>
      </div>
    );
  }

  return null;
}
