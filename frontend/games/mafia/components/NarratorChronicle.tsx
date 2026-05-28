'use client';

import { memo, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MafiaChronicleSection } from '../types';
import { formatChronicleEntry } from '../lib/formatChronicleEntry';
import MafiaDaySunIcon from './icons/MafiaDaySunIcon';
import MafiaNightMoonIcon from './icons/MafiaNightMoonIcon';
import { MafiaChronicleIcon } from './icons/MafiaChronicleIcon';

interface NarratorChronicleProps {
  sections: MafiaChronicleSection[];
  playerName: (id: string) => string;
  roleName: (roleId: string) => string;
  currentPeriodKey?: string;
}

function periodIcon(type: string) {
  if (type === 'night') return <MafiaNightMoonIcon size="sm" />;
  if (type === 'day') return <MafiaDaySunIcon size="sm" variant="day" />;
  if (type === 'morning') return <MafiaDaySunIcon size="sm" variant="morning" />;
  if (type === 'setup') return '🎭';
  return '🏁';
}

function sectionCompactSummary(
  section: MafiaChronicleSection,
  playerName: (id: string) => string,
  roleName: (roleId: string) => string
): string {
  const n = section.entries.length;
  if (n === 0) return 'No events yet';

  const last = section.entries[n - 1];
  const { text } = formatChronicleEntry(last, playerName, roleName);
  const clipped = text.length > 52 ? `${text.slice(0, 49)}…` : text;
  return n === 1 ? clipped : `${n} events · ${clipped}`;
}

const periodCardClass =
  'overflow-hidden rounded border border-amber-900/40 bg-gradient-to-b from-stone-800/55 to-stone-950/70 transition-[border-color,box-shadow] duration-200';

function NarratorChronicle({
  sections,
  playerName,
  roleName,
  currentPeriodKey,
}: NarratorChronicleProps) {
  const [openKey, setOpenKey] = useState<string | null>(
    currentPeriodKey ?? sections[0]?.key ?? null
  );

  const effectiveOpen = openKey ?? sections[0]?.key ?? null;

  if (sections.length === 0) {
    return (
      <MafiaCard variant="glass">
        <MafiaCardHeader className="pb-2">
          <MafiaCardTitle className="font-cinzel text-[0.78rem] font-bold uppercase tracking-[0.18em] text-amber-200/90 before:mr-1.5 before:text-amber-500/70 before:content-['◆_']">
            Game log
          </MafiaCardTitle>
        </MafiaCardHeader>
        <MafiaCardContent>
          <p className="m-0 text-center font-serif text-base italic text-[color:var(--p1-ink-soft)]/55 before:mx-1.5 before:text-amber-500/50 before:content-['~'] after:mx-1.5 after:text-amber-500/50 after:content-['~']">
            Events will appear here as the match progresses.
          </p>
        </MafiaCardContent>
      </MafiaCard>
    );
  }

  return (
    <MafiaCard variant="glass" className="min-w-0 max-w-full overflow-hidden">
      <MafiaCardHeader className="space-y-1 pb-2">
        <MafiaCardTitle className="font-cinzel text-[0.78rem] font-bold uppercase tracking-[0.18em] text-amber-200/90 before:mr-1.5 before:text-amber-500/70 before:content-['◆_']">
          Game log
        </MafiaCardTitle>
        <MafiaCardDescription className="text-sm italic text-[color:var(--p1-ink-soft)]/80">
          Tap a period — summary when closed, scroll when open
        </MafiaCardDescription>
      </MafiaCardHeader>
      <MafiaCardContent className="flex min-w-0 flex-col gap-2 overflow-hidden pt-0">
        {sections.map((section) => {
          const isOpen = effectiveOpen === section.key;
          const isCurrent = section.key === currentPeriodKey;
          const summary = sectionCompactSummary(section, playerName, roleName);
          return (
            <div
              key={section.key}
              className={clsx(
                periodCardClass,
                'w-full min-w-0 max-w-full',
                isOpen &&
                  'border-amber-600/60 shadow-[inset_0_1px_0_rgba(212,166,74,0.2),0_0_14px_-4px_rgba(212,166,74,0.3)]',
                isCurrent &&
                  'border-amber-300/70 bg-gradient-to-b from-amber-950/70 to-stone-950/80 shadow-[inset_0_1px_0_rgba(255,235,180,0.25),0_0_18px_-6px_rgba(240,198,106,0.45)]'
              )}
            >
              <button
                type="button"
                className="flex w-full min-w-0 max-w-full items-center gap-2 px-3 py-2.5 text-left text-[color:var(--p1-ink-soft)] transition-colors hover:bg-amber-500/5"
                onClick={() => setOpenKey(isOpen ? null : section.key)}
                aria-expanded={isOpen}
              >
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-600/45 bg-gradient-to-b from-stone-800 to-stone-950 text-sm"
                  aria-hidden
                >
                  {periodIcon(section.period.type)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-cinzel text-[0.78rem] font-bold uppercase tracking-[0.18em] text-amber-200">
                    {section.label}
                  </span>
                  {!isOpen && (
                    <span className="truncate font-serif text-sm italic text-[color:var(--p1-ink-soft)]/70">
                      {summary}
                    </span>
                  )}
                </span>
                <Badge variant="outline" className="max-w-[5.5rem] shrink-0 truncate tabular-nums">
                  {section.entries.length}
                  {isCurrent ? ' · now' : ''}
                </Badge>
                <span className="shrink-0 text-sm text-amber-500/75" aria-hidden>
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {isOpen && (
                <>
                  <Separator className="bg-amber-900/35" />
                  <ScrollArea className="max-h-[min(18rem,40vh)] w-full max-w-full">
                    <ol className="m-0 w-full min-w-0 list-none px-3 pb-3.5 pt-1">
                      {section.entries.map((entry, i) => {
                        const { icon, text, detail } = formatChronicleEntry(
                          entry,
                          playerName,
                          roleName
                        );
                        return (
                          <li
                            key={`${entry.at}-${i}`}
                            className="flex gap-2.5 border-b border-dashed border-amber-900/25 py-2 last:border-b-0"
                          >
                            <span
                              className="flex w-7 shrink-0 items-center justify-center text-sm text-amber-500"
                              aria-hidden
                            >
                              <MafiaChronicleIcon icon={icon} size="xs" />
                            </span>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="m-0 break-words font-serif text-base leading-snug text-[color:var(--p1-ink-soft)] [overflow-wrap:anywhere]">
                                {text}
                              </p>
                              {detail && (
                                <p className="mt-0.5 break-words font-serif text-sm italic text-[color:var(--p1-ink-soft)] [overflow-wrap:anywhere]">
                                  {detail}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </ScrollArea>
                </>
              )}
            </div>
          );
        })}
      </MafiaCardContent>
    </MafiaCard>
  );
}

export default memo(NarratorChronicle);
