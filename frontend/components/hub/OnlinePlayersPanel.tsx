'use client';

import { memo, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Users, Circle } from 'lucide-react';
import { useHubLive } from '@/lib/hub/HubLiveContext';
import type { OnlinePlayer } from '@/lib/hub/types';

function playerRowKey(player: OnlinePlayer, index: number): string {
  return player.id ?? `${player.displayName}\0${index}`;
}

function OnlinePlayersPanelInner() {
  const { connected, hubPresence } = useHubLive();
  const { total, players } = hubPresence;
  const prevKeysRef = useRef<Set<string>>(new Set());
  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const prev = prevKeysRef.current;
    const next = new Set(players.map((p, i) => playerRowKey(p, i)));
    const joined = players
      .map((p, i) => ({ key: playerRowKey(p, i), player: p }))
      .filter(({ key }) => !prev.has(key))
      .map(({ key }) => key);

    prevKeysRef.current = next;

    if (joined.length === 0) return;

    setEnteringKeys((current) => {
      const merged = new Set(current);
      joined.forEach((key) => merged.add(key));
      return merged;
    });

    const timer = window.setTimeout(() => {
      setEnteringKeys((current) => {
        const merged = new Set(current);
        joined.forEach((key) => merged.delete(key));
        return merged;
      });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      setEnteringKeys((current) => {
        const merged = new Set(current);
        joined.forEach((key) => merged.delete(key));
        return merged;
      });
    };
  }, [players]);

  return (
    <aside className="hub-players-panel flex flex-col h-full min-h-0 overflow-hidden">
      <div className="hub-players-panel__header flex items-center gap-2 px-4 py-3 shrink-0">
        <Users className="w-4 h-4 text-hub-accent" />
        <h3 className="text-sm font-semibold">Players Online</h3>
        <span
          className={clsx(
            'ml-auto text-xs font-bold tabular-nums px-2 py-0.5 rounded-full transition-colors duration-300',
            connected ? 'bg-hub-success/15 text-hub-success' : 'bg-hub-warning/15 text-hub-warning'
          )}
        >
          {connected ? total : '—'}
        </span>
      </div>

      <ul className="hub-arcade-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1">
        {!connected && (
          <li className="text-center text-xs text-hub-muted py-8 px-3">
            Connecting to hub…
          </li>
        )}

        {connected && players.length === 0 && (
          <li className="text-center text-xs text-hub-muted py-8 px-3">
            No players online yet. You&apos;ll appear here once connected.
          </li>
        )}

        {connected &&
          players.map((player, index) => {
            const rowKey = playerRowKey(player, index);
            return (
            <li
              key={rowKey}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors',
                player.isYou
                  ? 'border-hub-accent/40 bg-hub-accent/10'
                  : 'border-transparent bg-hub-bg/40',
                enteringKeys.has(rowKey) && 'hub-player-row--enter'
              )}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                {!player.isYou && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-hub-success opacity-75 animate-ping" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-hub-success" />
              </span>
              <span className="flex-1 text-sm font-medium text-gray-100 truncate">
                {player.displayName}
              </span>
              {player.isYou && (
                <span className="text-[10px] uppercase tracking-wider text-hub-accent font-semibold">
                  You
                </span>
              )}
            </li>
            );
          })}
      </ul>

      {connected && total > 0 && (
        <div className="hub-players-panel__footer px-4 py-2.5 shrink-0 flex items-center gap-1.5 text-[11px] text-hub-muted">
          <Circle className="w-2 h-2 fill-hub-success text-hub-success" />
          <span className="tabular-nums">{total}</span>
          {total === 1 ? 'player' : 'players'} on the hub
        </div>
      )}
    </aside>
  );
}

const OnlinePlayersPanel = memo(OnlinePlayersPanelInner);
export default OnlinePlayersPanel;
