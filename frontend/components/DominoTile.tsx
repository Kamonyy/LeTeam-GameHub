'use client';

import clsx from 'clsx';

interface DominoTileProps {
  left: number;
  right: number;
  /** Horizontal layout on the board */
  horizontal?: boolean;
  /** Highlight as playable */
  playable?: boolean;
  /** Selected state in hand */
  selected?: boolean;
  /** Smaller tile for board display */
  compact?: boolean;
  onClick?: () => void;
  /** Which end this tile would connect to (for preview) */
  connectEnd?: 'left' | 'right' | null;
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
    <div className="relative w-full h-full grid grid-cols-3 grid-rows-3 p-0.5">
      {dots.map(([row, col], i) => (
        <span
          key={i}
          className="absolute w-[22%] h-[22%] rounded-full bg-gray-800"
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
    <div className="flex-1 flex items-center justify-center bg-[#f5f0e8] rounded-sm min-w-0">
      <div className="w-full h-full max-w-[90%] max-h-[90%] aspect-square">
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
  onClick,
  connectEnd = null,
}: DominoTileProps) {
  const isDouble = left === right;
  const size = compact
    ? horizontal
      ? 'w-14 h-7'
      : 'w-7 h-14'
    : horizontal
      ? 'w-20 h-10'
      : 'w-10 h-20';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'relative flex bg-[#e8e0d4] rounded-md border-2 shadow-md transition-all duration-200',
        size,
        horizontal ? 'flex-row' : 'flex-col',
        isDouble && 'border-hub-accent/40',
        playable && 'ring-2 ring-hub-success/60 hover:scale-105 cursor-pointer',
        selected && 'ring-2 ring-hub-accent scale-105 -translate-y-1 shadow-lg',
        onClick && !playable && 'hover:scale-102 cursor-pointer hover:-translate-y-0.5',
        !onClick && 'cursor-default',
        connectEnd === 'left' && 'ring-2 ring-hub-accent/50',
        connectEnd === 'right' && 'ring-2 ring-hub-accent/50'
      )}
    >
      <Half value={left} />
      <div
        className={clsx(
          'bg-gray-400 shrink-0',
          horizontal ? 'w-px h-full' : 'h-px w-full'
        )}
      />
      <Half value={right} />
    </button>
  );
}
