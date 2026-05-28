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

const CLASS_SET = new Set<string>(LOL_CHAMPION_CLASSES);

/** Primary class — Riot Data Dragon `tags[0]` (matches LoL client filters). */
export function championPrimaryClass(
  champ: Pick<LolChampion, 'tags'>
): LolChampionClass | null {
  const primary = champ.tags[0];
  return primary && CLASS_SET.has(primary) ? (primary as LolChampionClass) : null;
}

/** Secondary class when Riot assigns a second tag. */
export function championSecondaryClass(
  champ: Pick<LolChampion, 'tags'>
): LolChampionClass | null {
  const secondary = champ.tags[1];
  return secondary && CLASS_SET.has(secondary) ?
      (secondary as LolChampionClass)
    : null;
}

/** Filter buckets use primary class only so each champion appears once. */
export function championMatchesClassFilter(
  champ: Pick<LolChampion, 'tags'>,
  filter: LolChampionClass | null
): boolean {
  if (!filter) return true;
  return champ.tags[0] === filter;
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

/** Uniform index in [0, max) — crypto.getRandomValues when available. */
function randomUniformIndex(max: number): number {
  if (max <= 1) return 0;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bucket = new Uint32Array(1);
    crypto.getRandomValues(bucket);
    return bucket[0]! % max;
  }
  return Math.floor(Math.random() * max);
}

/** Fair uniform pick from the full roster (every champion equally likely). */
export function pickRandomLolChampion(): LolChampion {
  const n = LOL_CHAMPIONS.length;
  if (n === 0) {
    throw new Error('Champion roster is empty');
  }
  return LOL_CHAMPIONS[randomUniformIndex(n)]!;
}

/** Square champion icon from Riot Data Dragon (version-pinned in lol-champions.json). */
export function championIconSrc(
  id: string,
  version = LOL_DDRAGON_VERSION
): string {
  return `${DDRAGON_CDN}/${version}/img/champion/${id}.png`;
}
