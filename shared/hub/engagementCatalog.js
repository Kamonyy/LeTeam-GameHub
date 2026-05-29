/** Allowlisted room reactions (social plane — no engine secrets). */

/** @type {Record<string, { emoji: string, soundKey?: string }>} */
export const REACTION_CATALOG = {
	fire: { emoji: "🔥", soundKey: "fire" },
	laugh: { emoji: "😂", soundKey: "laugh" },
	skull: { emoji: "💀", soundKey: "skull" },
	clap: { emoji: "👏", soundKey: "clap" },
	heart: { emoji: "❤️", soundKey: "heart" },
	think: { emoji: "🤔", soundKey: "think" },
	boom: { emoji: "💥", soundKey: "boom" },
	goat: { emoji: "🐐", soundKey: "goat" },
};

/**
 * @param {unknown} reactionId
 * @param {unknown} type
 * @returns {boolean}
 */
export function isValidRoomReaction(reactionId, type) {
	if (typeof reactionId !== "string" || !(reactionId in REACTION_CATALOG)) {
		return false;
	}
	if (type !== "emoji" && type !== "sound") return false;
	const entry = REACTION_CATALOG[reactionId];
	if (type === "emoji") return !!entry.emoji;
	return !!entry.soundKey;
}

/**
 * @param {string} reactionId
 * @returns {string | null}
 */
export function reactionEmojiForId(reactionId) {
	const entry = REACTION_CATALOG[reactionId];
	return entry?.emoji ?? null;
}
