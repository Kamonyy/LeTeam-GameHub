'use client';

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Copy,
  Check,
  Users,
  Crown,
  LogOut,
  Play,
  UserX,
} from 'lucide-react';
import type { LobbyPlayer, LobbyState } from '@/lib/hub/types';
import { buildShareUrl } from '@/lib/hub/share-url';
import InviteFriendsButton from '@/components/invitations/InviteFriendsButton';
import LobbyChatPanel from '@/components/hub/LobbyChatPanel';

export type GameLobbyCoreProps = {
  lobby: LobbyState;
  playerId: string;
  roomPath: string;
  onStartGame: () => void;
  onLeave: () => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  starting?: boolean;
  settingsSlot?: ReactNode;
  aboutSlot?: ReactNode;
  footerSlot?: ReactNode;
  /** When set, overrides default host/min-players start logic. */
  canStartOverride?: boolean;
  /** Extra badges/icons beside each player name (host crown is always shown). */
  renderPlayerExtra?: (player: LobbyPlayer, index: number) => ReactNode;
  /** Optional per-player row className. */
  getPlayerRowClassName?: (player: LobbyPlayer, index: number) => string | undefined;
  className?: string;
  roomCodeLabel?: string;
  playersLabel?: string;
  startLabel?: string;
  leaveLabel?: string;
  waitingForHostLabel?: string;
  showEmptySlots?: boolean;
  /** Collapsible lobby chat below roster (default true). */
  showLobbyChat?: boolean;
  lobbyChatScrollbar?: 'default' | 'hextech' | 'mafia';
  /** Render player roster above settingsSlot (e.g. Bara lobby). */
  rosterBeforeSettings?: boolean;
  /** Dense grid roster for games with large settings panels. */
  compactRoster?: boolean;
  rosterClassName?: string;
  /** Shown in compact roster empty grid cells (default …). */
  compactEmptySlotLabel?: string;
  /** Suffix after display name when compact roster marks local player. */
  compactYouLabel?: string;
};

