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
import type { LobbyState, WordCategory, WordGameSettings } from '@/lib/hub/types';
import { WORD_POINTS_OPTIONS } from '@/lib/hub/types';
import WordPanelFrame from './WordPanelFrame';
import WordGameAboutSidebar from './WordGameAboutSidebar';
import InviteFriendsButton from '@/components/invitations/InviteFriendsButton';

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
    wordCategory:
      lobby.settings && 'wordCategory' in lobby.settings ?
        (lobby.settings.wordCategory as WordCategory)
      :	'custom',
  };

  const isPresetPoints = WORD_POINTS_OPTIONS.includes(
    settings.pointsToWin as (typeof WORD_POINTS_OPTIONS)[number]
  );

  const categoryOptions: { id: WordCategory; label: string; hint: string }[] = [
    { id: 'custom', label: 'Custom', hint: 'Any secret word you choose' },
    {
      id: 'lol-champions',
      label: 'League of Legends',
      hint: 'Pick from all current champions',
    },
  ];

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
    <div className="sw-lobby-layout sw-animate-ascend-slow">
      <WordPanelFrame className="sw-lobby-layout__main w-full p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-2">
        <Swords className="w-6 h-6 text-[#f0d78c]" />
        <h2 className="sw-heading text-lg">Secret Word Lobby</h2>
      </div>
      <div className="sw-divider-gold mb-5" />

      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="sw-muted text-[10px] uppercase tracking-[0.25em] mb-1">Summon Code</p>
          <h3 className="text-3xl font-mono font-bold tracking-[0.35em] text-[#fff8e7] drop-shadow-[0_0_12px_rgba(201,162,39,0.3)]">
            {lobby.roomId}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InviteFriendsButton
            roomId={lobby.roomId}
            gameType={lobby.gameType}
            disabled={lobby.status !== 'lobby'}
          />
          <button type="button" onClick={copyLink} className="sw-btn-secondary text-sm py-2">
            {copied ?
              <Check className="w-4 h-4 text-[#86efac]" />
            :	<Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>

      <section className="sw-match-settings" aria-labelledby="sw-match-settings-title">
        <header className="sw-match-settings__head">
          <Settings2 className="w-4 h-4 text-[#f0d78c]" aria-hidden />
          <h3 id="sw-match-settings-title" className="sw-match-settings__title">
            Match settings
          </h3>
        </header>

        <div className="sw-match-settings__grid">
          <div className="sw-match-settings__block">
            <p className="sw-match-settings__label">Word category</p>
            <div className="sw-match-settings__category" role="group" aria-label="Word category">
              {categoryOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettingsChange?.({ wordCategory: opt.id })}
                  className={clsx(
                    'sw-match-settings__cat',
                    settings.wordCategory === opt.id && 'sw-match-settings__cat--active',
                    !isHost && 'sw-match-settings__cat--locked'
                  )}
                >
                  <span className="sw-match-settings__cat-label">{opt.label}</span>
                  <span className="sw-match-settings__cat-hint">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sw-match-settings__block">
            <div className="sw-match-settings__points-head">
              <p className="sw-match-settings__label">First to</p>
              <p className="sw-match-settings__target" aria-live="polite">
                <span className="sw-match-settings__target-num">
                  {settings.pointsToWin}
                </span>
                <span className="sw-match-settings__target-unit">pts</span>
                {!isPresetPoints && (
                  <span className="sw-match-settings__target-badge">Custom</span>
                )}
              </p>
            </div>

            <div
              className="sw-match-settings__presets"
              role="group"
              aria-label="Points to win"
            >
              {WORD_POINTS_OPTIONS.map((pts) => (
                <button
                  key={pts}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettingsChange?.({ pointsToWin: pts })}
                  className={clsx(
                    'sw-match-settings__preset',
                    settings.pointsToWin === pts && 'sw-match-settings__preset--active',
                    !isHost && 'sw-match-settings__preset--locked'
                  )}
                >
                  {pts}
                </button>
              ))}
            </div>

            {isHost && (
              <div className="sw-match-settings__custom">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  placeholder="1–99"
                  className="sw-input sw-match-settings__custom-input"
                  aria-label="Custom points to win"
                />
                <button
                  type="button"
                  onClick={applyCustomPoints}
                  disabled={!customPoints.trim()}
                  className="sw-btn-secondary sw-match-settings__custom-btn"
                >
                  Set
                </button>
              </div>
            )}

            {!isHost && (
              <p className="sw-match-settings__guest-note">
                Host sets the rules · first to {settings.pointsToWin} wins
              </p>
            )}
          </div>
        </div>
      </section>

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

      <WordGameAboutSidebar />
    </div>
  );
}
