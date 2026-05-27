import type { BoardTile, Tile } from "../types";

export type LayoutDirection = "east" | "west" | "north" | "south";
export type ChainSide = "left" | "right";

/** Compact board tile dimensions (px) — matches DominoTile compact sizes */
export const H_TILE_W = 72;
export const H_TILE_H = 36;
export const D_TILE_W = 40;
export const D_TILE_H = 80;
/** Visible gap between adjacent chain tiles (px) */
export const CHAIN_TILE_GAP = 6;
export const TABLE_INNER = 608;
export const TABLE_PADDING = 36;

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
	side: ChainSide | "center";
	/** Direction from previous tile to this one (undefined for index 0) */
	incomingDir?: LayoutDirection;
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
	east: ["south", "north"],
	west: ["south", "north"],
	north: ["west", "east"],
	south: ["west", "east"],
};

function oppositeDir(d: LayoutDirection): LayoutDirection {
	return (
		{ east: "west", west: "east", north: "south", south: "north" } as const
	)[d];
}

function rotateDir(d: LayoutDirection, turn: "cw" | "ccw"): LayoutDirection {
	const cw: Record<LayoutDirection, LayoutDirection> = {
		east: "south",
		south: "west",
		west: "north",
		north: "east",
	};
	return turn === "cw" ? cw[d] : oppositeDir(cw[d]);
}

