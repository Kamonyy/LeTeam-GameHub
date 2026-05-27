import { isGameEnabled } from '@shared/games/availability.js';

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

const CATALOG: Omit<GameCatalogEntry, 'active'>[] = [
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
    disabledReason: 'Temporarily unavailable while we improve the experience.',
    players: '2–4',
    icon: '🁢',
  },
  {
    id: 'wordgame',
    name: 'Secret Word',
    tagline: 'Two players, one secret word — guess it through voice chat and in-app confirms.',
    lobbyDescription: [
      'Built for voice chat: one player picks a secret word (or League champion), the other asks yes/no questions out loud, then confirms guesses here.',
      'Each correct guess earns a point; first to the chosen score wins the match. Share the room link so your friend joins the same lobby.',
      'In the lobby, choose Custom words or the League of Legends roster with champion search and portraits.',
      'Best with exactly 2 players in the same call (Discord, Zoom, etc.).',
    ],
    href: '/wordgame',
    players: '2',
    icon: '🔤',
  },
  {
    id: 'bara-alsalafa',
    name: 'برا السالفة',
    tagline: 'لعبة اجتماعية للتخمين والخداع — من 3 إلى 12 لاعباً، واحد برا السالفة!',
    lobbyDescription: [
      'لعبة حفلات عربية مستوحاة من Out of the Loop: الجميع يعرف الكلمة السرية إلا شخص واحد.',
      'اسألوا وتصوّتوا لاكتشاف من «برا السالفة»، أو اختبروا معرفتكم إن كنتم المطرود.',
      'اختر الحزمة: أكلات، مهن، أماكن، بوب كالتشر، أو أغراض منزلية — حتى 12 لاعباً في الغرفة.',
    ],
    href: '/bara-alsalafa',
    players: '3–12',
    icon: '🕵️',
  },
  {
    id: 'mafia',
    name: 'Mafia',
    tagline:
      'Face-to-face social deduction — one narrator guides the night; players only see their secret role.',
    lobbyDescription: [
      'Played in person: the website is a narrator console and role card, not the game board.',
      'One player is the narrator and runs day votes, night steps, and eliminations here.',
      'Everyone else joins on their phone to read their secret role and alive/dead status only.',
      '5–12 players with balanced Mafia, Seer, Doctor, Sniper, Sheriff, and Villagers.',
    ],
    href: '/mafia',
    players: '5–12',
    icon: '🎭',
  },
];

/** Hub catalog with `active` derived from shared availability flags. */
export const GAMES: GameCatalogEntry[] = CATALOG.map((entry) => ({
  ...entry,
  active: isGameEnabled(entry.id),
}));

export function getGameEntry(id: string): GameCatalogEntry | undefined {
  return GAMES.find((g) => g.id === id);
}

/** Whether the game can be played (hub cards, routes, room create). */
export function isGameActive(id: string): boolean {
  return isGameEnabled(id);
}

export { isGameEnabled };
