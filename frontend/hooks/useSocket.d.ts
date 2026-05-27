import type {
  MatchSettings,
  WordGameSettings,
  BaraGameSettings,
  TavernCouncilSettings,
  HubPresenceState,
  ChatMessage,
} from '@/lib/hub/types';
import type { GameState, Tile } from '@/games/dominoes/types';
import type { WordGameState } from '@/games/wordgame/types';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import type {
  TavernCouncilGameState,
  TavernNarratorAction,
} from '@/games/tavern-council/types';

export type HubGameState =
  | GameState
  | WordGameState
  | BaraGameState
  | TavernCouncilGameState;

export interface WordGuessedCelebrationEvent {
  wordCategory: string;
  championId: string | null;
  stateVersion: number | null;
  at: number;
}

export interface UseSocketReturn {
  connected: boolean;
  playerId: string;
  lobby: import('@/lib/hub/types').LobbyState | null;
  gameState: HubGameState | null;
  isSpectator: boolean;
  error: string | null;
  hubPresence: HubPresenceState;
  chatMessages: ChatMessage[];
  sendChat: (message: string) => void;
  clearError: () => void;
  refreshDisplayName: (name: string) => void;
  createRoom: (displayName: string, gameType?: string) => Promise<string | null>;
  joinRoom: (
    roomId: string,
    displayName: string,
    options?: { spectate?: boolean }
  ) => Promise<boolean>;
  spectateRoom: (roomId: string, displayName: string) => Promise<boolean>;
  joinRoomOrSpectate: (
    roomId: string,
    displayName: string
  ) => Promise<{ ok: boolean; spectating: boolean }>;
  leaveRoom: () => void;
  hardResetPlayer: () => Promise<void>;
  updateRoomSettings: (
    settings: Partial<
      MatchSettings | WordGameSettings | BaraGameSettings | TavernCouncilSettings
    >
  ) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  kickPlayer: (targetPlayerId: string) => Promise<boolean>;
  cancelMatch: () => Promise<boolean>;
  playMove: (tile: Tile, end: 'left' | 'right') => void;
  drawTile: () => void;
  passTurn: () => void;
  continueRound: () => Promise<boolean>;
  requestRematch: () => Promise<boolean>;
  submitSecretWord: (word: string) => Promise<boolean>;
  submitSecretChampion: (championId: string) => Promise<boolean>;
  confirmWordGuessed: () => Promise<boolean>;
  reportWordTabFocus: (focused: boolean) => void;
  wordGuessedCelebration: WordGuessedCelebrationEvent | null;
  baraReveal: () => Promise<boolean>;
  baraAdvanceInterrogation: () => Promise<boolean>;
  baraVote: (targetPlayerId: string) => Promise<boolean>;
  baraGuess: (guess: string) => Promise<boolean>;
  tavernAcknowledgeRole: () => Promise<boolean>;
  tavernNarratorAction: (
    action: TavernNarratorAction,
    targetPlayerId?: string | null
  ) => Promise<boolean>;
  /** Dev only — fill lobby with fake players */
  addDevBots: (count?: number) => Promise<{ ok: boolean; added?: number; error?: string }>;
  removeDevBots: () => Promise<{ ok: boolean; removed?: number; error?: string }>;
}

export function useSocket(): UseSocketReturn;

export interface UseHubLiveReturn {
  connected: boolean;
  hubPresence: HubPresenceState;
  error: string | null;
  clearError: () => void;
  refreshDisplayName: (name: string) => void;
  requestHubPresenceRefresh: () => void;
}

export function useHubLive(): UseHubLiveReturn;
