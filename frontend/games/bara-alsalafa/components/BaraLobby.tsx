'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Settings2 } from 'lucide-react';
import type { LobbyState, BaraGameSettings } from '@/lib/hub/types';
import { BARA_ROUNDS_OPTIONS } from '@/lib/hub/types';
import { CATEGORY_PACKAGES } from '@/lib/bara/categories';
import BaraAboutSidebar from './BaraAboutSidebar';
import CategoryPackageSettings from '@/components/ui/CategoryPackageSettings';
import GameLobbyCore from '@/components/ui/GameLobbyCore';

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
  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;
  const settings = parseBaraSettings(lobby);

  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    connectedCount <= lobby.maxPlayers &&
    settings.categoryPackageIds.length > 0;

  const categoryOptions = useMemo(
    () =>
      CATEGORY_PACKAGES.map((p) => ({
        id: p.id,
        name: p.nameAr,
        description: p.description,
        wordCount: p.wordCount,
        sampleWords: p.sampleWords,
      })),
    [],
  );

  const setCategories = (ids: string[]) => {
    if (ids.length === 0) return;
    onSettingsChange?.({ categoryPackageIds: ids });
  };

  return (
    <div className="bara-lobby-layout bara-view-mount" dir="rtl">
      <BaraAboutSidebar />

      <div className="bara-card w-full min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl" aria-hidden>
            🕵️
          </span>
          <h2 className="text-xl font-bold">برا السالفة — اللوبي</h2>
        </div>

        <GameLobbyCore
          lobby={lobby}
          playerId={playerId}
          roomPath="/bara-alsalafa"
          onStartGame={onStartGame}
          onLeave={onLeave}
          onKickPlayer={onKickPlayer}
          starting={starting}
          canStartOverride={canStart}
          roomCodeLabel="رمز الغرفة"
          playersLabel={`${lobby.players.length} / ${lobby.maxPlayers} لاعبين`}
          startLabel={starting ? 'جاري البدء…' : 'ابدأ اللعبة'}
          leaveLabel="مغادرة"
          waitingForHostLabel="بانتظار المضيف…"
          className="card max-w-none border-0 bg-transparent p-0 shadow-none animate-none"
          settingsSlot={
            <div className="bara-settings-block">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Settings2 className="w-4 h-4 bara-accent" />
                  إعدادات الجولة
                </div>
                <span className="text-xs bara-muted tabular-nums">
                  {settings.categoryPackageIds.length} / {CATEGORY_PACKAGES.length} فئات
                </span>
              </div>

              <div className="mb-6">
                <CategoryPackageSettings
                  packages={categoryOptions}
                  selectedIds={settings.categoryPackageIds}
                  onChange={setCategories}
                  disabled={!isHost}
                  variant="detailed"
                  label="حزم الفئات (اختر واحدة أو أكثر)"
                  hint="كل جولة تُختار فئة عشوائية من الفئات المحددة، ثم تُسحب كلمة سرية من تلك الفئة. كلما زادت الفئات، تنوّعت الجولات أكثر."
                  showSelectAll={isHost}
                  onSelectAll={() => setCategories(CATEGORY_PACKAGES.map((p) => p.id))}
                  onReset={() => setCategories(['food'])}
                  selectAllLabel="تحديد الكل"
                  resetLabel="إعادة ضبط"
                />
              </div>

              <div>
                <label className="bara-label block mb-2">جولات للفوز</label>
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
                        : 'border-[rgba(244,63,94,0.12)] bg-[rgba(0,0,0,0.25)] bara-muted',
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          }
          footerSlot={
            isHost && connectedCount < lobby.minPlayers ?
              <p className="text-sm bara-muted text-center mb-4">
                تحتاج {lobby.minPlayers - connectedCount} لاعبين إضافيين على الأقل للبدء.
              </p>
            : null
          }
        />
      </div>
    </div>
  );
}
