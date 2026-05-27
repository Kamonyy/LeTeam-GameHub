/** Community Dragon raw base (mirrors Riot LCU / game-data assets). */
export const CDRAGON_RAW =
  'https://raw.communitydragon.org/latest/plugins';

export const CDRAGON_GAME_DATA = `${CDRAGON_RAW}/rcp-be-lol-game-data/global/default`;

export const CDRAGON_CHAMP_SELECT_SFX = `${CDRAGON_RAW}/rcp-fe-lol-champ-select/global/default/sounds`;

/** Map `/lol-game-data/assets/...` paths from champion JSON to full URLs. */
export function cdragonAssetUrl(assetPath: string): string {
  if (!assetPath) return '';
  if (assetPath.startsWith('http')) return assetPath;
  const normalized = assetPath.startsWith('/lol-game-data/assets/')
    ? assetPath.replace('/lol-game-data/assets', '')
    : assetPath.startsWith('/')
      ? assetPath
      : `/${assetPath}`;
  return `${CDRAGON_GAME_DATA}${normalized}`;
}

export function cdragonChampionJsonUrl(championKey: string): string {
  return `${CDRAGON_GAME_DATA}/v1/champions/${championKey}.json`;
}
