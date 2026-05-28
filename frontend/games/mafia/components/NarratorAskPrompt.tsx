'use client';

import clsx from 'clsx';
import {
  MafiaCard,
  MafiaCardContent,
  MafiaCardDescription,
  MafiaCardHeader,
  MafiaCardTitle,
} from '@/components/mafia/mafia-panel';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { MafiaNightStepView } from '../types';
import { mfNameGold, mfNameMuted, mfRoleLine } from '../lib/mafiaTypography';
import {
  roleDotStyle,
  roleIconBadgeStyle,
  roleThemeStyleFromRole,
} from '../lib/roleTheme';

export interface AskHolder {
  id: string;
  alive: boolean;
  color: string;
  roleNameEn: string | null;
  roleIcon: string | null;
}

interface NarratorAskPromptProps {
  step: MafiaNightStepView;
  holders: AskHolder[];
  playerName: (id: string) => string;
  /** Inline inside DecreeZone — no nested card chrome */
  embedded?: boolean;
}

const askShellClass =
  'border-violet-900/40 bg-gradient-to-b from-indigo-950/75 to-stone-950/85 shadow-[inset_0_1px_0_rgba(180,200,255,0.12),0_6px_18px_-8px_rgba(0,0,0,0.7)]';

function HolderRow({
  step,
  primary,
  also,
  playerName,
  compact,
}: {
  step: MafiaNightStepView;
  primary: AskHolder;
  also: AskHolder[];
  playerName: (id: string) => string;
  compact: boolean;
}) {
  const roleAccentStyle = roleThemeStyleFromRole(step.roleId);

  return (
    <>
      <div
        className={clsx(
          'relative flex items-center gap-2.5 overflow-hidden rounded-md border',
          compact ? 'px-3 py-2.5' : 'gap-3.5 px-4 py-3.5',
          'border-amber-400/55 bg-gradient-to-b from-stone-800/92 to-stone-950/96 shadow-[inset_0_1px_0_rgba(255,235,180,0.2),0_0_16px_-6px_rgba(240,198,106,0.35)]',
          !primary.alive &&
            'border-stone-600/55 shadow-[inset_0_1px_0_rgba(200,150,130,0.18),0_0_14px_-8px_rgba(120,60,60,0.35)]',
        )}
        style={roleAccentStyle}
      >
        {primary.alive && (
          <span
            className="pointer-events-none absolute inset-[-2px] animate-[pulse_2.4s_ease-in-out_infinite] rounded-md border border-amber-300/45 motion-reduce:animate-none"
            aria-hidden
          />
        )}
        <span
          className={clsx(
            'relative inline-flex shrink-0 items-center justify-center rounded-full border-2',
            compact ? 'h-10 w-10' : 'h-[3.2rem] w-[3.2rem]',
          )}
          style={roleIconBadgeStyle(step.roleId, primary.color)}
        >
          <span
            className={clsx(
              'leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]',
              compact ? 'text-xl' : 'text-[1.65rem]',
            )}
            aria-hidden
          >
            {step.roleIcon ?? primary.roleIcon ?? '👤'}
          </span>
        </span>
        <div className="relative flex min-w-0 flex-1 flex-col gap-0.5">
          {!compact && (
            <span className="font-cinzel text-[0.58rem] font-bold uppercase tracking-[0.28em] text-amber-200/85">
              Wake & ask
            </span>
          )}
          <span
            className={clsx(
              primary.alive ? mfNameGold : mfNameMuted,
              'tracking-wide',
              compact ? 'text-lg leading-tight' : 'text-xl leading-tight',
            )}
          >
            {playerName(primary.id)}
          </span>
          <span
            className={clsx(
              mfRoleLine,
              compact ? 'text-[0.7rem]' : 'text-xs',
            )}
          >
            {step.roleNameEn ?? primary.roleNameEn ?? 'Unknown role'}
            {!primary.alive ? (
              <span className="font-serif normal-case tracking-normal text-[color:var(--p1-ink-soft)]/75">
                {' '}
                · dead — still prompt
              </span>
            ) : null}
          </span>
        </div>
        {!primary.alive && (
          <Badge variant="destructive" className="relative shrink-0 text-[0.6rem]">
            Dead
          </Badge>
        )}
      </div>

      {also.length > 0 && (
        <div className={compact ? 'mt-2' : 'mt-3'}>
          {!compact && <Separator className="mb-2 border-dashed bg-amber-900/35" />}
          <p className="font-cinzel mb-1.5 text-[0.58rem] uppercase tracking-[0.22em] text-amber-500/70">
            Also holds this role
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
            {also.map((h) => (
              <li
                key={h.id}
                className="inline-flex items-center gap-1 rounded-full border border-amber-700/35 bg-stone-950/90 px-2 py-0.5 font-serif text-xs text-[color:var(--p1-ink-soft)]"
                style={roleAccentStyle}
              >
                <span
                  className="mf-role-dot h-2.5 w-2.5 shrink-0 rounded-full"
                  style={roleDotStyle(step.roleId)}
                  aria-hidden
                />
                <span>{playerName(h.id)}</span>
                {!h.alive && (
                  <Badge variant="destructive" className="px-1 py-0 text-[0.45rem]">
                    dead
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function NarratorAskPrompt({
  step,
  holders,
  playerName,
  embedded = false,
}: NarratorAskPromptProps) {
  if (holders.length === 0) {
    const empty = (
      <p className="m-0 font-serif text-sm italic text-[color:var(--p1-ink-soft)]/60">
        No one has the {step.roleNameEn ?? 'required'} role in this game.
      </p>
    );
    if (embedded) {
      return (
        <div data-narrator-ask className="rounded-md border border-violet-800/35 bg-violet-950/25 px-3 py-2">
          {empty}
        </div>
      );
    }
    return (
      <MafiaCard variant="glass" data-narrator-ask className={clsx('my-3', askShellClass)}>
        <MafiaCardHeader className="space-y-1 p-4 pb-2">
          <MafiaCardTitle className="font-cinzel text-[0.7rem] font-bold uppercase tracking-[0.28em] text-violet-100">
            Who to ask
          </MafiaCardTitle>
        </MafiaCardHeader>
        <MafiaCardContent className="p-4 pt-0">{empty}</MafiaCardContent>
      </MafiaCard>
    );
  }

  const primary = holders[0];
  const also = holders.slice(1);

  if (embedded) {
    return (
      <div data-narrator-ask role="region" aria-label="Wake and ask this player">
        <HolderRow
          step={step}
          primary={primary}
          also={also}
          playerName={playerName}
          compact
        />
      </div>
    );
  }

  return (
    <MafiaCard
      variant="glass"
      data-narrator-ask
      className={clsx('my-3', askShellClass, 'animate-overlay-pop')}
      role="region"
      aria-label="Who to ask in person"
    >
      <MafiaCardHeader className="space-y-1 p-4 pb-2">
        <MafiaCardTitle className="font-cinzel text-[0.7rem] font-bold uppercase tracking-[0.28em] text-violet-100">
          Go ask in person
        </MafiaCardTitle>
        <MafiaCardDescription className="font-serif text-sm italic text-[color:var(--p1-ink-soft)]/70">
          Wake or tap this player — they perform the action, you record it below.
        </MafiaCardDescription>
      </MafiaCardHeader>
      <MafiaCardContent className="space-y-3 p-4 pt-0">
        <HolderRow
          step={step}
          primary={primary}
          also={also}
          playerName={playerName}
          compact={false}
        />
      </MafiaCardContent>
    </MafiaCard>
  );
}
