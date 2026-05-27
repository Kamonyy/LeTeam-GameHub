import type { BoardTile, Tile } from '../types';

export type LayoutDirection = 'east' | 'west' | 'north' | 'south';
export type ChainSide = 'left' | 'right';

/** Compact board tile dimensions (px) — matches Tailwind compact sizes */
export const H_TILE_W = 68;
export const H_TILE_H = 34;
export const D_TILE_W = 36;
export const D_TILE_H = 72;
export const TABLE_INNER = 500;
export const TABLE_PADDING = 40;

export interface PlacedTileLayout {
  index: number;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  displayLeft: number;
  displayRight: number;
  isDouble: boolean;
  side: ChainSide | 'center';
}

export interface ChainEndAnchor {
  x: number;
  y: number;
  rotation: number;
  direction: LayoutDirection;
}

export interface ChainLayoutResult {
  tiles: PlacedTileLayout[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  scale: number;
  offsetX: number;
  offsetY: number;
  leftEnd: ChainEndAnchor;
  rightEnd: ChainEndAnchor;
}

export interface GhostPreview {
  x: number;
  y: number;
  rotation: number;
  displayLeft: number;
  displayRight: number;
  isDouble: boolean;
}

const TURN_ORDER: Record<LayoutDirection, LayoutDirection[]> = {
  east: ['south', 'north'],
  west: ['south', 'north'],
  north: ['west', 'east'],
  south: ['west', 'east'],
};

function oppositeDir(d: LayoutDirection): LayoutDirection {
  return ({ east: 'west', west: 'east', north: 'south', south: 'north' } as const)[d];
}

function rotateDir(d: LayoutDirection, turn: 'cw' | 'ccw'): LayoutDirection {
  const cw: Record<LayoutDirection, LayoutDirection> = {
    east: 'south',
    south: 'west',
    west: 'north',
    north: 'east',
  };
  return turn === 'cw' ? cw[d] : oppositeDir(cw[d]);
}

function isHorizontal(d: LayoutDirection) {
  return d === 'east' || d === 'west';
}

function tileRotation(dir: LayoutDirection, isDouble: boolean): number {
  if (isDouble) {
    return isHorizontal(dir) ? 0 : 90;
  }
  const map: Record<LayoutDirection, number> = {
    east: 0,
    south: 90,
    west: 180,
    north: 270,
  };
  return map[dir];
}

function tileSize(isDouble: boolean, dir: LayoutDirection): { w: number; h: number } {
  if (isDouble) {
    return isHorizontal(dir)
      ? { w: D_TILE_W, h: D_TILE_H }
      : { w: H_TILE_W, h: H_TILE_H };
  }
  return isHorizontal(dir)
    ? { w: H_TILE_W, h: H_TILE_H }
    : { w: H_TILE_H, h: H_TILE_W };
}

function halfExtent(isDouble: boolean, dir: LayoutDirection): number {
  const { w, h } = tileSize(isDouble, dir);
  return isHorizontal(dir) ? w / 2 : h / 2;
}

function step(cx: number, cy: number, dir: LayoutDirection, dist: number) {
  switch (dir) {
    case 'east':
      return { x: cx + dist, y: cy };
    case 'west':
      return { x: cx - dist, y: cy };
    case 'north':
      return { x: cx, y: cy - dist };
    case 'south':
      return { x: cx, y: cy + dist };
  }
}

function fitsBounds(
  cx: number,
  cy: number,
  isDouble: boolean,
  dir: LayoutDirection,
  halfTable: number
): boolean {
  const { w, h } = tileSize(isDouble, dir);
  const limit = halfTable - 4;
  return (
    cx - w / 2 >= -limit &&
    cx + w / 2 <= limit &&
    cy - h / 2 >= -limit &&
    cy + h / 2 <= limit
  );
}

function pickTurn(
  dir: LayoutDirection,
  cx: number,
  cy: number,
  isDouble: boolean,
  halfTable: number,
  avoidNorth: boolean
): LayoutDirection {
  const options = TURN_ORDER[dir];
  for (const candidate of options) {
    if (avoidNorth && candidate === 'north') continue;
    const dist = halfExtent(isDouble, candidate);
    const next = step(cx, cy, candidate, dist);
    if (fitsBounds(next.x, next.y, isDouble, candidate, halfTable)) {
      return candidate;
    }
  }
  for (const candidate of options) {
    const dist = halfExtent(isDouble, candidate);
    const next = step(cx, cy, candidate, dist);
    if (fitsBounds(next.x, next.y, isDouble, candidate, halfTable)) {
      return candidate;
    }
  }
  return rotateDir(dir, 'cw');
}

function endAnchor(
  cx: number,
  cy: number,
  dir: LayoutDirection,
  isDouble: boolean,
  side: ChainSide
): ChainEndAnchor {
  const ext = halfExtent(isDouble, dir);
  const outward = side === 'left' ? oppositeDir(dir) : dir;
  const pt = step(cx, cy, outward, ext);
  return {
    x: pt.x,
    y: pt.y,
    rotation: tileRotation(dir, isDouble),
    direction: dir,
  };
}

function computeBounds(tiles: PlacedTileLayout[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const t of tiles) {
    minX = Math.min(minX, t.x - t.width / 2);
    minY = Math.min(minY, t.y - t.height / 2);
    maxX = Math.max(maxX, t.x + t.width / 2);
    maxY = Math.max(maxY, t.y + t.height / 2);
  }
  return { minX, minY, maxX, maxY };
}

function orientTileForChain(board: BoardTile[], index: number): {
  displayLeft: number;
  displayRight: number;
} {
  const tile = board[index];
  if (index === 0 && board.length === 1) {
    return { displayLeft: tile.left, displayRight: tile.right };
  }
  if (index === 0) {
    const conn = board[1].left;
    if (tile.right === conn) return { displayLeft: tile.left, displayRight: tile.right };
    return { displayLeft: tile.right, displayRight: tile.left };
  }
  if (index === board.length - 1) {
    const conn = board[index - 1].right;
    if (tile.left === conn) return { displayLeft: tile.left, displayRight: tile.right };
    return { displayLeft: tile.right, displayRight: tile.left };
  }
  const prevConn = board[index - 1].right;
  const nextConn = board[index + 1].left;
  if (tile.left === prevConn && tile.right === nextConn) {
    return { displayLeft: tile.left, displayRight: tile.right };
  }
  if (tile.right === prevConn && tile.left === nextConn) {
    return { displayLeft: tile.right, displayRight: tile.left };
  }
  return { displayLeft: tile.left, displayRight: tile.right };
}

function inferDir(a: PlacedTileLayout, b: PlacedTileLayout): LayoutDirection {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'east' : 'west';
  }
  return dy >= 0 ? 'south' : 'north';
}

