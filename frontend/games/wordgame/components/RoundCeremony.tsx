'use client';

interface RoundCeremonyProps {
  roundNumber: number;
}

export default function RoundCeremony({ roundNumber }: RoundCeremonyProps) {
  return (
    <div className="sw-round sw-round--live" role="status">
      <span className="sw-round__line" aria-hidden />
      <span className="sw-round__rune" aria-hidden />
      <p className="sw-round__label">
        Round <span className="sw-round__number">{roundNumber}</span>
      </p>
      <span className="sw-round__rune" aria-hidden />
      <span className="sw-round__line" aria-hidden />
    </div>
  );
}
