/**
 * Fetches LoL champion manifest + icons from Riot Data Dragon.
 * Run: node scripts/fetch-lol-champion-icons.mjs
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.join(__dirname, '..');
const ICON_DIR = path.join(FRONTEND_ROOT, 'public', 'wordgame', 'champions');
const SHARED_DATA = path.join(
  FRONTEND_ROOT,
  '..',
  'shared',
  'games',
  'wordgame',
  'data',
  'lol-champions.json',
);

const PINNED_VERSION = process.env.DDRAGON_VERSION || '16.10.1';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

async function main() {
  const version =
    process.env.DDRAGON_VERSION ||
    (await fetchJson('https://ddragon.leagueoflegends.com/api/versions.json'))[0] ||
    PINNED_VERSION;

  console.log(`Data Dragon version: ${version}`);

  const championJson = await fetchJson(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
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
  await fs.mkdir(ICON_DIR, { recursive: true });

  await fs.writeFile(SHARED_DATA, JSON.stringify(payload, null, 2));
  await fs.writeFile(
    path.join(ICON_DIR, 'manifest.json'),
    JSON.stringify(payload, null, 2),
  );

  let downloaded = 0;
  let skipped = 0;

  for (const champ of champions) {
    const dest = path.join(ICON_DIR, `${champ.id}.png`);
    try {
      await fs.access(dest);
      skipped += 1;
      continue;
    } catch {
      /* missing */
    }
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`;
    await downloadFile(url, dest);
    downloaded += 1;
    if (downloaded % 25 === 0) {
      console.log(`Downloaded ${downloaded}/${champions.length}…`);
    }
  }

  console.log(
    `Done: ${champions.length} champions, ${downloaded} downloaded, ${skipped} already present.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
