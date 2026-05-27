'use client';

import clsx from 'clsx';
import type { TavernNarratorPlayerRow } from '../types';

interface NarratorTargetPickerProps {
  players: TavernNarratorPlayerRow[];
  playerIds: string[];
  playerName: (id: string) => string;
  selectedId: string | null;
  blockedIds?: string[];
  allowSkip?: boolean;
  /** When true (default), dead players are omitted from selectable targets. */
  aliveOnly?: boolean;
  disabled?: boolean;
  actionLabel?: string;
  onSelect: (id: string | null) => void;
}

function TeamTargets({
  title,
  teamClass,
  ids,
  allPlayers,
  playerName,
  selectedId,
  blockedIds,
  disabled,
  onSelect,
}: {
  title: string;
  teamClass: 'tc-team--good' | 'tc-team--evil';
  ids: string[];
  allPlayers: TavernNarratorPlayerRow[];
  playerName: (id: string) => string;
  selectedId: string | null;
  blockedIds: string[];
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <div className={clsx('tc-target-team', teamClass)}>
      <p className="tc-target-team__label">{title}</p>
      <div className="tc-target-team__grid">
        {ids.map((id) => {
          const p = allPlayers.find((x) => x.id === id);
          if (!p) return null;
          const blocked = blockedIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={clsx(
                'tc-target-btn',
                selectedId === id && 'tc-target-btn--selected',
                !p.alive && 'tc-target-btn--dead',
                blocked && 'tc-target-btn--blocked'
              )}
              disabled={disabled || blocked}
              title={blocked ? 'Cannot select — rule blocked' : undefined}
              onClick={() => onSelect(id)}
            >
              <span className="tc-dot" style={{ background: p.color }} />
              <span className="tc-target-btn__name">{playerName(id)}</span>
              {!p.alive && <span className="tc-target-btn__tag">Dead</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NarratorTargetPicker({
  players,
  playerIds,
  playerName,
  selectedId,
  blockedIds = [],
  allowSkip,
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
    (id) => players.find((p) => p.id === id)?.team === 'good'
  );
  const evilIds = selectableIds.filter(
    (id) => players.find((p) => p.id === id)?.team === 'evil'
  );

  return (
    <div className="tc-target-picker">
      <p className="tc-target-picker__heading">{actionLabel}</p>
      <TeamTargets
        title="Good"
        teamClass="tc-team--good"
        ids={goodIds}
        allPlayers={players}
        playerName={playerName}
        selectedId={selectedId}
        blockedIds={blockedIds}
        disabled={disabled}
        onSelect={onSelect}
      />
      <TeamTargets
        title="Evil"
        teamClass="tc-team--evil"
        ids={evilIds}
        allPlayers={players}
        playerName={playerName}
        selectedId={selectedId}
        blockedIds={blockedIds}
        disabled={disabled}
        onSelect={onSelect}
      />
      {allowSkip && (
        <button
          type="button"
          className="tc-btn-ghost tc-target-picker__skip"
          disabled={disabled}
          onClick={() => onSelect(null)}
        >
          Skip — no action this step
        </button>
      )}
    </div>
  );
}
