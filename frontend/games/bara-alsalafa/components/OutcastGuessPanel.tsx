'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { BaraGameState } from '@/games/bara-alsalafa/types';

interface OutcastGuessPanelProps {
  gameState: BaraGameState;
  onGuess: (guess: string) => Promise<boolean>;
}

export default function OutcastGuessPanel({
  gameState,
  onGuess,
}: OutcastGuessPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const choices = gameState.outcastGuessChoices;

  const submitGuess = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await onGuess(trimmed);
    setSubmitting(false);
  };

  return (
    <div className="bara-guess-panel bara-outcast-guess" dir="rtl">
      <h3 className="bara-guess-panel__title">
        اختر الكلمة الصحيحة من بين الخيارات
      </h3>

      <p className="bara-outcast-guess__hint">
        كل الخيارات من نفس فئة الجولة — اختر بحذر
      </p>

      <div
        className="bara-outcast-guess__choices"
        role="listbox"
        aria-label="خيارات التخمين"
      >
        {choices.map((word) => (
          <button
            key={word}
            type="button"
            disabled={submitting}
            onClick={() => void submitGuess(word)}
            className={clsx(
              'bara-outcast-guess__choice',
              submitting && 'bara-outcast-guess__choice--busy'
            )}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
