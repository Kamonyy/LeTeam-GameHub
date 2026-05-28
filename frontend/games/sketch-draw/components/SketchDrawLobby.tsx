'use client';

import { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Users,
  Crown,
  LogOut,
  Play,
  UserX,
  Settings2,
  Package,
  CheckSquare,
  Square,
  Eye,
} from 'lucide-react';
import clsx from 'clsx';
import type { LobbyState, SketchDrawSettings } from '@/lib/hub/types';
import {
  SKETCH_DRAW_ROUNDS_OPTIONS,
  SKETCH_DRAW_TIMER_OPTIONS,
} from '@/lib/hub/types';
import { SKETCH_CATEGORY_PACKAGES } from '@/lib/sketch-draw/categories';
import InviteFriendsButton from '@/components/invitations/InviteFriendsButton';

interface SketchDrawLobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSettingsChange?: (settings: Partial<SketchDrawSettings>) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  starting?: boolean;
}

function parseSettings(lobby: LobbyState): SketchDrawSettings {
  const raw = lobby.settings as Partial<SketchDrawSettings> | undefined;
  let categoryPackageIds = raw?.categoryPackageIds;
  if (!categoryPackageIds?.length && raw?.categoryPackageId) {
    categoryPackageIds = [raw.categoryPackageId];
  }
  if (!categoryPackageIds?.length) categoryPackageIds = ['animals'];
  return {
    categoryPackageIds,
    totalRounds: raw?.totalRounds ?? 5,
    drawTimerSec: raw?.drawTimerSec ?? 90,
    customWords: raw?.customWords ?? '',
    useCustomWordsOnly: raw?.useCustomWordsOnly ?? false,
  };
}

