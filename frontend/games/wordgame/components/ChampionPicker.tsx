'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';
import {
  LOL_CHAMPIONS,
  championIconSrc,
  getLolChampionById,
  type LolChampion,
} from '@/lib/wordgame/lol-champions';

interface ChampionPickerProps {
  disabled?: boolean;
  selectedId: string | null;
  onSelect: (champion: LolChampion) => void;
  onClear?: () => void;
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

export default function ChampionPicker({
  disabled = false,
  selectedId,
  onSelect,
  onClear,
}: ChampionPickerProps) {
  const [query, setQuery] = useState('');
  const selected = selectedId ? getLolChampionById(selectedId) : undefined;

  const filtered = useMemo(() => {
    const n = normalizeQuery(query);
    if (!n) return LOL_CHAMPIONS;
    return LOL_CHAMPIONS.filter(
      (c) =>
        c.name.toLowerCase().includes(n) ||
        c.id.toLowerCase().includes(n)
    );
  }, [query]);

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
              placeholder="Search champions…"
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

          <p className="text-[10px] sw-muted mb-2 tabular-nums">
            {filtered.length} of {LOL_CHAMPIONS.length} champions
          </p>

          <ul
            className={clsx('sw-champ-grid', !query.trim() && 'sw-stagger')}
            role="listbox"
            aria-label="Champion list"
          >
            {filtered.map((champ, index) => (
              <li
                key={champ.id}
                style={
                  !query.trim() ?
                    { animationDelay: `${Math.min(index, 24) * 0.025}s` }
                  : undefined
                }
              >
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
                  <Image
                    src={championIconSrc(champ.id)}
                    alt=""
                    width={40}
                    height={40}
                    className="sw-champ-option__icon"
                    unoptimized
                  />
                  <span className="sw-champ-option__name">{champ.name}</span>
                </button>
              </li>
            ))}
          </ul>

          {filtered.length === 0 && (
            <p className="text-sm sw-muted text-center py-6">No champions match.</p>
          )}
        </>
      )}
    </div>
  );
}
