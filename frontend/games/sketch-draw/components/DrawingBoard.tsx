'use client';

import clsx from 'clsx';
import type { SketchStrokeBatch, StrokeBatchPayload } from '../types';
import { useFabricBoard } from '../hooks/useFabricBoard';

type DrawingBoardProps = {
  isDrawer: boolean;
  canDraw: boolean;
  canvasBuffer: SketchStrokeBatch[];
  canvasBufferVersion: number;
  tool: string;
  color: string;
  size: number;
  onStrokeBatch: (batch: StrokeBatchPayload) => void;
  onFill?: (seedX: number, seedY: number, color: string) => void;
  canvasApiRef?: React.MutableRefObject<DrawingBoardApi | null>;
  remoteBatch?: SketchStrokeBatch | null;
  syncBuffer?: SketchStrokeBatch[] | null;
  syncVersion?: number;
};

export type DrawingBoardApi = {
  localClear: () => void;
};

export default function DrawingBoard({
  isDrawer,
  canDraw,
  canvasBuffer,
  canvasBufferVersion,
  tool,
  color,
  size,
  onStrokeBatch,
  onFill,
  canvasApiRef,
  remoteBatch,
  syncBuffer,
  syncVersion,
}: DrawingBoardProps) {
  const board = useFabricBoard({
    isDrawer,
    canDraw,
    tool,
    color,
    size,
    canvasBuffer,
    canvasBufferVersion,
    onStrokeBatch,
    onFill,
    remoteBatch,
    syncBuffer,
    syncVersion,
  });

  if (canvasApiRef) {
    canvasApiRef.current = {
      localClear: board.localClear,
    };
  }

  return (
    <div
      className={clsx(
        'sketch-canvas-frame w-full flex-1 min-h-0 relative',
        'h-[65dvh] max-h-[70dvh] lg:h-auto lg:flex-1 lg:max-h-none',
        'rounded-lg overflow-hidden sketch-paper'
      )}
    >
      <div
        ref={board.containerRef}
        className="sketch-fabric-host absolute inset-0 w-full h-full"
      >
        <canvas
          ref={board.canvasElRef}
          className={clsx(
            'block w-full h-full touch-none',
            !(isDrawer && canDraw) && 'pointer-events-none'
          )}
          aria-label={isDrawer ? 'Drawing canvas' : 'Drawing preview'}
        />
      </div>
    </div>
  );
}
