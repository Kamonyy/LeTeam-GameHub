export type TavernCouncilPhase =
  | 'role_reveal'
  | 'day'
  | 'night'
  | 'morning'
  | 'match_over';

export type RoleTeam = 'good' | 'evil' | 'neutral';

export type SeerAlignment = 'GOOD' | 'EVIL';

export interface TavernRoleView {
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

export interface TavernPlayerCard {
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

export interface TavernNightStepView {
  index: number;
  total: number;
  key: string;
  titleEn: string;
  titleAr: string;
  instructionEn: string;
  instructionAr: string;
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
  selectedTargetId: string | null;
  blockedTargetIds: string[];
}

export interface TavernNarratorPlayerRow {
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

export interface TavernSeerReveal {
  playerId: string;
  alignment: SeerAlignment;
}

export type ChroniclePeriodType =
  | 'setup'
  | 'day'
  | 'night'
  | 'morning'
  | 'match_over';

export interface TavernChroniclePeriod {
  type: ChroniclePeriodType;
  dayNumber: number;
  nightNumber: number;
}

export interface TavernChronicleEntry {
  at: number;
  kind: string;
  period: TavernChroniclePeriod;
  playerId?: string;
  targetId?: string;
  roleId?: string;
  alignment?: SeerAlignment;
  stepKey?: string;
  stepTitleEn?: string;
  skipped?: boolean;
  deaths?: string[];
  saved?: string[];
  silenced?: string[];
  dayNumber?: number;
  nightNumber?: number;
  winnerTeam?: 'good' | 'evil';
}

export interface TavernChronicleSection {
  key: string;
  label: string;
  period: TavernChroniclePeriod;
  entries: TavernChronicleEntry[];
}

export interface TavernNarratorPanel {
  allPlayers: TavernNarratorPlayerRow[];
  roleCounts: Record<string, number>;
  suggestedCounts: Record<string, number>;
  setupWarnings: string[];
  nightStep: TavernNightStepView | null;
  lastSeerReveal: TavernSeerReveal | null;
  eventLog: { at: number; message: string }[];
  chronicle: TavernChronicleSection[];
  seerResults: Record<string, SeerAlignment>;
  canStartDay: boolean;
  canDayEliminate: boolean;
  canBeginNight: boolean;
  canConfirmNightStep: boolean;
  canEndMorning: boolean;
}

export interface TavernMorningSummary {
  deaths: { playerId: string; roleId: string | null }[];
  saved: { playerId: string }[];
  silenced: string[];
  seerInsights: Record<string, SeerAlignment>;
}

export interface TavernNightCallout {
  isYourTurn: boolean;
  stepTitleEn: string | null;
  stepTitleAr: string | null;
  roleNameEn: string | null;
  roleIcon: string | null;
}

export interface TavernCouncilGameState {
  gameType: 'mafia';
  stateVersion: number;
  phase: TavernCouncilPhase;
  playerIds: string[];
  narratorId: string;
  dayNumber: number;
  nightNumber: number;
  revealRoleOnDeath: boolean;
  playerCards: TavernPlayerCard[];
  isNarrator: boolean;
  winnerTeam: 'good' | 'evil' | null;
  lastMorningSummary: TavernMorningSummary | null;
  canAcknowledgeRole: boolean;
  myRoleAcknowledged: boolean;
  myRole?: TavernRoleView | null;
  myColor?: string | null;
  iAmAlive?: boolean;
  iAmSilenced?: boolean;
  playerChronicle?: TavernChronicleSection[];
  nightCallout?: TavernNightCallout | null;
  narratorPanel?: TavernNarratorPanel;
}

export interface TavernCouncilSettings {
  narratorId: string | null;
  revealRoleOnDeath: boolean;
  roleCounts: Record<string, number> | null;
  roleAssignments?: Record<string, string>;
}

export type TavernNarratorAction =
  | 'start_day'
  | 'day_eliminate'
  | 'begin_night'
  | 'set_night_target'
  | 'confirm_night_step'
  | 'end_morning'
  | 'reset_match';
