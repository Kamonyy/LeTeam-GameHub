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
}

const askShellClass =
  'my-3 border-violet-900/40 bg-gradient-to-b from-indigo-950/75 to-stone-950/85 shadow-[inset_0_1px_0_rgba(180,200,255,0.12),0_6px_18px_-8px_rgba(0,0,0,0.7)]';

export default function NarratorAskPrompt({
  step,
  holders,
  playerName,
}: NarratorAskPromptProps) {
  if (holders.length === 0) {
    return (
      <MafiaCard variant="glass" data-narrator-ask className={askShellClass}>
        <MafiaCardHeader className="space-y-1 p-4 pb-2">
          <MafiaCardTitle className="font-cinzel text-[0.7rem] font-bold uppercase tracking-[0.28em] text-violet-100 before:text-violet-200 before:content-['☾_']">
            Who to ask
          </MafiaCardTitle>
        </MafiaCardHeader>
        <MafiaCardContent className="p-4 pt-0">
          <p className="m-0 font-serif text-sm italic text-[color:var(--p1-ink-soft)]/60">
            No one has the {step.roleNameEn ?? 'required'} role in this game.
          </p>
        </MafiaCardContent>
      </MafiaCard>
    );
  }

  const primary = holders[0];
  const also = holders.slice(1);
  const roleAccentStyle = roleThemeStyleFromRole(step.roleId);

  return (
    <MafiaCard
      variant="glass"
      data-narrator-ask
      className={clsx(askShellClass, 'animate-overlay-pop')}
      role="region"
      aria-label="Who to ask in person"
    >
      <MafiaCardHeader className="space-y-1 p-4 pb-2">
        <MafiaCardTitle className="font-cinzel text-[0.7rem] font-bold uppercase tracking-[0.28em] text-violet-100 before:text-violet-200 before:content-['☾_']">
          Go ask in person
        </MafiaCardTitle>
        <MafiaCardDescription className="font-serif text-sm italic text-[color:var(--p1-ink-soft)]/70">
          Wake or tap this player — they perform the action, you record it below.
        </MafiaCardDescription>
      </MafiaCardHeader>
      <MafiaCardContent className="space-y-3 p-4 pt-0">
        <div
          className={clsx(
            'relative flex items-center gap-3.5 overflow-hidden rounded border px-4 py-3.5',
            'border-amber-400/55 bg-gradient-to-b from-stone-800/92 to-stone-950/96 shadow-[inset_0_1px_0_rgba(255,235,180,0.25),0_0_22px_-6px_rgba(240,198,106,0.45)]',
            !primary.alive &&
              'border-stone-600/55 shadow-[inset_0_1px_0_rgba(200,150,130,0.18),0_0_18px_-8px_rgba(120,60,60,0.4)]'
          )}
          style={roleAccentStyle}
        >
          {primary.alive && (
            <span
              className="pointer-events-none absolute inset-[-2px] animate-[pulse_2.4s_ease-in-out_infinite] rounded-md border border-amber-300/50 motion-reduce:animate-none"
              aria-hidden
            />
          )}
          <span
            className="relative inline-flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center rounded-full border-2"
            style={roleIconBadgeStyle(step.roleId, primary.color)}
          >
            <span
              className="text-[1.65rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
              aria-hidden
            >
              {step.roleIcon ?? primary.roleIcon ?? '👤'}
            </span>
          </span>
          <div className="relative flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-cinzel text-[0.6rem] font-bold uppercase tracking-[0.32em] text-amber-200/90">
              ASK THIS PLAYER
            </span>
            <span
              className={clsx(
                'font-cinzel text-lg font-bold uppercase tracking-wide',
                primary.alive
                  ? 'bg-gradient-to-b from-amber-50 via-amber-300 to-amber-600 bg-clip-text text-transparent'
                  : 'bg-gradient-to-b from-stone-300 to-stone-600 bg-clip-text text-transparent'
              )}
            >
              {playerName(primary.id)}
            </span>
            <span className="font-serif text-sm italic text-[color:var(--p1-ink-soft)]/75">
              {step.roleNameEn ?? primary.roleNameEn}
              {!primary.alive ? ' · still prompt them (dead)' : ''}
            </span>
          </div>
          {!primary.alive && (
            <Badge variant="destructive" className="relative shrink-0">
              Dead
            </Badge>
          )}
        </div>

        {also.length > 0 && (
          <>
            <Separator className="border-dashed bg-amber-900/35" />
            <div>
              <p className="font-cinzel mb-2 text-[0.6rem] uppercase tracking-[0.24em] text-amber-500/70">
                Also holds this role
              </p>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {also.map((h) => (
                  <li
                    key={h.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/35 bg-gradient-to-b from-stone-950/92 to-black/94 px-2.5 py-1 font-serif text-sm text-[color:var(--p1-ink-soft)]"
                    style={roleAccentStyle}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-stone-900/50"
                      style={roleDotStyle(step.roleId, h.color)}
                      aria-hidden
                    />
                    <span>{playerName(h.id)}</span>
                    {!h.alive && (
                      <Badge variant="destructive" className="px-1 py-0 text-[0.5rem]">
                        dead
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </MafiaCardContent>
    </MafiaCard>
  );
}
