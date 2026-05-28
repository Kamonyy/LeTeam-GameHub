'use client';

import clsx from 'clsx';
import { getGameEntry } from '@/lib/hub/games-registry';
import { getInviteAccent } from '@/lib/invitations/invite-accent';

interface InviteGameHighlightProps {
  gameType: string;
  className?: string;
}

/** Prominent game card — shown on incoming invite toast for receivers only. */
export default function InviteGameHighlight({
  gameType,
  className,
}: InviteGameHighlightProps) {
  const entry = getGameEntry(gameType);
  const accent = getInviteAccent(gameType);
  const gameName = entry?.name ?? gameType;
  const icon = entry?.icon ?? '🎮';
  const players = entry?.players;

  return (
    <div
      className={clsx(
        'relative overflow-hidden border mx-3 mb-2 rounded-xl px-3 py-3',
        className
      )}
      style={{
        borderColor: `${accent.color}55`,
        background: `linear-gradient(135deg, ${accent.color}1a 0%, ${accent.color}08 45%, rgba(15,17,24,0.6) 100%)`,
        boxShadow: `0 0 28px ${accent.color}22, inset 0 1px 0 ${accent.color}33`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl"
        style={{ backgroundColor: accent.color }}
      />

      <p
        className="relative font-mono uppercase tracking-[0.22em] text-[9px] mb-1.5 text-center"
        style={{ color: accent.color }}
      >
        Invited to play
      </p>

      <div className="relative flex flex-col items-center text-center gap-2">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl"
          style={{
            borderColor: `${accent.color}44`,
            backgroundColor: `${accent.color}18`,
            boxShadow: `0 0 20px ${accent.color}30`,
          }}
          aria-hidden
        >
          {icon}
        </span>

        <div className="w-full min-w-0">
          <p
            className="font-bold leading-tight text-white text-xl sm:text-2xl"
            style={{
              textShadow: `0 0 24px ${accent.color}66`,
            }}
          >
            {gameName}
          </p>
          {players && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-stone-400">
              {players} players
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