function isHorizontal(d: LayoutDirection) {
	return d === "east" || d === "west";
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

function tileSize(
	isDouble: boolean,
	dir: LayoutDirection,
): { w: number; h: number } {
	if (isDouble) {
		return isHorizontal(dir) ?
				{ w: D_TILE_W, h: D_TILE_H }
			:	{ w: H_TILE_W, h: H_TILE_H };
	}
	return isHorizontal(dir) ?
			{ w: H_TILE_W, h: H_TILE_H }
		:	{ w: H_TILE_H, h: H_TILE_W };
}

function halfExtent(isDouble: boolean, dir: LayoutDirection): number {
	const { w, h } = tileSize(isDouble, dir);
	return isHorizontal(dir) ? w / 2 : h / 2;
}

function step(cx: number, cy: number, dir: LayoutDirection, dist: number) {
	switch (dir) {
		case "east":
			return { x: cx + dist, y: cy };
		case "west":
			return { x: cx - dist, y: cy };
		case "north":
			return { x: cx, y: cy - dist };
		case "south":
			return { x: cx, y: cy + dist };
	}
}

/** Center of next tile along a straight segment */
function straightCenter(
	cx: number,
	cy: number,
	dir: LayoutDirection,
	prevIsDouble: boolean,
	currIsDouble: boolean,
): { x: number; y: number } {
	const dist =
		halfExtent(prevIsDouble, dir) +
		CHAIN_TILE_GAP +
		halfExtent(currIsDouble, dir);
	return step(cx, cy, dir, dist);
}

/** Center of corner tile when the chain turns from `fromDir` onto `toDir` */
function cornerCenter(
	cx: number,
	cy: number,
	fromDir: LayoutDirection,
	toDir: LayoutDirection,
	prevIsDouble: boolean,
	currIsDouble: boolean,
): { x: number; y: number } {
	const edge = step(cx, cy, fromDir, halfExtent(prevIsDouble, fromDir));
	const dist =
		CHAIN_TILE_GAP + halfExtent(currIsDouble, toDir);
	return step(edge.x, edge.y, toDir, dist);
}

function fitsBounds(
	cx: number,
	cy: number,
	isDouble: boolean,
	dir: LayoutDirection,
	halfTable: number,
): boolean {
	const { w, h } = tileSize(isDouble, dir);
	const margin = 2;
	const limit = halfTable - margin;
	return (
		cx - w / 2 >= -limit &&
		cx + w / 2 <= limit &&
		cy - h / 2 >= -limit &&
		cy + h / 2 <= limit
	);
}

/** After a 90° bend, continue along the opposite horizontal/vertical axis */
function travelAfterTurn(
	travelDir: LayoutDirection,
	turnDir: LayoutDirection,
): LayoutDirection {
	if (isHorizontal(travelDir) !== isHorizontal(turnDir)) {
		return oppositeDir(travelDir);
	}
	return turnDir;
}

function pickTurn(
	travelDir: LayoutDirection,
	cx: number,
	cy: number,
	prevIsDouble: boolean,
	currIsDouble: boolean,
	halfTable: number,
	avoidNorth: boolean,
): LayoutDirection {
	const options = TURN_ORDER[travelDir];
	const tryCandidate = (candidate: LayoutDirection) => {
		const center = cornerCenter(
			cx,
			cy,
			travelDir,
			candidate,
			prevIsDouble,
			currIsDouble,
		);
		return fitsBounds(
			center.x,
			center.y,
			currIsDouble,
			candidate,
			halfTable,
		) ?
				candidate
			:	null;
	};

	for (const candidate of options) {
		if (avoidNorth && candidate === "north") continue;
		const ok = tryCandidate(candidate);
		if (ok) return ok;
	}
	for (const candidate of options) {
		const ok = tryCandidate(candidate);
		if (ok) return ok;
	}
	return rotateDir(travelDir, "cw");
}

function endAnchor(
	cx: number,
	cy: number,
	dir: LayoutDirection,
	isDouble: boolean,
	side: ChainSide,
): ChainEndAnchor {
	const ext = halfExtent(isDouble, dir);
	const outward = side === "left" ? oppositeDir(dir) : dir;
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

function orientTileForChain(
	board: BoardTile[],
	index: number,
): {
	displayLeft: number;
	displayRight: number;
} {
	const tile = board[index];
	if (index === 0 && board.length === 1) {
		return { displayLeft: tile.left, displayRight: tile.right };
	}
	if (index === 0) {
		const conn = board[1].left;
		if (tile.right === conn)
			return { displayLeft: tile.left, displayRight: tile.right };
		return { displayLeft: tile.right, displayRight: tile.left };
	}
	if (index === board.length - 1) {
		const conn = board[index - 1].right;
		if (tile.left === conn)
			return { displayLeft: tile.left, displayRight: tile.right };
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

function computeScale(bw: number, bh: number): number {
	if (bw <= 0 && bh <= 0) return 1;
	const sx = TABLE_INNER / Math.max(bw, 1);
	const sy = TABLE_INNER / Math.max(bh, 1);
	const fit = Math.min(sx, sy, 1);
	if (fit >= 1) {
		if (bw > TABLE_INNER * 0.88 || bh > TABLE_INNER * 0.88) return 0.9;
		return 1;
	}
	return Math.max(0.75, fit);
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
			leftEnd: { x: 0, y: 0, rotation: 0, direction: "west" },
			rightEnd: { x: 0, y: 0, rotation: 0, direction: "east" },
		};
	}

	let travelDir: LayoutDirection = "east";
	let cx = 0;
	let cy = 0;
	const placed: PlacedTileLayout[] = [];

	for (let i = 0; i < board.length; i++) {
		const tile = board[i];
		const orient = orientTileForChain(board, i);
		let tileDir: LayoutDirection = travelDir;

		if (i > 0) {
			const prev = board[i - 1];
			let nextCenter = straightCenter(
				cx,
				cy,
				travelDir,
				prev.isDouble,
				tile.isDouble,
			);

			if (
				!fitsBounds(
					nextCenter.x,
					nextCenter.y,
					tile.isDouble,
					travelDir,
					halfTable,
				)
			) {
				const northEdge =
					nextCenter.y - halfExtent(tile.isDouble, "north");
				const avoidNorth = northEdge < -halfTable + 48;
				tileDir = pickTurn(
					travelDir,
					cx,
					cy,
					prev.isDouble,
					tile.isDouble,
					halfTable,
					avoidNorth,
				);
				nextCenter = cornerCenter(
					cx,
					cy,
					travelDir,
					tileDir,
					prev.isDouble,
					tile.isDouble,
				);
				travelDir = travelAfterTurn(travelDir, tileDir);
			} else {
				tileDir = travelDir;
			}

			cx = nextCenter.x;
			cy = nextCenter.y;
		} else if (tile.isDouble) {
			tileDir = "south";
		}

		const { w, h } = tileSize(tile.isDouble, tileDir);

		placed.push({
			index: i,
			x: cx,
			y: cy,
			rotation: tileRotation(tileDir, tile.isDouble),
			width: w,
			height: h,
			displayLeft: orient.displayLeft,
			displayRight: orient.displayRight,
			isDouble: tile.isDouble,
			side: i === 0 ? "center" : "right",
			incomingDir: i > 0 ? tileDir : undefined,
		});
	}

	const bounds = computeBounds(placed);
	const bw = bounds.maxX - bounds.minX;
	const bh = bounds.maxY - bounds.minY;
	const scale = computeScale(bw, bh);

	const centerX = (bounds.minX + bounds.maxX) / 2;
	const centerY = (bounds.minY + bounds.maxY) / 2;

	const first = placed[0];
	const last = placed[placed.length - 1];
	const leftSegDir =
		placed.length > 1 && placed[1].incomingDir ?
			placed[1].incomingDir
		:	"east";
	const rightSegDir =
		last.incomingDir ?? (placed.length > 1 ? leftSegDir : "east");

	return {
		tiles: placed,
		bounds,
		scale,
		offsetX: -centerX,
		offsetY: -centerY,
		leftEnd: endAnchor(first.x, first.y, leftSegDir, first.isDouble, "left"),
		rightEnd: endAnchor(last.x, last.y, rightSegDir, last.isDouble, "right"),
	};
}

function displayForPlay(
	tile: Tile,
	end: ChainSide,
	openLeft: number,
	openRight: number,
): { displayLeft: number; displayRight: number; isDouble: boolean } {
	const isDouble = tile.left === tile.right;
	if (end === "right") {
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
	openEnds: { left: number; right: number } | null,
): GhostPreview | null {
	if (!openEnds || board.length === 0) return null;

	const display = displayForPlay(tile, end, openEnds.left, openEnds.right);
	const ghostBoard: BoardTile = {
		left: display.displayLeft,
		right: display.displayRight,
		isDouble: display.isDouble,
	};

	const extended: BoardTile[] =
		end === "right" ? [...board, ghostBoard] : [ghostBoard, ...board];

	const layout = computeChainLayout(extended);
	const ghostIndex = end === "right" ? extended.length - 1 : 0;
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