export default function GameLobbyCore({
  lobby,
  playerId,
  roomPath,
  onStartGame,
  onLeave,
  onKickPlayer,
  starting = false,
  settingsSlot,
  aboutSlot,
  footerSlot,
  canStartOverride,
  renderPlayerExtra,
  getPlayerRowClassName,
  className,
  roomCodeLabel = 'Room Code',
  playersLabel,
  startLabel = 'Start Match',
  leaveLabel = 'Leave',
  waitingForHostLabel = 'Waiting for host to start…',
  showEmptySlots = true,
  showLobbyChat = true,
  lobbyChatScrollbar = 'default',
  rosterBeforeSettings = false,
  compactRoster = false,
  rosterClassName,
  compactEmptySlotLabel = '…',
  compactYouLabel = ' (أنت)',
}: GameLobbyCoreProps) {
  const [copied, setCopied] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);

  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;

  const defaultCanStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    connectedCount <= lobby.maxPlayers;

  const canStart = canStartOverride ?? defaultCanStart;

  const shareUrl = buildShareUrl(roomPath, lobby.roomId);

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKick = async (targetId: string) => {
    if (!onKickPlayer) return;
    setKickingId(targetId);
    await onKickPlayer(targetId);
    setKickingId(null);
  };

  const rosterLabel =
    playersLabel ?? `${lobby.players.length} / ${lobby.maxPlayers} players`;

  const rosterSection = (
    <div
      className={clsx(
        compactRoster ? 'mb-4' : 'mb-6',
        rosterClassName,
      )}
    >
      <div
        className={clsx(
          'flex items-center gap-2 text-hub-muted mb-2',
          compactRoster ? 'text-xs' : 'text-sm mb-3',
        )}
      >
        <Users className={compactRoster ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{rosterLabel}</span>
      </div>

      <ul
        className={clsx(
          compactRoster ?
            'grid grid-cols-2 sm:grid-cols-3 gap-1.5'
          : 'space-y-2',
        )}
      >
        {lobby.players.map((player, index) => {
          const streak = lobby.winStreaks?.[player.id] ?? 0;
          const showStreakAura = streak >= 2;
          return (
            <li
              key={player.id}
              className={clsx(
                'flex items-center justify-between rounded-lg border min-w-0',
                compactRoster ? 'gap-1.5 px-2 py-1.5' : 'px-4 py-3',
                player.id === playerId ?
                  'bg-hub-accent/10 border-hub-accent/30'
                : 'bg-hub-surface border-hub-border',
                showStreakAura &&
                  'ring-1 ring-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
                getPlayerRowClassName?.(player, index),
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {player.id === lobby.hostId && (
                  <Crown
                    className={clsx(
                      'text-hub-warning shrink-0',
                      compactRoster ? 'w-3 h-3' : 'w-4 h-4',
                    )}
                  />
                )}
                {renderPlayerExtra?.(player, index)}
                <span
                  className={clsx(
                    'font-medium truncate',
                    compactRoster ? 'text-xs' : '',
                    showStreakAura && 'animate-pulse-soft',
                  )}
                  title={
                    showStreakAura ? `Room win streak: ${streak}` : undefined
                  }
                >
                  {player.displayName}
                  {showStreakAura && (
                    <span className="text-amber-400/90 text-xs ml-1 tabular-nums">
                      ×{streak}
                    </span>
                  )}
                  {player.id === playerId && (
                    <span
                      className={clsx(
                        'text-hub-muted',
                        compactRoster ? 'text-[10px]' : 'text-sm ml-1',
                      )}
                    >
                      {compactRoster ? compactYouLabel : ' (you)'}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {compactRoster ?
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      player.connected ? 'bg-hub-success' : (
                        'bg-hub-warning'
                      ),
                    )}
                    title={player.connected ? 'Online' : 'Away'}
                    aria-label={player.connected ? 'Online' : 'Away'}
                  />
                : <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      player.connected ?
                        'bg-hub-success/15 text-hub-success'
                      : 'bg-hub-warning/15 text-hub-warning',
                    )}
                  >
                    {player.connected ? 'Online' : 'Away'}
                  </span>
                }
                {isHost &&
                  player.id !== playerId &&
                  lobby.status === 'lobby' &&
                  onKickPlayer && (
                    <button
                      type="button"
                      onClick={() => handleKick(player.id)}
                      disabled={kickingId === player.id}
                      className={clsx(
                        'rounded-md text-hub-muted hover:text-hub-danger hover:bg-hub-danger/10 transition-colors disabled:opacity-40',
                        compactRoster ? 'p-0.5' : 'p-1.5',
                      )}
                      title="Kick player"
                      aria-label={`Kick ${player.displayName}`}
                    >
                      <UserX
                        className={compactRoster ? 'w-3 h-3' : 'w-4 h-4'}
                      />
                    </button>
                  )}
              </div>
            </li>
          );
        })}

        {showEmptySlots &&
          Array.from({ length: lobby.maxPlayers - lobby.players.length }).map(
            (_, i) => (
              <li
                key={`empty-${i}`}
                className={clsx(
                  'rounded-lg border border-dashed border-hub-border text-hub-muted text-center',
                  compactRoster ?
                    'px-2 py-1.5 text-[10px] leading-tight'
                  : 'px-4 py-3 text-sm',
                )}
              >
                {compactRoster ?
                  compactEmptySlotLabel
                : 'Waiting for player…'}
              </li>
            ),
          )}
      </ul>
    </div>
  );

  return (
    <div className={clsx('card max-w-lg w-full mx-auto animate-fade-in', className)}>
      {aboutSlot}

      <div
        className={clsx(
          'flex items-center justify-between',
          compactRoster ? 'mb-4' : 'mb-6',
        )}
      >
        <div>
          <p className="text-hub-muted text-xs uppercase tracking-wider mb-1">
            {roomCodeLabel}
          </p>
          <h2
            className={clsx(
              'font-mono font-bold tracking-[0.3em] text-white',
              compactRoster ? 'text-2xl' : 'text-3xl',
            )}
          >
            {lobby.roomId}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InviteFriendsButton
            roomId={lobby.roomId}
            gameType={lobby.gameType}
            disabled={lobby.status !== 'lobby'}
          />
          <button
            type="button"
            onClick={copyLink}
            className={clsx(
              'btn-secondary flex items-center gap-2',
              compactRoster ? 'text-xs py-1.5' : 'text-sm py-2',
            )}
          >
            {copied ?
              <Check
                className={clsx(
                  compactRoster ? 'w-3.5 h-3.5' : 'w-4 h-4',
                  'text-hub-success',
                )}
              />
            : <Copy className={compactRoster ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>

      {rosterBeforeSettings && rosterSection}

      {settingsSlot}

      {!rosterBeforeSettings && rosterSection}

      {showLobbyChat && lobby.status === 'lobby' && (
        <LobbyChatPanel
          lobby={lobby}
          className="mb-6"
          scrollbar={lobbyChatScrollbar}
        />
      )}

      {footerSlot}

      <div className="flex gap-3">
        {canStart && (
          <button
            type="button"
            onClick={onStartGame}
            disabled={starting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {starting ? 'Starting…' : startLabel}
          </button>
        )}

        {!isHost && lobby.status === 'lobby' && (
          <p className="flex-1 text-center text-sm text-hub-muted py-2.5">
            {waitingForHostLabel}
          </p>
        )}

        <button
          type="button"
          onClick={onLeave}
          className="btn-secondary flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {leaveLabel}
        </button>
      </div>
    </div>
  );
}
