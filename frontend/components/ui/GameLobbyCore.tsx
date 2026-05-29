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

  return (
    <div className={clsx('card max-w-lg w-full mx-auto animate-fade-in', className)}>
      {aboutSlot}

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-hub-muted text-xs uppercase tracking-wider mb-1">
            {roomCodeLabel}
          </p>
          <h2 className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
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
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            {copied ?
              <Check className="w-4 h-4 text-hub-success" />
            : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>

      {settingsSlot}

      <div className="mb-6">
        <div className="flex items-center gap-2 text-hub-muted text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>{rosterLabel}</span>
        </div>

        <ul className="space-y-2">
          {lobby.players.map((player, index) => (
            <li
              key={player.id}
              className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-lg border',
                player.id === playerId ?
                  'bg-hub-accent/10 border-hub-accent/30'
                : 'bg-hub-surface border-hub-border',
                getPlayerRowClassName?.(player, index),
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {player.id === lobby.hostId && (
                  <Crown className="w-4 h-4 text-hub-warning shrink-0" />
                )}
                {renderPlayerExtra?.(player, index)}
                <span className="font-medium truncate">
                  {player.displayName}
                  {player.id === playerId && (
                    <span className="text-hub-muted text-sm ml-1">(you)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded-full',
                    player.connected ?
                      'bg-hub-success/15 text-hub-success'
                    : 'bg-hub-warning/15 text-hub-warning',
                  )}
                >
                  {player.connected ? 'Online' : 'Away'}
                </span>
                {isHost &&
                  player.id !== playerId &&
                  lobby.status === 'lobby' &&
                  onKickPlayer && (
                    <button
                      type="button"
                      onClick={() => handleKick(player.id)}
                      disabled={kickingId === player.id}
                      className="p-1.5 rounded-md text-hub-muted hover:text-hub-danger hover:bg-hub-danger/10 transition-colors disabled:opacity-40"
                      title="Kick player"
                      aria-label={`Kick ${player.displayName}`}
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
              </div>
            </li>
          ))}

          {showEmptySlots &&
            Array.from({ length: lobby.maxPlayers - lobby.players.length }).map(
              (_, i) => (
                <li
                  key={`empty-${i}`}
                  className="px-4 py-3 rounded-lg border border-dashed border-hub-border text-hub-muted text-sm text-center"
                >
                  Waiting for player…
                </li>
              ),
            )}
        </ul>
      </div>

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
