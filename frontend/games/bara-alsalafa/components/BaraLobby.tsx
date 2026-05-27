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
  Package,
} from 'lucide-react';
import clsx from 'clsx';
import type { LobbyState, BaraGameSettings } from '@/lib/hub/types';
import { BARA_ROUNDS_OPTIONS } from '@/lib/hub/types';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import { CATEGORY_PACKAGES } from '@/games/bara-alsalafa/lib/categories';

interface BaraLobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSettingsChange?: (settings: Partial<BaraGameSettings>) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  starting?: boolean;
}

export default function BaraLobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  onSettingsChange,
  onKickPlayer,
  starting = false,
}: BaraLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;

  const settings: BaraGameSettings = {
    categoryPackageId:
      lobby.settings && 'categoryPackageId' in lobby.settings ?
        (lobby.settings as BaraGameSettings).categoryPackageId
      :	'food',
    roundsToWin:
      lobby.settings && 'roundsToWin' in lobby.settings ?
        (lobby.settings as BaraGameSettings).roundsToWin
      :	3,
  };

  const selectedPkg = CATEGORY_PACKAGES.find((p) => p.id === settings.categoryPackageId);

  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    connectedCount <= lobby.maxPlayers;

  const shareUrl =
    typeof window !== 'undefined' ?
      `${window.location.origin}/bara-alsalafa?room=${lobby.roomId}`
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

  return (
    <div className="max-w-3xl w-full mx-auto animate-fade-in space-y-6" dir="rtl">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🕵️</span>
          <h2 className="text-xl font-bold">برا السالفة — اللوبي</h2>
        </div>

        <GameAboutPanel gameId="bara-alsalafa" className="mb-6" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-hub-muted text-xs uppercase tracking-wider mb-1">رمز الغرفة</p>
            <h3 className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
              {lobby.roomId}
            </h3>
          </div>
          <button
            onClick={copyLink}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            {copied ? <Check className="w-4 h-4 text-hub-success" /> : <Copy className="w-4 h-4" />}
            {copied ? 'تم النسخ' : 'مشاركة'}
          </button>
        </div>

        <div className="mb-6 p-4 rounded-xl border border-hub-border bg-hub-surface/60">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-4">
            <Settings2 className="w-4 h-4 text-hub-accent" />
            إعدادات الجولة
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-xs text-hub-muted mb-3 uppercase tracking-wide">
              <Package className="w-3.5 h-3.5" />
              حزمة الفئات
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORY_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettingsChange?.({ categoryPackageId: pkg.id })}
                  className={clsx(
                    'text-right p-3 rounded-xl border transition-all duration-200',
                    settings.categoryPackageId === pkg.id ?
                      'border-hub-accent bg-hub-accent/15'
                    :	'border-hub-border bg-hub-card hover:border-hub-accent/30',
                    !isHost && 'opacity-70 cursor-default'
                  )}
                >
                  <p className="font-semibold text-sm">{pkg.nameAr}</p>
                  <p className="text-[11px] text-hub-muted mt-0.5">{pkg.description}</p>
                  <p className="text-[10px] text-hub-muted/80 mt-2 truncate">
                    {pkg.sampleWords.slice(0, 5).join(' · ')}…
                  </p>
                </button>
              ))}
            </div>
            {selectedPkg && (
              <p className="text-xs text-hub-muted mt-3">
                عيّنة: {selectedPkg.sampleWords.join('، ')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-hub-muted mb-2 uppercase tracking-wide">
              جولات للفوز
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BARA_ROUNDS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettingsChange?.({ roundsToWin: r })}
                  className={clsx(
                    'py-2 rounded-lg text-sm font-semibold border transition-all',
                    settings.roundsToWin === r ?
                      'border-hub-accent bg-hub-accent/20 text-white'
                    :	'border-hub-border bg-hub-card text-hub-muted'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-hub-muted text-sm mb-3">
            <Users className="w-4 h-4" />
            <span>
              {lobby.players.length} / {lobby.maxPlayers} لاعبين (3–12)
            </span>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {lobby.players.map((player) => (
              <li
                key={player.id}
                className={clsx(
                  'flex items-center justify-between px-4 py-3 rounded-lg border',
                  player.id === playerId ?
                    'bg-hub-accent/10 border-hub-accent/30'
                  :	'bg-hub-surface border-hub-border'
                )}
              >
                <div className="flex items-center gap-2">
                  {player.id === lobby.hostId && (
                    <Crown className="w-4 h-4 text-hub-warning" />
                  )}
                  <span className="font-medium">
                    {player.displayName}
                    {player.id === playerId && (
                      <span className="text-hub-muted text-sm mr-1">(أنت)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      player.connected ?
                        'bg-hub-success/15 text-hub-success'
                      :	'bg-hub-warning/15 text-hub-warning'
                    )}
                  >
                    {player.connected ? 'متصل' : 'بعيد'}
                  </span>
                  {isHost &&
                    player.id !== playerId &&
                    lobby.status === 'lobby' &&
                    onKickPlayer && (
                      <button
                        type="button"
                        onClick={() => handleKick(player.id)}
                        disabled={kickingId === player.id}
                        className="p-1.5 rounded-md text-hub-muted hover:text-hub-danger hover:bg-hub-danger/10"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {isHost && connectedCount < lobby.minPlayers && (
          <p className="text-sm text-hub-muted text-center mb-4">
            تحتاج {lobby.minPlayers - connectedCount} لاعبين إضافيين على الأقل للبدء.
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
              {starting ? 'جاري البدء…' : 'ابدأ اللعبة'}
            </button>
          )}
          {!isHost && lobby.status === 'lobby' && (
            <p className="flex-1 text-center text-sm text-hub-muted py-2.5">
              بانتظار المضيف…
            </p>
          )}
          <button onClick={onLeave} className="btn-secondary flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            مغادرة
          </button>
        </div>
      </div>
    </div>
  );
}