function LobbySettingsPanel({
  settings,
  isHost,
  onSettingsChange,
}: {
  settings: SketchDrawSettings;
  isHost: boolean;
  onSettingsChange?: (settings: Partial<SketchDrawSettings>) => void;
}) {
  const selectedSet = useMemo(
    () => new Set(settings.categoryPackageIds),
    [settings.categoryPackageIds]
  );

  const totalWords = useMemo(() => {
    return SKETCH_CATEGORY_PACKAGES.filter((p) => selectedSet.has(p.id)).reduce(
      (sum, p) => sum + p.wordCount,
      0
    );
  }, [selectedSet]);

  const toggleCategory = (id: string) => {
    if (!isHost) return;
    const next = new Set(selectedSet);
    if (next.has(id)) {
      if (next.size <= 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    onSettingsChange?.({ categoryPackageIds: [...next] });
  };

  const disabled = !isHost;

  return (
    <div className="sketch-panel p-4 mb-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {isHost ?
          <Settings2 className="w-4 h-4" />
        : <Eye className="w-4 h-4 text-hub-muted" />}
        Match settings
        {!isHost && (
          <span className="text-[10px] font-normal text-hub-muted ml-auto uppercase tracking-wide">
            View only
          </span>
        )}
      </div>

      <div>
        <label className="text-xs text-hub-muted uppercase tracking-wide">Rounds</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {SKETCH_DRAW_ROUNDS_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              className={clsx(
                'hub-chip',
                settings.totalRounds === n && 'hub-chip--active',
                disabled && 'opacity-80 cursor-default'
              )}
              onClick={() => onSettingsChange?.({ totalRounds: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-hub-muted uppercase tracking-wide">
          Draw timer (seconds)
        </label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {SKETCH_DRAW_TIMER_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              className={clsx(
                'hub-chip',
                settings.drawTimerSec === n && 'hub-chip--active',
                disabled && 'opacity-80 cursor-default'
              )}
              onClick={() => onSettingsChange?.({ drawTimerSec: n })}
            >
              {n}s
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-hub-muted shrink-0">Custom (sec)</label>
          <input
            type="number"
            min={30}
            max={600}
            disabled={disabled}
            value={settings.drawTimerSec}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onSettingsChange?.({ drawTimerSec: v });
            }}
            className="w-24 rounded-lg bg-hub-bg border border-hub-border px-2 py-1.5 text-sm disabled:opacity-70"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4" />
          <span className="text-sm font-medium">Word categories</span>
          <span className="text-xs text-hub-muted ml-auto">{totalWords} words</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {SKETCH_CATEGORY_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              disabled={disabled || settings.useCustomWordsOnly}
              onClick={() => toggleCategory(pkg.id)}
              className={clsx(
                'text-left text-xs p-2 rounded-lg border transition-colors',
                selectedSet.has(pkg.id) ?
                  'border-violet-500/60 bg-violet-500/10'
                : 'border-hub-border opacity-70',
                (disabled || settings.useCustomWordsOnly) && 'cursor-default'
              )}
            >
              {pkg.nameEn}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-hub-muted uppercase tracking-wide">
          Custom words (comma-separated, English)
        </label>
        <textarea
          className="w-full mt-1 rounded-lg bg-hub-bg border border-hub-border px-3 py-2 text-sm min-h-[80px] disabled:opacity-70"
          value={settings.customWords}
          disabled={disabled}
          onChange={(e) => onSettingsChange?.({ customWords: e.target.value })}
          placeholder="pizza, lighthouse, basketball, ..."
        />
      </div>

      <label
        className={clsx(
          'flex items-center gap-2 text-sm',
          isHost ? 'cursor-pointer' : 'cursor-default opacity-80'
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onSettingsChange?.({
              useCustomWordsOnly: !settings.useCustomWordsOnly,
            })
          }
          className="text-violet-400 disabled:opacity-70"
        >
          {settings.useCustomWordsOnly ?
            <CheckSquare className="w-5 h-5" />
          : <Square className="w-5 h-5" />}
        </button>
        Use custom words only
      </label>
    </div>
  );
}

export default function SketchDrawLobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  onSettingsChange,
  onKickPlayer,
  starting = false,
}: SketchDrawLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;
  const settings = parseSettings(lobby);

  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    connectedCount <= lobby.maxPlayers &&
    (settings.useCustomWordsOnly ?
      settings.customWords.split(',').filter((w) => w.trim().length >= 2).length >= 10
    : settings.categoryPackageIds.length > 0);

  const shareUrl =
    typeof window !== 'undefined' ?
      `${window.location.origin}/sketch-draw?room=${lobby.roomId}`
    : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sketch-lobby max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold sketch-title">What is that</h1>
          <p className="text-hub-muted text-sm mt-1">Room {lobby.roomId}</p>
        </div>
        <button type="button" onClick={onLeave} className="sketch-exit-btn">
          <LogOut className="w-4 h-4 inline mr-1" />
          Exit
        </button>
      </div>

      <div className="sketch-panel p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium">
            {connectedCount} / {lobby.maxPlayers} players
          </span>
        </div>
        <ul className="space-y-2">
          {lobby.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-hub-bg/40"
            >
              <span>
                {p.displayName}
                {p.id === lobby.hostId && (
                  <Crown className="w-3 h-3 inline ml-1 text-amber-400" />
                )}
              </span>
              {isHost && p.id !== playerId && onKickPlayer && (
                <button
                  type="button"
                  disabled={kickingId === p.id}
                  onClick={async () => {
                    setKickingId(p.id);
                    await onKickPlayer(p.id);
                    setKickingId(null);
                  }}
                  className="text-hub-muted hover:text-red-400"
                >
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <LobbySettingsPanel
        settings={settings}
        isHost={isHost}
        onSettingsChange={onSettingsChange}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <InviteFriendsButton
          roomId={lobby.roomId}
          gameType={lobby.gameType}
          disabled={lobby.status !== 'lobby'}
          className="flex-1 justify-center"
        />
        <button type="button" onClick={copyLink} className="hub-btn-secondary flex-1">
          {copied ?
            <Check className="w-4 h-4 inline mr-1" />
          : <Copy className="w-4 h-4 inline mr-1" />}
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
        {isHost && (
          <button
            type="button"
            disabled={!canStart || starting}
            onClick={onStartGame}
            className="hub-btn-primary flex-1"
          >
            <Play className="w-4 h-4 inline mr-1" />
            {starting ? 'Starting…' : 'Start game'}
          </button>
        )}
      </div>
    </div>
  );
}
