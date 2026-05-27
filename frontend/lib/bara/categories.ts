/**
 * Category manifest for lobby UI — metadata only (no full word packs in bundle).
 */
import { CATEGORY_MANIFEST } from '@shared/games/bara-alsalafa/categories/package-manifest.js';

export interface CategoryPackageMeta {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  wordCount: number;
  sampleWords: string[];
}

export const CATEGORY_PACKAGES: CategoryPackageMeta[] = CATEGORY_MANIFEST;

export function getCategoryMeta(id: string) {
  return CATEGORY_PACKAGES.find((p) => p.id === id);
}
