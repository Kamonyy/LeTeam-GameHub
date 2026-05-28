'use client';

import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import {
  MafiaCard,
  MafiaCardContent,
  MafiaCardDescription,
  MafiaCardHeader,
  MafiaCardTitle,
} from '@/components/mafia/mafia-panel';
import { getRoleAccent } from '@shared/games/mafia/roles.js';
import { roleDotStyle } from '../lib/roleTheme';
import type { MafiaNarratorPlayerRow } from '../types';

type TeamSide = 'good' | 'evil';

interface NarratorCompactRosterProps {
  players: MafiaNarratorPlayerRow[];
  playerName: (id: string) => string;
}

function teamAccentClass(team: TeamSide) {
  return team === 'good' ? 'text-emerald-400' : 'text-rose-400';
}

function teamBorderAccent(team: TeamSide) {
  return team === 'good' ? 'border-l-emerald-500' : 'border-l-rose-500';
}

function sortTeamPlayers(
  players: MafiaNarratorPlayerRow[],
  playerName: (id: string) => string,
) {
  return [...players].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return playerName(a.id).localeCompare(playerName(b.id));
  });
}

function PlayerStatusBadge({ player }: { player: MafiaNarratorPlayerRow }) {
  if (!player.alive) return <Badge variant="dead">Dead</Badge>;
  if (!player.roleAcknowledged) return <Badge variant="pending">Oath</Badge>;
  return <Badge variant="ok">Ready</Badge>;
}

function TeamColumn({
  title,
  subtitle,
  team,
  players,
  playerName,
}: {
  title: string;
  subtitle: string;
  team: TeamSide;
  players: MafiaNarratorPlayerRow[];
  playerName: (id: string) => string;
}) {
  const sorted = sortTeamPlayers(players, playerName);
  const alive = players.filter((p) => p.alive).length;

  return (
    <MafiaCard
      variant="inset"
      interactive={false}
      className={clsx(
        'border-l-4',
        teamBorderAccent(team),
        team === 'good'
          ? 'bg-[radial-gradient(ellipse_at_0%_0%,rgba(110,200,144,0.1)_0%,transparent_55%),linear-gradient(180deg,rgba(20,36,24,0.92)_0%,rgba(10,18,12,0.96)_100%)]'
          : 'bg-[radial-gradient(ellipse_at_0%_0%,rgba(200,84,106,0.1)_0%,transparent_55%),linear-gradient(180deg,rgba(40,18,22,0.92)_0%,rgba(22,10,12,0.96)_100%)]',
      )}
    >
      <MafiaCardHeader className="space-y-1 border-b border-stone-700/45 p-3 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <MafiaCardTitle
              className={clsx(
                'font-cinzel text-sm font-bold uppercase tracking-[0.18em]',
                teamAccentClass(team),
              )}
            >
              {title}
            </MafiaCardTitle>
            <MafiaCardDescription className="mt-0.5 font-serif text-xs italic text-[color:var(--p1-ink-soft)]/75">
              {subtitle}
            </MafiaCardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end leading-none">
            <span
              className={clsx(
                'font-cinzel text-2xl font-bold tabular-nums',
                teamAccentClass(team),
              )}
            >
              {alive}
            </span>
            <span className="mt-0.5 font-cinzel text-[0.58rem] font-bold uppercase tracking-widest text-stone-400">
              alive
            </span>
          </div>
        </div>
        <p className="m-0 font-cinzel text-[0.62rem] uppercase tracking-widest text-stone-500">
          {players.length} total
        </p>
      </MafiaCardHeader>
      <MafiaCardContent className="p-3 pt-2">
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {sorted.length === 0 ?
            <li className="font-serif text-sm italic text-[color:var(--p1-ink-soft)]/50">
              None
            </li>
          : sorted.map((p) => (
              <li
                key={p.id}
                className={clsx(
                  'flex flex-wrap items-start gap-x-2.5 gap-y-1.5 rounded-md border border-stone-700/50 bg-stone-950/80 px-2.5 py-2',
                  !p.alive && 'opacity-70',
                )}
              >
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-stone-600/60"
                  style={roleDotStyle(p.roleId)}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 basis-[calc(100%-1.25rem)] sm:basis-auto">
                  <span
                    className={clsx(
                      'block break-words font-cinzel text-[0.82rem] font-bold uppercase leading-snug tracking-wide text-amber-50',
                      !p.alive && 'line-through decoration-stone-500/80',
                    )}
                  >
                    {playerName(p.id)}
                  </span>
                  <span
                    className="mt-0.5 block break-words font-serif text-[0.8rem] font-semibold leading-snug"
                    style={{ color: getRoleAccent(p.roleId) }}
                  >
                    <span aria-hidden>{p.roleIcon}</span>{' '}
                    {p.roleNameEn}
                  </span>
                </span>
                <span className="shrink-0 self-start sm:ml-auto">
                  <PlayerStatusBadge player={p} />
                </span>
              </li>
            ))
          }
        </ul>
      </MafiaCardContent>
    </MafiaCard>
  );
}

export default function NarratorCompactRoster({
  players,
  playerName,
}: NarratorCompactRosterProps) {
  const good = players.filter((p) => p.team === 'good');
  const evil = players.filter((p) => p.team === 'evil');

  return (
    <MafiaCard variant="glass" interactive={false} className="p-4 max-md:p-3.5">
      <MafiaCardHeader className="mb-3 space-y-1 border-b border-amber-900/35 pb-3">
        <MafiaCardTitle className="font-cinzel text-sm font-bold uppercase tracking-[0.2em] text-amber-200 before:mr-1.5 before:text-[0.55rem] before:text-amber-500 before:content-['◆']">
          Secret roster
        </MafiaCardTitle>
        <MafiaCardDescription className="font-serif text-sm italic text-[color:var(--p1-ink-soft)]/80">
          Narrator only — full roles and oath status
        </MafiaCardDescription>
      </MafiaCardHeader>

      <div className="grid grid-cols-1 gap-3">
        <TeamColumn
          title="Good"
          subtitle="Village & allies"
          team="good"
          players={good}
          playerName={playerName}
        />
        <TeamColumn
          title="Evil"
          subtitle="Mafia & allies"
          team="evil"
          players={evil}
          playerName={playerName}
        />
      </div>
    </MafiaCard>
  );
}
