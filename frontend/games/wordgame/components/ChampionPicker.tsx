'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';
import { preloadChampionIcon } from '@/lib/wordgame/champion-icon-cache';
import {
  LOL_CHAMPIONS,
  LOL_CHAMPION_CLASSES,
  championClassIconSrc,
  championClassLabel,
  getLolChampionById,
  type LolChampion,
  type LolChampionClass,
} from '@/lib/wordgame/lol-champions';
import ChampionIconImage from './ChampionIconImage';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';

interface ChampionPickerProps {
  disabled?: boolean;
  selectedId: string | null;
  onSelect: (champion: LolChampion) => void;
  onClear?: () => void;
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

const STAGGER_CAP = 30;

const ChampionGridItem = memo(function ChampionGridItem({
  champ,
  disabled,
  selectedId,
  staggerIndex,
  onSelect,
}: {
  champ: LolChampion;
  disabled: boolean;
  selectedId: string | null;
  staggerIndex: number;
  onSelect: (champion: LolChampion) => void;
}) {
  return (
    <li
      role="option"
      aria-selected={selectedId === champ.id}
      className="sw-champ-tile"
      style={
        {
          '--sw-i': Math.min(staggerIndex, STAGGER_CAP),
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(champ)}
        className={clsx(
          'sw-champ-option',
          selectedId === champ.id && 'sw-champ-option--active'
        )}
        title={champ.name}
      >
        <ChampionIconImage
          championId={champ.id}
          width={40}
          height={40}
          className="sw-champ-option__icon"
        />
        <span className="sw-champ-option__name">{champ.name}</span>
      </button>
    </li>
  );
});

export default function ChampionPicker({
  disabled = false,
  selectedId,
  onSelect,
  onClear,
}: ChampionPickerProps) {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<LolChampionClass | null>(null);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [filterWave, setFilterWave] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audio = useWordGameAudioOptional();

  const selected = selectedId ? getLolChampionById(selectedId) : undefined;

  const allIds = useMemo(() => LOL_CHAMPIONS.map((c) => c.id), []);

  useEffect(() => {
    let cancelled = false;
    setPreloadProgress(0);

    (async () => {
      const batchSize = 16;
      for (let i = 0; i < allIds.length; i += batchSize) {
        if (cancelled) return;
        const batch = allIds.slice(i, i + batchSize);
        await Promise.all(batch.map((id) => preloadChampionIcon(id)));
        if (!cancelled) {
          setPreloadProgress(Math.min(1, (i + batch.length) / allIds.length));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allIds]);

  const filtered = useMemo(() => {
    let list = LOL_CHAMPIONS;

    if (classFilter) {
      list = list.filter((c) => c.tags.includes(classFilter));
    }

    const n = normalizeQuery(query);
    if (n) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(n) ||
          c.id.toLowerCase().includes(n)
      );
    }

    return list;
  }, [query, classFilter]);

  const filterSignature = useMemo(
    () => `${query}|${classFilter ?? ''}`,
    [query, classFilter]
  );

  const resetGridScroll = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  };

  useEffect(() => {
    resetGridScroll();
    setFilterWave(true);
    const t = window.setTimeout(() => setFilterWave(false), 700);
    return () => window.clearTimeout(t);
  }, [filterSignature]);

  const hasActiveFilters = classFilter !== null || query.trim().length > 0;

  const clearAllFilters = () => {
    setQuery('');
    setClassFilter(null);
    resetGridScroll();
  };

  const selectClassFilter = (tag: LolChampionClass | null) => {
    audio?.unlock();
    audio?.playSfx('gridClick', 0.45);
    setClassFilter(tag);
    resetGridScroll();
  };

  return (
    <div className="sw-champ-picker">
      {selected && (
        <div className="sw-champ-selected mb-4">
          <ChampionIconImage
            championId={selected.id}
            width={48}
            height={48}
            className="sw-champ-selected__icon"
            loading="eager"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-0.5">
              Locked champion
            </p>
            <p className="font-semibold sw-text-accent truncate">{selected.name}</p>
          </div>
          {!disabled && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="sw-champ-clear"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {!selected && (
        <>
          <div
            className={clsx(
              'sw-champ-search-wrap',
              query.trim() && 'sw-champ-search-wrap--active'
            )}
          >
            <Search className="w-4 h-4 shrink-0 text-[#c9a227]/70" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
              className="sw-champ-search"
              placeholder="Search champions…"
              autoComplete="off"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  resetGridScroll();
                }}
                className="sw-champ-clear"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className={clsx(
              'sw-champ-filters',
              filterWave && 'sw-champ-filters--wave'
            )}
            role="radiogroup"
            aria-label="Champion class"
          >
            <span className="sw-champ-filter-label">Class</span>
            <div className="sw-champ-filter-chips">
              <button
                type="button"
                disabled={disabled}
                role="radio"
                aria-checked={classFilter === null}
                className={clsx(
                  'sw-champ-filter-chip',
                  classFilter === null && 'sw-champ-filter-chip--active'
                )}
                onClick={() => selectClassFilter(null)}
              >
                All
              </button>
              {LOL_CHAMPION_CLASSES.map((tag) => (
                <ClassFilterChip
                  key={tag}
                  tag={tag}
                  disabled={disabled}
                  active={classFilter === tag}
                  onSelect={() =>
                    selectClassFilter(classFilter === tag ? null : tag)
                  }
                />
              ))}
            </div>
          </div>

          <div className="sw-champ-picker-meta">
            <p
              key={filterSignature}
              className="text-[10px] sw-muted tabular-nums sw-champ-count"
            >
              {filtered.length} of {LOL_CHAMPIONS.length} champions
            </p>
            {preloadProgress < 1 && (
              <p className="sw-champ-cache-hint" aria-live="polite">
                Caching portraits… {Math.round(preloadProgress * 100)}%
              </p>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                className="sw-champ-filter-reset"
                onClick={clearAllFilters}
                disabled={disabled}
              >
                Clear filters
              </button>
            )}
          </div>

          <div
            ref={scrollRef}
            className={clsx(
              'sw-champ-grid-scroll',
              filterWave && 'sw-champ-grid-scroll--wave'
            )}
          >
            {filtered.length > 0 ? (
              <ul
                key={filterSignature}
                className="sw-champ-grid sw-champ-grid--cascade"
                role="listbox"
                aria-label="Champion list"
              >
                {filtered.map((champ, index) => (
                  <ChampionGridItem
                    key={champ.id}
                    champ={champ}
                    disabled={disabled}
                    selectedId={selectedId}
                    staggerIndex={index}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            ) : (
              <p
                key={filterSignature}
                className="text-sm sw-muted text-center py-6 sw-champ-empty"
              >
                No champions match these filters.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClassFilterChip({
  tag,
  active,
  disabled,
  onSelect,
}: {
  tag: LolChampionClass;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      role="radio"
      aria-checked={active}
      className={clsx(
        'sw-champ-filter-chip',
        `sw-champ-filter-chip--${tag.toLowerCase()}`,
        active && 'sw-champ-filter-chip--active sw-champ-filter-chip--pop'
      )}
      onClick={onSelect}
      title={championClassLabel(tag)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={championClassIconSrc(tag)}
        alt=""
        width={18}
        height={18}
        className="sw-champ-filter-chip__icon"
        loading="lazy"
        decoding="async"
      />
      <span>{championClassLabel(tag)}</span>
    </button>
  );
}