/** Build coordinate path layout for the board chain with automatic wrapping */
export function computeChainLayout(board: BoardTile[]): ChainLayoutResult {
  const halfTable = TABLE_INNER / 2;

  if (board.length === 0) {
    return {
      tiles: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      leftEnd: { x: 0, y: 0, rotation: 0, direction: 'west' },
      rightEnd: { x: 0, y: 0, rotation: 0, direction: 'east' },
    };
  }

  let dir: LayoutDirection = 'east';
  let cx = 0;
  let cy = 0;
  const placed: PlacedTileLayout[] = [];
  const dirs: LayoutDirection[] = [];

  for (let i = 0; i < board.length; i++) {
    const tile = board[i];
    const orient = orientTileForChain(board, i);

    if (i > 0) {
      const prev = board[i - 1];
      const prevHalf = halfExtent(prev.isDouble, dir);
      const currHalf = halfExtent(tile.isDouble, dir);
      let nextCenter = step(cx, cy, dir, prevHalf + currHalf);

      if (!fitsBounds(nextCenter.x, nextCenter.y, tile.isDouble, dir, halfTable)) {
        const avoidNorth =
          nextCenter.y - halfExtent(tile.isDouble, 'north') < -halfTable + 60;
        dir = pickTurn(dir, cx, cy, tile.isDouble, halfTable, avoidNorth);
        nextCenter = step(
          cx,
          cy,
          dir,
          prevHalf + halfExtent(tile.isDouble, dir)
        );
      }

      cx = nextCenter.x;
      cy = nextCenter.y;
    }

    const { w, h } = tileSize(tile.isDouble, dir);
    dirs.push(dir);

    placed.push({
      index: i,
      x: cx,
      y: cy,
      rotation: tileRotation(dir, tile.isDouble),
      width: w,
      height: h,
      displayLeft: orient.displayLeft,
      displayRight: orient.displayRight,
      isDouble: tile.isDouble,
      side: i === 0 ? 'center' : 'right',
    });
  }

  const bounds = computeBounds(placed);
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  let scale = 1;
  if (bw > TABLE_INNER || bh > TABLE_INNER) {
    scale = Math.max(0.75, Math.min(TABLE_INNER / bw, TABLE_INNER / bh, 1));
  } else if (bw > TABLE_INNER * 0.88 || bh > TABLE_INNER * 0.88) {
    scale = 0.9;
  }

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const first = placed[0];
  const last = placed[placed.length - 1];
  const firstDir = placed.length > 1 ? inferDir(first, placed[1]) : 'east';
  const lastDir =
    placed.length > 1
      ? inferDir(placed[placed.length - 2], last)
      : dirs[dirs.length - 1] ?? 'east';

  return {
    tiles: placed,
    bounds,
    scale,
    offsetX: -centerX,
    offsetY: -centerY,
    leftEnd: endAnchor(first.x, first.y, firstDir, first.isDouble, 'left'),
    rightEnd: endAnchor(last.x, last.y, lastDir, last.isDouble, 'right'),
  };
}

