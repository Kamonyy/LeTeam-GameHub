import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCategoryManifest } from '../../shared/games/bara-alsalafa/categories/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(
  __dirname,
  '../../shared/games/bara-alsalafa/categories/package-manifest.js'
);

const manifest = getCategoryManifest();
const body = `/** Lobby UI metadata only — no word lists (generated). */

/** @type {{ id: string; nameAr: string; nameEn: string; description: string; wordCount: number; sampleWords: string[] }[]} */
export const CATEGORY_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;

await fs.writeFile(out, body);
console.log(`Wrote ${manifest.length} entries to ${out}`);
