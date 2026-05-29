'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  useInvitation,
  INVITE_TTL_MS,
  type InviteOverlayPhase,
} from '@/context/InvitationContext';
import { getInviteAccent } from '@/lib/invitations/invite-accent';
import InviteGameHighlight from '@/components/invitations/InviteGameHighlight';

function overlayAnimationClass(phase: InviteOverlayPhase): string {
  if (phase === 'exiting') return 'animate-arcade-slide-out';
  if (phase === 'entering' || phase === 'visible') return 'animate-arcade-slide-in';
  return '';
}

export default function InvitationOverlay() {
  const {
    incomingInvite,
    overlayPhase,
    secondsRemaining,
    respondToInvite,
    dismissIncoming,
  } = useInvitation();

  const [mounted, setMounted] = useState(false);
  const [progressStarted, setProgressStarted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!incomingInvite || overlayPhase === 'hidden' || overlayPhase === 'exiting') {
      setProgressStarted(false);
      return;
    }
    setProgressStarted(false);
    const frame = requestAnimationFrame(() => {
      setProgressStarted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [incomingInvite?.inviteId, overlayPhase]);

  if (!mounted || !incomingInvite || overlayPhase === 'hidden') {
    return null;
  }

  const urgent = secondsRemaining > 0 && secondsRemaining <= 5;
  const accent = getInviteAccent(incomingInvite.gameType);
  const initial =
    incomingInvite.fromName?.trim().charAt(0).toUpperCase() || '?';

  const content = (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-live="polite"
    >
      <div
        className={clsx(
          'pointer-events-auto fixed bottom-6 right-6 w-80 max-w-[calc(100vw-1.5rem)]',
          'mb-[max(0px,env(safe-area-inset-bottom))] mr-[max(0px,env(safe-area-inset-right))]',
          overlayAnimationClass(overlayPhase)
        )}
      >
        <div
          className={clsx(
            'relative overflow-hidden rounded-2xl border border-stone-800/90',
            'bg-[#12141c]/95 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)]',
            'border-l-[3px]',
            urgent ? 'border-l-red-500' : accent.borderClass
          )}
        >
          <button
            type="button"
            onClick={dismissIncoming}
            className="absolute top-2 right-2 z-10 p-1 text-hub-faint hover:text-hub-text-secondary transition-colors text-lg leading-none"
            aria-label="Decline invite"
          >
            ×
          </button>

          <div className="px-3 pt-2 pb-1">
            <span
              className={clsx(
                'inline-block text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded',
                'bg-secondary/80 text-hub-text-secondary',
                urgent && 'animate-pulse duration-500 text-red-400'
              )}
            >
              {urgent ? 'CHALLENGER APPROACHING' : 'INVITE RECEIVED'}
            </span>
          </div>

          <InviteGameHighlight gameType={incomingInvite.gameType} />

          <div className="flex items-center gap-2.5 px-3 pb-2">
            <div
              className={clsx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-foreground',
                'bg-secondary',
                urgent ? 'ring-2 ring-red-500/50' : 'ring-1 ring-border'
              )}
            >
              {initial}
            </div>
            <p className="min-w-0 flex-1 pr-5 text-xs text-muted-foreground leading-snug">
              <span className="font-medium text-hub-text-secondary">
                {incomingInvite.fromName}
              </span>
              {' invited you'}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 pb-2">
            <span className="font-mono text-[10px] tracking-wider text-hub-faint uppercase">
              ROOM {incomingInvite.roomId}
            </span>
            <span
              className={clsx(
                'font-mono tabular-nums text-xs tracking-wider',
                urgent ?
                  'text-red-500 animate-pulse duration-500'
                : 'text-muted-foreground'
              )}
            >
              {secondsRemaining}s
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={() => void respondToInvite(true)}
              className="text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-3 py-1 text-xs font-mono uppercase tracking-widest transition-all duration-150"
            >
              Accept
            </button>
          </div>

          <div
            className={clsx(
              'absolute bottom-0 left-0 h-px',
              urgent ? 'bg-red-500' : accent.progressClass,
              urgent && 'animate-pulse duration-500'
            )}
            style={{
              width: progressStarted ? '0%' : '100%',
              transition: progressStarted
                ? `width ${INVITE_TTL_MS}ms linear`
                : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
