/** Shared input validation for hub socket events. */

export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ROOM_ID_REGEX = /^[A-Z0-9]{8}$/;

export const MAX_DISPLAY_NAME = 32;
export const MAX_CHAT_MESSAGE_LENGTH = 200;
export const MAX_PLAYER_ID_LENGTH = 36;
export const MAX_TARGET_PLAYER_ID_LENGTH = 36;
export const SESSION_TOKEN_BYTES = 32;

const MAFIA_NARRATOR_ACTIONS = new Set([
	"start_day",
	"day_eliminate",
	"begin_night",
	"set_night_target",
	"confirm_night_step",
	"end_morning",
	"reset_match",
]);

export function validateMafiaNarratorAction(action) {
	return typeof action === "string" && MAFIA_NARRATOR_ACTIONS.has(action);
}

export function sanitizeDisplayName(raw) {
	if (typeof raw !== "string") return "Player";
	let trimmed = raw.trim().replace(/[\x00-\x1f\x7f]/g, "");
	if (typeof trimmed.normalize === "function") {
		trimmed = trimmed.normalize("NFKC").trim();
	}
	const safe = trimmed.replace(/[<>]/g, "");
	if (!safe) return "Player";
	return safe.slice(0, MAX_DISPLAY_NAME);
}

export function validatePlayerId(id) {
	if (typeof id !== "string" || id.length > MAX_PLAYER_ID_LENGTH) return false;
	return UUID_REGEX.test(id);
}

export function validateSessionToken(token) {
	if (token == null || token === "") return true;
	if (typeof token !== "string") return false;
	return /^[0-9a-f]{64}$/i.test(token);
}

export function normalizeRoomId(id) {
	if (typeof id !== "string") return null;
	const upper = id.trim().toUpperCase();
	if (!ROOM_ID_REGEX.test(upper)) return null;
	return upper;
}

export function validateGameType(gameType) {
	return (
		gameType === "dominoes" ||
		gameType === "wordgame" ||
		gameType === "bara-alsalafa" ||
		gameType === "mafia"
	);
}

export function validateMoveEnd(end) {
	return end === "left" || end === "right";
}

export function validateDominoTile(tile) {
	if (!tile || typeof tile !== "object") return false;
	const { left, right } = tile;
	return (
		Number.isInteger(left) &&
		Number.isInteger(right) &&
		left >= 0 &&
		left <= 6 &&
		right >= 0 &&
		right <= 6
	);
}

export function validateTargetPlayerId(id) {
	if (typeof id !== "string" || id.length > MAX_TARGET_PLAYER_ID_LENGTH)
		return false;
	return UUID_REGEX.test(id);
}

export function sanitizeChatMessage(raw) {
	if (typeof raw !== "string") return "";
	const trimmed = raw.trim().replace(/[\x00-\x1f\x7f]/g, "");
	const safe = trimmed.replace(/[<>]/g, "");
	if (!safe) return "";
	return safe.slice(0, MAX_CHAT_MESSAGE_LENGTH);
}
