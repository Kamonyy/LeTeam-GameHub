'use client';

import { useState } from 'react';
import { Copy, Check, Users, Crown, LogOut, Play } from 'lucide-react';
import clsx from 'clsx';
import type { LobbyState } from '@/lib/types';

interface LobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  starting?: boolean;
}

export default function Lobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  starting = false,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const isHost = lobby.hostId === playerId;
  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    lobby.players.filter((p) => p.connected).length >= lobby.minPlayers;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dominoes?room=${lobby.roomId}`
      : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <div className="mb-6">
        <div className="flex items-center gap-2 text-hub-muted text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>
            {lobby.players.length} / {lobby.maxPlayers} players
          </span>
        </div>

        <ul className="space-y-2">
          {lobby.players.map((player) => (
            <li
              key={player.id}
              className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-lg border',
                player.id === playerId
                  ? 'bg-hub-accent/10 border-hub-accent/30'
                  : 'bg-hub-surface border-hub-border'
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
              </div>
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
            </li>
          ))}

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

      <div className="flex gap-3">
        {canStart && (
          <button
            onClick={onStartGame}
            disabled={starting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {starting ? 'Starting…' : 'Start Game'}
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
