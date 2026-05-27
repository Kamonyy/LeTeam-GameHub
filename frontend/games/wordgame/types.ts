export type WordGamePhase = 'setup' | 'playing' | 'round_end' | 'match_over';

export interface WordGameLastAction {
  type: string;
  playerId?: string;
  guesserId?: string;
  creatorId?: string;
  winnerId?: string;
  word?: string;
  roundNumber?: number;
}

export interface WordGameState {
  roomId?: string;
  gameType: 'wordgame';
  phase: WordGamePhase;
  playerIds: string[];
  scores: Record<string, number>;
  pointsToWin: number;
  roundNumber: number;
  iHaveSubmitted: boolean;
  opponentHasSubmitted: boolean;
  myChosenWord: string | null;
  revealedWord: string | null;
  winnerId: string | null;
  lastGuesserId: string | null;
  canConfirmGuessed: boolean;
  lastAction: WordGameLastAction | null;
}
