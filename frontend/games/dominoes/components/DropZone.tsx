'use client';

import clsx from 'clsx';
import type { DragEvent, CSSProperties } from 'react';

interface DropZoneProps {
  end: 'left' | 'right';
  active: boolean;
  valid: boolean;
  dragOver?: boolean;
  onClick: () => void;
  onDragOver?: (e: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent) => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  vertical?: boolean;
  large?: boolean;
  floating?: boolean;
  style?: CSSProperties;
}

export default function DropZone({
  end,
  active,
  valid,
  dragOver = false,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onHover,
  onHoverEnd,
  vertical = true,
  large = false,
  floating = false,
  style,
}: DropZoneProps) {
  if (!active || !valid) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onFocus={onHover}
      onBlur={onHoverEnd}
      aria-label={`Play on ${end} end`}
      style={style}
      className={clsx(
        'flex items-center justify-center rounded-xl border-2 border-dashed z-30',
        'transition-all duration-300',
        floating ? 'absolute w-11 h-11 -translate-x-1/2 -translate-y-1/2' : 'shrink-0',
        dragOver
          ? 'animate-drop-pulse border-emerald-300 bg-emerald-500/30 scale-110 shadow-lg shadow-emerald-500/25'
          : 'animate-drop-glow border-emerald-400/70 bg-emerald-500/10 hover:bg-emerald-500/20',
        !floating &&
          (large
            ? vertical
              ? 'w-14 h-28 mx-1.5'
              : 'w-36 h-20'
            : vertical
              ? 'w-11 h-[5.5rem] mx-1'
              : 'w-32 h-[4.5rem]')
      )}
    >
      <span className="text-[10px] font-bold text-emerald-200/90 uppercase tracking-wider">
        {end === 'left' ? '◀' : '▶'}
      </span>
    </button>
  );
}
