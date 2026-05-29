'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DoorOpen, Loader2, LogOut, Scale, Swords } from 'lucide-react';
import clsx from 'clsx';
import { MafiaButton } from '@/components/mafia/mafia-button';

interface MafiaMatchOverModalProps {
  open: boolean;
  winnerTeam: 'good' | 'evil';
  isHost: boolean;
  busy?: boolean;
  onReturnToLobby?: () => void | Promise<void>;
  onExit?: () => void | Promise<void>;
  onLeave?: () => void | Promise<void>;
}

export default function MafiaMatchOverModal({
  open,
  winnerTeam,
  isHost,
  busy = false,
  onReturnToLobby,
  onExit,
  onLeave,
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
      data-mafia-theme
      className={clsx(
        'fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain',
        'p-[max(1.25rem,env(safe-area-inset-top))_max(1.25rem,env(safe-area-inset-right))_max(1.25rem,env(safe-area-inset-bottom))_max(1.25rem,env(safe-area-inset-left))]',
        'bg-[rgba(4,3,2,0.92)] backdrop-blur-md',
        goodWon
          ? '[background-image:radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,120,80,0.22)_0%,transparent_55%)]'
          : '[background-image:radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(190,24,40,0.2)_0%,transparent_55%)]',
      )}
      role="presentation"
    >
      <div
        className={clsx(
          'relative mx-auto box-border w-full max-w-lg',
          'max-h-[min(100%,calc(100dvh-2.5rem))] overflow-x-hidden overflow-y-auto',
          'rounded-xl border-2 px-7 py-8 text-center',
          'bg-gradient-to-b from-stone-900 via-stone-950 to-black',
          'shadow-[0_0_0_1px_rgba(251,191,36,0.15),0_32px_64px_rgba(0,0,0,0.75),var(--mf-shadow-panel)]',
          'before:pointer-events-none before:absolute before:inset-1.5 before:rounded-[0.65rem] before:border before:border-white/10',
          'animate-mf-scale-in motion-reduce:animate-none',
          goodWon
            ? 'border-emerald-500/55 ring-4 ring-emerald-500/15'
            : 'border-rose-500/55 ring-4 ring-rose-500/15',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mafia-match-over-title"
      >
        <div
          className={clsx(
            'mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-lg',
            goodWon
              ? 'border-emerald-400/70 bg-emerald-950/80 text-emerald-100 shadow-emerald-900/50'
              : 'border-rose-400/70 bg-rose-950/80 text-rose-100 shadow-rose-900/50',
          )}
          aria-hidden
        >
          {goodWon ? (
            <Scale className="h-8 w-8" strokeWidth={1.75} />
          ) : (
            <Swords className="h-8 w-8" strokeWidth={1.75} />
          )}
        </div>

        <p className="m-0 font-cinzel text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
          Match ended
        </p>
        <h2
          id="mafia-match-over-title"
          className={clsx(
            'mt-3 font-cinzel text-3xl font-bold uppercase tracking-wide sm:text-4xl',
            goodWon ? 'text-emerald-100' : 'text-rose-100',
          )}
        >
          {goodWon ? 'Good triumphs' : 'Evil prevails'}
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-stone-100">
          {goodWon
            ? 'The village drove out the darkness. Every evil role has fallen.'
            : 'The Mafia and their allies hold the town. Good could not endure.'}
        </p>

        <div
          className={clsx(
            'mt-8 rounded-lg border px-4 py-5',
            'border-amber-700/40 bg-black/45',
            'shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]',
          )}
        >
          {isHost ? (
            <>
              <p className="m-0 text-base font-medium text-amber-50">
                Choose what happens next for the room
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-stretch">
                {onReturnToLobby && (
                  <MafiaButton
                    type="button"
                    variant="primary"
                    className="min-h-[3rem] flex-1 text-sm sm:text-base"
                    disabled={busy}
                    onClick={() => void onReturnToLobby()}
                  >
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    ) : (
                      <DoorOpen className="h-5 w-5" aria-hidden />
                    )}
                    Return to lobby
                  </MafiaButton>
                )}
                {onExit && (
                  <MafiaButton
                    type="button"
                    variant="destructive"
                    className="min-h-[3rem] flex-1 text-sm sm:text-base"
                    disabled={busy}
                    onClick={() => void onExit()}
                  >
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    ) : (
                      <LogOut className="h-5 w-5" aria-hidden />
                    )}
                    Exit room
                  </MafiaButton>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="m-0 text-base text-stone-200">
                Waiting for the host to continue…
              </p>
              {onLeave && (
                <MafiaButton
                  type="button"
                  variant="outline"
                  className="mt-4 min-h-[3rem] w-full border-stone-500/50 bg-stone-900/80 text-base text-stone-100 hover:border-amber-500/60 hover:text-amber-50"
                  disabled={busy}
                  onClick={() => void onLeave()}
                >
                  <LogOut className="h-5 w-5" aria-hidden />
                  Leave to main page
                </MafiaButton>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
