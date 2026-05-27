import type { LobbyState, MatchSettings } from '@/lib/hub/types';
import type { GameState, Tile } from '@/games/dominoes/types';

export interface UseSocketReturn {
  connected: boolean;
  playerId: string;
  lobby: LobbyState | null;
  gameState: GameState | null;
  error: string | null;
  clearError: () => void;
  createRoom: (displayName: string) => Promise<string | null>;
  joinRoom: (roomId: string, displayName: string) => Promise<boolean>;
  leaveRoom: () => void;
  updateRoomSettings: (settings: Partial<MatchSettings>) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  playMove: (tile: Tile, end: 'left' | 'right') => void;
  drawTile: () => void;
  passTurn: () => void;
}

export function useSocket(): UseSocketReturn;
