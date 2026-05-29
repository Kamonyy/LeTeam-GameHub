'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Settings2, Eye, CheckSquare, Square } from 'lucide-react';
import type { LobbyState, SketchDrawSettings } from '@/lib/hub/types';
import {
  SKETCH_DRAW_ROUNDS_OPTIONS,
  SKETCH_DRAW_TIMER_OPTIONS,
} from '@/lib/hub/types';
import { SKETCH_CATEGORY_PACKAGES } from '@/lib/sketch-draw/categories';
import CategoryPackageSettings from '@/components/ui/CategoryPackageSettings';
import GameLobbyCore from '@/components/ui/GameLobbyCore';

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

export default function SketchDrawLobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  onSettingsChange,
  onKickPlayer,
  starting = false,
}: SketchDrawLobbyProps) {
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

  const categoryOptions = useMemo(
    () =>
      SKETCH_CATEGORY_PACKAGES.map((p) => ({
        id: p.id,
        name: p.nameEn,
        wordCount: p.wordCount,
      })),
    [],
  );

  const disabled = !isHost;

  return (
    <div className="sketch-lobby max-w-2xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sketch-title">What is that</h1>
        <p className="text-hub-muted text-sm mt-1">Draw and guess with friends</p>
      </div>

      <GameLobbyCore
        lobby={lobby}
        playerId={playerId}
        roomPath="/sketch-draw"
        onStartGame={onStartGame}
        onLeave={onLeave}
        onKickPlayer={onKickPlayer}
        starting={starting}
        canStartOverride={canStart}
        className="card sketch-panel border-0 max-w-none shadow-none bg-transparent p-0 animate-none"
        startLabel="Start game"
        settingsSlot={
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
                      disabled && 'opacity-80 cursor-default',
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
                      disabled && 'opacity-80 cursor-default',
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

            <CategoryPackageSettings
              packages={categoryOptions}
              selectedIds={settings.categoryPackageIds}
              onChange={(ids) => onSettingsChange?.({ categoryPackageIds: ids })}
              disabled={disabled || settings.useCustomWordsOnly}
              variant="compact"
            />

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
                isHost ? 'cursor-pointer' : 'cursor-default opacity-80',
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
        }
      />
    </div>
  );
}
