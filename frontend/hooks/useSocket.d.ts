import type { GameState, LobbyState } from '@/lib/types';

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
  startGame: () => Promise<boolean>;
  playMove: (tile: { left: number; right: number }, end: 'left' | 'right') => void;
  drawTile: () => void;
  passTurn: () => void;
}

export function useSocket(): UseSocketReturn;
