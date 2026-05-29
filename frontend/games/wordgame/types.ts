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

export type ScratchpadNote = {
  id: string;
  text: string;
  createdAt: number;
};

/** Secret assignment a player must guess (spectator DTO). */
export interface WordGameGuesserAssignment {
  word: string;
  championId: string | null;
  assignedByPlayerId: string | null;
}

export interface WordGameState {
  roomId?: string;
  gameType: 'wordgame';
  /** Present on neutral spectator payloads from the server */
  isSpectator?: boolean;
  /** Per-player setup submission flags (spectator DTO) */
  submissionStatus?: Record<string, boolean>;
  /** Live clue notes per player (spectator DTO) */
  scratchpadsByPlayer?: Record<string, ScratchpadNote[]>;
  /** Word/champion each player must guess (spectator DTO, active round+) */
  assignmentsForGuesser?: Record<string, WordGameGuesserAssignment>;
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
  /** Shown at round end — what your opponent chose for you to guess */
  opponentChosenWord: string | null;
  opponentChosenChampionId: string | null;
  revealedWord: string | null;
  revealedChampionId: string | null;
  winnerId: string | null;
  lastGuesserId: string | null;
  canConfirmGuessed: boolean;
  lastAction: WordGameLastAction | null;
}
