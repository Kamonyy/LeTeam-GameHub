'use client';

import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import {
  MafiaCard,
  MafiaCardContent,
  MafiaCardHeader,
  MafiaCardTitle,
} from '@/components/mafia/mafia-panel';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { roleDotStyle } from '../lib/roleTheme';
import type { MafiaNarratorPlayerRow } from '../types';

const SKIP_VALUE = '__skip__';

const targetItemClass = clsx(
  'flex h-auto min-h-9 w-full items-center justify-start gap-2 px-2.5 py-2',
  'text-left text-[0.88rem] leading-snug whitespace-normal text-stone-200',
  'hover:border-amber-700/70 hover:bg-stone-800/90',
  'data-[state=on]:border-amber-500/75 data-[state=on]:bg-amber-950/50 data-[state=on]:text-amber-100',
  'data-[state=on]:shadow-[inset_0_1px_0_rgba(251,191,36,0.15),0_0_12px_rgba(180,83,9,0.2)]',
);

/** Tiles grow with name length and wrap to fit available width. */
const targetGridClass =
  'grid w-full gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,10rem),1fr))]';

type TeamSide = 'good' | 'evil';

interface NarratorTargetPickerProps {
  players: MafiaNarratorPlayerRow[];
  playerIds: string[];
  playerName: (id: string) => string;
  selectedId: string | null;
  skipSelected?: boolean;
  blockedIds?: string[];
  allowSkip?: boolean;
  aliveOnly?: boolean;
  disabled?: boolean;
  actionLabel?: string;
  onSelect: (id: string | null) => void;
}

function teamAccentClass(team: TeamSide) {
  return team === 'good' ? 'text-emerald-300' : 'text-rose-300';
}

function teamBorderClass(team: TeamSide) {
  return team === 'good' ? 'border-emerald-500/40' : 'border-rose-500/40';
}

function TeamTargets({
  title,
  team,
  ids,
  allPlayers,
  playerName,
  groupValue,
  blockedIds,
  disabled,
  onValueChange,
}: {
  title: string;
  team: TeamSide;
  ids: string[];
  allPlayers: MafiaNarratorPlayerRow[];
  playerName: (id: string) => string;
  groupValue: string;
  blockedIds: string[];
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  if (ids.length === 0) return null;

  return (
    <MafiaCard variant="inset" interactive={false} className={teamBorderClass(team)}>
      <MafiaCardHeader className="space-y-0 p-2 pb-1">
        <MafiaCardTitle
          className={clsx(
            'font-cinzel text-[0.68rem] font-bold uppercase tracking-widest',
            teamAccentClass(team),
          )}
        >
          {title}
        </MafiaCardTitle>
      </MafiaCardHeader>
      <MafiaCardContent className="p-2 pt-0">
        <ToggleGroup
          type="single"
          variant="outline"
          value={groupValue}
          onValueChange={onValueChange}
          disabled={disabled}
          className={targetGridClass}
        >
          {ids.map((id) => {
            const p = allPlayers.find((x) => x.id === id);
            if (!p) return null;
            const blocked = blockedIds.includes(id);
            const label = playerName(id);
            return (
              <ToggleGroupItem
                key={id}
                value={id}
                variant="outline"
                disabled={disabled || blocked}
                title={blocked ? 'Cannot select — rule blocked' : label}
                className={clsx(
                  targetItemClass,
                  'min-w-0',
                  !p.alive && 'opacity-45 grayscale',
                  blocked && 'cursor-not-allowed opacity-40',
                )}
              >
                <span
                  className="h-[0.7rem] w-[0.7rem] shrink-0 rounded-full ring-1 ring-stone-900/45"
                  style={roleDotStyle(p.roleId, p.color)}
                />
                <span className="min-w-0 flex-1 break-words text-left">
                  {label}
                </span>
                {!p.alive && (
                  <Badge variant="dead" className="shrink-0 px-1 py-0 text-[0.5rem]">
                    Dead
                  </Badge>
                )}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </MafiaCardContent>
    </MafiaCard>
  );
}

export default function NarratorTargetPicker({
  players,
  playerIds,
  playerName,
  selectedId,
  skipSelected = false,
  blockedIds = [],
  allowSkip = false,
  aliveOnly = true,
  disabled,
  actionLabel = 'Choose target',
  onSelect,
}: NarratorTargetPickerProps) {
  const selectableIds =
    aliveOnly ?
      playerIds.filter((id) => players.find((p) => p.id === id)?.alive)
    : playerIds;
  const goodIds = selectableIds.filter(
    (id) => players.find((p) => p.id === id)?.team === 'good',
  );
  const evilIds = selectableIds.filter(
    (id) => players.find((p) => p.id === id)?.team === 'evil',
  );

  const groupValue = skipSelected ? SKIP_VALUE : (selectedId ?? '');

  const handleValueChange = (value: string) => {
    if (!value) return;
    if (value === SKIP_VALUE) onSelect(null);
    else onSelect(value);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <p className="m-0 font-cinzel text-[0.78rem] font-bold uppercase tracking-widest text-amber-200 before:text-[0.6rem] before:text-amber-400 before:content-['◆_']">
        {actionLabel}
      </p>

      <div className="grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 min-[520px]:items-start">
        <TeamTargets
          title="Good"
          team="good"
          ids={goodIds}
          allPlayers={players}
          playerName={playerName}
          groupValue={groupValue}
          blockedIds={blockedIds}
          disabled={disabled}
          onValueChange={handleValueChange}
        />
        <TeamTargets
          title="Evil"
          team="evil"
          ids={evilIds}
          allPlayers={players}
          playerName={playerName}
          groupValue={groupValue}
          blockedIds={blockedIds}
          disabled={disabled}
          onValueChange={handleValueChange}
        />
      </div>

      {allowSkip && (
        <div className="border-t border-dashed border-stone-700/60 pt-2">
          <ToggleGroup
            type="single"
            variant="outline"
            value={groupValue}
            onValueChange={handleValueChange}
            disabled={disabled}
            className="w-full"
          >
            <ToggleGroupItem
              value={SKIP_VALUE}
              variant="outline"
              aria-pressed={skipSelected}
              className={clsx(
                targetItemClass,
                'min-h-[2.1rem] w-full justify-center text-center',
              )}
            >
              <span className="shrink-0 text-[0.95rem] leading-none opacity-90" aria-hidden>
                ⊘
              </span>
              <span className="font-cinzel text-[0.62rem] font-semibold uppercase tracking-widest">
                {skipSelected ? 'Skipped — no target' : 'Skip — no target tonight'}
              </span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
