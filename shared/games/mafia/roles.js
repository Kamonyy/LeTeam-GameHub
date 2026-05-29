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
 * @property {string} summaryEn — short “what you do” for the role reveal card
 * @property {string} summaryAr
 * @property {string} icon
 * @property {RoleTeam} team
 * @property {string[]} abilities
 * @property {string[]} abilitiesAr
 * @property {string[]} restrictions
 * @property {string[]} restrictionsAr
 * @property {'night' | 'day' | 'passive'} actionPhase
 * @property {string} accentColor — hex accent for UI theming
 */

/** Default accent when role is unknown */
export const DEFAULT_ROLE_ACCENT = "#6B6560";

/** @type {Record<string, RoleDefinition>} */
export const ROLES = {
	mafia: {
		id: "mafia",
		accentColor: "#B83248",
		nameEn: "Mafia",
		nameAr: "مافيا",
		descriptionEn:
			"Evil faction. Coordinate in person and choose one kill each night.",
		descriptionAr:
			"فريق الشر. تتواعدون ويا بعض وجهاً لوجه (مو بالتطبيق)، وكل ليلة تختارون ضحية واحدة.",
		summaryEn:
			"Work with the other Mafia. Each night your group picks one player to eliminate.",
		summaryAr:
			"إنت ويا باقي المافيا — كل ليلة تختارون شخص واحد ينقتل، والراوي يسجل قراركم.",
		icon: "🗡️",
		team: "evil",
		actionPhase: "night",
		abilities: ["One shared kill per night (recorded by narrator)"],
		abilitiesAr: ["قتل واحد للفريق كل ليلة — الراوي يعلن مين انقتل"],
		restrictions: ["Must coordinate outside the app"],
		restrictionsAr: ["التفاهم والتآمر لازم يصير برا التطبيق وجهاً لوجه"],
	},
	seer: {
		id: "seer",
		accentColor: "#7B5EA7",
		nameEn: "Seer",
		nameAr: "شيخ الصالحين",
		descriptionEn:
			"Good faction. Inspect one player per night; narrator sees GOOD or EVIL.",
		descriptionAr:
			"فريق الخير. كل ليلة تختار لاعب وتعرف نيته — الراوي يشوف النتيجة ويگوللك بريء ولا مجرم.",
		summaryEn:
			"Each night, inspect one player. The narrator tells you if they are good or evil.",
		summaryAr:
			"كل ليلة تكشف لاعب واحد — الراوي يگوللك: بريء ولا مجرم (خير ولا شر).",
		icon: "🔮",
		team: "good",
		actionPhase: "night",
		abilities: ["Inspect one player alignment per night"],
		abilitiesAr: ["كل ليلة تفحص لاعب واحد — الراوي يأكدلك بريء أو مجرم"],
		restrictions: [],
		restrictionsAr: [],
	},
	doctor: {
		id: "doctor",
		accentColor: "#2D9B78",
		nameEn: "Doctor",
		nameAr: "الطبيب",
		descriptionEn:
			"Good faction. Heal one player from the Mafia kill each night.",
		descriptionAr:
			"فريق الخير. كل ليلة تنقذ شخص من قتل المافيا — بس واحد كل ليلة، مو نفس الشخص ليلتين ورا بعض.",
		summaryEn:
			"Each night, protect one player so they survive the Mafia's kill.",
		summaryAr:
			"كل ليلة تختار واحد تحميه — إذا المافيا هدفته، ما يموت تلك الليلة.",
		icon: "⚕️",
		team: "good",
		actionPhase: "night",
		abilities: ["Protect one player from Mafia kill"],
		abilitiesAr: ["تحمي لاعب واحد من طلقة المافيا تلك الليلة"],
		restrictions: ["Cannot heal the same player two nights in a row"],
		restrictionsAr: ["ما تگدر تحمي نفس الشخص ليلتين ورا بعض"],
	},
	villager: {
		id: "villager",
		accentColor: "#9A8468",
		nameEn: "Villager",
		nameAr: "قروي",
		descriptionEn: "Good faction. No night power.",
		descriptionAr: "فريق الخير. بالليل ما عندك شي — دورك بالنهار تحچي وتصوت.",
		summaryEn:
			"You have no night power. Discuss and vote by day to find and eliminate the Mafia.",
		summaryAr:
			"ما عندك قوة بالليل — نهاراً تحچي وتصوت عشان تطلع المافيا من اللعبة.",
		icon: "🌾",
		team: "good",
		actionPhase: "passive",
		abilities: [],
		abilitiesAr: [],
		restrictions: [],
		restrictionsAr: [],
	},
	sniper: {
		id: "sniper",
		accentColor: "#4A7089",
		nameEn: "Sniper",
		nameAr: "القنّاص",
		descriptionEn: "Evil faction. Silence one player for the next day.",
		descriptionAr:
			"فريق الشر. كل ليلة تسكت واحد — اليوم اللي بعده ما يگدر يحچي قدام الكل (بس يسمع).",
		summaryEn:
			"Each night, silence one player so they cannot speak or vote during the next day (their night action still happens tonight).",
		summaryAr:
			"كل ليلة تسكت لاعباً — اليوم التالي لا يحچي ولا يصوّت (لكن فعله الليلي يبقى هذه الليلة).",
		icon: "🎯",
		team: "evil",
		actionPhase: "night",
		abilities: ["Silence one player until next day (no talk or vote)"],
		abilitiesAr: ["تسكت لاعباً حتى نهاية اليوم التالي (بدون حچي أو تصويت)"],
		restrictions: ["Cannot silence the same player two nights in a row"],
		restrictionsAr: ["لا يمكن إسكات نفس اللاعب ليلتين متتاليتين"],
	},
	sheriff: {
		id: "sheriff",
		accentColor: "#F5C518",
		nameEn: "Sheriff",
		nameAr: "الشريف",
		descriptionEn:
			"Good faction. Judge one player: if EVIL they die; if GOOD you both die.",
		descriptionAr:
			"فريق الخير. كل ليلة تحكم على واحد: إذا مجرم ينحذف؛ وإذا طلع بريء أنت وياه تنقتلون.",
		summaryEn:
			"Each night, judge one player. If they are evil, they die. If good, you both die.",
		summaryAr:
			"كل ليلة تختار لاعب — مجرم يموت؛ بريء؟ أنت وياه تنقتلون سوة.",
		icon: "⚖️",
		team: "good",
		actionPhase: "night",
		abilities: ["Kill one player with alignment check"],
		abilitiesAr: [
			"تقتل لاعب واحد — الراوي يتأكد أولاً: مجرم ولا بريء، بعدها يصير الأثر",
		],
		restrictions: ["Cannot judge yourself"],
		restrictionsAr: ["ما يگدر يحكم على نفسه"],
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
