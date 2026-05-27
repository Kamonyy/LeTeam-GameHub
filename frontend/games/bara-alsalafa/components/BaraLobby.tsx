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
} from 'lucide-react';
import clsx from 'clsx';
import type { LobbyState, BaraGameSettings } from '@/lib/hub/types';
import { BARA_ROUNDS_OPTIONS } from '@/lib/hub/types';
import { CATEGORY_PACKAGES } from '@/lib/bara/categories';
import BaraAboutSidebar from './BaraAboutSidebar';

interface BaraLobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSettingsChange?: (settings: Partial<BaraGameSettings>) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  starting?: boolean;
}

function parseBaraSettings(lobby: LobbyState): BaraGameSettings {
  const raw = lobby.settings as Partial<BaraGameSettings> | undefined;
  let categoryPackageIds = raw?.categoryPackageIds;
  if (!categoryPackageIds?.length && raw?.categoryPackageId) {
    categoryPackageIds = [raw.categoryPackageId];
  }
  if (!categoryPackageIds?.length) {
    categoryPackageIds = ['food'];
  }
  return {
    categoryPackageIds,
    roundsToWin: raw?.roundsToWin ?? 3,
  };
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

  const settings = parseBaraSettings(lobby);
  const selectedSet = useMemo(
    () => new Set(settings.categoryPackageIds),
    [settings.categoryPackageIds]
  );

  const totalWords = useMemo(() => {
    return CATEGORY_PACKAGES.filter((p) => selectedSet.has(p.id)).reduce(
      (sum, p) => sum + p.wordCount,
      0
    );
  }, [selectedSet]);

  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    connectedCount <= lobby.maxPlayers &&
    settings.categoryPackageIds.length > 0;

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

  const setCategories = (ids: string[]) => {
    if (ids.length === 0) return;
    onSettingsChange?.({ categoryPackageIds: ids });
  };

  const toggleCategory = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      if (next.size <= 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    setCategories([...next]);
  };

  const selectAllCategories = () => {
    setCategories(CATEGORY_PACKAGES.map((p) => p.id));
  };

  return (
    <div className="bara-lobby-layout bara-view-mount" dir="rtl">
      <BaraAboutSidebar />

      <div className="bara-card w-full min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl" aria-hidden>
            🕵️
          </span>
          <h2 className="text-xl font-bold">برا السالفة — اللوبي</h2>
        </div>

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="bara-muted text-xs uppercase tracking-wider mb-1">رمز الغرفة</p>
            <h3 className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
              {lobby.roomId}
            </h3>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="bara-btn-secondary text-sm py-2"
          >
            {copied ?
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                تم النسخ
              </>
            :	<>
                <Copy className="w-4 h-4" />
                مشاركة
              </>}
          </button>
        </div>

        <div className="bara-settings-block">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="w-4 h-4 bara-accent" />
              إعدادات الجولة
            </div>
            <span className="text-xs bara-muted tabular-nums">
              {settings.categoryPackageIds.length} / {CATEGORY_PACKAGES.length} فئات · ~{totalWords}{' '}
              كلمة
            </span>
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label className="flex items-center gap-2 text-xs bara-muted uppercase tracking-wide">
                <Package className="w-3.5 h-3.5" />
                حزم الفئات (اختر واحدة أو أكثر)
              </label>
              {isHost && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    className="bara-chip-btn"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategories(['food'])}
                    className="bara-chip-btn"
                  >
                    إعادة ضبط
                  </button>
                </div>
              )}
            </div>

            <div className="bara-category-scroll">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
                {CATEGORY_PACKAGES.map((pkg) => {
                  const selected = selectedSet.has(pkg.id);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => toggleCategory(pkg.id)}
                      className={clsx(
                        'text-right p-3 rounded-xl border transition-all duration-200',
                        selected ?
                          'bara-category-card--selected border-[rgba(244,63,94,0.55)]'
                        :	'border-[rgba(244,63,94,0.12)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(244,63,94,0.28)]',
                        !isHost && 'opacity-70 cursor-default'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm leading-snug">{pkg.nameAr}</p>
                        {selected ?
                          <CheckSquare className="w-4 h-4 bara-accent shrink-0" />
                        :	<Square className="w-4 h-4 bara-muted shrink-0" />}
                      </div>
                      <p className="text-[10px] bara-accent/90 mb-1">{pkg.nameEn}</p>
                      <p className="text-[11px] bara-muted line-clamp-2">{pkg.description}</p>
                      <p className="text-[10px] bara-muted/70 mt-2">
                        {pkg.wordCount} كلمة · {pkg.sampleWords.slice(0, 4).join('، ')}…
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs bara-muted mt-3 leading-relaxed">
              كل جولة تُختار فئة عشوائية من الفئات المحددة، ثم تُسحب كلمة سرية من تلك الفئة. كلما
              زادت الفئات، تنوّعت الجولات أكثر.
            </p>
          </div>

          <div>
            <label className="block text-xs bara-muted mb-2 uppercase tracking-wide">
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
                      'border-[rgba(244,63,94,0.55)] bg-[rgba(244,63,94,0.18)] text-white'
                    :	'border-[rgba(244,63,94,0.12)] bg-[rgba(0,0,0,0.25)] bara-muted'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 bara-muted text-sm mb-3">
            <Users className="w-4 h-4" />
            <span>
              {lobby.players.length} / {lobby.maxPlayers} لاعبين ({lobby.minPlayers}–
              {lobby.maxPlayers})
            </span>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {lobby.players.map((player) => (
              <li
                key={player.id}
                className={clsx(
                  'flex items-center justify-between px-4 py-3 rounded-lg border',
                  player.id === playerId ?
                    'bg-[rgba(244,63,94,0.1)] border-[rgba(244,63,94,0.3)]'
                  :	'bg-[rgba(0,0,0,0.25)] border-[rgba(244,63,94,0.1)]'
                )}
              >
                <div className="flex items-center gap-2">
                  {player.id === lobby.hostId && (
                    <Crown className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="font-medium">
                    {player.displayName}
                    {player.id === playerId && (
                      <span className="bara-muted text-sm mr-1">(أنت)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      player.connected ?
                        'bg-emerald-500/15 text-emerald-300'
                      :	'bg-amber-500/15 text-amber-300'
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
                        className="p-1.5 rounded-md bara-muted hover:text-red-300 hover:bg-red-500/10"
                        aria-label={`طرد ${player.displayName}`}
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
          <p className="text-sm bara-muted text-center mb-4">
            تحتاج {lobby.minPlayers - connectedCount} لاعبين إضافيين على الأقل للبدء.
          </p>
        )}

        <div className="flex gap-3 flex-wrap">
          {canStart && (
            <button
              type="button"
              onClick={onStartGame}
              disabled={starting}
              className="bara-btn-primary flex-1 min-w-[10rem] flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {starting ? 'جاري البدء…' : 'ابدأ اللعبة'}
            </button>
          )}
          {!isHost && lobby.status === 'lobby' && (
            <p className="flex-1 text-center text-sm bara-muted py-2.5 min-w-[10rem]">
              بانتظار المضيف…
            </p>
          )}
          <button type="button" onClick={onLeave} className="bara-btn-secondary flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            مغادرة
          </button>
        </div>
      </div>
    </div>
  );
}
