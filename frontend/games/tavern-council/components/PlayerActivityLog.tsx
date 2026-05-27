'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { TavernChronicleSection } from '../types';
import { formatPlayerChronicleEntry } from '../lib/formatPlayerChronicleEntry';

interface PlayerActivityLogProps {
  sections: TavernChronicleSection[];
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

export default function PlayerActivityLog({
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
      <section className="tc-player-log">
        <h2 className="tc-player-log__title tc-font-display">Your role log</h2>
        <p className="tc-player-log__empty">
          Role-related events will appear here as the match progresses.
        </p>
      </section>
    );
  }

  return (
    <section className="tc-player-log">
      <h2 className="tc-player-log__title tc-font-display">Your role log</h2>
      <p className="tc-player-log__hint">
        Events tied to your role and what you are allowed to know — check Council above for who is alive
      </p>

      <div className="tc-player-log__periods">
        {sections.map((section) => {
          if (section.entries.length === 0) return null;
          const isOpen = openKey === section.key;
          const last = section.entries[section.entries.length - 1];
          const lastLine = last ?
            formatPlayerChronicleEntry(last, playerName, roleName).text
          :	'';

          return (
            <div
              key={section.key}
              className={clsx(
                'tc-player-log-period',
                isOpen && 'tc-player-log-period--open'
              )}
            >
              <button
                type="button"
                className="tc-player-log-period__toggle"
                onClick={() => setOpenKey(isOpen ? null : section.key)}
                aria-expanded={isOpen}
              >
                <span className="tc-player-log-period__icon" aria-hidden>
                  {periodIcon(section.period.type)}
                </span>
                <span className="tc-player-log-period__label">{section.label}</span>
                {!isOpen && lastLine && (
                  <span className="tc-player-log-period__peek">{lastLine}</span>
                )}
                <span className="tc-player-log-period__chevron" aria-hidden>
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {isOpen && (
                <ol className="tc-player-log-period__entries">
                  {section.entries.map((entry, i) => {
                    const { icon, text, detail } = formatPlayerChronicleEntry(
                      entry,
                      playerName,
                      roleName
                    );
                    return (
                      <li
                        key={`${entry.at}-${i}`}
                        className="tc-player-log-entry"
                        style={{ ['--tc-entry-index' as string]: String(i) }}
                      >
                        <span className="tc-player-log-entry__icon" aria-hidden>
                          {icon}
                        </span>
                        <div>
                          <p className="tc-player-log-entry__text">{text}</p>
                          {detail && (
                            <p className="tc-player-log-entry__detail">{detail}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
