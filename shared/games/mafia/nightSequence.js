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

/** @type {NightStepDef[]} — evil roles first, then good (ritual order). */
export const NIGHT_SEQUENCE = [
	{
		key: "mafia",
		roleId: "mafia",
		titleEn: "Mafia action",
		titleAr: "فعل المافيا",
		instructionEn:
			"Ask the Mafia (in person) for their kill(s), then record each victim here. With two or more living Mafia, you may record up to two victims (one is enough). Mafia cannot target themselves.",
		instructionAr:
			"اسأل المافيا عن ضحايا الليلة وسجّلهم هنا. إن وُجد مافيان حيّان أو أكثر، يمكن تسجيل ضحية أو اثنتين كحد أقصى. لا يمكن للمافيا استهداف نفسها.",
		requiresTarget: true,
		allowSkip: true,
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
		key: "seer",
		roleId: "seer",
		titleEn: "Seer action",
		titleAr: "فعل شيخ الصالحين",
		instructionEn:
			"Ask the Seer who to inspect (not themselves). The system will reveal GOOD or EVIL.",
		instructionAr:
			"اسأل شيخ الصالحين من يفحص (غير نفسه). النظام يكشف خير أو شر.",
		requiresTarget: true,
		allowSkip: true,
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
