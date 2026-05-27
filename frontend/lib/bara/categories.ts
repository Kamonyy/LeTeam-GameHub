/**
 * Category manifest for lobby UI — sourced from shared pack library.
 */
import { getCategoryManifest } from '@shared/games/bara-alsalafa/categories/index.js';

export interface CategoryPackageMeta {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  wordCount: number;
  sampleWords: string[];
}

export const CATEGORY_PACKAGES: CategoryPackageMeta[] = getCategoryManifest();

export function getCategoryMeta(id: string) {
  return CATEGORY_PACKAGES.find((p) => p.id === id);
}
