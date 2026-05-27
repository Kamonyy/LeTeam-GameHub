/**
 * Strict night ritual order — enforced gates, no skip/reorder.
 * Steps run if any player (alive or dead) holds the role (ritual integrity).
 */

/**
 * @typedef {object} NightStepDef
 * @property {string} key
 * @property {string | null} roleId
 * @property {string} titleEn
 * @property {string} titleAr
 * @property {string} instructionEn
 * @property {string} instructionAr
 * @property {boolean} requiresTarget
 * @property {boolean} allowSkip
 */

/** @type {NightStepDef[]} */
export const NIGHT_SEQUENCE = [
	{
		key: "healer",
		roleId: "doctor",
		titleEn: "Healer action",
		titleAr: "فعل المعالج",
		instructionEn: "Ask the Doctor who they want to save tonight.",
		instructionAr: "اسأل الطبيب من يريد إنقاذه هذه الليلة.",
		requiresTarget: true,
		allowSkip: true,
	},
	{
		key: "mafia",
		roleId: "mafia",
		titleEn: "Mafia action",
		titleAr: "فعل المافيا",
		instructionEn:
			"Ask the Mafia (in person) for their single kill, then record the target here.",
		instructionAr: "اسأل المافيا وجمع قرار القتل الواحد، ثم سجّل الهدف هنا.",
		requiresTarget: true,
		allowSkip: false,
	},
	{
		key: "sniper",
		roleId: "sniper",
		titleEn: "Sniper action",
		titleAr: "فعل القنّاص",
		instructionEn: "Ask the Sniper who they want to silence tomorrow.",
		instructionAr: "اسأل القنّاص من يريد إسكاته غداً.",
		requiresTarget: true,
		allowSkip: true,
	},
	{
		key: "seer",
		roleId: "seer",
		titleEn: "Seer action",
		titleAr: "فعل شيخ الصالحين",
		instructionEn: "Ask the Seer who to inspect. The system will reveal GOOD or EVIL.",
		instructionAr: "اسأل شيخ الصالحين من يفحص. النظام يكشف خير أو شر.",
		requiresTarget: true,
		allowSkip: false,
	},
	{
		key: "sheriff",
		roleId: "sheriff",
		titleEn: "Sheriff action",
		titleAr: "فعل الشريف",
		instructionEn: "Ask the Sheriff who they want to judge.",
		instructionAr: "اسأل الشريف من يريد الحكم عليه.",
		requiresTarget: true,
		allowSkip: true,
	},
	{
		key: "resolution",
		roleId: null,
		titleEn: "Resolution",
		titleAr: "حل الليل",
		instructionEn:
			"Apply healing, silences, and kills in order. Confirm to lock outcomes.",
		instructionAr: "طبّق الإنقاذ والإسكات والقتل بالترتيب. أكّد لقفل النتائج.",
		requiresTarget: false,
		allowSkip: false,
	},
	{
		key: "morning",
		roleId: null,
		titleEn: "Morning announcement",
		titleAr: "إعلان الصباح",
		instructionEn: "Announce the night outcomes to the council in person.",
		instructionAr: "أعلن نتائج الليل للمجلس وجهاً لوجه.",
		requiresTarget: false,
		allowSkip: false,
	},
];

/** @deprecated use titleEn/instructionEn */
export function stepPromptEn(step) {
	return step?.instructionEn ?? "";
}

export function getNightStep(index) {
	return NIGHT_SEQUENCE[index] ?? null;
}

export function nightStepCount() {
	return NIGHT_SEQUENCE.length;
}
