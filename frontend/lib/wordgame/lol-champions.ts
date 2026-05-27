import championsData from '@shared/games/wordgame/data/lol-champions.json';

export interface LolChampion {
  id: string;
  key: string;
  name: string;
}

export const LOL_DDRAGON_VERSION = championsData.version;
export const LOL_CHAMPIONS: LolChampion[] = championsData.champions;

export function getLolChampionById(id: string): LolChampion | undefined {
  return LOL_CHAMPIONS.find((c) => c.id === id);
}

/** Champion splash icon (served from /public/wordgame/champions). */
export function championIconSrc(id: string): string {
  return `/wordgame/champions/${id}.png`;
}
