export interface GameCatalogEntry {
  id: string;
  name: string;
  description: string;
  href: string;
  active: boolean;
  players: string;
  icon?: string;
}

export const GAMES: GameCatalogEntry[] = [
  {
    id: 'dominoes',
    name: 'Dominoes',
    description: 'Classic Draw/Block dominoes. 2–4 players, real-time.',
    href: '/dominoes',
    active: true,
    players: '2–4',
    icon: '🁢',
  },
  {
    id: 'wordgame',
    name: 'Secret Word',
    description: '2-player guessing game for voice chat. Choose words, ask clues, score points.',
    href: '/wordgame',
    active: true,
    players: '2',
    icon: '🔤',
  },
];
