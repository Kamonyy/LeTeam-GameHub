/**
 * Player identity — cryptographic UUID persisted in sessionStorage.
 * Survives page refreshes within the same tab; used for reconnection.
 */

import { v4 as uuidv4 } from "uuid";

const PLAYER_ID_KEY = "leteam_player_id";
const DISPLAY_NAME_KEY = "leteam_display_name";

/** UUID v4 — works on LAN HTTP where crypto.randomUUID is unavailable. */
function generatePlayerId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return uuidv4();
}

export function getOrCreatePlayerId(): string {
	if (typeof window === "undefined") return "";

	let id = sessionStorage.getItem(PLAYER_ID_KEY);
	if (!id) {
		id = generatePlayerId();
		sessionStorage.setItem(PLAYER_ID_KEY, id);
	}
	return id;
}

export function getDisplayName(): string {
	if (typeof window === "undefined") return "Player";
	return sessionStorage.getItem(DISPLAY_NAME_KEY) || "Player";
}

export function setDisplayName(name: string): void {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(DISPLAY_NAME_KEY, name.trim() || "Player");
}

export const SERVER_URL =
	process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
