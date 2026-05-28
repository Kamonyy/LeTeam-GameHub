/** Distinct player accent colors (medieval palette). */
export const PLAYER_COLORS = [
	"#8B2942",
	"#C9A227",
	"#2D5A3D",
	"#3D4F6F",
	"#6B4423",
	"#7B4B8A",
	"#4A6741",
	"#9B5E3C",
	"#5C4033",
	"#1E3A5F",
	"#B8860B",
	"#556B2F",
];

/** @param {number} index */
export function colorForPlayerIndex(index) {
	return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
