import championsData from '@shared/games/wordgame/data/lol-champions.json';

export interface LolChampion {
  id: string;
  key: string;
  name: string;
}

export const LOL_DDRAGON_VERSION = championsData.version;
export const LOL_CHAMPIONS: LolChampion[] = championsData.champions;

const CHAMPION_BY_ID = new Map(LOL_CHAMPIONS.map((c) => [c.id, c]));

const DDRAGON_CDN = 'https://ddragon.leagueoflegends.com/cdn';

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
