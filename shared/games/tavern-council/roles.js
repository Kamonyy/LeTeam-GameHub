/**
 * Modular role definitions for Mafia.
 */

/** @typedef {'good' | 'evil' | 'neutral'} RoleTeam */

/**
 * @typedef {object} RoleDefinition
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {string} descriptionEn
 * @property {string} descriptionAr
 * @property {string} icon
 * @property {RoleTeam} team
 * @property {string[]} abilities
 * @property {string[]} restrictions
 * @property {'night' | 'day' | 'passive'} actionPhase
 * @property {string} accentColor — hex accent for UI theming
 */

/** Default accent when role is unknown */
export const DEFAULT_ROLE_ACCENT = "#c9a227";

/** @type {Record<string, RoleDefinition>} */
export const ROLES = {
	mafia: {
		id: "mafia",
		accentColor: "#9B2D42",
		nameEn: "Mafia",
		nameAr: "مافيا",
		descriptionEn:
			"Evil faction. Coordinate in person and choose one kill each night.",
		descriptionAr: "فريق الشر. تتآمرون وجهاً لوجه وتختارون قتلاً واحداً كل ليلة.",
		icon: "🗡️",
		team: "evil",
		actionPhase: "night",
		abilities: ["One shared kill per night (recorded by narrator)"],
		restrictions: ["Must coordinate outside the app"],
	},
	seer: {
		id: "seer",
		accentColor: "#6B5B9E",
		nameEn: "Seer",
		nameAr: "شيخ الصالحين",
		descriptionEn:
			"Good faction. Inspect one player per night; narrator sees GOOD or EVIL.",
		descriptionAr:
			"فريق الخير. افحص لاعباً كل ليلة؛ يرى المُنشد خيراً أو شراً.",
		icon: "🔮",
		team: "good",
		actionPhase: "night",
		abilities: ["Inspect one player alignment per night"],
		restrictions: [],
	},
	doctor: {
		id: "doctor",
		accentColor: "#3D8F7A",
		nameEn: "Doctor",
		nameAr: "الطبيب",
		descriptionEn:
			"Good faction. Heal one player from the Mafia kill each night.",
		descriptionAr: "فريق الخير. انقذ لاعباً واحداً من قتل المافيا كل ليلة.",
		icon: "⚕️",
		team: "good",
		actionPhase: "night",
		abilities: ["Protect one player from Mafia kill"],
		restrictions: ["Cannot heal the same player two nights in a row"],
	},
	villager: {
		id: "villager",
		accentColor: "#A68B5B",
		nameEn: "Villager",
		nameAr: "قروي",
		descriptionEn: "Good faction. No night power.",
		descriptionAr: "فريق الخير. بلا قدرة ليلية.",
		icon: "🌾",
		team: "good",
		actionPhase: "passive",
		abilities: [],
		restrictions: [],
	},
	sniper: {
		id: "sniper",
		accentColor: "#5A6E7C",
		nameEn: "Sniper",
		nameAr: "القنّاص",
		descriptionEn: "Evil faction. Silence one player for the next day.",
		descriptionAr: "فريق الشر. أسكت لاعباً عن الكلام في اليوم التالي.",
		icon: "🎯",
		team: "evil",
		actionPhase: "night",
		abilities: ["Silence one player until next day"],
		restrictions: [],
	},
	sheriff: {
		id: "sheriff",
		accentColor: "#C9A227",
		nameEn: "Sheriff",
		nameAr: "الشريف",
		descriptionEn:
			"Good faction. Judge one player: if EVIL they die; if GOOD you both die.",
		descriptionAr:
			"فريق الخير. احكم على لاعب: إن شريراً يموت؛ وإن بريئاً تموتان معاً.",
		icon: "⚖️",
		team: "good",
		actionPhase: "night",
		abilities: ["Kill one player with alignment check"],
		restrictions: [],
	},
};

export const ROLE_IDS = Object.keys(ROLES);

export function getRole(roleId) {
	return ROLES[roleId] ?? null;
}

/** @param {string | null | undefined} roleId */
export function getRoleAccent(roleId) {
	if (!roleId) return DEFAULT_ROLE_ACCENT;
	return ROLES[roleId]?.accentColor ?? DEFAULT_ROLE_ACCENT;
}

export function isEvilRole(roleId) {
	return ROLES[roleId]?.team === "evil";
}

export function isGoodRole(roleId) {
	return ROLES[roleId]?.team === "good";
}

/** @param {string} roleId */
export function alignmentLabel(roleId) {
	return isEvilRole(roleId) ? "EVIL" : "GOOD";
}
