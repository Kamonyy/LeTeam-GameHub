'use client';

import { memo, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MafiaButton } from '@/components/mafia/mafia-button';
import {
  MafiaCard,
  MafiaCardContent,
  MafiaCardDescription,
  MafiaCardHeader,
  MafiaCardTitle,
} from '@/components/mafia/mafia-panel';
import type { MafiaChronicleSection } from '../types';
import { formatPlayerChronicleEntry } from '../lib/formatPlayerChronicleEntry';

interface PlayerActivityLogProps {
  sections: MafiaChronicleSection[];
  playerName: (id: string) => string;
  roleName: (roleId: string) => string;
}

function periodIcon(type: string) {
  if (type === 'day') return '☀️';
  if (type === 'night') return '🌙';
  if (type === 'morning') return '🌅';
  if (type === 'setup') return '🎭';
  return '📜';
}

function PlayerActivityLog({
  sections,
  playerName,
  roleName,
}: PlayerActivityLogProps) {
  const [openKey, setOpenKey] = useState<string | null>(
    sections[0]?.key ?? null
  );

  const hasEntries = useMemo(
    () => sections.some((s) => s.entries.length > 0),
    [sections]
  );

  if (!hasEntries) {
    return (
      <MafiaCard variant="glass">
        <MafiaCardHeader className="space-y-1 p-4 pb-2">
          <MafiaCardTitle className="font-cinzel text-[0.78rem] font-bold uppercase tracking-[0.28em] text-amber-200">
            <span className="mr-1 text-[0.55rem] text-amber-500" aria-hidden>
              ◆
            </span>
            Your role log
          </MafiaCardTitle>
        </MafiaCardHeader>
        <MafiaCardContent className="p-4 pt-0">
          <p className="text-center text-sm italic text-stone-500">
            <span className="text-amber-600/50" aria-hidden>
              ~{' '}
            </span>
            Role-related events will appear here as the match progresses.
            <span className="text-amber-600/50" aria-hidden>
              {' '}
              ~
            </span>
          </p>
        </MafiaCardContent>
      </MafiaCard>
    );
  }

  return (
    <MafiaCard variant="glass">
      <MafiaCardHeader className="space-y-1.5 border-b border-stone-800 p-4 pb-3">
        <MafiaCardTitle className="font-cinzel text-[0.78rem] font-bold uppercase tracking-[0.28em] text-amber-200">
          <span className="mr-1 text-[0.55rem] text-amber-500" aria-hidden>
            ◆
          </span>
          Your role log
        </MafiaCardTitle>
        <MafiaCardDescription className="text-sm italic text-stone-500">
          Events tied to your role and what you are allowed to know — check Players above for who is alive
        </MafiaCardDescription>
      </MafiaCardHeader>

      <MafiaCardContent className="flex flex-col gap-2 p-4 pt-3">
        {sections.map((section) => {
          if (section.entries.length === 0) return null;
          const isOpen = openKey === section.key;
          const last = section.entries[section.entries.length - 1];
          const lastLine = last
            ? formatPlayerChronicleEntry(last, playerName, roleName).text
            : '';

          return (
            <MafiaCard
              key={section.key}
              variant="inset"
              className={clsx(
                'overflow-hidden',
                isOpen && 'border-amber-500/50 shadow-[inset_0_1px_0_rgba(251,191,36,0.15)]',
              )}
            >
              <MafiaButton
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start gap-2 rounded-none px-3 py-2.5 text-left hover:bg-amber-500/5"
                onClick={() => setOpenKey(isOpen ? null : section.key)}
                aria-expanded={isOpen}
              >
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-b from-stone-800 to-stone-950 text-sm"
                  aria-hidden
                >
                  {periodIcon(section.period.type)}
                </span>
                <span className="font-cinzel shrink-0 text-[0.78rem] font-bold uppercase tracking-[0.18em] text-amber-200">
                  {section.label}
                </span>
                {!isOpen && lastLine && (
                  <span className="min-w-0 flex-1 truncate text-sm italic text-[color:var(--p1-ink-dim)]">
                    {lastLine}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-amber-500/75" aria-hidden>
                  {isOpen ? '▾' : '▸'}
                </span>
              </MafiaButton>

              {isOpen && (
                <>
                  <Separator className="bg-stone-700/80" />
                  <ScrollArea className="max-h-[18rem]">
                    <ol className="m-0 list-none space-y-0 px-3 py-2">
                      {section.entries.map((entry, i) => {
                        const { icon, text, detail } = formatPlayerChronicleEntry(
                          entry,
                          playerName,
                          roleName
                        );
                        const isLast = i === section.entries.length - 1;
                        return (
                          <li
                            key={`${entry.at}-${i}`}
                            className="animate-in fade-in slide-in-from-left-2 fill-mode-backwards py-2 duration-300 motion-reduce:animate-none"
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <div className="flex gap-2">
                              <span
                                className="w-5 shrink-0 text-center text-sm text-amber-500"
                                aria-hidden
                              >
                                {icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-base leading-snug text-stone-200">
                                  {text}
                                </p>
                                {detail && (
                                  <p className="mt-0.5 text-sm italic text-stone-500">
                                    {detail}
                                  </p>
                                )}
                              </div>
                            </div>
                            {!isLast && <Separator className="mt-2 bg-stone-700/50" />}
                          </li>
                        );
                      })}
                    </ol>
                  </ScrollArea>
                </>
              )}
            </MafiaCard>
          );
        })}
      </MafiaCardContent>
    </MafiaCard>
  );
}

export default memo(PlayerActivityLog);
