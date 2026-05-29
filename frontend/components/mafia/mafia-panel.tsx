'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Medieval glass / bronze panel shells — use instead of flat `bg-stone-900/80 shadow-none`. */
export const mafiaPanelVariants = cva(
  [
    'mf-surface relative rounded-lg border text-[color:var(--mf-text-on-panel)]',
    'transition-all duration-200 ease-out',
    '[background-image:var(--p1-noise)] [background-blend-mode:overlay]',
  ],
  {
    variants: {
      variant: {
        glass: [
          'mf-surface--glass',
          'border-[color:var(--mf-glass-border)] bg-[color:var(--mf-glass-bg)]',
          'shadow-[var(--mf-shadow-panel)] backdrop-blur-[var(--mf-glass-blur)] saturate-[0.92]',
        ],
        elevated: [
          'mf-surface--elevated',
          'rounded-[8px] border-amber-900/50',
          'shadow-[var(--mf-shadow-elevated)] backdrop-blur-[6px] saturate-[0.94]',
        ],
        codex: [
          'overflow-hidden rounded-md border-amber-800/55',
          'bg-gradient-to-b from-stone-900/95 to-stone-950/98',
          'shadow-[inset_0_1px_0_rgba(212,166,74,0.25),inset_0_-2px_0_rgba(0,0,0,0.6),0_10px_32px_-8px_rgba(0,0,0,0.75)]',
          'before:pointer-events-none before:absolute before:left-[8%] before:right-[8%] before:top-0 before:z-[1] before:h-px',
          'before:bg-gradient-to-r before:from-transparent before:via-amber-400/85 before:to-transparent',
          'before:shadow-[0_0_10px_rgba(212,166,74,0.55)]',
        ],
        inset: [
          'border-stone-700/55 bg-gradient-to-b from-stone-950/92 to-black/94',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_2px_8px_rgba(0,0,0,0.35)]',
        ],
        decree: [
          'overflow-x-hidden overflow-y-visible rounded-md border-amber-700/55',
          'bg-gradient-to-b from-stone-950/98 to-[#0a0908]',
          'p-3 shadow-[var(--mf-shadow-panel),inset_0_1px_0_rgba(212,166,74,0.12)]',
          'data-[decree-night]:border-violet-800/50',
          'data-[decree-night]:shadow-[0_4px_24px_rgba(0,0,0,0.45),inset_0_0_24px_-10px_rgba(67,56,202,0.22),inset_0_0_0_1px_rgba(139,92,246,0.12)]',
        ],
      },
    },
    defaultVariants: {
      variant: 'glass',
    },
  },
);

const mafiaPanelElevatedHoverClass =
  'hover:-translate-y-0.5 hover:border-amber-700/45 hover:shadow-[var(--mf-shadow-panel),0_0_28px_-6px_rgba(180,90,40,0.35)]';

const mafiaPanelGlassHoverClass = 'hover:border-amber-700/40';

export interface MafiaCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mafiaPanelVariants> {
  /** When false, no hover lift/border on glass and elevated variants. Default true. */
  interactive?: boolean;
}

const MafiaCard = React.forwardRef<HTMLDivElement, MafiaCardProps>(
  ({ className, variant, interactive = true, children, ...props }, ref) => {
    const cardClassName = cn(
      'border-0 bg-transparent p-0 shadow-none backdrop-blur-none',
      mafiaPanelVariants({ variant }),
      interactive && variant === 'elevated' && mafiaPanelElevatedHoverClass,
      interactive && variant === 'glass' && mafiaPanelGlassHoverClass,
      !interactive && 'transition-none',
      className,
    );

    if (variant === 'decree') {
      return (
        <Card ref={ref} className={cardClassName} {...props}>
          <div className="relative flex min-h-0 flex-col rounded-md">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
            />
            <div className="relative z-[1] flex min-h-0 flex-col">{children}</div>
          </div>
        </Card>
      );
    }

    return (
      <Card ref={ref} className={cardClassName} {...props}>
        {children}
      </Card>
    );
  },
);
MafiaCard.displayName = 'MafiaCard';

export {
  MafiaCard,
  CardHeader as MafiaCardHeader,
  CardTitle as MafiaCardTitle,
  CardDescription as MafiaCardDescription,
  CardContent as MafiaCardContent,
  CardFooter as MafiaCardFooter,
};
