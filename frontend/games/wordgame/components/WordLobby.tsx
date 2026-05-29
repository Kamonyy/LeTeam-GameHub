'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Settings2, Swords } from 'lucide-react';
import type { LobbyState, WordCategory, WordGameSettings } from '@/lib/hub/types';
import { WORD_POINTS_OPTIONS } from '@/lib/hub/types';
import WordPanelFrame from './WordPanelFrame';
import WordGameAboutSidebar from './WordGameAboutSidebar';
import GameLobbyCore from '@/components/ui/GameLobbyCore';

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
  const [customPoints, setCustomPoints] = useState('');
  const isHost = lobby.hostId === playerId;
  const connectedCount = lobby.players.filter((p) => p.connected).length;

  const settings: WordGameSettings = {
    pointsToWin:
      lobby.settings && 'pointsToWin' in lobby.settings ?
        lobby.settings.pointsToWin
      : 5,
    wordCategory:
      lobby.settings && 'wordCategory' in lobby.settings ?
        (lobby.settings.wordCategory as WordCategory)
      : 'custom',
  };

  const isPresetPoints = WORD_POINTS_OPTIONS.includes(
    settings.pointsToWin as (typeof WORD_POINTS_OPTIONS)[number],
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

        <GameLobbyCore
          lobby={lobby}
          playerId={playerId}
          roomPath="/wordgame"
          onStartGame={onStartGame}
          onLeave={onLeave}
          onKickPlayer={onKickPlayer}
          starting={starting}
          canStartOverride={canStart}
          roomCodeLabel="Summon Code"
          playersLabel={`${lobby.players.length} / ${lobby.maxPlayers} champions`}
          startLabel="Begin Match"
          waitingForHostLabel="Awaiting host…"
          className="card max-w-none border-0 bg-transparent p-0 shadow-none animate-none"
          getPlayerRowClassName={(player, index) =>
            player.id === playerId ?
              index === 0 ?
                'border-[rgba(255,107,53,0.35)] bg-[rgba(157,47,15,0.15)]'
              : 'border-[rgba(76,201,240,0.35)] bg-[rgba(26,107,138,0.12)]'
            : 'border-[rgba(201,162,39,0.1)] bg-[rgba(6,8,22,0.4)]'
          }
          settingsSlot={
            <section className="sw-match-settings mb-8" aria-labelledby="sw-match-settings-title">
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
                          !isHost && 'sw-match-settings__cat--locked',
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
                          !isHost && 'sw-match-settings__preset--locked',
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
          }
          footerSlot={
            isHost && connectedCount < 2 ?
              <p className="text-sm sw-muted text-center mb-4">
                Share the summon code — one more champion required.
              </p>
            : null
          }
        />
      </WordPanelFrame>

      <WordGameAboutSidebar />
    </div>
  );
}
