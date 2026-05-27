'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { TavernChronicleSection } from '../types';
import { formatChronicleEntry } from '../lib/formatChronicleEntry';

interface NarratorChronicleProps {
  sections: TavernChronicleSection[];
  playerName: (id: string) => string;
  roleName: (roleId: string) => string;
  currentPeriodKey?: string;
}

function periodIcon(type: string) {
  if (type === 'day') return '☀️';
  if (type === 'night') return '🌙';
  if (type === 'morning') return '🌅';
  if (type === 'setup') return '🎭';
  return '🏁';
}

function sectionCompactSummary(
  section: TavernChronicleSection,
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

export default function NarratorChronicle({
  sections,
  playerName,
  roleName,
  currentPeriodKey,
}: NarratorChronicleProps) {
  const [openKey, setOpenKey] = useState<string | null>(
    currentPeriodKey ?? sections[0]?.key ?? null
  );

  const effectiveOpen = openKey ?? sections[0]?.key ?? null;

  const sorted = useMemo(() => sections, [sections]);

  if (sorted.length === 0) {
    return (
      <section className="tc-chronicle tc-chronicle--compact">
        <h2 className="tc-section-title tc-font-display">Game log</h2>
        <p className="tc-chronicle__empty">Events will appear here as the match progresses.</p>
      </section>
    );
  }

  return (
    <section className="tc-chronicle tc-chronicle--compact">
      <h2 className="tc-section-title tc-font-display">Game log</h2>
      <p className="tc-section-hint tc-section-hint--tight">
        Tap a period — summary when closed, scroll when open
      </p>

      <div className="tc-chronicle__periods">
        {sorted.map((section) => {
          const isOpen = effectiveOpen === section.key;
          const isCurrent = section.key === currentPeriodKey;
          const summary = sectionCompactSummary(section, playerName, roleName);
          return (
            <div
              key={section.key}
              className={clsx(
                'tc-chronicle-period',
                isOpen && 'tc-chronicle-period--open',
                isCurrent && 'tc-chronicle-period--current'
              )}
            >
              <button
                type="button"
                className="tc-chronicle-period__toggle"
                onClick={() => setOpenKey(isOpen ? null : section.key)}
                aria-expanded={isOpen}
              >
                <span className="tc-chronicle-period__icon" aria-hidden>
                  {periodIcon(section.period.type)}
                </span>
                <span className="tc-chronicle-period__main">
                  <span className="tc-chronicle-period__label">{section.label}</span>
                  {!isOpen && (
                    <span className="tc-chronicle-period__summary">{summary}</span>
                  )}
                </span>
                <span className="tc-chronicle-period__meta">
                  {section.entries.length}
                  {isCurrent ? ' · now' : ''}
                </span>
                <span className="tc-chronicle-period__chevron" aria-hidden>
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {isOpen && (
                <ol className="tc-chronicle-period__entries tc-chronicle-period__entries--scroll">
                  {section.entries.map((entry, i) => {
                    const { icon, text, detail } = formatChronicleEntry(
                      entry,
                      playerName,
                      roleName
                    );
                    return (
                      <li key={`${entry.at}-${i}`} className="tc-chronicle-entry">
                        <span className="tc-chronicle-entry__icon" aria-hidden>
                          {icon}
                        </span>
                        <div className="tc-chronicle-entry__body">
                          <p className="tc-chronicle-entry__text">{text}</p>
                          {detail && (
                            <p className="tc-chronicle-entry__detail">{detail}</p>
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
