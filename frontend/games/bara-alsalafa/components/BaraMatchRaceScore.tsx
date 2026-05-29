'use client';

import clsx from 'clsx';

type BaraMatchRaceScoreProps = {
  roundNumber: number;
  totalRounds: number;
  insiderRoundWins: number;
  outcastRoundWins: number;
  phase?: string;
  className?: string;
};

function RoundPips({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <span className="bara-round-pips" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx('bara-round-pip', i < current && 'bara-round-pip--done')}
        />
      ))}
    </span>
  );
}

/** Fixed-length match: play `totalRounds` rounds, then winner by round tally. */
export default function BaraMatchRaceScore({
  roundNumber,
  totalRounds,
  insiderRoundWins,
  outcastRoundWins,
  phase,
  className,
}: BaraMatchRaceScoreProps) {
  const roundsDone =
    phase === 'round_end' || phase === 'match_over' ?
      Math.min(roundNumber, totalRounds)
    : Math.max(0, Math.min(roundNumber - 1, totalRounds));

  return (
    <div
      className={clsx('bara-match-race', className)}
      role="group"
      aria-label={`المباراة ${totalRounds} جولات — الجولة ${roundNumber} من ${totalRounds}`}
    >
      <div className="bara-match-race__head">
        <p className="bara-match-race__goal tabular-nums">
          المباراة: <strong>{totalRounds}</strong> جولات
        </p>
        <p className="bara-match-race__round tabular-nums">
          الجولة <strong>{roundNumber}</strong> من {totalRounds}
        </p>
      </div>
      <RoundPips current={roundsDone} total={totalRounds} />
      <p className="bara-match-race__goal-hint">
        تنتهي المباراة بعد إكمال {totalRounds} جولات — الأكثر انتصاراتاً يفوز
      </p>
      <div className="bara-match-race__teams">
        <div className="bara-match-race__row bara-match-race__row--in">
          <span className="bara-match-race__label">انتصارات الداخلون</span>
          <span className="bara-match-race__count tabular-nums">
            {insiderRoundWins}
          </span>
        </div>
        <div className="bara-match-race__row bara-match-race__row--out">
          <span className="bara-match-race__label">انتصارات برا السالفة</span>
          <span className="bara-match-race__count tabular-nums">
            {outcastRoundWins}
          </span>
        </div>
      </div>
    </div>
  );
}
