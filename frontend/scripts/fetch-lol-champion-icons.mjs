/**
 * Sync LoL champion roster from Riot Data Dragon (metadata only; icons load from CDN at runtime).
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

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
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
    .map((c) => ({ id: c.id, key: c.key, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  const payload = {
    version,
    updatedAt: new Date().toISOString(),
    champions,
  };

  await fs.mkdir(path.dirname(SHARED_DATA), { recursive: true });
  await fs.writeFile(SHARED_DATA, JSON.stringify(payload, null, 2));

  console.log(`Wrote ${champions.length} champions to ${SHARED_DATA}`);
  console.log(
    'Icons are loaded at runtime from ddragon.leagueoflegends.com (see championIconSrc).'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
