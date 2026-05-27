'use client';

import { useEffect, useRef } from 'react';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';

interface RoundCeremonyProps {
  roundNumber: number;
}

export default function RoundCeremony({ roundNumber }: RoundCeremonyProps) {
  const audio = useWordGameAudioOptional();
  const prevRound = useRef(roundNumber);

  useEffect(() => {
    if (roundNumber <= 0 || roundNumber === prevRound.current) return;
    prevRound.current = roundNumber;
    audio?.playSfx('pickIntro', 0.5);
  }, [roundNumber, audio]);

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
