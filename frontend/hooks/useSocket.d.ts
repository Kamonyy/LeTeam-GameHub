import type {
  MatchSettings,
  WordGameSettings,
  BaraGameSettings,
  MafiaSettings,
  SketchDrawSettings,
  HubPresenceState,
  ChatMessage,
} from '@/lib/hub/types';
import type { GameState, Tile } from '@/games/dominoes/types';
import type { WordGameState } from '@/games/wordgame/types';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import type {
  MafiaGameState,
  MafiaNarratorAction,
} from '@/games/mafia/types';
import type { SketchDrawGameState, SketchStrokeBatch } from '@/games/sketch-draw/types';

export type HubGameState =
  | GameState
  | WordGameState
  | BaraGameState
  | MafiaGameState
  | SketchDrawGameState;

export interface SketchDrawLocalHint {
  id: string;
  messageAr: string;
  messageEn: string;
  at: number;
}

export interface SketchDrawRoomAlert {
  id: string;
  message: string;
  kind?: string;
  at: number;
}

export interface SketchDrawGuessFeedItem {
  id: string;
  playerId: string;
  displayName: string;
  text: string;
  at: number;
}

export interface SketchDrawTimeTick {
  roomId: string;
  phase: string;
  remainingMs: number;
  phaseEndsAt: number | null;
  stateVersion: number;
  at: number;
}

export interface UseSocketReturn {
  connected: boolean;
  playerId: string;
  lobby: import('@/lib/hub/types').LobbyState | null;
  gameState: HubGameState | null;
  isSpectator: boolean;
  error: string | null;
  /** Short-lived rate-limit / protocol warnings (auto-cleared). */
  transientWarning: string | null;
  hardResetInFlight: boolean;
  isIdentityHydrated: boolean;
  sessionReady: boolean;
  reconnectAssessed: boolean;
  reconnectedRoomId: string | null;
  reconnectedAsSpectator: boolean;
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
    displayName: string,
    options?: { spectate?: boolean }
  ) => Promise<{ ok: boolean; spectating: boolean }>;
  leaveRoom: () => Promise<void>;
  /** Leave room/game, clear client session; keeps player id and display name. */
  hardResetPlayer: () => Promise<void>;
  updateRoomSettings: (
    settings: Partial<
      | MatchSettings
      | WordGameSettings
      | BaraGameSettings
      | MafiaSettings
      | SketchDrawSettings
    >
  ) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  kickPlayer: (targetPlayerId: string) => Promise<boolean>;
  cancelMatch: () => Promise<boolean>;
  disbandRoom: () => Promise<boolean>;
  playMove: (tile: Tile, end: 'left' | 'right') => void;
  drawTile: () => void;
  passTurn: () => void;
  continueRound: () => Promise<boolean>;
  requestRematch: () => Promise<boolean>;
  submitSecretWord: (word: string) => Promise<boolean>;
  submitSecretChampion: (championId: string) => Promise<boolean>;
  confirmWordGuessed: () => Promise<boolean>;
  reportWordTabFocus: (focused: boolean) => void;
  baraReveal: () => Promise<boolean>;
  baraReady: () => Promise<boolean>;
  baraAdvanceInterrogation: () => Promise<boolean>;
  baraRequestVoteEnd: () => Promise<boolean>;
  baraVote: (targetPlayerId: string) => Promise<boolean>;
  baraGuess: (guess: string) => Promise<boolean>;
  baraOutcastFreeGuess: () => Promise<boolean>;
  sketchDrawSelectWord: (index: number) => Promise<boolean>;
  sketchDrawStrokeBatch: (batch: SketchStrokeBatch & { strokeComplete?: boolean }) => void;
  sketchDrawCanvasUndo: () => Promise<boolean>;
  sketchDrawCanvasRedo: () => Promise<boolean>;
  sketchDrawCanvasClear: () => Promise<boolean>;
  sketchDrawCanvasFill: (x: number, y: number, color: string) => Promise<boolean>;
  sketchDrawSubmitGuess: (
    guess: string
  ) => Promise<{ ok: boolean; outcome?: string; error?: string }>;
  sketchDrawLocalHints: SketchDrawLocalHint[];
  sketchDrawRoomAlerts: SketchDrawRoomAlert[];
  sketchDrawGuessFeed: SketchDrawGuessFeedItem[];
  sketchDrawTimeTick: SketchDrawTimeTick | null;
  sketchDrawDisbandAt: number;
  sketchDrawDisbandRoom: () => Promise<boolean>;
  sketchDrawRemoteBatch: (SketchStrokeBatch & { _at?: number }) | null;
  sketchDrawCanvasSync: {
    canvasBuffer: SketchStrokeBatch[];
    canvasBufferVersion: number;
    at: number;
  } | null;
  requestSketchCanvasRecovery: () => void;
  clearSketchDrawLocalHints: () => void;
  mafiaAcknowledgeRole: () => Promise<boolean>;
  mafiaNarratorAction: (
    action: MafiaNarratorAction,
    targetPlayerId?: string | null
  ) => Promise<boolean>;
  /** Dev only — fill lobby with fake players */
  addDevBots: (count?: number) => Promise<{ ok: boolean; added?: number; error?: string }>;
  removeDevBots: () => Promise<{ ok: boolean; removed?: number; error?: string }>;
  registerSocketListener: (
    event: string,
    handler: (...args: unknown[]) => void
  ) => () => void;
  emitInviteSend: (payload: {
    targetPlayerId: string;
    roomId: string;
    gameType: string;
    sessionToken: string;
  }) => Promise<{
    error?: string;
    success?: boolean;
    inviteId?: string;
    expiresAt?: number;
  }>;
  emitInviteRespond: (payload: {
    inviteId: string;
    accept: boolean;
    sessionToken: string;
  }) => Promise<{
    error?: string;
    success?: boolean;
    accepted?: boolean;
    roomId?: string;
    gameType?: string;
  }>;
  joinLobbyByTargetPlayer: (targetPlayerId: string) => Promise<{
    error?: string;
    roomId?: string;
    gameType?: string;
  }>;
}

