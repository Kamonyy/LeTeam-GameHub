/**
 * When a player should keep their lobby seat across socket drop / tab away / refresh.
 * Mirrors Secret Word (wordgame) session preservation for other hub games.
 */

import { isActiveWordGameSession, isWordGameWon } from "./wordgame-session.js";

/**
 * @param {{ gameType?: string, status?: string, game?: unknown } | null | undefined} room
 */
export function shouldPreservePlayerSeat(room) {
	if (!room) return false;
	if (isActiveWordGameSession(room)) return true;
	if (isWordGameWon(room)) return true;

	if (room.gameType === "mafia") {
		return room.status === "lobby" || room.status === "playing";
	}

	if (room.status === "lobby") return true;
	if (room.status === "playing" && room.game) return true;

	return false;
}

/**
 * Rooms that should not be destroyed by idle cleanup while seats are preserved.
 * @param {{ gameType?: string, status?: string, game?: { phase?: string } | null } | null | undefined} room
 */
export function shouldPreserveRoomFromIdlePurge(room) {
	if (shouldPreservePlayerSeat(room)) return true;
	return isActiveWordGameSession(room);
}
