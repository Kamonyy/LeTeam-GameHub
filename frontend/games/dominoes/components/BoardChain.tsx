'use client';

import clsx from 'clsx';
import type { DragEvent, CSSProperties } from 'react';
import type { BoardTile, Tile } from '../types';
import {
  computeChainLayout,
  computeGhostPreview,
  TABLE_PADDING,
  type ChainSide,
} from '../lib/chainLayout';
import DominoTile from './DominoTile';
import DropZone from './DropZone';

interface BoardChainProps {
  board: BoardTile[];
  openEnds: { left: number; right: number } | null;
  showDropZones: boolean;
  canPlayEnd: (end: ChainSide) => boolean;
  activeTile: Tile | null;
  dragOverEnd: ChainSide | null;
  ghostEnd: ChainSide | null;
  recentlyPlaced: number | null;
  onEndClick: (end: ChainSide) => void;
  onDragOverEnd: (end: ChainSide) => (e: DragEvent) => void;
  onDragLeave: () => void;
  onDropOnEnd: (end: ChainSide) => (e: DragEvent) => void;
  onZoneHover: (end: ChainSide | null) => void;
}

function anchorStyle(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number
): CSSProperties {
  return {
    left: `calc(50% + ${x + offsetX}px)`,
    top: `calc(50% + ${y + offsetY}px)`,
  };
}

export default function BoardChain({
  board,
  openEnds,
  showDropZones,
  canPlayEnd,
  activeTile,
  dragOverEnd,
  ghostEnd,
  recentlyPlaced,
  onEndClick,
  onDragOverEnd,
  onDragLeave,
  onDropOnEnd,
  onZoneHover,
}: BoardChainProps) {
  const layout = computeChainLayout(board);

  const previewEnd = ghostEnd ?? dragOverEnd;

  const ghostLeft =
    activeTile && previewEnd === 'left' && openEnds
      ? computeGhostPreview(board, activeTile, 'left', openEnds)
      : null;
  const ghostRight =
    activeTile && previewEnd === 'right' && openEnds
      ? computeGhostPreview(board, activeTile, 'right', openEnds)
      : null;

  const leftAnchor = {
    x: layout.leftEnd.x + layout.offsetX,
    y: layout.leftEnd.y + layout.offsetY,
  };
  const rightAnchor = {
    x: layout.rightEnd.x + layout.offsetX,
    y: layout.rightEnd.y + layout.offsetY,
  };

  return (
    <div
      className="domino-chain-viewport absolute z-10 flex items-center justify-center overflow-hidden"
      style={{
        inset: TABLE_PADDING,
      }}
    >
      <div
        className="domino-chain-canvas relative w-full h-full transition-transform duration-500 ease-out"
        style={{
          transform: `scale(${layout.scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div className="absolute inset-0">
          {layout.tiles.map((t) => (
            <div
              key={`${t.displayLeft}-${t.displayRight}-${t.index}`}
              className="absolute"
              style={{
                ...anchorStyle(t.x, t.y, layout.offsetX, layout.offsetY),
                transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
                zIndex: recentlyPlaced === t.index ? 20 : 10 + t.index,
              }}
            >
              <DominoTile
                left={t.displayLeft}
                right={t.displayRight}
                compact
                placed
                className={clsx(
                  recentlyPlaced === t.index && 'animate-tile-snap-magnetic'
                )}
              />
            </div>
          ))}

          {ghostLeft && (
            <div
              className="absolute pointer-events-none animate-ghost-fade-in"
              style={{
                ...anchorStyle(ghostLeft.x, ghostLeft.y, 0, 0),
                transform: `translate(-50%, -50%) rotate(${ghostLeft.rotation}deg)`,
                zIndex: 25,
              }}
            >
              <DominoTile
                left={ghostLeft.displayLeft}
                right={ghostLeft.displayRight}
                compact
                placed
                ghost
              />
            </div>
          )}

          {ghostRight && (
            <div
              className="absolute pointer-events-none animate-ghost-fade-in"
              style={{
                ...anchorStyle(ghostRight.x, ghostRight.y, 0, 0),
                transform: `translate(-50%, -50%) rotate(${ghostRight.rotation}deg)`,
                zIndex: 25,
              }}
            >
              <DominoTile
                left={ghostRight.displayLeft}
                right={ghostRight.displayRight}
                compact
                placed
                ghost
              />
            </div>
          )}

          <DropZone
            end="left"
            active={showDropZones}
            valid={canPlayEnd('left')}
            dragOver={dragOverEnd === 'left'}
            onClick={() => onEndClick('left')}
            onDragOver={onDragOverEnd('left')}
            onDragLeave={onDragLeave}
            onDrop={onDropOnEnd('left')}
            onHover={() => onZoneHover('left')}
            onHoverEnd={() => onZoneHover(null)}
            floating
            style={anchorStyle(leftAnchor.x, leftAnchor.y, 0, 0)}
          />

          <DropZone
            end="right"
            active={showDropZones}
            valid={canPlayEnd('right')}
            dragOver={dragOverEnd === 'right'}
            onClick={() => onEndClick('right')}
            onDragOver={onDragOverEnd('right')}
            onDragLeave={onDragLeave}
            onDrop={onDropOnEnd('right')}
            onHover={() => onZoneHover('right')}
            onHoverEnd={() => onZoneHover(null)}
            floating
            style={anchorStyle(rightAnchor.x, rightAnchor.y, 0, 0)}
          />
        </div>
      </div>
    </div>
  );
}
