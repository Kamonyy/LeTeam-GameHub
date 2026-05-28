'use client';

import { cn } from '@/lib/utils';

interface PhaseCeremonyProps {
  label: string;
  compact?: boolean;
  className?: string;
}

const bladeClass =
  'inline-block h-[7px] w-7 shrink-0 bg-gradient-to-r from-transparent via-[#e0b85a] to-[#3d2e0c] [clip-path:polygon(0_50%,18%_0,100%_35%,100%_65%,18%_100%)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8),0_0_6px_rgba(224,184,90,0.35)] sm:h-[9px] sm:w-[38px]';

export default function PhaseCeremony({
  label,
  compact = true,
  className,
}: PhaseCeremonyProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center self-center',
        compact ? 'gap-2 px-1 py-0.5' : 'gap-3 px-2.5 py-1',
        className,
      )}
      role="status"
    >
      <span className={bladeClass} aria-hidden />
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-sm border border-amber-600/60 font-cinzel font-bold uppercase text-[#ffd97a]',
          'bg-gradient-to-b from-[#2a2218]/95 to-stone-950/98',
          'shadow-[inset_0_1px_0_rgba(248,228,168,0.35),inset_0_-1px_2px_rgba(0,0,0,0.65),0_0_18px_-2px_rgba(201,162,39,0.55)]',
          compact ?
            'px-2.5 py-0.5 text-[0.68rem] tracking-[0.2em]'
          : 'px-4 py-1 text-[0.78rem] tracking-[0.26em]',
        )}
      >
        {label}
      </span>
      <span className={cn(bladeClass, 'scale-x-[-1]')} aria-hidden />
    </div>
  );
}
