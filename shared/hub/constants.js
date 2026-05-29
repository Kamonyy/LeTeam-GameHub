/** Pre-game lobby: remove disconnected players after 30 minutes. */
export const LOBBY_DISCONNECT_GRACE_MS = 30 * 60 * 1000;
/** Legacy alias — active matches use in-room disconnect handling instead. */
export const DISCONNECT_GRACE_MS = LOBBY_DISCONNECT_GRACE_MS;
/** Idle lobby (all disconnected) — purge room after 30 minutes without activity. */
export const LOBBY_IDLE_PURGE_MS = 30 * 60 * 1000;
export const TURN_TIMER_TICK_MS = 1000;
export const DEFAULT_MIN_PLAYERS = 2;
export const DEFAULT_MAX_PLAYERS = 4;
export const DEFAULT_SCORE_CAP = 100;
export const SCORE_CAP_OPTIONS = [50, 100, 150, 200];
export const DEFAULT_HAND_SIZE = 7;
export const ROUND_RESTART_DELAY_MS = 4000;
export const WORD_ROUND_RESET_DELAY_MS = 6500;
export const WORD_GAME_MIN_PLAYERS = 2;
export const WORD_GAME_MAX_PLAYERS = 2;
export const WORD_POINTS_OPTIONS = [3, 5, 10];
export const BARA_MIN_PLAYERS = 3;
export const BARA_MAX_PLAYERS = 12;
export const BARA_ROUND_RESET_DELAY_MS = 6000;
export const BARA_ROUNDS_OPTIONS = [3, 5, 7];
export const BARA_PHASE_TICK_MS = 1000;
/** Lobby size: at least 5 gameplay players + 1 narrator */
export const MAFIA_MIN_PLAYERS = 6;
export const MAFIA_MAX_PLAYERS = 12;
export const SKETCH_DRAW_MIN_PLAYERS = 3;
export const SKETCH_DRAW_MAX_PLAYERS = 12;
export const SKETCH_DRAW_ROUND_DELAY_MS = 6000;
export const SKETCH_DRAW_ROUNDS_OPTIONS = [3, 5, 7, 10];
export const SKETCH_DRAW_TIMER_OPTIONS = [90, 120, 180];
export const SKETCH_DRAW_TIMER_MIN_SEC = 30;
export const SKETCH_DRAW_TIMER_MAX_SEC = 600;

export const DEFAULT_SKETCH_DRAW_SETTINGS = {
	totalRounds: 5,
	drawTimerSec: 90,
	categoryPackageIds: ["animals"],
	customWords: "",
	useCustomWordsOnly: false,
};

export const DEFAULT_MAFIA_SETTINGS = {
	narratorId: null,
	revealRoleOnDeath: false,
	roleCounts: null,
	roleAssignments: {},
};

export const DEFAULT_BARA_SETTINGS = {
	categoryPackageIds: ["food"],
	roundsToWin: 3,
};

export const DEFAULT_MATCH_SETTINGS = {
	scoreCap: DEFAULT_SCORE_CAP,
	mode: "ffa",
	handSize: DEFAULT_HAND_SIZE,
};

export const DEFAULT_WORD_GAME_SETTINGS = {
	pointsToWin: 5,
	wordCategory: "custom",
};

export const MAX_ROOMS = 500;
export const INVITE_TTL_MS = 30_000;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMITS = {
	register: 30,
	create: 10,
	join: 20,
	move: 120,
	chat: 30,
	profile: 20,
	focus: 40,
	hubPresence: 20,
	gameStateRequest: 30,
	gameStart: 5,
	gameCancel: 5,
	roomSettingsUpdate: 15,
	mafiaRoleAcknowledge: 10,
	mafiaNarrator: 60,
	wordSubmit: 20,
	wordGuessed: 30,
	wordChampionSubmit: 20,
	wordScratchpadSync: 90,
	baraReveal: 10,
	baraReady: 20,
	baraVoteEnd: 20,
	baraVote: 20,
	baraGuess: 30,
	sketchDrawWordSelect: 10,
	sketchDrawCanvasBatch: 120,
	sketchDrawCanvasUndo: 30,
	sketchDrawCanvasRedo: 30,
	sketchDrawCanvasClear: 10,
	sketchDrawCanvasFill: 20,
	sketchDrawCanvasRecovery: 10,
	sketchDrawGuessSubmit: 40,
	inviteSend: 15,
	inviteRespond: 30,
	joinByTargetPlayer: 15,
	roomReaction: 20,
};
