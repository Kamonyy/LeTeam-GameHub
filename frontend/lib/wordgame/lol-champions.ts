import championsData from '@shared/games/wordgame/data/lol-champions.json';

export interface LolChampionAudio {
  choose?: string;
  ban?: string;
  stinger?: string;
}

export interface LolChampion {
  id: string;
  key: string;
  name: string;
  tags: string[];
  partype: string;
  audio?: LolChampionAudio;
}

export const LOL_DDRAGON_VERSION = championsData.version;
type ChampionRow = (typeof championsData.champions)[number] & {
  tags?: string[];
  partype?: string;
  audio?: LolChampionAudio;
};

export const LOL_CHAMPIONS: LolChampion[] = (
  championsData.champions as ChampionRow[]
).map((c) => ({
  id: c.id,
  key: c.key,
  name: c.name,
  tags: c.tags ?? [],
  partype: c.partype ?? 'Unknown',
  ...(c.audio ? { audio: c.audio } : {}),
}));

const CHAMPION_BY_ID = new Map(LOL_CHAMPIONS.map((c) => [c.id, c]));

/** Riot role tags used for class filters (stable order). */
export const LOL_CHAMPION_CLASSES = [
  'Assassin',
  'Fighter',
  'Mage',
  'Marksman',
  'Support',
  'Tank',
] as const;

export type LolChampionClass = (typeof LOL_CHAMPION_CLASSES)[number];

const CLASS_LABELS: Record<string, string> = {
  Assassin: 'Assassin',
  Fighter: 'Fighter',
  Mage: 'Mage',
  Marksman: 'Marksman',
  Support: 'Support',
  Tank: 'Tank',
};

export function championClassLabel(tag: string): string {
  return CLASS_LABELS[tag] ?? tag;
}

const DDRAGON_CDN = 'https://ddragon.leagueoflegends.com/cdn';

const CDRAGON_ROLE_ICON_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champion-details/global/default';

/** Official LoL client class/role icon (Community Dragon). */
export function championClassIconSrc(tag: LolChampionClass): string {
  return `${CDRAGON_ROLE_ICON_BASE}/role-icon-${tag.toLowerCase()}.png`;
}

export function getLolChampionById(id: string): LolChampion | undefined {
  return CHAMPION_BY_ID.get(id);
}

/** Square champion icon from Riot Data Dragon (version-pinned in lol-champions.json). */
export function championIconSrc(
  id: string,
  version = LOL_DDRAGON_VERSION
): string {
  return `${DDRAGON_CDN}/${version}/img/champion/${id}.png`;
}
