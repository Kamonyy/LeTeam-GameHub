'use client';

import clsx from 'clsx';
import DominoTile from './DominoTile';
import type { Tile } from '../types';

interface DropZoneProps {
  end: 'left' | 'right';
  active: boolean;
  valid: boolean;
  previewTile?: Tile | null;
  onClick: () => void;
  vertical?: boolean;
}

export default function DropZone({
  end,
  active,
  valid,
  previewTile,
  onClick,
  vertical = true,
}: DropZoneProps) {
  if (!active || !valid) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Play on ${end} end`}
      className={clsx(
        'shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed',
        'transition-all duration-300 animate-drop-glow',
        'border-emerald-400/70 bg-emerald-500/10 hover:bg-emerald-500/20',
        vertical ? 'w-10 h-20 mx-1' : 'w-28 h-16'
      )}
    >
      {previewTile ? (
        <DominoTile
          left={previewTile.left}
          right={previewTile.right}
          horizontal={previewTile.left !== previewTile.right}
          compact
          connectEnd={end}
          className="scale-90 opacity-90"
        />
      ) : (
        <span className="text-[10px] font-bold text-emerald-300/80 uppercase">
          {end}
        </span>
      )}
    </button>
  );
}
