/**
 * Sync LoL champion roster from Riot Data Dragon (metadata + Community Dragon audio URLs).
 * Run: npm run fetch:lol-champions
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHARED_DATA = path.join(
  __dirname,
  '..',
  '..',
  'shared',
  'games',
  'wordgame',
  'data',
  'lol-champions.json'
);

const PINNED_VERSION = process.env.DDRAGON_VERSION || '16.10.1';
const CDRAGON_GAME_DATA =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

function mapCdragonAsset(assetPath) {
  if (!assetPath || typeof assetPath !== 'string') return '';
  return `${CDRAGON_GAME_DATA}${assetPath.replace('/lol-game-data/assets', '')}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const version =
    process.env.DDRAGON_VERSION ||
    (await fetchJson('https://ddragon.leagueoflegends.com/api/versions.json'))[0] ||
    PINNED_VERSION;

  console.log(`Data Dragon version: ${version}`);

  const championJson = await fetchJson(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
  );

  const champions = Object.values(championJson.data)
    .map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      tags: Array.isArray(c.tags) ? [...c.tags] : [],
      partype: typeof c.partype === 'string' ? c.partype : 'Unknown',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  console.log(`Fetching Community Dragon audio for ${champions.length} champions…`);

  let withAudio = 0;
  for (let i = 0; i < champions.length; i++) {
    const c = champions[i];
    try {
      const detail = await fetchJson(`${CDRAGON_GAME_DATA}/v1/champions/${c.key}.json`);
      const choose = mapCdragonAsset(detail.chooseVoPath);
      const ban = mapCdragonAsset(detail.banVoPath);
      const stinger = mapCdragonAsset(detail.stingerSfxPath);
      if (choose || ban || stinger) {
        c.audio = {
          ...(choose ? { choose } : {}),
          ...(ban ? { ban } : {}),
          ...(stinger ? { stinger } : {}),
        };
        withAudio++;
      }
    } catch (err) {
      console.warn(`  skip audio for ${c.name}:`, err.message);
    }
    if (i % 20 === 19) await sleep(120);
  }

  const payload = {
    version,
    updatedAt: new Date().toISOString(),
    champions,
  };

  await fs.mkdir(path.dirname(SHARED_DATA), { recursive: true });
  await fs.writeFile(SHARED_DATA, JSON.stringify(payload, null, 2));

  console.log(`Wrote ${champions.length} champions to ${SHARED_DATA}`);
  console.log(`Embedded audio URLs for ${withAudio} champions (choose/ban VO + stinger).`);
  console.log(
    'Icons load from ddragon.leagueoflegends.com; VO/SFX from raw.communitydragon.org.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
