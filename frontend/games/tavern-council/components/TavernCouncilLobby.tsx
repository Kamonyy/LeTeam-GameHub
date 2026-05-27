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
  Mic,
  Bot,
  Castle,
} from 'lucide-react';
import clsx from 'clsx';
import {
  suggestBalancedSetup,
  validateLobbySetup,
} from '@shared/games/tavern-council/balancing.js';
import { ROLE_IDS } from '@shared/games/tavern-council/roles.js';
import type { LobbyState } from '@/lib/hub/types';
import type { TavernCouncilSettings } from '../types';
import MafiaSelect from './MafiaSelect';
import MafiaToggle from './MafiaToggle';

interface TavernCouncilLobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSettingsChange?: (settings: Partial<TavernCouncilSettings>) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  onAddDevBots?: (count?: number) => Promise<{ ok: boolean }>;
  onRemoveDevBots?: () => Promise<{ ok: boolean }>;
  starting?: boolean;
}

function gameplayPlayerCount(lobby: LobbyState, narratorId: string) {
  const connected = lobby.players.filter((p) => p.connected).length;
  const narratorPresent = lobby.players.some((p) => p.id === narratorId);
  return narratorPresent ? Math.max(0, connected - 1) : connected;
}

function parseSettings(lobby: LobbyState): TavernCouncilSettings {
  const raw = lobby.settings as Partial<TavernCouncilSettings> | undefined;
  const narratorId = raw?.narratorId ?? lobby.hostId;
  const count = gameplayPlayerCount(lobby, narratorId);
  const suggested = suggestBalancedSetup(Math.max(count, 5));
  return {
    narratorId,
    revealRoleOnDeath: raw?.revealRoleOnDeath !== false,
    roleCounts: raw?.roleCounts ?? suggested.counts,
    roleAssignments: raw?.roleAssignments ?? {},
  };
}

const ROLE_LABELS: Record<string, string> = {
  mafia: 'Mafia',
  seer: 'Seer',
  doctor: 'Doctor',
  villager: 'Villager',
  sniper: 'Sniper',
  sheriff: 'Sheriff',
};

