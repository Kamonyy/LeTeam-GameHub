'use client';

import { useState } from 'react';
import {
  Copy,
  Check,
  Users,
  Crown,
  LogOut,
  Play,
  UserX,
  MessageCircle,
  Settings2,
} from 'lucide-react';
import clsx from 'clsx';
import type { LobbyState, WordGameSettings } from '@/lib/hub/types';
import { WORD_POINTS_OPTIONS } from '@/lib/hub/types';
import GameAboutPanel from '@/components/hub/GameAboutPanel';

interface WordLobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSettingsChange?: (settings: Partial<WordGameSettings>) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  starting?: boolean;
}

export default function WordLobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  onSettingsChange,
  onKickPlayer,
  starting = false,
}: WordLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [customPoints, setCustomPoints] = useState('');
  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;

  const settings: WordGameSettings = {
    pointsToWin:
      lobby.settings && 'pointsToWin' in lobby.settings
        ? lobby.settings.pointsToWin
        : 5,
  };

  const canStart =
    isHost && lobby.status === 'lobby' && connectedCount === lobby.maxPlayers;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/wordgame?room=${lobby.roomId}`
      : '';

  const copyLink = async () => {
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

  const applyCustomPoints = () => {
    const value = parseInt(customPoints, 10);
    if (value >= 1 && value <= 99) {
      onSettingsChange?.({ pointsToWin: value });
      setCustomPoints('');
    }
  };

  return (
    <div className="card max-w-lg w-full mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <MessageCircle className="w-6 h-6 text-hub-accent" />
        <h2 className="text-xl font-bold">Secret Word Lobby</h2>
      </div>

      <GameAboutPanel gameId="wordgame" className="mb-6" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-hub-muted text-xs uppercase tracking-wider mb-1">Room Code</p>
          <h3 className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
            {lobby.roomId}
          </h3>
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

      <div className="mb-6 p-4 rounded-xl border border-hub-border bg-hub-surface/60">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-4">
          <Settings2 className="w-4 h-4 text-hub-accent" />
          Match Settings
        </div>

        <div>
          <label className="block text-xs text-hub-muted mb-2 uppercase tracking-wide">
            Points to win
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {WORD_POINTS_OPTIONS.map((pts) => (
              <button
                key={pts}
                type="button"
                disabled={!isHost}
                onClick={() => onSettingsChange?.({ pointsToWin: pts })}
                className={clsx(
                  'py-2 rounded-lg text-sm font-semibold border transition-all duration-200',
                  settings.pointsToWin === pts
                    ? 'border-hub-accent bg-hub-accent/20 text-white'
                    : 'border-hub-border bg-hub-card text-hub-muted hover:border-hub-accent/40',
                  !isHost && 'opacity-70 cursor-default'
                )}
              >
                {pts}
              </button>
            ))}
          </div>
          {isHost && (
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                placeholder="Custom"
                className="input-field flex-1 py-2 text-sm normal-case tracking-normal"
              />
              <button
                type="button"
                onClick={applyCustomPoints}
                disabled={!customPoints.trim()}
                className="btn-secondary py-2 text-sm px-4"
              >
                Set
              </button>
            </div>
          )}
          {!isHost && !WORD_POINTS_OPTIONS.includes(settings.pointsToWin as 3 | 5 | 10) && (
            <p className="text-xs text-hub-muted mt-2">
              Custom target: {settings.pointsToWin} points
            </p>
          )}
        </div>
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
                      className="p-1.5 rounded-md text-hub-muted hover:text-hub-danger hover:bg-hub-danger/10 transition-colors"
                      title="Kick player"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
              </div>
            </li>
          ))}

          {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map(
            (_, i) => (
              <li
                key={`empty-${i}`}
                className="px-4 py-3 rounded-lg border border-dashed border-hub-border text-hub-muted text-sm text-center"
              >
                Waiting for friend…
              </li>
            )
          )}
        </ul>
      </div>

      {isHost && connectedCount < 2 && (
        <p className="text-sm text-hub-muted text-center mb-4">
          Share the link — you need exactly 1 more player to start.
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
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        )}

        {!isHost && lobby.status === 'lobby' && (
          <p className="flex-1 text-center text-sm text-hub-muted py-2.5">
            Waiting for host to start…
          </p>
        )}

        <button onClick={onLeave} className="btn-secondary flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Leave
        </button>
      </div>
    </div>
  );
}