function displayForPlay(
  tile: Tile,
  end: ChainSide,
  openLeft: number,
  openRight: number
): { displayLeft: number; displayRight: number; isDouble: boolean } {
  const isDouble = tile.left === tile.right;
  if (end === 'right') {
    if (tile.left === openRight) {
      return { displayLeft: tile.left, displayRight: tile.right, isDouble };
    }
    return { displayLeft: tile.right, displayRight: tile.left, isDouble };
  }
  if (tile.right === openLeft) {
    return { displayLeft: tile.left, displayRight: tile.right, isDouble };
  }
  return { displayLeft: tile.right, displayRight: tile.left, isDouble };
}

/** Ghost position for a tile played on left or right end */
export function computeGhostPreview(
  board: BoardTile[],
  tile: Tile,
  end: ChainSide,
  openEnds: { left: number; right: number } | null
): GhostPreview | null {
  if (!openEnds || board.length === 0) return null;

  const display = displayForPlay(tile, end, openEnds.left, openEnds.right);
  const ghostBoard: BoardTile =
    end === 'right'
      ? {
          left: display.displayLeft,
          right: display.displayRight,
          isDouble: display.isDouble,
        }
      : {
          left: display.displayLeft,
          right: display.displayRight,
          isDouble: display.isDouble,
        };

  const extended: BoardTile[] =
    end === 'right' ? [...board, ghostBoard] : [ghostBoard, ...board];

  const layout = computeChainLayout(extended);
  const ghostIndex = end === 'right' ? extended.length - 1 : 0;
  const ghostTile = layout.tiles[ghostIndex];
  if (!ghostTile) return null;

  return {
    x: ghostTile.x + layout.offsetX,
    y: ghostTile.y + layout.offsetY,
    rotation: ghostTile.rotation,
    displayLeft: ghostTile.displayLeft,
    displayRight: ghostTile.displayRight,
    isDouble: ghostTile.isDouble,
  };
}
