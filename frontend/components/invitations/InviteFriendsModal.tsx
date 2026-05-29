'use client';

import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { UserPlus, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHubLive } from '@/lib/hub/HubLiveContext';
import { useInvitation } from '@/context/InvitationContext';
import { useSocket } from '@/hooks/useSocket';
import { getInviteAccent } from '@/lib/invitations/invite-accent';
import type { OnlinePlayer } from '@/lib/hub/types';

interface InviteFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  gameType: string;
}

function rowTag(
  player: OnlinePlayer,
  inMyLobby: boolean
): { label: string; tone: 'muted' | 'warn' | 'room' } | null {
  if (inMyLobby) return { label: 'In Your Lobby', tone: 'room' };
  if (player.status === 'playing') return { label: 'In-Match', tone: 'warn' };
  if (player.status === 'lobby') return { label: 'In Lobby', tone: 'muted' };
  return null;
}

export default function InviteFriendsModal({
  open,
  onOpenChange,
  roomId,
  gameType,
}: InviteFriendsModalProps) {
  const { connected, hubPresence, requestHubPresenceRefresh } = useHubLive();
  const { lobby } = useSocket();
  const { sendInvite, sentInvites, inviteError, clearInviteError } = useInvitation();
  const accent = getInviteAccent(gameType);

  const lobbyMateIds = useMemo(() => {
    if (!lobby || lobby.roomId !== roomId) return new Set<string>();
    return new Set(lobby.players.map((p) => p.id));
  }, [lobby, roomId]);

  useEffect(() => {
    if (open) {
      requestHubPresenceRefresh();
      clearInviteError();
    }
  }, [open, requestHubPresenceRefresh, clearInviteError]);

  const players = hubPresence.players ?? [];
  const inviteableCount = players.filter(
    (p) => p.inviteable && !lobbyMateIds.has(p.id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        className={clsx(
          'sm:max-w-md gap-0 p-0 overflow-hidden border-0',
          'rounded-3xl bg-[#0f1118]/95 backdrop-blur-xl',
          'shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)]',
          'ring-1 ring-white/[0.08]'
        )}
      >
        <div
          className="h-1 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent.color}, transparent)`,
          }}
        />

        <div className="px-6 pt-6 pb-4">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${accent.color}22, transparent)`,
                  boxShadow: `0 0 24px ${accent.color}33`,
                }}
              >
                <UserPlus className="h-5 w-5" style={{ color: accent.color }} />
              </div>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="text-lg font-semibold text-white tracking-tight">
                  Invite friends
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Pick someone online — they&apos;ll get a live notification.
                  <span className="font-mono text-[11px] text-hub-faint ml-1.5 tracking-wider block mt-1">
                    ROOM {roomId}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {connected && (
              <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-hub-accent shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="tabular-nums font-medium text-hub-text-secondary">
                    {inviteableCount}
                  </span>{' '}
                  {inviteableCount === 1 ? 'player' : 'players'} available · lobby mates
                  are greyed out
                </p>
              </div>
            )}
          </DialogHeader>

          {inviteError && (
            <p className="mt-3 text-sm text-hub-danger rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              {inviteError}
            </p>
          )}
        </div>

        <ul className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain px-4 pb-5 space-y-2 hub-arcade-scroll">
          {!connected && (
            <li className="text-center text-sm text-hub-muted py-10 rounded-2xl bg-white/[0.02]">
              Connecting…
            </li>
          )}

          {connected && players.length === 0 && (
            <li className="text-center text-sm text-hub-muted py-10 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08]">
              No other players online right now.
            </li>
          )}

          {connected &&
            players.map((player) => {
              const sent = sentInvites.get(player.id);
              const inMyLobby = lobbyMateIds.has(player.id);
              const canInvite = player.inviteable && !inMyLobby;
              const tag = rowTag(player, inMyLobby);

              return (
                <li
                  key={player.id}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200',
                    inMyLobby &&
                      'opacity-45 grayscale-[0.35] border-white/[0.04] bg-stone-900/40 cursor-not-allowed',
                    !inMyLobby &&
                      canInvite &&
                      'border-white/[0.08] bg-gradient-to-r from-white/[0.06] to-transparent hover:border-white/[0.14] hover:from-white/[0.09]',
                    !inMyLobby &&
                      !canInvite &&
                      'opacity-55 border-transparent bg-stone-900/30'
                  )}
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    {canInvite && (
                      <span
                        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                        style={{ backgroundColor: accent.color }}
                      />
                    )}
                    <span
                      className={clsx(
                        'relative inline-flex h-2.5 w-2.5 rounded-full',
                        canInvite ? '' : 'bg-stone-600'
                      )}
                      style={canInvite ? { backgroundColor: accent.color } : undefined}
                    />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p
                      className={clsx(
                        'text-sm font-medium truncate',
                        inMyLobby ? 'text-hub-faint' : 'text-foreground'
                      )}
                    >
                      {player.displayName}
                    </p>
                    {tag && (
                      <p
                        className={clsx(
                          'text-[10px] uppercase tracking-wider font-mono mt-0.5',
                          tag.tone === 'room' && 'text-hub-faint',
                          tag.tone === 'warn' && 'text-amber-500/90',
                          tag.tone === 'muted' && 'text-hub-muted'
                        )}
                      >
                        {tag.label}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!canInvite || !!sent}
                    onClick={() => void sendInvite(player.id, roomId, gameType)}
                    className={clsx(
                      'shrink-0 text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all duration-200',
                      sent &&
                        'text-hub-faint border-border/80 bg-secondary/60 cursor-default',
                      !sent &&
                        canInvite &&
                        'text-white border-white/20 hover:border-white/30 hover:bg-white/10',
                      !sent &&
                        !canInvite &&
                        'text-hub-faint border-border/60 cursor-not-allowed'
                    )}
                    style={
                      !sent && canInvite ?
                        {
                          borderColor: `${accent.color}44`,
                          color: accent.color,
                        }
                      : undefined
                    }
                  >
                    {sent ? 'Sent' : 'Invite'}
                  </button>
                </li>
              );
            })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
