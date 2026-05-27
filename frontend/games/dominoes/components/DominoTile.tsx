'use client';

import clsx from 'clsx';

interface DominoTileProps {
  left: number;
  right: number;
  horizontal?: boolean;
  playable?: boolean;
  selected?: boolean;
  compact?: boolean;
  placed?: boolean;
  onClick?: () => void;
  connectEnd?: 'left' | 'right' | null;
  className?: string;
}

function Pip({ value }: { value: number }) {
  const positions: Record<number, number[][]> = {
    0: [],
    1: [[1, 1]],
    2: [
      [0, 0],
      [2, 2],
    ],
    3: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    4: [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ],
    5: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
    ],
    6: [
      [0, 0],
      [0, 1],
      [0, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
  };

  const dots = positions[value] || [];

  return (
    <div className="relative w-full h-full">
      {dots.map(([row, col], i) => (
        <span
          key={i}
          className="domino-pip absolute rounded-full"
          style={{
            top: `${row * 33 + 16}%`,
            left: `${col * 33 + 16}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

function Half({ value }: { value: number }) {
  return (
    <div className="domino-face flex-1 flex items-center justify-center min-w-0 relative overflow-hidden">
      <div className="w-[88%] h-[88%] aspect-square relative z-[1]">
        <Pip value={value} />
      </div>
    </div>
  );
}

export default function DominoTile({
  left,
  right,
  horizontal = false,
  playable = false,
  selected = false,
  compact = false,
  placed = false,
  onClick,
  connectEnd = null,
  className,
}: DominoTileProps) {
  const isDouble = left === right;
  const boardHorizontal = horizontal && !isDouble;
  const boardVertical = isDouble && compact;

  const size = compact
    ? boardVertical
      ? 'w-8 h-16'
      : boardHorizontal
        ? 'w-14 h-7'
        : 'w-7 h-14'
    : horizontal
      ? 'w-20 h-10'
      : 'w-11 h-[5.5rem]';

  const layoutHorizontal = compact ? boardHorizontal : horizontal;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'domino-tile relative flex rounded-md transition-all duration-300 ease-out',
        size,
        layoutHorizontal ? 'flex-row' : 'flex-col',
        placed && 'domino-placed animate-tile-snap',
        playable && 'domino-playable cursor-pointer',
        selected && 'domino-selected',
        onClick && !playable && 'cursor-pointer domino-hover',
        !onClick && 'cursor-default',
        connectEnd && 'ring-2 ring-emerald-400/70',
        className
      )}
    >
      <div className="domino-body absolute inset-0 rounded-md" />
      <Half value={left} />
      <div
        className={clsx(
          'domino-spine shrink-0 relative z-[2]',
          layoutHorizontal ? 'w-[2px] h-full' : 'h-[2px] w-full'
        )}
      >
        <div className="domino-rivet absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <Half value={right} />
    </button>
  );
}
