'use client';

import { useState } from 'react';
import { Copy, Check, Users, Crown, LogOut, Play, Settings2, Swords, Handshake, UserX } from 'lucide-react';
import clsx from 'clsx';
import type { LobbyState, MatchSettings } from '@/lib/hub/types';
import { SCORE_CAP_OPTIONS } from '@/lib/hub/types';

interface LobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSettingsChange?: (settings: Partial<MatchSettings>) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  starting?: boolean;
}

export default function Lobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  onSettingsChange,
  onKickPlayer,
  starting = false,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;
  const settings: MatchSettings = (lobby.settings as MatchSettings | undefined) ?? {
    scoreCap: 100,
    mode: 'ffa',
    handSize: 7,
  };

  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    (settings.mode !== '2v2' || connectedCount === 4);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dominoes?room=${lobby.roomId}`
      : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const teamModeBlocked = settings.mode === '2v2' && connectedCount !== 4;

  const handleKick = async (targetId: string) => {
    if (!onKickPlayer) return;
    setKickingId(targetId);
    await onKickPlayer(targetId);
    setKickingId(null);
  };

  return (
    <div className="card max-w-lg w-full mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-hub-muted text-xs uppercase tracking-wider mb-1">
            Room Code
          </p>
          <h2 className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
            {lobby.roomId}
          </h2>
        </div>
        <button
          onClick={copyLink}
          className="btn-secondary flex items-center gap-2 text-sm py-2"
        >
          {copied ? (
            <Check className="w-4 h-4 text-hub-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      {/* Match settings */}
      <div className="mb-6 p-4 rounded-xl border border-hub-border bg-hub-surface/60">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-4">
          <Settings2 className="w-4 h-4 text-hub-accent" />
          Match Settings
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-hub-muted mb-2 uppercase tracking-wide">
              Win Condition (points to win match)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SCORE_CAP_OPTIONS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettingsChange?.({ scoreCap: cap })}
                  className={clsx(
                    'py-2 rounded-lg text-sm font-semibold border transition-all duration-200',
                    settings.scoreCap === cap
                      ? 'border-hub-accent bg-hub-accent/20 text-white'
                      : 'border-hub-border bg-hub-card text-hub-muted hover:border-hub-accent/40',
                    !isHost && 'opacity-70 cursor-default'
                  )}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-hub-muted mb-2 uppercase tracking-wide">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!isHost}
                onClick={() => onSettingsChange?.({ mode: 'ffa' })}
                className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all',
                  settings.mode === 'ffa'
                    ? 'border-hub-accent bg-hub-accent/20 text-white'
                    : 'border-hub-border bg-hub-card text-hub-muted hover:border-hub-accent/40',
                  !isHost && 'opacity-70 cursor-default'
                )}
              >
                <Swords className="w-4 h-4" />
                Free For All
              </button>
              <button
                type="button"
                disabled={!isHost}
                onClick={() => onSettingsChange?.({ mode: '2v2' })}
                className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all',
                  settings.mode === '2v2'
                    ? 'border-hub-accent bg-hub-accent/20 text-white'
                    : 'border-hub-border bg-hub-card text-hub-muted hover:border-hub-accent/40',
                  !isHost && 'opacity-70 cursor-default'
                )}
              >
                <Handshake className="w-4 h-4" />
                2v2 Teams
              </button>
            </div>
            {settings.mode === '2v2' && (
              <p className="text-xs text-hub-muted mt-2">
                Team 1: Players 1 &amp; 3 · Team 2: Players 2 &amp; 4 · Requires 4 players
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-hub-muted pt-1 border-t border-hub-border/60">
            <span>Hand size</span>
            <span className="font-mono text-gray-300">7 tiles / player</span>
          </div>
        </div>

        {!isHost && (
          <p className="text-xs text-hub-muted mt-3 text-center">
            Only the host can change settings
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-hub-muted text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>
            {lobby.players.length} / {lobby.maxPlayers} players
          </span>
        </div>

        <ul className="space-y-2">
          {lobby.players.map((player, index) => {
            const team =
              settings.mode === '2v2'
                ? index % 2 === 0
                  ? 'Team 1'
                  : 'Team 2'
                : null;

            return (
              <li
                key={player.id}
                className={clsx(
                  'flex items-center justify-between px-4 py-3 rounded-lg border',
                  player.id === playerId
                    ? 'bg-hub-accent/10 border-hub-accent/30'
                    : 'bg-hub-surface border-hub-border',
                  settings.mode === '2v2' &&
                    (index % 2 === 0
                      ? 'border-l-2 border-l-blue-500/50'
                      : 'border-l-2 border-l-amber-500/50')
                )}
              >
                <div className="flex items-center gap-2">
                  {player.id === lobby.hostId && (
                    <Crown className="w-4 h-4 text-hub-warning" />
                  )}
                  <span className="font-medium">
                    {player.displayName}
                    {player.id === playerId && (
                      <span className="text-hub-muted text-sm ml-1">(you)</span>
                    )}
                  </span>
                  {team && (
                    <span
                      className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium',
                        index % 2 === 0
                          ? 'bg-blue-500/15 text-blue-300'
                          : 'bg-amber-500/15 text-amber-300'
                      )}
                    >
                      {team}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      player.connected
                        ? 'bg-hub-success/15 text-hub-success'
                        : 'bg-hub-warning/15 text-hub-warning'
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
            );
          })}

          {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map(
            (_, i) => (
              <li
                key={`empty-${i}`}
                className="px-4 py-3 rounded-lg border border-dashed border-hub-border text-hub-muted text-sm text-center"
              >
                Waiting for player…
              </li>
            )
          )}
        </ul>
      </div>

      {teamModeBlocked && isHost && (
        <p className="text-sm text-hub-warning text-center mb-4">
          2v2 mode requires exactly 4 connected players to start
        </p>
      )}

      <div className="flex gap-3">
        {canStart && (
          <button
            onClick={onStartGame}
            disabled={starting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {starting ? 'Starting…' : 'Start Match'}
          </button>
        )}

        {!isHost && lobby.status === 'lobby' && (
          <p className="flex-1 text-center text-sm text-hub-muted py-2.5">
            Waiting for host to start…
          </p>
        )}

        <button
          onClick={onLeave}
          className="btn-secondary flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Leave
        </button>
      </div>
    </div>
  );
}
