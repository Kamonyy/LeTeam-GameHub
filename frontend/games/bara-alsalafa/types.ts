export type BaraPhase =
	| "reveal"
	| "ready"
	| "interrogation"
	| "voting"
	| "defend"
	| "revote"
	| "outcast_guess"
	| "round_end"
	| "match_over";

export type BaraMicroStatus =
	| "waiting_reveal"
	| "role_revealed"
	| "ready"
	| "thinking"
	| "vote_requested"
	| "voted";

export interface BaraPlayerCard {
	id: string;
	microStatus: BaraMicroStatus;
	roleRevealed: boolean;
	ready: boolean;
	eliminated: boolean;
	voteLocked: boolean;
	voteEndRequested: boolean;
	isOutcast: boolean;
}

export interface BaraRoleView {
	isOutcast: boolean;
	categoryName: string;
	showSecretWord: boolean;
	secretWord: string | null;
	outcastMessage: string | null;
}

export interface BaraRoundOutcome {
	type:
		| "wrong_accusation"
		| "outcast_caught"
		| "outcast_stole_win"
		| "insiders_win";
	eliminatedId?: string;
	innocent?: boolean;
	awaitingGuess?: boolean;
	guess?: string;
	secretWord?: string;
}

export interface BaraGameState {
	gameType: "bara-alsalafa";
	phase: BaraPhase;
	playerIds: string[];
	playerCards: BaraPlayerCard[];
	scores: Record<string, number>;
	/** Outcast personal round wins (display). */
	roundWins: Record<string, number>;
	/** Insider round victories tallied across the match. */
	insiderRoundWins: number;
	/** Outcast round victories tallied across the match. */
	outcastRoundWins: number;
	/** Total rounds played in the match (lobby setting). */
	roundsToWin: number;
	roundNumber: number;
	categoryPackageIds: string[];
	activeCategoryId: string | null;
	/** Active round category (legacy alias) */
	categoryPackageId: string | null;
	categoryName: string;
	categoryNameEn: string;
	categoryNamesSummary: string;
	selectedCategoryCount: number;
	secretWord: string | null;
	roleView: BaraRoleView | null;
	currentInterviewerId: string | null;
	currentTargetId: string | null;
	phaseEndsAt: number | null;
	phaseRemainingMs: number | null;
	votesCast: number;
	votesExpected: number;
	tiedPlayerIds: string[];
	isTiebreak: boolean;
	tiebreakStep: number;
	tiebreakTotal: number;
	myVoteTarget: string | null;
	canReveal: boolean;
	canReady: boolean;
	readyCount: number;
	readyExpected: number;
	canRequestVoteEnd: boolean;
	voteEndCount: number;
	voteEndExpected: number;
	canVote: boolean;
	canGuess: boolean;
	/** Six category-related options (outcast only, choices mode). */
	outcastGuessChoices: string[];
	outcastGuessMode: "choices" | "free" | null;
	canUseFreeGuess: boolean;
	/** True for all clients while outcast is guessing. */
	outcastGuessing: boolean;
	canAdvanceInterrogation: boolean;
	eliminatedThisRound: string | null;
	roundOutcome: BaraRoundOutcome | null;
	outcastId: string | null;
	revealedSecretWord: string | null;
	winnerId: string | null;
	iAmOutcast: boolean;
}

export interface BaraGameSettings {
	categoryPackageIds: string[];
	roundsToWin: number;
}
