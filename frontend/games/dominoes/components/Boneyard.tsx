'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

interface BoneyardProps {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
  /** Brief pulse when a tile is drawn from the stack */
  isDrawing?: boolean;
}

const STACK_DEPTH = 5;

const Boneyard = forwardRef<HTMLDivElement, BoneyardProps>(function Boneyard(
  { count, canDraw, onDraw, isDrawing = false },
  ref
) {
  const visibleLayers = Math.min(STACK_DEPTH, Math.max(1, count));
  const disabled = !canDraw || count === 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onDraw}
        disabled={disabled}
        className={clsx(
          'group relative rounded-2xl p-1 transition-all duration-300',
          'bg-gradient-to-b from-[#2a1810] via-[#1a100c] to-[#0f0a08]',
          'border-2 border-[#5c3d28]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.55)]',
          'hover:border-amber-700/50 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)]',
          'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:border-[#5c3d28]/80',
          canDraw &&
            count > 0 &&
            'ring-1 ring-emerald-500/30 shadow-[0_0_18px_rgba(16,185,129,0.14)]'
        )}
      >
        {/* felt pad */}
        <div
          className="relative rounded-xl px-5 pt-4 pb-5 min-w-[7.5rem]"
          style={{
            background:
              'radial-gradient(ellipse 120% 80% at 50% 30%, rgba(22, 101, 52, 0.35) 0%, rgba(6, 40, 24, 0.92) 55%, rgba(4, 24, 14, 0.98) 100%)',
            boxShadow: 'inset 0 0 24px rgba(0,0,0,0.45)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-2 rounded-lg opacity-[0.12]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Stack origin — center of top tile for fly animation */}
          <div
            ref={ref}
            className="relative mx-auto flex h-[5.5rem] w-[3.75rem] items-center justify-center"
            aria-hidden
          >
            {Array.from({ length: visibleLayers }).map((_, i) => {
              const fromTop = visibleLayers - 1 - i;
              const rot = (fromTop - (visibleLayers - 1) / 2) * 3.2;
              const y = fromTop * -2.2;
              const x = fromTop * 0.6;
              const z = 10 + fromTop;
              const scale = 1 - fromTop * 0.028;
              return (
                <div
                  key={i}
                  className={clsx(
                    'domino-back absolute rounded-md border border-white/[0.12]',
                    'shadow-[0_4px_8px_rgba(0,0,0,0.5)]',
                    i === visibleLayers - 1 && 'ring-1 ring-black/30',
                    i === visibleLayers - 1 &&
                      isDrawing &&
                      'animate-boneyard-stack-pop'
                  )}
                  style={{
                    width: '3.25rem',
                    height: '5rem',
                    transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
                    zIndex: z,
                    opacity: 0.55 + (i / visibleLayers) * 0.45,
                  }}
                />
              );
            })}
            {/* decorative spine hint on front tile */}
            <div className="pointer-events-none absolute bottom-[0.65rem] left-1/2 z-[20] h-[2px] w-[45%] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            {count > 0 && (
              <span
                className="absolute -right-1 -top-1 z-[25] flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-600 px-1 text-[11px] font-bold tabular-nums text-white shadow-md"
                style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}
              >
                {count}
              </span>
            )}
          </div>

          <span
            className={clsx(
              'relative z-[5] mt-1 block text-center text-[11px] font-semibold uppercase tracking-wider',
              canDraw && count > 0
                ? 'text-emerald-200/90 group-hover:text-emerald-100'
                : 'text-white/35'
            )}
          >
            {count > 0 ? 'Draw' : 'Empty'}
          </span>
        </div>
      </button>
    </div>
  );
});

export default Boneyard;