export function useSocket(): UseSocketReturn;

export function useGameTimer(): SketchDrawTimeTick | null;

export function useSketchCanvas(): Pick<
  UseSocketReturn,
  | 'sketchDrawRemoteBatch'
  | 'sketchDrawCanvasSync'
  | 'sketchDrawStrokeBatch'
  | 'sketchDrawCanvasUndo'
  | 'sketchDrawCanvasRedo'
  | 'sketchDrawCanvasClear'
  | 'sketchDrawCanvasFill'
  | 'requestSketchCanvasRecovery'
>;

export function useGameState(): Pick<
  UseSocketReturn,
  | 'lobby'
  | 'gameState'
  | 'isSpectator'
  | 'hubPresence'
  | 'chatMessages'
  | 'sketchDrawLocalHints'
  | 'sketchDrawRoomAlerts'
  | 'sketchDrawGuessFeed'
  | 'sketchDrawDisbandAt'
  | 'clearSketchDrawLocalHints'
  | 'sendChat'
>;

export function useSocketConnection(): {
  connected: boolean;
  playerId: string;
  error: string | null;
  hardResetInFlight: boolean;
  socketRef: import('react').MutableRefObject<
    import('socket.io-client').Socket | null
  >;
  actionsRef: import('react').MutableRefObject<Record<string, unknown>>;
};

export function useSocketActions(): Omit<
  UseSocketReturn,
  | 'connected'
  | 'playerId'
  | 'lobby'
  | 'gameState'
  | 'isSpectator'
  | 'error'
  | 'hardResetInFlight'
  | 'hubPresence'
  | 'chatMessages'
  | 'sketchDrawLocalHints'
  | 'sketchDrawRoomAlerts'
  | 'sketchDrawGuessFeed'
  | 'sketchDrawTimeTick'
  | 'sketchDrawDisbandAt'
  | 'sketchDrawRemoteBatch'
  | 'sketchDrawCanvasSync'
  | 'requestSketchCanvasRecovery'
  | 'clearSketchDrawLocalHints'
>;

export interface UseHubLiveReturn {
  connected: boolean;
  hubPresence: HubPresenceState;
  error: string | null;
  clearError: () => void;
  refreshDisplayName: (name: string) => void;
  requestHubPresenceRefresh: () => void;
}

export function useHubLive(): UseHubLiveReturn;

export { useGameRoom } from '@/hooks/useGameRoom';
export type { UseGameRoomOptions, UseGameRoomReturn } from '@/hooks/useGameRoom';
export { useBrowserStorage } from '@/hooks/useBrowserStorage';
export { useCoreSession } from '@/hooks/useCoreSession';
