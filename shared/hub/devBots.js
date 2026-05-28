/**
 * Dev-only fake players for solo local testing.
 * Enabled only when ALLOW_DEV_BOTS=true or NODE_ENV=development (and not DISABLE_DEV_BOTS).
 */

/** @returns {boolean} */
export function isDevBotsEnabled() {
	if (typeof process === "undefined" || !process.env) return false;
	if (process.env.DISABLE_DEV_BOTS === "true") return false;
	if (process.env.ALLOW_DEV_BOTS === "true") return true;
	if (process.env.NODE_ENV === "development") return true;
	return false;
}

/** @returns {string} */
export function generateBotPlayerId() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const BOT_NAMES = [
	"Aldric",
	"Brunhilde",
	"Cedric",
	"Daria",
	"Eldon",
	"Freyja",
	"Gareth",
	"Helga",
	"Ivar",
	"Jocelyn",
	"Kael",
	"Lyra",
];

/**
 * @param {number} index — 1-based label for display
 */
export function createBotPlayer(index) {
	return {
		id: generateBotPlayerId(),
		displayName: `Bot ${BOT_NAMES[(index - 1) % BOT_NAMES.length]}`,
		connected: true,
		disconnectTimer: null,
		tabFocused: true,
		isBot: true,
	};
}
