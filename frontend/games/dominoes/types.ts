export interface Tile {
  left: number;
  right: number;
}

export interface BoardTile {
  left: number;
  right: number;
  isDouble: boolean;
}

export interface ValidMove {
  tile: Tile;
  end: 'left' | 'right';
}

export interface MatchSettings {
  scoreCap: number;
  mode: 'ffa' | '2v2';
  handSize: number;
}

export type GamePhase = 'playing' | 'round_over' | 'match_over';

export interface GameLastAction {
  type: 'play' | 'draw' | 'pass' | 'gameover';
  playerId?: string;
  winnerId?: string;
  reason?: 'domino' | 'blocked';
  points?: number;
  roundNumber?: number;
  auto?: boolean;
  tile?: Tile;
  end?: 'left' | 'right';
}

export interface GameState {
  roomId?: string;
  phase: GamePhase;
  board: BoardTile[];
  openEnds: { left: number; right: number } | null;
  currentPlayerId: string;
  playerIds: string[];
  myHand: Tile[];
  tileCounts: Record<string, number>;
  boneyardCount: number;
  matchScores: Record<string, number>;
  roundWinnerId: string | null;
  matchWinnerId: string | null;
  roundNumber: number;
  settings: MatchSettings;
  teamIds: Record<string, 'team1' | 'team2'>;
  lastAction: GameLastAction | null;
  turnTimeRemaining: number;
  turnTimerPaused: boolean;
  validMoves: ValidMove[];
}

export const TEAM_LABELS: Record<'team1' | 'team2', string> = {
  team1: 'Team 1',
  team2: 'Team 2',
};
