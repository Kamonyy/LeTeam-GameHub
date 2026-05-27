import type { Tile } from "../types";

export function tilesMatch(a: Tile, b: Tile) {
	return (
		(a.left === b.left && a.right === b.right) ||
		(a.left === b.right && a.right === b.left)
	);
}

export function tileKey(tile: Tile, index: number) {
	return `${tile.left}-${tile.right}-${index}`;
}

export function handPipCount(hand: Tile[]) {
	return hand.reduce((sum, t) => sum + t.left + t.right, 0);
}
