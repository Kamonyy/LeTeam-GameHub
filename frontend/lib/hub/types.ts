export interface HubPresenceState {
  total: number;
  players: OnlinePlayer[];
}

export interface ChatMessage {
  roomId: string | null;
  playerId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

export type OnlinePlayerStatus = 'hub' | 'lobby' | 'playing' | 'spectating';

export interface OnlinePlayer {
  id: string;
  displayName: string;
  status: OnlinePlayerStatus;
  inviteable: boolean;
  roomId?: string | null;
  hostId?: string | null;
  gameType?: string | null;
  /** Joinable lobby code when the player is in an active lobby (presence direct-join). */
  targetRoomId?: string | null;
  isRoomFull?: boolean;
  /** Players currently in a joinable lobby (presence direct-join). */
  lobbyPlayerCount?: number;
  lobbyMaxPlayers?: number;
}

export interface MatchSettings {
  scoreCap: number;
  mode: 'ffa' | '2v2';
  handSize: number;
}

export type WordCategory = 'custom' | 'lol-champions';

export interface WordGameSettings {
  pointsToWin: number;
  wordCategory?: WordCategory;
}

export interface BaraGameSettings {
  categoryPackageIds: string[];
  /** @deprecated Legacy single-pack field */
  categoryPackageId?: string;
  roundsToWin: number;
}

export interface MafiaSettings {
  narratorId: string | null;
  revealRoleOnDeath: boolean;
  roleCounts: Record<string, number> | null;
  /** Host-only pre-deal map; omitted for non-host lobby payloads. Never render in UI. */
  roleAssignments?: Record<string, string>;
}

export interface SketchDrawSettings {
  totalRounds: number;
  drawTimerSec: number;
  categoryPackageIds: string[];
  categoryPackageId?: string;
  customWords: string;
  useCustomWordsOnly: boolean;
}

export interface LobbyPlayer {
  id: string;
  displayName: string;
  connected: boolean;
  /** False when the player left the game tab during an active Secret Word match. */
  tabFocused?: boolean;
  /** Dev-only filler players (local testing). */
  isBot?: boolean;
}

export interface LobbySpectator {
  id: string;
  displayName: string;
  connected: boolean;
}

export interface LobbyState {
  roomId: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  gameType: string;
  players: LobbyPlayer[];
  spectators?: LobbySpectator[];
  minPlayers: number;
  maxPlayers: number;
  settings?:
    | MatchSettings
    | WordGameSettings
    | BaraGameSettings
    | MafiaSettings
    | SketchDrawSettings;
  isSpectator?: boolean;
  /** Server allows `room:dev:*` bot fillers (hide UI when false). */
  devBotsEnabled?: boolean;
}

export const SCORE_CAP_OPTIONS = [50, 100, 150, 200] as const;
export const WORD_POINTS_OPTIONS = [3, 5, 10] as const;
export const WORD_CATEGORY_OPTIONS = ['custom', 'lol-champions'] as const;
export const BARA_ROUNDS_OPTIONS = [3, 5, 7] as const;
export const SKETCH_DRAW_ROUNDS_OPTIONS = [3, 5, 7, 10] as const;
export const SKETCH_DRAW_TIMER_OPTIONS = [90, 120, 180] as const;
