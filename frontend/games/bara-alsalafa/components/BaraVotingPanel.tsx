'use client';

import { Target } from 'lucide-react';
import clsx from 'clsx';
import type { BaraGameState } from '@/games/bara-alsalafa/types';

interface BaraVotingPanelProps {
  gameState: BaraGameState;
  playerId: string;
  canVote: boolean;
  tiedDisplayNames?: string;
}

export default function BaraVotingPanel({
  gameState,
  playerId,
  canVote,
  tiedDisplayNames = '',
}: BaraVotingPanelProps) {
  const isRevote = gameState.phase === 'revote';
  const { votesCast, votesExpected } = gameState;
  const myCard = gameState.playerCards.find((c) => c.id === playerId);
  const iVoted = myCard?.microStatus === 'voted';
  const progress =
    votesExpected > 0 ? Math.min(100, (votesCast / votesExpected) * 100) : 0;

  return (
    <div className="bara-voting-stage" role="status" aria-live="polite">
      <div className="bara-voting-stage__badge" aria-hidden>
        <Target className="bara-voting-stage__icon" strokeWidth={2} />
      </div>

      <h3 className="bara-voting-stage__title">
        {isRevote ? 'إعادة التصويت' : 'صوّت سراً على المشتبه به'}
      </h3>

      <p className="bara-voting-stage__hint">
        {isRevote && tiedDisplayNames ?
          `المتعادلون: ${tiedDisplayNames} — اختر من يُستبعد`
        : canVote ?
          'اضغط على بطاقة لاعب أدناه لإرسال صوتك'
        : iVoted ?
          'تم تسجيل صوتك — بانتظار بقية اللاعبين'
        :	'بانتظار بقية اللاعبين…'}
      </p>

      <div className="bara-voting-stage__progress-wrap">
        <div className="bara-voting-stage__progress-meta">
          <span>تقدّم التصويت</span>
          <span className="tabular-nums">
            {votesCast} / {votesExpected}
          </span>
        </div>
        <div
          className="bara-voting-stage__progress-track"
          role="progressbar"
          aria-valuenow={votesCast}
          aria-valuemin={0}
          aria-valuemax={votesExpected}
          aria-label="أصوات مُسجّلة"
        >
          <div
            className={clsx(
              'bara-voting-stage__progress-fill',
              progress >= 100 && 'bara-voting-stage__progress-fill--done'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
