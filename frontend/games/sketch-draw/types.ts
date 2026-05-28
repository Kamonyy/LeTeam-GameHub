export type SketchDrawPhase =
  | 'word_select'
  | 'drawing'
  | 'round_end'
  | 'match_over';

export interface SketchStrokeBatch {
  batchId: string;
  tool: string;
  color: string;
  size: number;
  points: number[][];
  strokeComplete?: boolean;
}

export type StrokeBatchPayload = SketchStrokeBatch & { strokeComplete?: boolean };

export interface SketchDrawGameState {
  gameType: 'sketch-draw';
  phase: SketchDrawPhase;
  stateVersion: number;
  playerIds: string[];
  turnOrder: string[];
  currentDrawerId: string | null;
  roundNumber: number;
  totalRounds: number;
  drawTimerSec: number;
  scores: Record<string, number>;
  phaseTimeRemaining: number;
  phaseEndsAt: number | null;
  lastAction: Record<string, unknown> | null;
  lastRoundBreakdown: {
    drawerId?: string;
    secretWord?: string;
    correctGuessers?: string[];
    drawerPoints?: number;
    roundNumber?: number;
  } | null;
  winnerId: string | null;
  canvasBufferVersion: number;
  canvasBuffer: SketchStrokeBatch[];
  solvedThisRound: string[];
  isDrawer: boolean;
  canSelectWord: boolean;
  canDraw: boolean;
  canGuess: boolean;
  guessFrozen: boolean;
  wordOptions: string[] | null;
  revealedWord: string | null;
  /** Per-letter blanks shown during drawing (e.g. "_ _ _"). */
  wordBlanks: string | null;
  /** Secret word visible only to the drawer during drawing. */
  drawerWord: string | null;
}

export type BrushSizeId = 'thin' | 'medium' | 'thick' | 'chisel';

export const BRUSH_SIZE_MAP: Record<BrushSizeId, number> = {
  thin: 2,
  medium: 6,
  thick: 12,
  chisel: 18,
};

export const COLOR_SWATCHES = [
  '#1a1a2e',
  '#e94560',
  '#0f3460',
  '#533483',
  '#f39c12',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#e74c3c',
  '#1abc9c',
  '#f1c40f',
  '#ff6bcb',
  '#00d9ff',
  '#ffffff',
  '#94a3b8',
  '#fef08a',
];
