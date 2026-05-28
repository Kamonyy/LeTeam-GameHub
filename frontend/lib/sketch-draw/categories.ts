import { SKETCH_CATEGORY_MANIFEST } from '@shared/games/sketch-draw/data/package-manifest.js';

export interface SketchCategoryPackageMeta {
  id: string;
  nameAr: string;
  nameEn: string;
  wordCount: number;
  sampleWords: string[];
}

export const SKETCH_CATEGORY_PACKAGES: SketchCategoryPackageMeta[] =
  SKETCH_CATEGORY_MANIFEST;
