'use client';

import clsx from 'clsx';

type WordChoiceOverlayProps = {
  words: string[];
  secondsLeft: number;
  onSelect: (index: number) => void;
};

export default function WordChoiceOverlay({
  words,
  secondsLeft,
  onSelect,
}: WordChoiceOverlayProps) {
  return (
    <div className="sketch-word-overlay">
      <p className="text-sm text-hub-muted mb-2 text-center">
        Choose a word to draw · {Math.ceil(secondsLeft)}s
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {words.map((word, i) => (
          <button
            key={`${word}-${i}`}
            type="button"
            className={clsx('sketch-word-btn')}
            onClick={() => onSelect(i)}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
