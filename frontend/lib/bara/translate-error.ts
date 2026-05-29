/** Maps hub / engine messages to Arabic for برا السالفة UI. */

const BARA_ERROR_AR: Record<string, string> = {
  'No votes cast': 'لم يُصوَّت أحد',
  'Not in reveal phase': 'ليست مرحلة الكشف',
  'Invalid player': 'لاعب غير صالح',
  'Player is eliminated': 'اللاعب مُستبعد',
  'Already revealed': 'كُشفت بطاقتك مسبقاً',
  'Not in ready phase': 'ليست مرحلة الاستعداد',
  'Reveal your card first': 'اكشف بطاقتك أولاً',
  'Already ready': 'أنت جاهز مسبقاً',
  'Not in interrogation phase': 'ليست مرحلة الاستجواب',
  'Eliminated players cannot vote': 'المُستبعدون لا يمكنهم التصويت',
  'Already requested vote': 'طلبت التصويت مسبقاً',
  'Only the current questioner can skip this turn':
    'فقط السائس الحالي يمكنه تخطي هذه الجولة',
  'Not in voting phase': 'ليست مرحلة التصويت',
  'Invalid voter': 'مُصوّت غير صالح',
  'Already voted': 'صوّتت مسبقاً',
  'Invalid vote target': 'هدف التصويت غير صالح',
  'Cannot vote for yourself': 'لا يمكنك التصويت لنفسك',
  'Not awaiting outcast guess': 'ليست مرحلة تخمين برا السالفة',
  'Only the outcast can guess': 'فقط برا السالفة يمكنه التخمين',
  'No active برا السالفة game': 'لا توجد مباراة برا السالفة نشطة',
  'Guess is required': 'أدخل تخميناً',
  'Guess is too long': 'التخمين طويل جداً',
  'Not registered': 'غير مسجّل — أعد تحميل الصفحة',
  'Not in a room': 'أنت لست في غرفة',
  'Player not in room': 'اللاعب غير موجود في الغرفة',
  'Player not connected': 'اللاعب غير متصل',
  'Game already in progress': 'المباراة جارية بالفعل',
  'Room is full': 'الغرفة ممتلئة',
  'Room not found': 'الغرفة غير موجودة',
  'Cannot change name during a match': 'لا يمكن تغيير الاسم أثناء المباراة',
  'Too many requests': 'طلبات كثيرة — انتظر قليلاً',
  'Rate limit exceeded': 'طلبات كثيرة — انتظر قليلاً',
};

export function translateBaraError(message: string | null): string | null {
  if (!message) return null;
  return BARA_ERROR_AR[message] ?? message;
}