export default function TavernCouncilLobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  onSettingsChange,
  onKickPlayer,
  onAddDevBots,
  onRemoveDevBots,
  starting = false,
}: TavernCouncilLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [botsBusy, setBotsBusy] = useState(false);
  const isHost = lobby.hostId === playerId;
  const showDevBots = !!lobby.devBotsEnabled && isHost && !!onAddDevBots;
  const connectedCount = lobby.players.filter((p) => p.connected).length;
  const settings = parseSettings(lobby);

  const gameplayCount = useMemo(
    () => gameplayPlayerCount(lobby, settings.narratorId ?? lobby.hostId),
    [lobby, settings.narratorId, connectedCount]
  );

  const suggested = useMemo(
    () => suggestBalancedSetup(gameplayCount || 5),
    [gameplayCount]
  );

  const lobbySetup = useMemo(
    () => validateLobbySetup(gameplayCount, settings.roleCounts ?? {}),
    [gameplayCount, settings.roleCounts]
  );

  const activeRoleSummary = useMemo(() => {
    if (!settings.roleCounts) return [];
    return ROLE_IDS.filter((id) => (settings.roleCounts![id] ?? 0) > 0).map(
      (id) => `${ROLE_LABELS[id] ?? id} ×${settings.roleCounts![id]}`
    );
  }, [settings.roleCounts]);

  const canIncrementRoles =
    gameplayCount > 0 && lobbySetup.roleTotal < gameplayCount;

  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    connectedCount <= lobby.maxPlayers;

  const shareUrl =
    typeof window !== 'undefined' ?
      `${window.location.origin}/mafia?room=${lobby.roomId}`
    :	'';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setRoleCount = (roleId: string, delta: number) => {
    if (!onSettingsChange || !settings.roleCounts) return;
    const counts = settings.roleCounts;
    if (delta > 0) {
      const { roleTotal } = validateLobbySetup(gameplayCount, counts);
      if (roleTotal >= gameplayCount) return;
      const slotsLeft = gameplayCount - roleTotal;
      delta = Math.min(delta, slotsLeft);
    }
    const next = { ...counts };
    next[roleId] = Math.max(0, (next[roleId] ?? 0) + delta);
    onSettingsChange({ roleCounts: next });
  };

  return (
    <div className="tc-lobby tc-p2-lobby">
      <header className="tc-p2-lobby__crest">
        <span className="tc-p2-lobby__crest-mark" aria-hidden>
          <Castle className="w-7 h-7" />
        </span>
        <h1 className="tc-font-display tc-display">Tavern Council</h1>
        <p>
          A gathering at the long table — one Narrator weaves the tale,
          the rest pledge their oaths in secret upon their own seal.
        </p>
      </header>

      <div className="tc-p2-divider" aria-hidden>
        <span className="tc-p2-divider__glyph">◆</span>
      </div>

      <section className="tc-stone-panel tc-lobby-panel" style={{ ['--tc-stagger' as string]: 0 }}>
        <h2 className="tc-p2-section-title">The Chamber</h2>
        <div className="tc-p2-room">
          <span className="tc-p2-room__count">
            <Users className="w-4 h-4" />
            <strong>{connectedCount}</strong> of {lobby.maxPlayers} seated
          </span>
          <code className="tc-p2-wax-seal" aria-label={`Room code ${lobby.roomId}`}>
            {lobby.roomId}
          </code>
          <button
            type="button"
            className="tc-btn-ghost w-full sm:w-auto flex items-center justify-center gap-2"
            onClick={copyLink}
          >
            {copied ?
              <>
                <Check className="w-4 h-4" /> Sealed to clipboard
              </>
            :	<>
                <Copy className="w-4 h-4" /> Copy invitation
              </>
            }
          </button>
        </div>
      </section>

      <section
        className="tc-stone-panel tc-lobby-panel"
        style={{ ['--tc-stagger' as string]: 1 }}
      >
        <h2 className="tc-p2-section-title">The Roster</h2>
        <ul className="tc-p2-roster-list">
        {lobby.players.map((p) => (
          <li key={p.id} className="tc-lobby-player">
            <span className="flex items-center gap-2 truncate min-w-0">
              {p.id === lobby.hostId && (
                <Crown className="w-4 h-4 tc-display shrink-0" aria-label="Host" />
              )}
              {p.id === settings.narratorId && (
                <Mic className="w-4 h-4 shrink-0 text-rose-300/90" aria-label="Narrator" />
              )}
              <span className="truncate">{p.displayName}</span>
              {p.isBot && <span className="tc-bot-tag shrink-0">bot</span>}
              {p.id === playerId ?
                <span className="tc-muted shrink-0">(you)</span>
              :	null}
            </span>
            {isHost && p.id !== playerId && onKickPlayer && (
              <button
                type="button"
                className="text-rose-300/80 hover:text-rose-200 shrink-0"
                disabled={kickingId === p.id}
                onClick={async () => {
                  setKickingId(p.id);
                  await onKickPlayer(p.id);
                  setKickingId(null);
                }}
                aria-label={`Kick ${p.displayName}`}
              >
                <UserX className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
        </ul>
      </section>

      {showDevBots && (
        <div className="tc-p2-divider" aria-hidden>
          <span className="tc-p2-divider__glyph">◆</span>
        </div>
      )}

      {showDevBots && (
        <section
          className="tc-stone-panel tc-lobby-panel tc-dev-panel"
          style={{ ['--tc-stagger' as string]: 2 }}
        >
          <div className="flex items-center gap-2 text-sm tc-display mb-2">
            <Bot className="w-4 h-4" />
            Dev: test bots
          </div>
          <p className="text-xs tc-muted mb-3">
            Fill the lobby without extra browsers. Bots have no UI — you stay narrator.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="tc-btn-ghost text-sm"
              disabled={botsBusy || connectedCount >= lobby.maxPlayers}
              onClick={async () => {
                setBotsBusy(true);
                await onAddDevBots?.();
                setBotsBusy(false);
              }}
            >
              {botsBusy ? '…' : `Fill to ${lobby.minPlayers}`}
            </button>
            <button
              type="button"
              className="tc-btn-ghost text-sm"
              disabled={botsBusy || connectedCount >= lobby.maxPlayers}
              onClick={async () => {
                setBotsBusy(true);
                await onAddDevBots?.(1);
                setBotsBusy(false);
              }}
            >
              +1 bot
            </button>
            <button
              type="button"
              className="tc-btn-ghost text-sm"
              disabled={botsBusy}
              onClick={async () => {
                setBotsBusy(true);
                await onRemoveDevBots?.();
                setBotsBusy(false);
              }}
            >
              Remove bots
            </button>
          </div>
        </section>
      )}

      {isHost && onSettingsChange && (
        <div className="tc-p2-divider" aria-hidden>
          <span className="tc-p2-divider__glyph">◆</span>
        </div>
      )}

      {isHost && onSettingsChange && (
        <section
          className="tc-stone-panel tc-lobby-panel space-y-4"
          style={{ ['--tc-stagger' as string]: showDevBots ? 3 : 2 }}
        >
          <h2 className="tc-p2-section-title">Council Settings</h2>

          <MafiaSelect
            label="Narrator (only active controller)"
            value={settings.narratorId ?? ''}
            onChange={(narratorId) =>
              onSettingsChange({ narratorId: narratorId || null })
            }
            options={lobby.players.map((p) => ({
              value: p.id,
              label: p.displayName,
            }))}
          />

          <MafiaToggle
            checked={settings.revealRoleOnDeath}
            onChange={(revealRoleOnDeath) =>
              onSettingsChange({ revealRoleOnDeath })
            }
          >
            Reveal role on death
          </MafiaToggle>

          <div
            className="tc-stone-panel tc-stone-panel--warning p-3 space-y-2"
            aria-live="polite"
          >
            <p className="text-sm tc-display">Setup check</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="tc-muted">Gameplay players</dt>
              <dd className="tc-display text-right">{lobbySetup.gameplayCount}</dd>
              <dt className="tc-muted">Role total</dt>
              <dd className="tc-display text-right">{lobbySetup.roleTotal}</dd>
            </dl>
            <p
              className={clsx(
                'text-sm flex items-center gap-2',
                lobbySetup.matches ? 'text-emerald-300/90' : 'text-rose-300/90'
              )}
            >
              {lobbySetup.matches ?
                <>
                  <Check className="w-4 h-4 shrink-0" aria-hidden />
                  Role total matches player count
                </>
              :	<>
                  <UserX className="w-4 h-4 shrink-0" aria-hidden />
                  Role total does not match player count
                </>
              }
            </p>
            {lobbySetup.errors.length > 0 && (
              <ul className="text-sm text-rose-200/95 space-y-1 list-disc list-inside">
                {lobbySetup.errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
            {lobbySetup.warnings.length > 0 && (
              <ul className="text-xs tc-muted opacity-75 space-y-0.5 list-disc list-inside">
                {lobbySetup.warnings.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
            {activeRoleSummary.length > 0 && (
              <p className="text-xs tc-muted pt-1 border-t border-white/5">
                {activeRoleSummary.join(' · ')}
              </p>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-sm tc-muted">Role balance</p>
              <button
                type="button"
                className="tc-btn-ghost text-xs"
                onClick={() =>
                  onSettingsChange({
                    roleCounts: { ...suggested.counts },
                  })
                }
              >
                Apply balanced setup
              </button>
            </div>
            <ul className="space-y-2">
              {ROLE_IDS.map((id) => {
                const count = settings.roleCounts?.[id] ?? 0;
                return (
                  <li key={id} className="tc-p2-role-row text-sm">
                    <span className="tc-muted">
                      {ROLE_LABELS[id] ?? id}
                      <span className="text-xs opacity-60 ml-2">
                        (suggested {(suggested.counts as Record<string, number>)[id] ?? 0})
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        className="tc-btn-ghost tc-p2-coin"
                        disabled={count <= 0}
                        onClick={() => setRoleCount(id, -1)}
                        aria-label={`Decrease ${ROLE_LABELS[id] ?? id}`}
                      >
                        −
                      </button>
                      <span className="w-6 text-center tc-display tc-font-display">
                        {count}
                      </span>
                      <button
                        type="button"
                        className="tc-btn-ghost tc-p2-coin"
                        disabled={!canIncrementRoles}
                        onClick={() => setRoleCount(id, 1)}
                        aria-label={`Increase ${ROLE_LABELS[id] ?? id}`}
                      >
                        +
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <div className="tc-p2-divider" aria-hidden>
        <span className="tc-p2-divider__glyph">◆</span>
      </div>

      <div className="tc-p2-actions">
        {isHost && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              className={clsx('tc-btn-royal flex items-center gap-2')}
              disabled={!canStart || !lobbySetup.valid || starting}
              onClick={onStartGame}
            >
              <Play className="w-4 h-4" />
              {starting ? 'Summoning…' : 'Deal Roles & Begin'}
            </button>
            {!lobbySetup.valid && lobbySetup.errors[0] && (
              <p className="text-xs text-rose-300/80">{lobbySetup.errors[0]}</p>
            )}
          </div>
        )}
        <button
          type="button"
          className="tc-btn-ghost flex items-center gap-2"
          onClick={onLeave}
        >
          <LogOut className="w-4 h-4" />
          Depart
        </button>
      </div>

      {!isHost && (
        <p className="tc-p2-waiting">
          Awaiting the host to call the council to order
        </p>
      )}
    </div>
  );
}
