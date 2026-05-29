'use client';

import clsx from 'clsx';
import { Settings2, Swords, Handshake } from 'lucide-react';
import type { LobbyState, MatchSettings } from '@/lib/hub/types';
import { SCORE_CAP_OPTIONS } from '@/lib/hub/types';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import GameLobbyCore from '@/components/ui/GameLobbyCore';

interface LobbyProps {
  lobby: LobbyState;
  playerId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSettingsChange?: (settings: Partial<MatchSettings>) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  starting?: boolean;
}

export default function Lobby({
  lobby,
  playerId,
  onStartGame,
  onLeave,
  onSettingsChange,
  onKickPlayer,
  starting = false,
}: LobbyProps) {
  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;
  const settings: MatchSettings = (lobby.settings as MatchSettings | undefined) ?? {
    scoreCap: 100,
    mode: 'ffa',
    handSize: 7,
  };

  const canStart =
    isHost &&
    lobby.status === 'lobby' &&
    connectedCount >= lobby.minPlayers &&
    (settings.mode !== '2v2' || connectedCount === 4);

  const teamModeBlocked = settings.mode === '2v2' && connectedCount !== 4;

  return (
    <GameLobbyCore
      lobby={lobby}
      playerId={playerId}
      roomPath="/dominoes"
      onStartGame={onStartGame}
      onLeave={onLeave}
      onKickPlayer={onKickPlayer}
      starting={starting}
      canStartOverride={canStart}
      aboutSlot={<GameAboutPanel gameId="dominoes" className="mb-6" />}
      getPlayerRowClassName={(_, index) =>
        settings.mode === '2v2' ?
          index % 2 === 0 ?
            'border-l-2 border-l-blue-500/50'
          : 'border-l-2 border-l-amber-500/50'
        : undefined
      }
      renderPlayerExtra={(_, index) => {
        if (settings.mode !== '2v2') return null;
        const team = index % 2 === 0 ? 'Team 1' : 'Team 2';
        return (
          <span
            className={clsx(
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              index % 2 === 0 ?
                'bg-blue-500/15 text-blue-300'
              : 'bg-amber-500/15 text-amber-300',
            )}
          >
            {team}
          </span>
        );
      }}
      settingsSlot={
        <div className="mb-6 p-4 rounded-xl border border-hub-border bg-hub-surface/60">
          <div className="flex items-center gap-2 text-sm font-medium text-hub-text-secondary mb-4">
            <Settings2 className="w-4 h-4 text-hub-accent" />
            Match Settings
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-hub-muted mb-2 uppercase tracking-wide">
                Win Condition (points to win match)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SCORE_CAP_OPTIONS.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onSettingsChange?.({ scoreCap: cap })}
                    className={clsx(
                      'py-2 rounded-lg text-sm font-semibold border transition-all duration-200',
                      settings.scoreCap === cap ?
                        'border-hub-accent bg-hub-accent/20 text-white'
                      : 'border-hub-border bg-hub-card text-hub-muted hover:border-hub-accent/40',
                      !isHost && 'opacity-70 cursor-default',
                    )}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-hub-muted mb-2 uppercase tracking-wide">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettingsChange?.({ mode: 'ffa' })}
                  className={clsx(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    settings.mode === 'ffa' ?
                      'border-hub-accent bg-hub-accent/20 text-white'
                    : 'border-hub-border bg-hub-card text-hub-muted hover:border-hub-accent/40',
                    !isHost && 'opacity-70 cursor-default',
                  )}
                >
                  <Swords className="w-4 h-4" />
                  Free For All
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettingsChange?.({ mode: '2v2' })}
                  className={clsx(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    settings.mode === '2v2' ?
                      'border-hub-accent bg-hub-accent/20 text-white'
                    : 'border-hub-border bg-hub-card text-hub-muted hover:border-hub-accent/40',
                    !isHost && 'opacity-70 cursor-default',
                  )}
                >
                  <Handshake className="w-4 h-4" />
                  2v2 Teams
                </button>
              </div>
              {settings.mode === '2v2' && (
                <p className="text-xs text-hub-muted mt-2">
                  Team 1: Players 1 &amp; 3 · Team 2: Players 2 &amp; 4 · Requires 4 players
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-hub-muted pt-1 border-t border-hub-border/60">
              <span>Hand size</span>
              <span className="font-mono text-hub-text-secondary">7 tiles / player</span>
            </div>
          </div>

          {!isHost && (
            <p className="text-xs text-hub-muted mt-3 text-center">
              Only the host can change settings
            </p>
          )}
        </div>
      }
      footerSlot={
        teamModeBlocked && isHost ?
          <p className="text-sm text-hub-warning text-center mb-4">
            2v2 mode requires exactly 4 connected players to start
          </p>
        : null
      }
    />
  );
}
