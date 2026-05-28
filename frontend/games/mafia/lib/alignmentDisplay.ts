import type { SeerAlignment } from '../types';

export function isEvilAlignment(alignment: string): boolean {
  return alignment.toUpperCase() === 'EVIL';
}

/** Mafia-themed GOOD / EVIL label classes for oracle reveals */
export function seerAlignmentPanelClass(alignment: string): string {
  return isEvilAlignment(alignment)
    ? 'border-rose-700/55 bg-gradient-to-b from-rose-950/90 via-stone-950/95 to-stone-950 shadow-[inset_0_1px_0_rgba(255,120,120,0.18),0_0_28px_-6px_rgba(185,28,28,0.5)]'
    : 'border-emerald-700/55 bg-gradient-to-b from-emerald-950/90 via-stone-950/95 to-stone-950 shadow-[inset_0_1px_0_rgba(120,255,180,0.15),0_0_28px_-6px_rgba(16,120,80,0.45)]';
}

export function seerAlignmentTextClass(alignment: string): string {
  return isEvilAlignment(alignment)
    ? 'text-rose-300 drop-shadow-[0_0_12px_rgba(248,113,113,0.55)]'
    : 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.45)]';
}

/** Inline GOOD / EVIL emphasis inside recap sentences */
export function seerAlignmentInlineClass(alignment: string): string {
  return isEvilAlignment(alignment)
    ? 'font-semibold text-rose-300'
    : 'font-semibold text-emerald-300';
}

export function normalizeSeerAlignment(
  alignment: string
): SeerAlignment {
  return isEvilAlignment(alignment) ? 'EVIL' : 'GOOD';
}
