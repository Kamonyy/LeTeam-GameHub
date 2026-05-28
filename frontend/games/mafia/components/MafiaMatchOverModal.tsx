'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DoorOpen, Loader2, RotateCcw, Scale, Swords } from 'lucide-react';
import clsx from 'clsx';
import { MafiaButton } from '@/components/mafia/mafia-button';

interface MafiaMatchOverModalProps {
  open: boolean;
  winnerTeam: 'good' | 'evil';
  isNarrator: boolean;
  isHost: boolean;
  busy?: boolean;
  onPlayAgain?: () => void | Promise<void>;
  onBackToLobby?: () => void | Promise<void>;
}

export default function MafiaMatchOverModal({
  open,
  winnerTeam,
  isNarrator,
  isHost,
  busy = false,
  onPlayAgain,
  onBackToLobby,
}: MafiaMatchOverModalProps) {
  const [mounted, setMounted] = useState(false);
  const goodWon = winnerTeam === 'good';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const content = (
    <div
      className={clsx(
        'fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto overscroll-contain',
        'p-[max(1.25rem,env(safe-area-inset-top))_max(1.25rem,env(safe-area-inset-right))_max(1.25rem,env(safe-area-inset-bottom))_max(1.25rem,env(safe-area-inset-left))]',
        'bg-[rgba(7,5,4,0.82)] backdrop-blur-sm',
        '[background-image:linear-gradient(180deg,rgba(120,53,15,0.14)_0%,transparent_42%)]',
      )}
      role="presentation"
    >
      <div
        className={clsx(
          'relative mx-auto my-auto box-border w-full max-w-md',
          'max-h-[min(100%,calc(100dvh-2.5rem))] overflow-x-hidden overflow-y-auto',
          'rounded-lg border px-6 py-7 text-center',
          'border-amber-800/50 bg-gradient-to-b from-stone-900/98 to-black/98',
          'shadow-[var(--mf-shadow-panel),0_24px_48px_rgba(0,0,0,0.65)]',
          'before:pointer-events-none before:absolute before:inset-1 before:rounded before:border before:border-white/[0.07]',
          'animate-mf-scale-in motion-reduce:animate-none',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mafia-match-over-title"
      >
        <div
          className={clsx(
            'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2',
            goodWon
              ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-200'
              : 'border-rose-600/50 bg-rose-950/60 text-rose-200',
          )}
          aria-hidden
        >
          {goodWon ? (
            <Scale className="h-7 w-7" strokeWidth={1.5} />
          ) : (
            <Swords className="h-7 w-7" strokeWidth={1.5} />
          )}
        </div>

        <p className="m-0 font-cinzel text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-amber-500/80">
          Match ended
        </p>
        <h2
          id="mafia-match-over-title"
          className={clsx(
            'mt-2 font-cinzel text-2xl font-bold uppercase tracking-wide',
            goodWon ? 'text-emerald-200' : 'text-rose-200',
          )}
        >
          {goodWon ? 'Good triumphs' : 'Evil prevails'}
        </h2>
        <p className="mx-auto mt-3 max-w-xs font-serif text-base italic leading-relaxed text-[color:var(--p1-ink-soft)]">
          {goodWon
            ? 'The village drove out the darkness. Every evil role has fallen.'
            : 'The Mafia and their allies hold the town. Good could not endure.'}
        </p>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          {isNarrator && onPlayAgain && (
            <MafiaButton
              type="button"
              variant="primary"
              className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[10.5rem]"
              disabled={busy}
              onClick={() => void onPlayAgain()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden />
              )}
              Play again
            </MafiaButton>
          )}
          {isHost && onBackToLobby && (
            <MafiaButton
              type="button"
              variant="outline"
              className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[10.5rem]"
              disabled={busy}
              onClick={() => void onBackToLobby()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <DoorOpen className="h-4 w-4" aria-hidden />
              )}
              Back to lobby
            </MafiaButton>
          )}
        </div>

        {!isNarrator && !isHost && (
          <p className="mt-5 font-serif text-sm italic text-[color:var(--p1-ink-soft)]/70">
            Waiting for the narrator or host to continue…
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
