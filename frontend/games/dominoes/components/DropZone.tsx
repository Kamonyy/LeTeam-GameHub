'use client';

import clsx from 'clsx';
import DominoTile from './DominoTile';
import type { Tile } from '../types';
import type { DragEvent } from 'react';

interface DropZoneProps {
  end: 'left' | 'right';
  active: boolean;
  valid: boolean;
  previewTile?: Tile | null;
  dragOver?: boolean;
  onClick: () => void;
  onDragOver?: (e: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent) => void;
  vertical?: boolean;
  large?: boolean;
}

export default function DropZone({
  end,
  active,
  valid,
  previewTile,
  dragOver = false,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  vertical = true,
  large = false,
}: DropZoneProps) {
  if (!active || !valid) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label={`Play on ${end} end`}
      className={clsx(
        'shrink-0 flex items-center justify-center rounded-xl border-2 border-dashed',
        'transition-all duration-300',
        dragOver
          ? 'animate-drop-pulse border-emerald-300 bg-emerald-500/25 scale-105 shadow-lg shadow-emerald-500/20'
          : 'animate-drop-glow border-emerald-400/70 bg-emerald-500/10 hover:bg-emerald-500/20',
        large
          ? vertical
            ? 'w-14 h-28 mx-1.5'
            : 'w-36 h-20'
          : vertical
            ? 'w-11 h-[5.5rem] mx-1'
            : 'w-32 h-[4.5rem]'
      )}
    >
      {previewTile ? (
        <DominoTile
          left={previewTile.left}
          right={previewTile.right}
          horizontal={previewTile.left !== previewTile.right}
          compact
          connectEnd={end}
          className="scale-95 opacity-95 pointer-events-none"
        />
      ) : (
        <span className="text-[11px] font-bold text-emerald-200/90 uppercase tracking-wider">
          {end}
        </span>
      )}
    </button>
  );
}
