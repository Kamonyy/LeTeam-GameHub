/**
 * Lobby-safe metadata (no full word lists in frontend bundle).
 */

import { SKETCH_CATEGORY_PACKAGES } from "./word-packs.js";

export const SKETCH_CATEGORY_MANIFEST = SKETCH_CATEGORY_PACKAGES.map((p) => ({
  id: p.id,
  nameAr: p.nameAr,
  nameEn: p.nameEn,
  wordCount: p.words.length,
  sampleWords: p.words.slice(0, 3),
}));
