/**
 * Word game clue scratchpad — shared sanitization for sync + broadcast.
 */

const MAX_NOTES = 100;
const MAX_NOTE_TEXT = 500;
const MAX_NOTE_ID = 64;

/**
 * @param {unknown} notes
 * @returns {Array<{ id: string, text: string, createdAt: number }>}
 */
export function sanitizeWordScratchpadNotes(notes) {
	if (!Array.isArray(notes)) return [];
	const out = [];
	for (const raw of notes) {
		if (out.length >= MAX_NOTES) break;
		if (!raw || typeof raw !== "object") continue;
		const id =
			typeof raw.id === "string" ? raw.id.slice(0, MAX_NOTE_ID) : "";
		const text =
			typeof raw.text === "string" ?
				raw.text.trim().slice(0, MAX_NOTE_TEXT)
			:	"";
		const createdAt =
			typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt) ?
				raw.createdAt
			:	Date.now();
		if (!id || !text) continue;
		out.push({ id, text, createdAt });
	}
	return out;
}

/**
 * @param {unknown} roundNumber
 * @returns {number | null}
 */
export function parseScratchpadRoundNumber(roundNumber) {
	const n = Number(roundNumber);
	if (!Number.isInteger(n) || n < 1 || n > 999) return null;
	return n;
}
