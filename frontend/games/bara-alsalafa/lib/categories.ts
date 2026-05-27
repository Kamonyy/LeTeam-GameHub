/** Lobby UI metadata — mirrors shared/games/bara-alsalafa/categories.js */

export interface CategoryPackageMeta {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  sampleWords: string[];
}

export const CATEGORY_PACKAGES: CategoryPackageMeta[] = [
  {
    id: 'food',
    nameAr: 'الأكلات والمشروبات',
    nameEn: 'Food & Drinks',
    description: 'أطباق يومية محلية وعالمية ومشروبات',
    sampleWords: ['شاورما', 'دولمة', 'منسف', 'كشري', 'كبسة', 'فلافل', 'شاي كرك', 'برجر', 'بيتزا', 'كنافة'],
  },
  {
    id: 'jobs',
    nameAr: 'الوظائف والمهن',
    nameEn: 'Jobs & Professions',
    description: 'مهن ومسارات مهنية متنوعة',
    sampleWords: ['مبرمج', 'طبيب', 'سباك', 'طيار', 'صانع محتوى', 'شرطي', 'طباخ', 'رائد فضاء', 'معلم', 'محامي'],
  },
  {
    id: 'places',
    nameAr: 'أماكن ومعالم',
    nameEn: 'Places & Landmarks',
    description: 'بيئات شائعة ومعالم سياحية',
    sampleWords: ['مطار', 'قاعة رياضية', 'سينما', 'المحطة', 'مستشفى', 'جامعة', 'شاطئ', 'الأهرامات', 'مقهى'],
  },
  {
    id: 'popculture',
    nameAr: 'ثقافة بوب ومشاهد',
    nameEn: 'Pop Culture & Media',
    description: 'شخصيات وأعمال مشهورة عالمياً وإقليمياً',
    sampleWords: ['ميسي', 'رونالدو', 'سبايدرمان', 'باتمان', 'المحقق كونان', 'أنمي', 'لعبة فيفا', 'قراصنة الكاريبي'],
  },
  {
    id: 'household',
    nameAr: 'أغراض ومقتنيات',
    nameEn: 'Household Items',
    description: 'أشياء يومية في المنزل والمكتب',
    sampleWords: ['غسالة', 'ثلاجة', 'ملعقة', 'ريموت كنترول', 'شاحن', 'مفتاح', 'مرآة', 'ستائر', 'مكنسة'],
  },
];

export function getCategoryMeta(id: string) {
  return CATEGORY_PACKAGES.find((p) => p.id === id);
}
