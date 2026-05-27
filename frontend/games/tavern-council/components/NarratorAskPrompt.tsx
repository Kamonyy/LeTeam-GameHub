'use client';

import clsx from 'clsx';
import type { TavernNightStepView } from '../types';
import { roleThemeStyleFromRole } from '../lib/roleTheme';

export interface AskHolder {
  id: string;
  alive: boolean;
  color: string;
  roleNameEn: string | null;
  roleIcon: string | null;
}

interface NarratorAskPromptProps {
  step: TavernNightStepView;
  holders: AskHolder[];
  playerName: (id: string) => string;
}

export default function NarratorAskPrompt({
  step,
  holders,
  playerName,
}: NarratorAskPromptProps) {
  if (holders.length === 0) {
    return (
      <div className="tc-ask-prompt tc-ask-prompt--empty">
        <p className="tc-ask-prompt__label">Who to ask</p>
        <p className="tc-ask-prompt__empty">
          No one has the {step.roleNameEn ?? 'required'} role in this game.
        </p>
      </div>
    );
  }

  const primary = holders[0];
  const also = holders.slice(1);
  const roleAccentStyle = roleThemeStyleFromRole(step.roleId);

  return (
    <div className="tc-ask-prompt" role="region" aria-label="Who to ask in person">
      <p className="tc-ask-prompt__label">Go ask in person</p>
      <p className="tc-ask-prompt__hint">
        Wake or tap this player — they perform the action, you record it below.
      </p>

      <div
        className={clsx(
          'tc-ask-prompt__hero',
          !primary.alive && 'tc-ask-prompt__hero--dead'
        )}
        style={roleAccentStyle}
      >
        <span className="tc-ask-prompt__pulse" aria-hidden />
        <span
          className="tc-ask-prompt__avatar"
          style={{ background: primary.color }}
        >
          <span className="tc-ask-prompt__avatar-icon" aria-hidden>
            {step.roleIcon ?? primary.roleIcon ?? '👤'}
          </span>
        </span>
        <div className="tc-ask-prompt__hero-text">
          <span className="tc-ask-prompt__wake">ASK THIS PLAYER</span>
          <span className="tc-ask-prompt__name tc-font-display">
            {playerName(primary.id)}
          </span>
          <span className="tc-ask-prompt__role">
            {step.roleNameEn ?? primary.roleNameEn}
            {!primary.alive ? ' · still prompt them (dead)' : ''}
          </span>
        </div>
        {!primary.alive && (
          <span className="tc-ask-prompt__dead-badge">Dead</span>
        )}
      </div>

      {also.length > 0 && (
        <div className="tc-ask-prompt__also">
          <p className="tc-ask-prompt__also-label">Also holds this role</p>
          <ul className="tc-ask-prompt__also-list">
            {also.map((h) => (
              <li
                key={h.id}
                className="tc-ask-prompt__also-chip"
                style={roleAccentStyle}
              >
                <span className="tc-dot" style={{ background: h.color }} />
                <span>{playerName(h.id)}</span>
                {!h.alive && <span className="tc-ask-prompt__mini-dead">dead</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
