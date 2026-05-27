'use client';

import { memo, useMemo, useState } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';
import {
  LOL_CHAMPIONS,
  championIconSrc,
  getLolChampionById,
  type LolChampion,
} from '@/lib/wordgame/lol-champions';

const MIN_QUERY_LEN = 2;
const GRID_COLS = 4;
const ROW_HEIGHT_PX = 76;

interface ChampionPickerProps {
  disabled?: boolean;
  selectedId: string | null;
  onSelect: (champion: LolChampion) => void;
  onClear?: () => void;
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

const ChampionGridItem = memo(function ChampionGridItem({
  champ,
  disabled,
  selectedId,
  onSelect,
}: {
  champ: LolChampion;
  disabled: boolean;
  selectedId: string | null;
  onSelect: (champion: LolChampion) => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        disabled={disabled}
        onClick={() => onSelect(champ)}
        className={clsx(
          'sw-champ-option',
          selectedId === champ.id && 'sw-champ-option--active'
        )}
        title={champ.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={championIconSrc(champ.id)}
          alt=""
          width={40}
          height={40}
          className="sw-champ-option__icon"
          loading="lazy"
          decoding="async"
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
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(256);

  const selected = selectedId ? getLolChampionById(selectedId) : undefined;
  const trimmedQuery = query.trim();
  const canBrowse = trimmedQuery.length >= MIN_QUERY_LEN;

  const filtered = useMemo(() => {
    const n = normalizeQuery(query);
    if (!n) return [];
    return LOL_CHAMPIONS.filter(
      (c) =>
        c.name.toLowerCase().includes(n) ||
        c.id.toLowerCase().includes(n)
    );
  }, [query]);

  const rowCount = Math.ceil(filtered.length / GRID_COLS);
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_PX) - 1);
  const visibleRows =
    Math.ceil(viewportHeight / ROW_HEIGHT_PX) + 2;
  const endRow = Math.min(rowCount, startRow + visibleRows);
  const visibleChampions = filtered.slice(
    startRow * GRID_COLS,
    endRow * GRID_COLS
  );
  const padTop = startRow * ROW_HEIGHT_PX;
  const padBottom = Math.max(0, (rowCount - endRow) * ROW_HEIGHT_PX);

  return (
    <div className="sw-champ-picker">
      {selected && (
        <div className="sw-champ-selected mb-4">
          <Image
            src={championIconSrc(selected.id)}
            alt=""
            width={48}
            height={48}
            className="sw-champ-selected__icon"
            unoptimized
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
          <div className="sw-champ-search-wrap">
            <Search className="w-4 h-4 shrink-0 text-[#c9a227]/70" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
              className="sw-champ-search"
              placeholder="Search champions (min 2 letters)…"
              autoComplete="off"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="sw-champ-clear"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!canBrowse && (
            <p className="text-sm sw-muted text-center py-8">
              Type at least {MIN_QUERY_LEN} letters to browse {LOL_CHAMPIONS.length}{' '}
              champions.
            </p>
          )}

          {canBrowse && (
            <>
              <p className="text-[10px] sw-muted mb-2 tabular-nums">
                {filtered.length} match{filtered.length === 1 ? '' : 'es'}
              </p>

              <div
                className="sw-champ-grid-scroll"
                onScroll={(e) =>
                  setScrollTop((e.target as HTMLDivElement).scrollTop)
                }
                ref={(el) => {
                  if (el && el.clientHeight !== viewportHeight) {
                    setViewportHeight(el.clientHeight);
                  }
                }}
              >
                <ul
                  className="sw-champ-grid"
                  role="listbox"
                  aria-label="Champion list"
                  style={{ paddingTop: padTop, paddingBottom: padBottom }}
                >
                  {visibleChampions.map((champ) => (
                    <ChampionGridItem
                      key={champ.id}
                      champ={champ}
                      disabled={disabled}
                      selectedId={selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              </div>

              {filtered.length === 0 && (
                <p className="text-sm sw-muted text-center py-6">
                  No champions match.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
