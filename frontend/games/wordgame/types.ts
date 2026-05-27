export type WordGamePhase = 'setup' | 'playing' | 'round_end' | 'match_over';
export type WordCategory = 'custom' | 'lol-champions';

export interface WordGameLastAction {
  type: string;
  playerId?: string;
  guesserId?: string;
  creatorId?: string;
  winnerId?: string;
  word?: string;
  championId?: string;
  roundNumber?: number;
}

export interface WordGameState {
  roomId?: string;
  gameType: 'wordgame';
  /** Server revision — ignore older broadcasts after a successful action */
  stateVersion?: number;
  phase: WordGamePhase;
  playerIds: string[];
  scores: Record<string, number>;
  pointsToWin: number;
  wordCategory: WordCategory;
  roundNumber: number;
  iHaveSubmitted: boolean;
  opponentHasSubmitted: boolean;
  myChosenWord: string | null;
  myChosenChampionId: string | null;
  revealedWord: string | null;
  revealedChampionId: string | null;
  winnerId: string | null;
  lastGuesserId: string | null;
  canConfirmGuessed: boolean;
  lastAction: WordGameLastAction | null;
}
