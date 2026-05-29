'use client';

import { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { Package, CheckSquare, Square } from 'lucide-react';
import HextechScrollbar from '@/components/ui/HextechScrollbar';

export type CategoryPackageOption = {
  id: string;
  name: string;
  description?: string;
  wordCount: number;
  sampleWords?: string[];
};

type CategoryPackageSettingsProps = {
  packages: CategoryPackageOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Compact grid (Sketch) vs detailed cards (Bara). */
  variant?: 'compact' | 'detailed';
  label?: string;
  hint?: string;
  showSelectAll?: boolean;
  onSelectAll?: () => void;
  onReset?: () => void;
  selectAllLabel?: string;
  resetLabel?: string;
  className?: string;
  /** Custom rail beside the package grid (hides native scrollbar). */
  scrollbar?: 'default' | 'mafia' | 'hextech';
};

export default function CategoryPackageSettings({
  packages,
  selectedIds,
  onChange,
  disabled = false,
  variant = 'compact',
  label = 'Word categories',
  hint,
  showSelectAll = false,
  onSelectAll,
  onReset,
  selectAllLabel = 'Select all',
  resetLabel = 'Reset',
  className,
  scrollbar = 'default',
}: CategoryPackageSettingsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const usesCustomRail = scrollbar === 'mafia' || scrollbar === 'hextech';
  const scrollRowClass =
    scrollbar === 'mafia' ? 'mafia-scroll-row' : 'hextech-scroll-row';
  const scrollContentClass =
    scrollbar === 'mafia' ? 'mafia-scroll-content' : 'hextech-scroll-content';

  const totalWords = useMemo(
    () =>
      packages
        .filter((p) => selectedSet.has(p.id))
        .reduce((sum, p) => sum + p.wordCount, 0),
    [packages, selectedSet],
  );

  const toggleCategory = (id: string) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(id)) {
      if (next.size <= 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange([...next]);
  };

  const gridClassName = clsx(
    variant === 'compact' ?
      'grid grid-cols-2 sm:grid-cols-3 gap-2 w-full'
    : 'grid gap-2 sm:grid-cols-2 w-full',
    !usesCustomRail && (variant === 'compact' ? 'max-h-48' : 'max-h-64'),
    !usesCustomRail && 'overflow-y-auto',
  );

  const packageGrid = (
    <div
      ref={usesCustomRail ? scrollRef : undefined}
      className={clsx(
        gridClassName,
        usesCustomRail && scrollContentClass,
        usesCustomRail && 'overflow-y-auto overscroll-contain',
      )}
    >
      {packages.map((pkg) => {
        const selected = selectedSet.has(pkg.id);
        return (
          <button
            key={pkg.id}
            type="button"
            disabled={disabled}
            onClick={() => toggleCategory(pkg.id)}
            className={clsx(
              'transition-colors border rounded-lg disabled:cursor-default',
              variant === 'compact' ?
                clsx(
                  'text-left text-xs p-2',
                  selected ?
                    'border-violet-500/60 bg-violet-500/10'
                  : 'border-hub-border opacity-70',
                )
              : clsx(
                  'text-right p-3 rounded-xl',
                  selected ?
                    'border-[rgba(244,63,94,0.55)] bg-[rgba(244,63,94,0.12)]'
                  : 'border-[rgba(244,63,94,0.12)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(244,63,94,0.28)]',
                  disabled && 'opacity-70',
                ),
            )}
          >
            {variant === 'detailed' ?
              <>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm leading-snug">{pkg.name}</p>
                  {selected ?
                    <CheckSquare className="w-4 h-4 shrink-0 text-rose-400" />
                  : <Square className="w-4 h-4 shrink-0 text-hub-muted" />}
                </div>
                {pkg.description && (
                  <p className="text-[11px] text-hub-muted line-clamp-2">
                    {pkg.description}
                  </p>
                )}
                {pkg.sampleWords && pkg.sampleWords.length > 0 && (
                  <p className="text-[10px] text-hub-muted/70 mt-2">
                    {pkg.wordCount} words · {pkg.sampleWords.slice(0, 4).join('، ')}…
                  </p>
                )}
              </>
            : pkg.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-hub-muted tabular-nums">{totalWords} words</span>
        </div>
        {showSelectAll && !disabled && (onSelectAll || onReset) && (
          <div className="flex gap-2">
            {onSelectAll && (
              <button type="button" onClick={onSelectAll} className="hub-chip text-xs">
                {selectAllLabel}
              </button>
            )}
            {onReset && (
              <button type="button" onClick={onReset} className="hub-chip text-xs">
                {resetLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {usesCustomRail ?
        <div
          className={clsx(
            scrollRowClass,
            variant === 'compact' ? 'max-h-48' : 'max-h-64',
          )}
        >
          {packageGrid}
          <HextechScrollbar
            scrollRef={scrollRef}
            contentKey={`${packages.length}-${selectedIds.join(',')}`}
            variant={scrollbar === 'mafia' ? 'mafia' : 'hextech'}
          />
        </div>
      : packageGrid}

      {hint && (
        <p className="text-xs text-hub-muted mt-3 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
