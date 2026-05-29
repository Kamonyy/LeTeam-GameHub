'use client';

import { memo, useCallback, useState } from 'react';
import clsx from 'clsx';
import { Users, Crown } from 'lucide-react';
import { useHubLive } from '@/lib/hub/HubLiveContext';
import {
  gameLabelForPresence,
  getLobbyCapacityFromPlayers,
  getLobbyJoinTarget,
  groupOnlinePlayers,
  presenceDotClass,
} from '@/lib/hub/groupOnlinePlayers';
import { canShowSpectateForPresenceGroup } from '@/lib/hub/spectateFromHub';
import { useJoinLobbyByTarget } from '@/lib/hub/useJoinLobbyByTarget';
import { useSpectateRoomFromHub } from '@/lib/hub/useSpectateRoomFromHub';
import { usePresenceListAnimations } from '@/lib/hub/usePresenceListAnimations';
import type { OnlinePlayer } from '@/lib/hub/types';
import type { ExitingPresenceRow } from '@/lib/hub/usePresenceListAnimations';

function playerRowKey(player: OnlinePlayer): string {
  return player.id;
}

function PresenceDot({
  player,
  showPing,
  statusFlash,
}: {
  player: OnlinePlayer;
  showPing?: boolean;
  statusFlash?: boolean;
}) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {showPing && (
        <span
          className={clsx(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            presenceDotClass(player.status)
          )}
        />
      )}
      <span
        className={clsx(
          'relative inline-flex h-2 w-2 rounded-full hub-presence-dot',
          presenceDotClass(player.status),
          statusFlash && 'hub-presence-dot--flash'
        )}
      />
    </span>
  );
}

function PlayerRow({
  player,
  hostId,
  entering,
  exiting,
  statusFlash,
}: {
  player: OnlinePlayer;
  hostId?: string;
  entering?: boolean;
  exiting?: boolean;
  statusFlash?: boolean;
}) {
  const isHost = hostId && player.id === hostId;
  const displayName = player.displayName?.trim() || 'Player';

  return (
    <li
      className={clsx(
        'hub-player-row px-2.5 py-1.5 rounded-lg border bg-hub-bg/40',
        entering && 'hub-player-row--enter',
        exiting && 'hub-player-row--exit',
        statusFlash && 'hub-player-row--status-flash',
        !exiting && !statusFlash && 'border-transparent'
      )}
    >
      <PresenceDot
        player={player}
        showPing={player.status === 'hub' && player.inviteable && !exiting}
        statusFlash={statusFlash}
      />
      <span
        className="hub-player-row__name text-sm font-medium text-gray-100"
        title={displayName}
      >
        {displayName}
      </span>
      {isHost && !exiting && (
        <span className="hub-player-row__host" title="Room owner">
          <Crown className="w-3 h-3" aria-hidden />
          <span className="hidden sm:inline">Host</span>
        </span>
      )}
    </li>
  );
}

function renderPlayerRow(
  player: OnlinePlayer,
  opts: {
    hostId?: string;
    enteringKeys: Set<string>;
    statusFlashKeys: Set<string>;
    exiting?: boolean;
  }
) {
  const key = playerRowKey(player);
  return (
    <PlayerRow
      key={opts.exiting ? `exit-${key}` : key}
      player={player}
      hostId={opts.hostId}
      entering={!opts.exiting && opts.enteringKeys.has(key)}
      exiting={opts.exiting}
      statusFlash={!opts.exiting && opts.statusFlashKeys.has(key)}
    />
  );
}

