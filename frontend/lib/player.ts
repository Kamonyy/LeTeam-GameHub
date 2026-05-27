/**
 * Player identity — cryptographic UUID persisted in sessionStorage.
 * Survives page refreshes within the same tab; used for reconnection.
 */

import { v4 as uuidv4 } from "uuid";

const PLAYER_ID_KEY = "leteam_player_id";
const DISPLAY_NAME_KEY = "leteam_display_name";
const LOCAL_API = "http://localhost:3001";

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

let cachedServerUrl: string | null = null;

/**
 * Resolve the Socket.io server URL at runtime.
 * Empty serverUrl in config.json = same origin (Cloudflare Worker unified deploy).
 */
export async function resolveServerUrl(): Promise<string> {
	if (cachedServerUrl) return cachedServerUrl;

	if (typeof window !== "undefined") {
		try {
			const res = await fetch("/config.json", { cache: "no-store" });
			if (res.ok) {
				const data = (await res.json()) as { serverUrl?: string };
				if (data.serverUrl === "" || data.serverUrl === "/") {
					cachedServerUrl = window.location.origin;
					return cachedServerUrl;
				}
				if (data.serverUrl) {
					cachedServerUrl = data.serverUrl;
					return cachedServerUrl;
				}
			}
		} catch {
			// fall through
		}

		// Production: same Worker serves frontend + WebSocket
		if (window.location.protocol === "https:") {
			cachedServerUrl = window.location.origin;
			return cachedServerUrl;
		}
	}

	const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL;
	cachedServerUrl = fromEnv || LOCAL_API;
	return cachedServerUrl;
}

/** True when socket connects to the same host as the page (Cloudflare Worker). */
export function isSameOriginServer(serverUrl: string): boolean {
	if (typeof window === "undefined") return false;
	try {
		const target = new URL(serverUrl, window.location.origin);
		return target.origin === window.location.origin;
	} catch {
		return false;
	}
}

export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || LOCAL_API;
