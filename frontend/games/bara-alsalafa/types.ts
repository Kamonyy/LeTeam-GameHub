export type BaraPhase =
  | 'reveal'
  | 'interrogation'
  | 'voting'
  | 'defend'
  | 'revote'
  | 'outcast_guess'
  | 'round_end'
  | 'match_over';

export type BaraMicroStatus =
  | 'waiting_reveal'
  | 'role_revealed'
  | 'thinking'
  | 'voted';

export interface BaraPlayerCard {
  id: string;
  microStatus: BaraMicroStatus;
  roleRevealed: boolean;
  eliminated: boolean;
  voteLocked: boolean;
  isOutcast: boolean;
}

export interface BaraRoleView {
  isOutcast: boolean;
  categoryName: string;
  showSecretWord: boolean;
  secretWord: string | null;
  outcastMessage: string | null;
}

export interface BaraRoundOutcome {
  type:
    | 'wrong_accusation'
    | 'outcast_caught'
    | 'outcast_stole_win'
    | 'insiders_win';
  eliminatedId?: string;
  innocent?: boolean;
  awaitingGuess?: boolean;
  guess?: string;
  secretWord?: string;
}

export interface BaraGameState {
  gameType: 'bara-alsalafa';
  phase: BaraPhase;
  playerIds: string[];
  playerCards: BaraPlayerCard[];
  scores: Record<string, number>;
  roundsToWin: number;
  roundNumber: number;
  categoryPackageId: string;
  categoryName: string;
  categoryNameEn: string;
  secretWord: string | null;
  roleView: BaraRoleView | null;
  cheatSheetWords: string[];
  currentInterviewerId: string | null;
  currentTargetId: string | null;
  phaseEndsAt: number | null;
  phaseRemainingMs: number | null;
  votesCast: number;
  votesExpected: number;
  tiedPlayerIds: string[];
  myVoteTarget: string | null;
  canReveal: boolean;
  canVote: boolean;
  canGuess: boolean;
  eliminatedThisRound: string | null;
  roundOutcome: BaraRoundOutcome | null;
  outcastId: string | null;
  revealedSecretWord: string | null;
  winnerId: string | null;
  iAmOutcast: boolean;
}

export interface BaraGameSettings {
  categoryPackageId: string;
  roundsToWin: number;
}
