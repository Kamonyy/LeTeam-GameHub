export type MafiaPhase =
  | 'role_reveal'
  | 'day'
  | 'night'
  | 'morning'
  | 'match_over';

export type RoleTeam = 'good' | 'evil' | 'neutral';

export type SeerAlignment = 'GOOD' | 'EVIL';

export interface MafiaRoleView {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  team: RoleTeam;
  accentColor: string;
  pendingAcknowledge?: boolean;
}

export interface MafiaPlayerCard {
  id: string;
  color: string;
  alive: boolean;
  roleRevealed: boolean;
  roleId: string | null;
  roleNameEn: string | null;
  roleNameAr: string | null;
  roleIcon: string | null;
  silenced: boolean;
}

export interface MafiaNightStepView {
  index: number;
  total: number;
  key: string;
  titleEn: string;
  titleAr: string;
  instructionEn: string;
  instructionAr: string;
  /** Role holder(s) are dead — ritual theater only, no target recorded. */
  playAlongOnly: boolean;
  playAlongMessageEn: string | null;
  playAlongMessageAr: string | null;
  requiresTarget: boolean;
  allowSkip: boolean;
  roleId: string | null;
  roleNameEn: string | null;
  roleNameAr: string | null;
  roleIcon: string | null;
  roleHolders: {
    id: string;
    alive: boolean;
    color: string;
    roleNameEn: string | null;
    roleIcon: string | null;
  }[];
  /** Narrator tapped a player or Skip for this step. */
  choiceRecorded: boolean;
  /** Skip was chosen (no player target). */
  skipped: boolean;
  selectedTargetId: string | null;
  blockedTargetIds: string[];
}

export interface MafiaNarratorPlayerRow {
  id: string;
  color: string;
  alive: boolean;
  roleId: string;
  roleNameEn: string;
  roleNameAr: string;
  roleIcon: string;
  team: RoleTeam;
  roleAcknowledged: boolean;
}

export interface MafiaSeerReveal {
  playerId: string;
  alignment: SeerAlignment;
}

export type ChroniclePeriodType =
  | 'setup'
  | 'day'
  | 'night'
  | 'morning'
  | 'match_over';

export interface MafiaChroniclePeriod {
  type: ChroniclePeriodType;
  dayNumber: number;
  nightNumber: number;
}

export interface MafiaChronicleEntry {
  at: number;
  kind: string;
  period: MafiaChroniclePeriod;
  playerId?: string;
  actorPlayerId?: string;
  targetId?: string;
  roleId?: string;
  alignment?: SeerAlignment;
  stepKey?: string;
  stepTitleEn?: string;
  skipped?: boolean;
  playAlong?: boolean;
  deaths?: string[];
  saved?: string[];
  silenced?: string[];
  dayNumber?: number;
  nightNumber?: number;
  winnerTeam?: 'good' | 'evil';
}

export interface MafiaChronicleSection {
  key: string;
  label: string;
  period: MafiaChroniclePeriod;
  entries: MafiaChronicleEntry[];
}

export interface MafiaNarratorPanel {
  allPlayers: MafiaNarratorPlayerRow[];
  roleCounts: Record<string, number>;
  suggestedCounts: Record<string, number>;
  setupWarnings: string[];
  nightStep: MafiaNightStepView | null;
  lastSeerReveal: MafiaSeerReveal | null;
  eventLog: { at: number; message: string }[];
  chronicle: MafiaChronicleSection[];
  seerResults: Record<string, SeerAlignment>;
  canStartDay: boolean;
  canDayEliminate: boolean;
  canBeginNight: boolean;
  canConfirmNightStep: boolean;
  canEndMorning: boolean;
}

/** Morning recap visible to players (and as the public subset for narrators). */
export interface MafiaPlayerMorningSummary {
  deaths: { playerId: string; roleId: string | null }[];
  saved: { playerId: string }[];
  silenced: string[];
}

export type MafiaNightRecapOutcome =
  | 'skipped'
  | 'protected'
  | 'saved_kill'
  | 'kill_landed'
  | 'silenced'
  | 'inspected'
  | 'sheriff_executed_evil'
  | 'sheriff_executed_innocent'
  | 'sheriff_misfire';

/** One line in the narrator’s private “what happened tonight” recap. */
export interface MafiaNightRecapBeat {
  roleId: 'doctor' | 'mafia' | 'sniper' | 'seer' | 'sheriff';
  icon: string;
  titleEn: string;
  targetPlayerId: string | null;
  outcome: MafiaNightRecapOutcome;
  alignment?: SeerAlignment;
}

/** Narrator-only fields on the morning recap (also stripped client-side when !isNarrator). */
export interface MafiaNarratorMorningSummary extends MafiaPlayerMorningSummary {
  seerInsights: Record<string, SeerAlignment>;
  mafiaAttempted?: string | null;
  mafiaKillLanded?: boolean;
  nightRecap: MafiaNightRecapBeat[];
}

/** @deprecated Prefer MafiaPlayerMorningSummary / MafiaNarratorMorningSummary */
export type MafiaMorningSummary = MafiaNarratorMorningSummary;

export interface MafiaNightCallout {
  isYourTurn: boolean;
  stepTitleEn: string | null;
  stepTitleAr: string | null;
  roleNameEn: string | null;
  roleIcon: string | null;
}

/** Fields shared by narrator and player serialized views. */
export interface MafiaGameStateBase {
  gameType: 'mafia';
  stateVersion: number;
  phase: MafiaPhase;
  playerIds: string[];
  narratorId: string;
  dayNumber: number;
  nightNumber: number;
  revealRoleOnDeath: boolean;
  playerCards: MafiaPlayerCard[];
  winnerTeam: 'good' | 'evil' | null;
  canAcknowledgeRole: boolean;
  myRoleAcknowledged: boolean;
  myRole?: MafiaRoleView | null;
  myColor?: string | null;
  iAmAlive?: boolean;
  iAmSilenced?: boolean;
  playerChronicle?: MafiaChronicleSection[];
  nightCallout?: MafiaNightCallout | null;
}

/** Player / non-narrator socket view — never includes narratorPanel. */
export interface MafiaPlayerGameState extends MafiaGameStateBase {
  isNarrator: false;
  lastMorningSummary: MafiaPlayerMorningSummary | null;
}

/** Narrator socket view — includes narratorPanel and full morning meta. */
export interface MafiaNarratorGameState extends MafiaGameStateBase {
  isNarrator: true;
  lastMorningSummary: MafiaNarratorMorningSummary | null;
  narratorPanel: MafiaNarratorPanel;
}

export type MafiaGameState = MafiaPlayerGameState | MafiaNarratorGameState;

export interface MafiaSettings {
  narratorId: string | null;
  revealRoleOnDeath: boolean;
  roleCounts: Record<string, number> | null;
  /** Host-only pre-deal map from server; never show in lobby UI. */
  roleAssignments?: Record<string, string>;
}

export type MafiaNarratorAction =
  | 'start_day'
  | 'day_eliminate'
  | 'begin_night'
  | 'set_night_target'
  | 'confirm_night_step'
  | 'end_morning'
  | 'reset_match';
