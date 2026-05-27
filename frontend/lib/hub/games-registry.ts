export interface GameCatalogEntry {
  id: string;
  name: string;
  /** One-line blurb for the home page game grid */
  tagline: string;
  /** Longer copy shown on the game page and in the waiting lobby */
  lobbyDescription: string[];
  href: string;
  active: boolean;
  disabledReason?: string;
  players: string;
  icon?: string;
}

export const GAMES: GameCatalogEntry[] = [
  {
    id: 'dominoes',
    name: 'Dominoes',
    tagline: 'Block dominoes for 2–4 players — match tiles, empty your hand, score the round.',
    lobbyDescription: [
      'Draw/Block dominoes with a shared chain: on your turn, play a tile that matches an open end, or draw from the boneyard until you can play or must pass.',
      'The first player to play all their tiles wins the round and scores the pips left in everyone else\'s hands. Play to a point cap in Free-for-All or 2v2 teams.',
      'This mode is temporarily offline while we improve fairness, layout, and polish.',
    ],
    href: '/dominoes',
    active: false,
    disabledReason: 'Temporarily unavailable while we improve the experience.',
    players: '2–4',
    icon: '🁢',
  },
  {
    id: 'wordgame',
    name: 'Secret Word',
    tagline: 'Two players, one secret word — guess it through voice chat and in-app confirms.',
    lobbyDescription: [
      'Built for voice chat: one player picks a secret word, the other asks yes/no questions out loud, then locks in guesses here.',
      'Each correct guess earns a point; first to the chosen score wins the match. Share the room link so your friend joins the same lobby.',
      'Best with exactly 2 players in the same call (Discord, Zoom, etc.).',
    ],
    href: '/wordgame',
    active: true,
    players: '2',
    icon: '🔤',
  },
];

export function getGameEntry(id: string): GameCatalogEntry | undefined {
  return GAMES.find((g) => g.id === id);
}

export function isGameActive(id: string): boolean {
  return getGameEntry(id)?.active ?? false;
}
