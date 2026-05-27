import type { MatchSettings, WordGameSettings, HubPresenceState } from '@/lib/hub/types';
import type { GameState, Tile } from '@/games/dominoes/types';
import type { WordGameState } from '@/games/wordgame/types';

export type HubGameState = GameState | WordGameState;

export interface UseSocketReturn {
  connected: boolean;
  playerId: string;
  lobby: import('@/lib/hub/types').LobbyState | null;
  gameState: HubGameState | null;
  error: string | null;
  hubPresence: HubPresenceState;
  clearError: () => void;
  refreshDisplayName: (name: string) => void;
  createRoom: (displayName: string, gameType?: string) => Promise<string | null>;
  joinRoom: (roomId: string, displayName: string) => Promise<boolean>;
  leaveRoom: () => void;
  updateRoomSettings: (settings: Partial<MatchSettings | WordGameSettings>) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  kickPlayer: (targetPlayerId: string) => Promise<boolean>;
  cancelMatch: () => Promise<boolean>;
  playMove: (tile: Tile, end: 'left' | 'right') => void;
  drawTile: () => void;
  passTurn: () => void;
  submitSecretWord: (word: string) => Promise<boolean>;
  confirmWordGuessed: () => Promise<boolean>;
}

export function useSocket(): UseSocketReturn;
