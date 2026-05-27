/** Shared types for lobby and game state synchronization. */

export interface Tile {
  left: number;
  right: number;
}

export interface BoardTile {
  left: number;
  right: number;
  isDouble: boolean;
}

export interface LobbyPlayer {
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
  minPlayers: number;
  maxPlayers: number;
}

export interface ValidMove {
  tile: Tile;
  end: 'left' | 'right';
}

export interface GameState {
  roomId?: string;
  phase: 'playing' | 'finished';
  board: BoardTile[];
  openEnds: { left: number; right: number } | null;
  currentPlayerId: string;
  playerIds: string[];
  myHand: Tile[];
  tileCounts: Record<string, number>;
  boneyardCount: number;
  scores: Record<string, number>;
  winnerId: string | null;
  lastAction: Record<string, unknown> | null;
  turnTimeRemaining: number;
  turnTimerPaused: boolean;
  validMoves: ValidMove[];
}

export interface GameError {
  message: string;
}
