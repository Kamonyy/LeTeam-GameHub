/**
 * Player identity — cryptographic UUID persisted in sessionStorage.
 * Survives page refreshes within the same tab; used for reconnection.
 */

import { v4 as uuidv4 } from "uuid";

const PLAYER_ID_KEY = "leteam_player_id";
const DISPLAY_NAME_KEY = "leteam_display_name";

const PRODUCTION_HOST = "gamehub.mohamed-hussein.net";
const PRODUCTION_API = "https://leteam-gamehub-api.onrender.com";
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
 * Priority: /config.json → build env → production hostname → localhost
 */
export async function resolveServerUrl(): Promise<string> {
	if (cachedServerUrl) return cachedServerUrl;

	if (typeof window !== "undefined") {
		try {
			const res = await fetch("/config.json", { cache: "no-store" });
			if (res.ok) {
				const data = (await res.json()) as { serverUrl?: string };
				if (data.serverUrl) {
					cachedServerUrl = data.serverUrl;
					return cachedServerUrl;
				}
			}
		} catch {
			// fall through
		}
	}

	const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL;
	if (fromEnv && !fromEnv.includes("localhost")) {
		cachedServerUrl = fromEnv;
		return cachedServerUrl;
	}

	if (typeof window !== "undefined" && window.location.hostname === PRODUCTION_HOST) {
		cachedServerUrl = PRODUCTION_API;
		return cachedServerUrl;
	}

	cachedServerUrl = fromEnv || LOCAL_API;
	return cachedServerUrl;
}

/** @deprecated Use resolveServerUrl() — kept for SSR-safe default */
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || LOCAL_API;
