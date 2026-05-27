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
  Settings2,
  Swords,
} from 'lucide-react';
import clsx from 'clsx';
import type { LobbyState, WordGameSettings } from '@/lib/hub/types';
import { WORD_POINTS_OPTIONS } from '@/lib/hub/types';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import WordPanelFrame from './WordPanelFrame';

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
      lobby.settings && 'pointsToWin' in lobby.settings ?
        lobby.settings.pointsToWin
      :	5,
  };

  const canStart =
    isHost && lobby.status === 'lobby' && connectedCount === lobby.maxPlayers;

  const shareUrl =
    typeof window !== 'undefined' ?
      `${window.location.origin}/wordgame?room=${lobby.roomId}`
    :	'';

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
    <WordPanelFrame className="max-w-lg w-full mx-auto animate-fade-in p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-2">
        <Swords className="w-6 h-6 text-[#f0d78c]" />
        <h2 className="sw-heading text-lg">Secret Word Lobby</h2>
      </div>
      <div className="sw-divider-gold mb-6" />

      <div className="rounded-xl border border-[rgba(201,162,39,0.12)] bg-[rgba(6,8,22,0.4)] p-4 mb-6 [&_p]:text-[#8b95ad] [&_.text-gray-300]:text-[#c9a227]">
        <GameAboutPanel gameId="wordgame" />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="sw-muted text-[10px] uppercase tracking-[0.25em] mb-1">Summon Code</p>
          <h3 className="text-3xl font-mono font-bold tracking-[0.35em] text-[#fff8e7] drop-shadow-[0_0_12px_rgba(201,162,39,0.3)]">
            {lobby.roomId}
          </h3>
        </div>
        <button type="button" onClick={copyLink} className="sw-btn-secondary text-sm py-2">
          {copied ?
            <Check className="w-4 h-4 text-[#86efac]" />
          :	<Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      <div className="mb-8 p-4 rounded-xl border border-[rgba(201,162,39,0.15)] bg-[rgba(8,12,24,0.5)]">
        <div className="flex items-center gap-2 text-sm font-medium sw-text-accent mb-4">
          <Settings2 className="w-4 h-4 text-[#f0d78c]" />
          <span className="sw-heading text-xs">Match Settings</span>
        </div>

        <label className="block text-[10px] sw-muted mb-2 uppercase tracking-[0.2em]">
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
                settings.pointsToWin === pts ?
                  'border-[rgba(201,162,39,0.55)] bg-[rgba(201,162,39,0.18)] text-[#fff8e7] shadow-[0_0_16px_rgba(201,162,39,0.12)]'
                :	'border-[rgba(201,162,39,0.15)] bg-[rgba(6,8,22,0.6)] sw-muted hover:border-[rgba(201,162,39,0.35)]',
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
              className="sw-input flex-1 py-2 text-sm normal-case tracking-normal"
            />
            <button
              type="button"
              onClick={applyCustomPoints}
              disabled={!customPoints.trim()}
              className="sw-btn-secondary py-2 text-sm px-4"
            >
              Set
            </button>
          </div>
        )}
        {!isHost && !WORD_POINTS_OPTIONS.includes(settings.pointsToWin as 3 | 5 | 10) && (
          <p className="text-xs sw-muted mt-2">Custom target: {settings.pointsToWin} points</p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 sw-muted text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>
            {lobby.players.length} / {lobby.maxPlayers} champions
          </span>
        </div>

        <ul className="space-y-2">
          {lobby.players.map((player, index) => (
            <li
              key={player.id}
              className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-lg border transition-colors',
                player.id === playerId ?
                  index === 0 ?
                    'border-[rgba(255,107,53,0.35)] bg-[rgba(157,47,15,0.15)]'
                  :	'border-[rgba(76,201,240,0.35)] bg-[rgba(26,107,138,0.12)]'
                :	'border-[rgba(201,162,39,0.1)] bg-[rgba(6,8,22,0.4)]'
              )}
            >
              <div className="flex items-center gap-2">
                {player.id === lobby.hostId && (
                  <Crown className="w-4 h-4 text-[#f0d78c]" />
                )}
                <span className="font-medium sw-text-accent">
                  {player.displayName}
                  {player.id === playerId && (
                    <span className="sw-muted text-sm ml-1">(you)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold',
                    player.connected ?
                      'border border-[rgba(34,197,94,0.4)] text-[#86efac] bg-[rgba(22,101,52,0.2)]'
                    :	'border border-[rgba(245,158,11,0.35)] text-[#fcd34d] bg-[rgba(120,53,15,0.2)]'
                  )}
                >
                  {player.connected ? 'Live' : 'Away'}
                </span>
                {isHost &&
                  player.id !== playerId &&
                  lobby.status === 'lobby' &&
                  onKickPlayer && (
                    <button
                      type="button"
                      onClick={() => handleKick(player.id)}
                      disabled={kickingId === player.id}
                      className="p-1.5 rounded-md sw-muted hover:text-[#fca5a5] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                      title="Kick player"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
              </div>
            </li>
          ))}

          {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map((_, i) => (
            <li
              key={`empty-${i}`}
              className="px-4 py-3 rounded-lg border border-dashed border-[rgba(201,162,39,0.15)] sw-muted text-sm text-center"
            >
              Awaiting rival…
            </li>
          ))}
        </ul>
      </div>

      {isHost && connectedCount < 2 && (
        <p className="text-sm sw-muted text-center mb-4">
          Share the summon code — one more champion required.
        </p>
      )}

      <div className="flex gap-3">
        {canStart && (
          <button
            type="button"
            onClick={onStartGame}
            disabled={starting}
            className="sw-btn-primary flex-1"
          >
            <Play className="w-4 h-4" />
            {starting ? 'Awakening…' : 'Begin Match'}
          </button>
        )}

        {!isHost && lobby.status === 'lobby' && (
          <p className="flex-1 text-center text-sm sw-muted py-2.5">Awaiting host…</p>
        )}

        <button type="button" onClick={onLeave} className="sw-btn-secondary">
          <LogOut className="w-4 h-4" />
          Leave
        </button>
      </div>
    </WordPanelFrame>
  );
}
