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
];
