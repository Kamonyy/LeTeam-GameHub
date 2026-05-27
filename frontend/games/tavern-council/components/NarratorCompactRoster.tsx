'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { TavernNarratorPlayerRow } from '../types';
import { roleThemeStyleFromRole } from '../lib/roleTheme';

interface NarratorCompactRosterProps {
  players: TavernNarratorPlayerRow[];
  playerName: (id: string) => string;
}

function TeamChipRow({
  title,
  teamClass,
  players,
  playerName,
}: {
  title: string;
  teamClass: 'tc-team--good' | 'tc-team--evil';
  players: TavernNarratorPlayerRow[];
  playerName: (id: string) => string;
}) {
  const alive = players.filter((p) => p.alive).length;
  return (
    <div className={clsx('tc-roster-chips-row', teamClass)}>
      <div className="tc-roster-chips-row__head">
        <span className="tc-roster-chips-row__title">{title}</span>
        <span className="tc-roster-chips-row__count">
          {alive}/{players.length}
        </span>
      </div>
      <div className="tc-roster-chips" role="list">
        {players.length === 0 ?
          <span className="tc-roster-chips__empty">None</span>
        :	players.map((p) => (
            <span
              key={p.id}
              role="listitem"
              className={clsx(
                'tc-roster-chip',
                !p.alive && 'tc-roster-chip--dead'
              )}
              style={roleThemeStyleFromRole(p.roleId)}
              title={`${playerName(p.id)} · ${p.roleNameEn}`}
            >
              <span
                className="tc-dot tc-roster-chip__dot"
                style={{ background: p.color }}
                aria-hidden
              />
              <span className="tc-roster-chip__name">{playerName(p.id)}</span>
              <span className="tc-roster-chip__icon" aria-hidden>
                {p.roleIcon}
              </span>
              {!p.alive && (
                <span className="tc-roster-chip__mark" aria-label="Dead">
                  †
                </span>
              )}
            </span>
          ))
        }
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  subtitle,
  teamClass,
  players,
  playerName,
}: {
  title: string;
  subtitle: string;
  teamClass: 'tc-team--good' | 'tc-team--evil';
  players: TavernNarratorPlayerRow[];
  playerName: (id: string) => string;
}) {
  const alive = players.filter((p) => p.alive).length;
  return (
    <div className={clsx('tc-team-column', teamClass)}>
      <header className="tc-team-column__head">
        <h3 className="tc-team-column__title tc-font-display">{title}</h3>
        <p className="tc-team-column__sub">{subtitle}</p>
        <span className="tc-team-column__count">
          {alive} alive · {players.length} total
        </span>
      </header>
      <ul className="tc-team-column__list">
        {players.length === 0 ?
          <li className="tc-team-column__empty">None</li>
        :	players.map((p) => (
            <li
              key={p.id}
              className={clsx(
                'tc-roster-card',
                !p.alive && 'tc-roster-card--dead'
              )}
            >
              <span className="tc-dot" style={{ background: p.color }} />
              <span className="tc-roster-card__body">
                <span className="tc-roster-card__name">{playerName(p.id)}</span>
                <span className="tc-roster-card__role">
                  {p.roleIcon} {p.roleNameEn}
                </span>
              </span>
              <span className="tc-roster-card__badges">
                {!p.alive && <span className="tc-badge tc-badge--dead">Dead</span>}
                {p.alive && !p.roleAcknowledged && (
                  <span className="tc-badge tc-badge--pending">Oath</span>
                )}
                {p.alive && p.roleAcknowledged && (
                  <span className="tc-badge tc-badge--ok">Ready</span>
                )}
              </span>
            </li>
          ))
        }
      </ul>
    </div>
  );
}

export default function NarratorCompactRoster({
  players,
  playerName,
}: NarratorCompactRosterProps) {
  const [expanded, setExpanded] = useState(false);
  const good = players.filter((p) => p.team === 'good');
  const evil = players.filter((p) => p.team === 'evil');

  return (
    <section
      className={clsx('tc-roster-split', !expanded && 'tc-roster-split--compact')}
    >
      <div className="tc-roster-split__toolbar">
        <div>
          <h2 className="tc-section-title tc-font-display">Secret roster</h2>
          <p className="tc-section-hint tc-section-hint--tight">
            {expanded ?
              'Narrator only — full cards'
            :	'Good / Evil chips — tap expand for cards'}
          </p>
        </div>
        <button
          type="button"
          className="tc-btn-ghost tc-roster-split__toggle text-xs"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded ?
        <div className="tc-roster-split__grid">
          <TeamColumn
            title="Good"
            subtitle="Village & allies"
            teamClass="tc-team--good"
            players={good}
            playerName={playerName}
          />
          <TeamColumn
            title="Evil"
            subtitle="Mafia & allies"
            teamClass="tc-team--evil"
            players={evil}
            playerName={playerName}
          />
        </div>
      :	<div className="tc-roster-compact">
          <TeamChipRow
            title="Good"
            teamClass="tc-team--good"
            players={good}
            playerName={playerName}
          />
          <TeamChipRow
            title="Evil"
            teamClass="tc-team--evil"
            players={evil}
            playerName={playerName}
          />
        </div>
      }
    </section>
  );
}
