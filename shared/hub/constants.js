export const DISCONNECT_GRACE_MS = 86_400_000;
export const ROOM_IDLE_CLEANUP_MS = 86_400_000 * 7;
export const TURN_TIMER_TICK_MS = 1000;
export const DEFAULT_MIN_PLAYERS = 2;
export const DEFAULT_MAX_PLAYERS = 4;
export const DEFAULT_SCORE_CAP = 100;
export const SCORE_CAP_OPTIONS = [50, 100, 150, 200];
export const DEFAULT_HAND_SIZE = 7;
export const ROUND_RESTART_DELAY_MS = 4000;
export const WORD_ROUND_RESET_DELAY_MS = 6500;
/** Secret Word matches are not ended by idle cleanup until won or host cancel. */
export const WORD_GAME_PRESERVE_SESSION = true;
export const WORD_GAME_MIN_PLAYERS = 2;
export const WORD_GAME_MAX_PLAYERS = 2;
export const WORD_POINTS_OPTIONS = [3, 5, 10];
export const BARA_MIN_PLAYERS = 3;
export const BARA_MAX_PLAYERS = 12;
export const BARA_ROUND_RESET_DELAY_MS = 6000;
export const BARA_ROUNDS_OPTIONS = [3, 5, 7];
export const BARA_PHASE_TICK_MS = 1000;

export const DEFAULT_BARA_SETTINGS = {
	categoryPackageIds: ["food"],
	roundsToWin: 3,
};

export const DEFAULT_MATCH_SETTINGS = {
	scoreCap: DEFAULT_SCORE_CAP,
	mode: "ffa",
	handSize: DEFAULT_HAND_SIZE,
};

export const WORD_CATEGORY_OPTIONS = ["custom", "lol-champions"];

export const DEFAULT_WORD_GAME_SETTINGS = {
	pointsToWin: 5,
	wordCategory: "custom",
};

export const MAX_ROOMS = 500;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMITS = {
	register: 30,
	create: 10,
	join: 20,
	move: 120,
	chat: 30,
	profile: 20,
};
