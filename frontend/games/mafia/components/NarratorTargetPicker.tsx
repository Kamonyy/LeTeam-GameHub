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
import { getRoleAccent } from '@shared/games/mafia/roles.js';
import { mfNameGold, mfNameMuted, mfRoleLine } from '../lib/mafiaTypography';
import { roleDotStyle } from '../lib/roleTheme';
import type { MafiaNarratorPlayerRow } from '../types';

const SKIP_VALUE = '__skip__';

/** Tiles grow with name length and wrap to fit available width. */
const targetGridClass = clsx(
  'grid w-full grid-cols-1 gap-2',
  'min-[400px]:[grid-template-columns:repeat(auto-fill,minmax(min(100%,11rem),1fr))]',
);

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

function teamPanelClass(team: TeamSide) {
  return team === 'good'
    ? 'border-emerald-700/45 bg-[radial-gradient(ellipse_at_0%_0%,rgba(110,200,144,0.12)_0%,transparent_55%),linear-gradient(180deg,rgba(22,38,28,0.95)_0%,rgba(10,16,12,0.98)_100%)] shadow-[inset_0_1px_0_rgba(180,230,200,0.08)]'
    : 'border-rose-800/45 bg-[radial-gradient(ellipse_at_0%_0%,rgba(200,84,106,0.12)_0%,transparent_55%),linear-gradient(180deg,rgba(42,18,22,0.95)_0%,rgba(18,8,10,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,180,190,0.06)]';
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
    <MafiaCard
      variant="inset"
      interactive={false}
      className={clsx('border', teamPanelClass(team))}
    >
      <MafiaCardHeader className="space-y-0 border-b border-amber-900/30 p-2.5 pb-2">
        <MafiaCardTitle
          className={clsx(
            'font-cinzel text-[0.72rem] font-bold uppercase tracking-[0.2em]',
            teamAccentClass(team),
          )}
        >
          {title}
        </MafiaCardTitle>
      </MafiaCardHeader>
      <MafiaCardContent className="p-2.5 pt-2">
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
            const roleAccent = getRoleAccent(p.roleId);
            const isChosen = groupValue === id;

            return (
              <ToggleGroupItem
                key={id}
                value={id}
                variant="outline"
                disabled={disabled || blocked}
                aria-label={
                  isChosen ?
                    `${label}, ${p.roleNameEn}, selected`
                  : `${label}, ${p.roleNameEn}`
                }
                title={
                  blocked
                    ? 'Cannot select — rule blocked'
                    : `${label} · ${p.roleNameEn}`
                }
                className={clsx(
                  'mf-target-tile',
                  team === 'good' ? 'mf-target-tile--good' : 'mf-target-tile--evil',
                  isChosen && 'mf-target-tile--chosen',
                  'relative flex h-auto min-h-[3.25rem] w-full min-w-0 items-center gap-2 px-2.5 py-2',
                  'text-left whitespace-normal',
                  !p.alive && 'opacity-50 grayscale',
                  blocked && 'cursor-not-allowed opacity-40',
                )}
              >
                <span
                  className="mf-role-dot shrink-0 rounded-full"
                  style={roleDotStyle(p.roleId)}
                  aria-hidden
                />
                <span className="min-w-0 flex flex-1 flex-col gap-0.5 text-left">
                  <span
                    className={clsx(
                      p.alive ? mfNameGold : mfNameMuted,
                      'text-[0.8rem] leading-tight tracking-wide',
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={clsx(mfRoleLine, 'text-[0.62rem] leading-tight')}
                    style={{ color: roleAccent }}
                  >
                    <span aria-hidden>{p.roleIcon}</span> {p.roleNameEn}
                  </span>
                </span>
                {isChosen && (
                  <span className="mf-target-tile__chosen-mark shrink-0" aria-hidden>
                    ✓ Chosen
                  </span>
                )}
                {!p.alive && !isChosen && (
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
  const hasChoice = Boolean(selectedId || skipSelected);
  const chosenPlayer =
    selectedId ? players.find((p) => p.id === selectedId) : null;

  const handleValueChange = (value: string) => {
    if (!value) return;
    if (value === SKIP_VALUE) onSelect(null);
    else onSelect(value);
  };

  return (
    <div
      className="mf-target-picker flex flex-col gap-2.5"
      data-has-choice={hasChoice ? '' : undefined}
    >
      <p className="m-0 font-cinzel text-[0.82rem] font-bold uppercase tracking-widest text-amber-100 before:text-[0.6rem] before:text-amber-400 before:content-['◆_']">
        {actionLabel}
      </p>

      {hasChoice && (
        <div
          className="mf-target-choice-summary rounded-md px-3 py-2.5"
          role="status"
          aria-live="polite"
        >
          <p className="m-0 font-cinzel text-[0.62rem] font-bold uppercase tracking-[0.22em] text-amber-300">
            Recorded choice
          </p>
          <p className="mf-name-gold m-0 mt-1 text-lg leading-tight tracking-wide">
            {skipSelected ?
              'No target — skipped'
            : <>
                {chosenPlayer && playerName(selectedId!)}
                {chosenPlayer && (
                  <span className="mt-0.5 block font-cinzel text-sm font-semibold normal-case tracking-normal text-amber-200/95">
                    <span aria-hidden>{chosenPlayer.roleIcon}</span>{' '}
                    {chosenPlayer.roleNameEn}
                  </span>
                )}
              </>
            }
          </p>
        </div>
      )}

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
        <div className="border-t border-dashed border-amber-900/40 pt-2">
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
                'mf-target-tile',
                skipSelected && 'mf-target-tile--chosen',
                'flex min-h-11 w-full items-center justify-center gap-2 px-3 py-2.5 text-center',
              )}
            >
              <span
                className="shrink-0 text-[0.95rem] leading-none text-amber-200/90"
                aria-hidden
              >
                ⊘
              </span>
              <span className="font-cinzel text-[0.65rem] font-semibold uppercase tracking-widest text-amber-100">
                {skipSelected ? 'Skipped — no target' : 'Skip — no target tonight'}
              </span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
