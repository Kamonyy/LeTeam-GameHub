/**
 * Secret Word session lifecycle — match persists until won or host cancel.
 */

/** @param {{ gameType?: string, game?: { phase?: string } | null, status?: string } | null | undefined} room */
export function isWordGameRoom(room) {
	return room?.gameType === "wordgame";
}

/** In-progress match (not yet won). */
export function isActiveWordGameSession(room) {
	return (
		isWordGameRoom(room) &&
		!!room.game &&
		room.game.phase !== "match_over"
	);
}

/** Match completed normally. */
export function isWordGameWon(room) {
	return (
		isWordGameRoom(room) &&
		!!room.game &&
		room.game.phase === "match_over"
	);
}

/**
 * Room should not be torn down by idle cleanup or player-drop logic.
 * @param {{ gameType?: string, game?: { phase?: string } | null } | null | undefined} room
 */
export function shouldPreserveWordGameRoom(room) {
	return isActiveWordGameSession(room);
}
