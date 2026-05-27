export type WordGamePhase = 'setup' | 'playing' | 'round_end';

export interface WordGameLastAction {
  type: string;
  playerId?: string;
  guesserId?: string;
  creatorId?: string;
  word?: string;
  roundNumber?: number;
}

export interface WordGameState {
  roomId?: string;
  gameType: 'wordgame';
  phase: WordGamePhase;
  playerIds: string[];
  scores: Record<string, number>;
  roundNumber: number;
  iHaveSubmitted: boolean;
  opponentHasSubmitted: boolean;
  targetWordLength: number;
  revealedWord: string | null;
  lastGuesserId: string | null;
  canConfirmGuessed: boolean;
  lastAction: WordGameLastAction | null;
}
