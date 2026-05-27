'use client';

import clsx from 'clsx';

const PIP_LAYOUT: Record<number, [number, number][]> = {
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

function Half({ value }: { value: number }) {
  const dots = PIP_LAYOUT[value] ?? [];
  return (
    <div className="hub-domino-half">
      <div className="hub-domino-pips">
        {dots.map(([row, col], i) => (
          <span
            key={i}
            className="hub-domino-pip"
            style={{
              top: `${row * 33 + 16}%`,
              left: `${col * 33 + 16}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface HubDominoTileProps {
  top: number;
  bottom: number;
  className?: string;
}

/** Mini ivory domino with pip values for the hub card hover effect */
export default function HubDominoTile({ top, bottom, className }: HubDominoTileProps) {
  return (
    <div className={clsx('hub-domino-tile', className)} aria-hidden>
      <Half value={top} />
      <div className="hub-domino-divider" />
      <Half value={bottom} />
    </div>
  );
}