function OnlinePlayersPanelInner() {
  const { connected, hubPresence, error, clearError } = useHubLive();
  const { total, players } = hubPresence;
  const { joinLobby, playerId: selfPlayerId } = useJoinLobbyByTarget();
  const { spectateMatch, spectateInFlightRoomId, currentRoomId } =
    useSpectateRoomFromHub();
  const [joinInFlightRoomId, setJoinInFlightRoomId] = useState<string | null>(
    null
  );

  const handleJoinLobby = useCallback(
    async (targetPlayerId: string, roomId: string) => {
      clearError();
      setJoinInFlightRoomId(roomId);
      try {
        await joinLobby(targetPlayerId);
      } finally {
        setJoinInFlightRoomId(null);
      }
    },
    [joinLobby, clearError]
  );

  const handleSpectate = useCallback(
    async (roomId: string, gameType: string) => {
      clearError();
      await spectateMatch(roomId, gameType);
    },
    [spectateMatch, clearError]
  );

  const groups = groupOnlinePlayers(players);
  const {
    enteringKeys,
    statusFlashKeys,
    groupFlashKeys,
    groupEnterKeys,
    exitingRows,
    countPulse,
    listBump,
  } = usePresenceListAnimations(players, groups);

  const rowOpts = { enteringKeys, statusFlashKeys };

  const exitingByGroup = new Map<string, ExitingPresenceRow[]>();
  for (const row of exitingRows) {
    const list = exitingByGroup.get(row.groupKey) ?? [];
    list.push(row);
    exitingByGroup.set(row.groupKey, list);
  }

  return (
    <aside className="hub-players-panel flex flex-col h-full min-h-0 overflow-hidden">
      <div className="hub-players-panel__header flex items-center gap-2 px-6 py-3 shrink-0">
        <Users className="w-4 h-4 text-hub-accent" />
        <h3 className="text-sm font-semibold">Players Online</h3>
        <span
          className={clsx(
            'ml-auto text-xs font-bold tabular-nums px-2 py-0.5 rounded-full transition-all duration-300',
            connected ? 'bg-hub-success/15 text-hub-success' : 'bg-hub-warning/15 text-hub-warning',
            countPulse && 'hub-players-count--pulse'
          )}
        >
          {connected ? total : '—'}
        </span>
      </div>

      <ul
        className={clsx(
          'hub-arcade-scroll hub-players-list flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-2',
          listBump && 'hub-players-list--bump'
        )}
      >
        {!connected && (
          <li className="text-center text-xs text-hub-muted py-8 px-3 hub-players-empty--enter">
            Connecting to hub…
          </li>
        )}

        {connected && players.length === 0 && exitingRows.length === 0 && (
          <li className="text-center text-xs text-hub-muted py-8 px-3 hub-players-empty--enter">
            No other players online yet.
          </li>
        )}

        {connected &&
          groups.map((group) => {
            const groupKey = group.kind === 'hub' ? 'hub-solo' : `room:${group.roomId}`;
            const groupAnim = clsx(
              'hub-presence-group',
              groupEnterKeys.has(groupKey) && 'hub-presence-group--enter',
              groupFlashKeys.has(groupKey) && 'hub-presence-group--flash'
            );

            if (group.kind === 'hub') {
              const ghosts = exitingByGroup.get('hub-solo') ?? [];
              return (
                <li key="hub-solo" className={groupAnim}>
                  <p className="hub-presence-group__label px-2 py-1 text-[10px] uppercase tracking-wider text-hub-muted">
                    On hub
                  </p>
                  <ul className="hub-presence-group__list space-y-0.5">
                    {group.players.map((player) =>
                      renderPlayerRow(player, rowOpts)
                    )}
                    {ghosts.map((g) =>
                      renderPlayerRow(g.player, { ...rowOpts, exiting: true })
                    )}
                  </ul>
                </li>
              );
            }

            const statusLabel =
              group.status === 'playing' ? 'In game' : 'In lobby';
            const lobbyCapacity =
              group.status === 'lobby' ?
                getLobbyCapacityFromPlayers(group.players)
              : null;
            const joinTarget =
              group.status === 'lobby' ?
                getLobbyJoinTarget(group.players, selfPlayerId)
              : null;
            const lobbyFull =
              group.status === 'lobby' &&
              !joinTarget &&
              group.players.some((p) => p.targetRoomId && p.isRoomFull === true);
            const showSpectate = canShowSpectateForPresenceGroup(group, {
              selfPlayerId,
              currentRoomId,
            });
            const ghosts = exitingByGroup.get(groupKey) ?? [];

            return (
              <li key={group.roomId} className={groupAnim}>
                <div
                  className={clsx(
                    'hub-presence-group__header px-2 py-1.5 min-w-0',
                    groupFlashKeys.has(groupKey) && 'hub-presence-group__header--flash'
                  )}
                >
                  <div className="hub-presence-group__header-row flex items-center gap-1.5 min-w-0">
                    <span
                      className={clsx(
                        'hub-presence-dot inline-flex h-2 w-2 rounded-full shrink-0',
                        presenceDotClass(group.status),
                        groupFlashKeys.has(groupKey) && 'hub-presence-dot--flash'
                      )}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 shrink-0">
                      {statusLabel}
                    </span>
                    {lobbyCapacity && (
                      <span
                        className={clsx(
                          'text-[10px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded',
                          lobbyCapacity.occupied >= lobbyCapacity.max ?
                            'text-stone-500 bg-stone-800/60'
                          : 'text-hub-accent bg-hub-accent/10'
                        )}
                        title={`${lobbyCapacity.occupied} of ${lobbyCapacity.max} players`}
                      >
                        {lobbyCapacity.occupied}/{lobbyCapacity.max}
                      </span>
                    )}
                    <div className="hub-presence-group__header-actions ml-auto shrink-0 flex items-center gap-1">
                      {showSpectate && (
                        <button
                          type="button"
                          className="hub-spectate-btn"
                          disabled={spectateInFlightRoomId === group.roomId}
                          onClick={() =>
                            void handleSpectate(group.roomId, group.gameType)
                          }
                          title={`Watch ${group.roomId} match`}
                          aria-label={`Spectate ${gameLabelForPresence(group.gameType)} match ${group.roomId}`}
                        >
                          {spectateInFlightRoomId === group.roomId ?
                            '…'
                          :	'Spectate'}
                        </button>
                      )}
                      {joinTarget && (
                        <button
                          type="button"
                          className="hub-join-lobby-btn"
                          disabled={joinInFlightRoomId === group.roomId}
                          onClick={() =>
                            void handleJoinLobby(joinTarget.id, group.roomId)
                          }
                          title={`Join ${group.roomId} lobby`}
                          aria-label={`Join ${gameLabelForPresence(group.gameType)} lobby ${group.roomId}`}
                        >
                          {joinInFlightRoomId === group.roomId ? '…' : 'Join'}
                        </button>
                      )}
                      {lobbyFull && (
                        <span className="hub-join-lobby-full" aria-label="Lobby full">
                          Full
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5 truncate min-w-0">
                    {gameLabelForPresence(group.gameType)}
                    <span className="font-mono text-[10px] text-stone-500 ml-1.5">
                      {group.roomId}
                    </span>
                  </p>
                </div>
                <ul className="hub-presence-group__list space-y-0.5 pl-1 border-l border-white/10 ml-2">
                  {group.players.map((player) =>
                    renderPlayerRow(player, { ...rowOpts, hostId: group.hostId })
                  )}
                  {ghosts.map((g) =>
                    renderPlayerRow(g.player, {
                      hostId: g.hostId,
                      ...rowOpts,
                      exiting: true,
                    })
                  )}
                </ul>
              </li>
            );
          })}
      </ul>

      {connected && error && (
        <p className="px-4 py-2 text-xs text-red-400/90 shrink-0" role="alert">
          {error}
        </p>
      )}

      {connected && total > 0 && (
        <div className="hub-players-panel__footer px-4 py-2.5 shrink-0 space-y-1.5">
          <div className="flex items-center gap-3 text-[10px] text-hub-muted flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="hub-presence-dot hub-presence-dot--hub h-2 w-2 rounded-full" />
              Hub
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="hub-presence-dot hub-presence-dot--lobby h-2 w-2 rounded-full" />
              Lobby
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="hub-presence-dot hub-presence-dot--playing h-2 w-2 rounded-full" />
              In game
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="hub-presence-dot hub-presence-dot--spectating h-2 w-2 rounded-full" />
              Spectating
            </span>
          </div>
          <p className="text-[11px] text-hub-muted tabular-nums">
            {total} {total === 1 ? 'player' : 'players'} on the hub
          </p>
        </div>
      )}
    </aside>
  );
}

const OnlinePlayersPanel = memo(OnlinePlayersPanelInner);
export default OnlinePlayersPanel;
