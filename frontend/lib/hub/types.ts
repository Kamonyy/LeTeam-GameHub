export interface MatchSettings {
  scoreCap: number;
  mode: 'ffa' | '2v2';
  handSize: number;
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
  settings?: MatchSettings;
}

export const SCORE_CAP_OPTIONS = [50, 100, 150, 200] as const;
