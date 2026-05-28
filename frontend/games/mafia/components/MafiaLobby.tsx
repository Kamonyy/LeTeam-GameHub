"use client";



import { useMemo, useState } from "react";

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

} from "lucide-react";

import clsx from "clsx";

import {

  suggestBalancedSetup,

  validateLobbySetup,

} from "@shared/games/mafia/balancing.js";

import { ROLE_IDS, getRoleAccent } from "@shared/games/mafia/roles.js";
import { roleDotStyle } from "../lib/roleTheme";

import type { LobbyState } from "@/lib/hub/types";

import type { MafiaSettings } from "../types";

import { MafiaButton } from "@/components/mafia/mafia-button";
import InviteFriendsButton from "@/components/invitations/InviteFriendsButton";

import { MafiaCard, MafiaCardContent } from "@/components/mafia/mafia-panel";

import MafiaSelect from "./MafiaSelect";

import MafiaToggle from "./MafiaToggle";



interface MafiaLobbyProps {

  lobby: LobbyState;

  playerId: string;

  onStartGame: () => void;

  onLeave: () => void;

  onSettingsChange?: (settings: Partial<MafiaSettings>) => void;

  onKickPlayer?: (targetPlayerId: string) => void;

  onAddDevBots?: (count?: number) => Promise<{ ok: boolean }>;

  onRemoveDevBots?: () => Promise<{ ok: boolean }>;

  starting?: boolean;

}



const sectionTitleClass =

  "mb-2.5 flex items-center gap-2 border-b border-amber-700/50 pb-2 font-cinzel text-[0.72rem] font-bold uppercase tracking-[0.28em] text-amber-50";



const lobbyCardBodyClass = "p-3.5 sm:p-4";



const lobbyMutedClass = "text-[color:var(--mf-text-muted-on-panel)]";



const lobbyBodyClass = "text-[color:var(--p1-ink-soft)]";



function toRoman(value: number): string {

  const numerals: [number, string][] = [

    [10, "X"],

    [9, "IX"],

    [5, "V"],

    [4, "IV"],

    [1, "I"],

  ];

  let n = value;

  let result = "";

  for (const [amount, symbol] of numerals) {

    while (n >= amount) {

      result += symbol;

      n -= amount;

    }

  }

  return result;

}



function LobbyDivider() {

  return (

    <div

      className="my-5 flex items-center justify-center gap-3 text-amber-500/85"

      aria-hidden

    >

      <span className="h-px max-w-56 flex-1 bg-gradient-to-r from-transparent via-amber-600/55 to-transparent shadow-[0_1px_0_rgba(0,0,0,0.6)] max-sm:max-w-24" />

      <span className="inline-flex h-[22px] w-[22px] rotate-45 items-center justify-center font-cinzel text-lg text-amber-200 drop-shadow-[0_0_6px_rgba(212,166,74,0.6)]">

        ◆

      </span>

      <span className="h-px max-w-56 flex-1 bg-gradient-to-l from-transparent via-amber-600/55 to-transparent shadow-[0_1px_0_rgba(0,0,0,0.6)] max-sm:max-w-24" />

    </div>

  );

}



function gameplayPlayerCount(lobby: LobbyState, narratorId: string) {

  const connected = lobby.players.filter((p) => p.connected).length;

  const narratorPresent = lobby.players.some((p) => p.id === narratorId);

  return narratorPresent ? Math.max(0, connected - 1) : connected;

}



function parseSettings(lobby: LobbyState): MafiaSettings {

  const raw = lobby.settings as Partial<MafiaSettings> | undefined;

  const narratorId = raw?.narratorId ?? lobby.hostId;

  const count = gameplayPlayerCount(lobby, narratorId);

  const suggested = suggestBalancedSetup(Math.max(count, 5));

  return {

    narratorId,

    revealRoleOnDeath: raw?.revealRoleOnDeath === true,

    roleCounts: raw?.roleCounts ?? suggested.counts,

  };

}



const ROLE_LABELS: Record<string, string> = {

  mafia: "Mafia",

  seer: "Seer",

  doctor: "Doctor",

  villager: "Villager",

  sniper: "Sniper",

  sheriff: "Sheriff",

};



export default function MafiaLobby({

  lobby,

  playerId,

  onStartGame,

  onLeave,

  onSettingsChange,

  onKickPlayer,

  onAddDevBots,

  onRemoveDevBots,

  starting = false,

}: MafiaLobbyProps) {

  const [copied, setCopied] = useState(false);

  const [kickingId, setKickingId] = useState<string | null>(null);

  const [botsBusy, setBotsBusy] = useState(false);

  const isHost = lobby.hostId === playerId;

  const showDevBots = !!lobby.devBotsEnabled && isHost && !!onAddDevBots;

  const connectedCount = lobby.players.filter((p) => p.connected).length;

  const settings = parseSettings(lobby);



  const gameplayCount = useMemo(

    () => gameplayPlayerCount(lobby, settings.narratorId ?? lobby.hostId),

    [lobby, settings.narratorId, connectedCount],

  );



  const suggested = useMemo(

    () => suggestBalancedSetup(gameplayCount || 5),

    [gameplayCount],

  );



  const lobbySetup = useMemo(

    () => validateLobbySetup(gameplayCount, settings.roleCounts ?? {}),

    [gameplayCount, settings.roleCounts],

  );



  const activeRoleSummary = useMemo(() => {

    if (!settings.roleCounts) return [];

    return ROLE_IDS.filter((id) => (settings.roleCounts![id] ?? 0) > 0).map(

      (id) => `${ROLE_LABELS[id] ?? id} ×${settings.roleCounts![id]}`,

    );

  }, [settings.roleCounts]);



  const canIncrementRoles =

    gameplayCount > 0 && lobbySetup.roleTotal < gameplayCount;



  const canStart =

    isHost &&

    lobby.status === "lobby" &&

    connectedCount >= lobby.minPlayers &&

    connectedCount <= lobby.maxPlayers;



  const shareUrl =

    typeof window !== "undefined"

      ? `${window.location.origin}/mafia?room=${lobby.roomId}`

      : "";



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

    <div className="relative isolate mx-auto my-6 max-w-2xl px-4 py-6 sm:px-6">

      <header className="mb-2 px-4 pb-6 pt-5 text-center max-sm:px-2 max-sm:pb-4 max-sm:pt-3">

        <span

          className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/80 via-stone-900 to-stone-950 text-amber-100 shadow-[0_6px_18px_-4px_rgba(0,0,0,0.7),0_0_22px_-6px_rgba(212,166,74,0.5)] max-sm:mb-2 max-sm:h-[52px] max-sm:w-[52px]"

          aria-hidden

        >

          <Castle className="h-7 w-7 max-sm:h-6 max-sm:w-6" />

        </span>

        <h1 className="mb-1.5 bg-gradient-to-b from-amber-50 via-amber-200 to-amber-700 bg-clip-text font-cinzel text-[clamp(1.75rem,5vw,2.6rem)] font-bold uppercase tracking-[0.18em] text-transparent">

          Mafia

        </h1>

        <p className="mx-auto max-w-lg font-cormorant text-base italic leading-relaxed text-[color:var(--p1-ink-soft)]">

          A gathering at the long table — one Narrator weaves the tale, the rest

          pledge their oaths in secret upon their own seal.

        </p>

      </header>



      <LobbyDivider />



      <MafiaCard variant="glass" interactive={false} className="mb-3.5">

        <MafiaCardContent className={clsx("space-y-3", lobbyCardBodyClass)}>

          <h2 className={sectionTitleClass}>

            <span className="text-[0.55rem] text-amber-400">◆</span>

            The Chamber

          </h2>

          <div className="flex flex-col items-center gap-3 py-0.5">

            <div

              className={clsx(

                "flex flex-col items-center gap-1.5 text-center font-cormorant text-[0.95rem] italic",

                lobbyBodyClass,

              )}

            >

              <span className="inline-flex flex-wrap items-center justify-center gap-2">

                <Users className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />

                <strong className="font-cinzel text-[1.1rem] not-italic tracking-wide text-amber-100">

                  {connectedCount}

                </strong>

                <span className="not-italic">of {lobby.maxPlayers} in room</span>

              </span>

              <span className={clsx("text-[0.88rem] not-italic", lobbyMutedClass)}>

                <strong className="font-cinzel tracking-wide text-amber-100">

                  {gameplayCount}

                </strong>{" "}

                receive roles (narrator excluded)

              </span>

            </div>

            <code

              className="inline-flex items-center justify-center rounded border border-amber-700/50 bg-gradient-to-b from-red-900 to-red-950 px-6 py-3 font-cinzel text-xl font-bold tracking-[0.32em] text-amber-100 shadow-[0_4px_14px_-4px_rgba(120,20,20,0.6)] max-sm:px-5 max-sm:py-2.5 max-sm:text-lg max-sm:tracking-[0.24em]"

              aria-label={`Room code ${lobby.roomId}`}

            >

              {lobby.roomId}

            </code>

            <InviteFriendsButton

              roomId={lobby.roomId}

              gameType={lobby.gameType}

              disabled={lobby.status !== "lobby"}

              className="w-full sm:w-auto justify-center"

            />

            <MafiaButton

              type="button"

              variant="outline"

              className="w-full sm:w-auto"

              onClick={copyLink}

            >

              {copied ? (

                <>

                  <Check className="h-4 w-4" /> Sealed to clipboard

                </>

              ) : (

                <>

                  <Copy className="h-4 w-4" /> Copy invitation

                </>

              )}

            </MafiaButton>

          </div>

        </MafiaCardContent>

      </MafiaCard>



      <MafiaCard variant="glass" interactive={false} className="mb-3.5">

        <MafiaCardContent className={lobbyCardBodyClass}>

          <h2 className={sectionTitleClass}>

            <span className="text-[0.55rem] text-amber-400">◆</span>

            The Roster

          </h2>

          <ul className="m-0 flex list-none flex-col gap-1 p-0">

            {lobby.players.map((p, index) => (

              <li

                key={p.id}

                className="relative flex items-center gap-2.5 rounded-md border border-stone-700/45 bg-stone-950/55 py-2 pl-10 pr-2"

              >

                <span

                  className="absolute left-1 top-1/2 flex h-[1.85rem] w-[1.85rem] -translate-y-1/2 items-center justify-center rounded-full border border-amber-700/45 bg-gradient-to-b from-stone-700 to-stone-900 font-cinzel text-[0.7rem] font-bold tracking-wide text-amber-200 shadow-[inset_0_1px_0_rgba(212,166,74,0.3),0_2px_4px_-1px_rgba(0,0,0,0.5)]"

                  aria-hidden

                >

                  {toRoman(index + 1)}

                </span>

                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">

                  {p.id === lobby.hostId && (

                    <Crown

                      className="h-4 w-4 shrink-0 text-amber-300"

                      aria-label="Host"

                    />

                  )}

                  {p.id === settings.narratorId && (

                    <Mic

                      className="h-4 w-4 shrink-0 text-rose-300"

                      aria-label="Narrator"

                    />

                  )}

                  <span
                    dir="auto"
                    className="break-words font-cinzel text-[0.88rem] font-semibold normal-case tracking-wide text-[color:var(--p1-ink)]"
                  >
                    {p.displayName}
                  </span>

                  {p.isBot && (

                    <span className="shrink-0 rounded-sm border border-emerald-600/45 bg-emerald-950/80 px-1.5 py-0.5 font-cinzel text-[0.58rem] uppercase tracking-widest text-emerald-200">

                      bot

                    </span>

                  )}

                  {p.id === playerId ? (

                    <span className={clsx("shrink-0 text-[0.8rem]", lobbyMutedClass)}>

                      (you)

                    </span>

                  ) : null}

                </span>

                {isHost && p.id !== playerId && onKickPlayer && (

                  <button

                    type="button"

                    className="flex shrink-0 items-center justify-center min-h-11 min-w-11 p-2 text-rose-300/80 hover:text-rose-200"

                    disabled={kickingId === p.id}

                    onClick={async () => {

                      setKickingId(p.id);

                      await onKickPlayer(p.id);

                      setKickingId(null);

                    }}

                    aria-label={`Kick ${p.displayName}`}

                  >

                    <UserX className="h-4 w-4" />

                  </button>

                )}

              </li>

            ))}

          </ul>

        </MafiaCardContent>

      </MafiaCard>



      {showDevBots && <LobbyDivider />}



      {showDevBots && (

        <MafiaCard variant="glass" interactive={false} className="mb-3.5">

          <MafiaCardContent className={clsx("space-y-2.5", lobbyCardBodyClass)}>

            <h2 className={clsx(sectionTitleClass, "mb-2")}>

              <Bot className="h-3.5 w-3.5 text-amber-400" aria-hidden />

              Dev: test bots

            </h2>

            <p className={clsx("m-0 text-[0.84rem] leading-snug", lobbyBodyClass)}>

              Fill the lobby without extra browsers. Bots have no UI — you stay

              narrator.

            </p>

            <div className="flex flex-wrap gap-2">

              <MafiaButton

                type="button"

                variant="outline"

                size="sm"

                className="min-h-11"

                disabled={botsBusy || connectedCount >= lobby.maxPlayers}

                onClick={async () => {

                  setBotsBusy(true);

                  await onAddDevBots?.();

                  setBotsBusy(false);

                }}

              >

                {botsBusy ? "…" : `Fill to ${lobby.minPlayers}`}

              </MafiaButton>

              <MafiaButton

                type="button"

                variant="outline"

                size="sm"

                className="min-h-11"

                disabled={botsBusy || connectedCount >= lobby.maxPlayers}

                onClick={async () => {

                  setBotsBusy(true);

                  await onAddDevBots?.(1);

                  setBotsBusy(false);

                }}

              >

                +1 bot

              </MafiaButton>

              <MafiaButton

                type="button"

                variant="ghost"

                size="sm"

                className="min-h-11"

                disabled={botsBusy}

                onClick={async () => {

                  setBotsBusy(true);

                  await onRemoveDevBots?.();

                  setBotsBusy(false);

                }}

              >

                Remove bots

              </MafiaButton>

            </div>

          </MafiaCardContent>

        </MafiaCard>

      )}



      {isHost && onSettingsChange && <LobbyDivider />}



      {isHost && onSettingsChange && (

        <MafiaCard variant="glass" interactive={false} className="mb-3.5">

          <MafiaCardContent className={clsx("space-y-3.5", lobbyCardBodyClass)}>

            <h2 className={sectionTitleClass}>

              <span className="text-[0.55rem] text-amber-400">◆</span>

              Game Settings

            </h2>



            <MafiaSelect

              label="Narrator (only active controller)"

              value={settings.narratorId ?? ""}

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



            <MafiaCard
              variant="inset"
              className="mt-1 space-y-1 p-2.5"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="font-cinzel text-[0.65rem] font-semibold uppercase tracking-widest text-amber-100">
                  Setup check
                </p>
                <p className="m-0 flex items-center gap-2.5 font-cinzel text-[0.72rem] tabular-nums leading-none">
                  <span className={lobbyMutedClass}>
                    Players{" "}
                    <strong className="text-[color:var(--p1-ink)]">
                      {lobbySetup.gameplayCount}
                    </strong>
                  </span>
                  <span className="text-amber-800/80" aria-hidden>
                    ·
                  </span>
                  <span className={lobbyMutedClass}>
                    Roles{" "}
                    <strong className="text-[color:var(--p1-ink)]">
                      {lobbySetup.roleTotal}
                    </strong>
                  </span>
                </p>
              </div>

              <p
                className={clsx(
                  "m-0 flex items-center gap-1.5 text-[0.7rem] leading-snug",
                  lobbySetup.matches
                    ? "text-emerald-300/90"
                    : "text-rose-300/90",
                )}
              >
                {lobbySetup.matches ? (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Roles match player count
                  </>
                ) : (
                  <>
                    <UserX className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Roles ≠ player count
                  </>
                )}
              </p>

              {(lobbySetup.errors.length > 0 ||
                lobbySetup.warnings.length > 0) && (
                <ul className="m-0 list-none space-y-0.5 p-0 text-[0.68rem] leading-snug">
                  {lobbySetup.errors.map((msg) => (
                    <li key={msg} className="text-rose-200/95 before:mr-1 before:content-['•']">
                      {msg}
                    </li>
                  ))}
                  {lobbySetup.warnings.map((msg) => (
                    <li
                      key={msg}
                      className="text-[color:var(--p1-ink-dim)] before:mr-1 before:content-['•']"
                    >
                      {msg}
                    </li>
                  ))}
                </ul>
              )}

              {activeRoleSummary.length > 0 && (
                <p className={clsx("m-0 border-t border-amber-900/25 pt-1 text-[0.68rem] leading-snug", lobbyBodyClass)}>
                  {activeRoleSummary.join(" · ")}
                </p>
              )}
            </MafiaCard>



            <div>

              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                <p className="font-cinzel text-[0.72rem] font-semibold uppercase tracking-widest text-amber-100/95">
                  Role balance
                </p>

                <MafiaButton

                  type="button"

                  variant="ghost"

                  size="sm"

                  className="text-xs"

                  onClick={() =>

                    onSettingsChange({

                      roleCounts: { ...suggested.counts },

                    })

                  }

                >

                  Apply balanced setup

                </MafiaButton>

              </div>

              <ul className="space-y-2">

                {ROLE_IDS.map((id) => {

                  const count = settings.roleCounts?.[id] ?? 0;

                  return (

                    <li

                      key={id}

                      className="flex items-center justify-between rounded-md border border-stone-800/50 bg-stone-950/45 px-2.5 py-1.5 text-sm"

                    >

                      <span className="inline-flex items-center gap-2 text-[color:var(--p1-ink-soft)]">
                        <span
                          className="mf-role-dot shrink-0 rounded-full"
                          style={roleDotStyle(id)}
                          aria-hidden
                        />
                        <span style={{ color: getRoleAccent(id) }}>
                          {ROLE_LABELS[id] ?? id}
                        </span>

                        <span className={clsx("ml-2 text-xs", lobbyMutedClass)}>

                          (suggested{" "}

                          {(suggested.counts as Record<string, number>)[id] ??

                            0}

                          )

                        </span>

                      </span>

                      <span className="flex items-center gap-2">

                        <MafiaButton

                          type="button"

                          variant="outline"

                          size="icon"

                          className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-full text-base"

                          disabled={count <= 0}

                          onClick={() => setRoleCount(id, -1)}

                          aria-label={`Decrease ${ROLE_LABELS[id] ?? id}`}

                        >

                          −

                        </MafiaButton>

                        <span className="w-6 text-center font-cinzel text-amber-100">

                          {count}

                        </span>

                        <MafiaButton

                          type="button"

                          variant="outline"

                          size="icon"

                          className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-full text-base"

                          disabled={!canIncrementRoles}

                          onClick={() => setRoleCount(id, 1)}

                          aria-label={`Increase ${ROLE_LABELS[id] ?? id}`}

                        >

                          +

                        </MafiaButton>

                      </span>

                    </li>

                  );

                })}

              </ul>

            </div>

          </MafiaCardContent>

        </MafiaCard>

      )}



      <LobbyDivider />



      <div className="flex flex-wrap justify-center gap-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">

        {isHost && (

          <div className="flex flex-col items-center gap-1">

            <MafiaButton

              type="button"

              variant="primary"

              className="gap-2"

              disabled={!canStart || !lobbySetup.valid || starting}

              onClick={onStartGame}

            >

              <Play className="h-4 w-4" />

              {starting ? "Summoning…" : "Deal Roles & Begin"}

            </MafiaButton>

            {!lobbySetup.valid && lobbySetup.errors[0] && (

              <p className="text-xs text-rose-300/80">{lobbySetup.errors[0]}</p>

            )}

          </div>

        )}

        <MafiaButton

          type="button"

          variant="ghost"

          className="gap-2"

          onClick={onLeave}

        >

          <LogOut className="h-4 w-4" />

          Depart

        </MafiaButton>

      </div>



      {!isHost && (

        <p className="mt-4 text-center font-cormorant text-base italic tracking-wide text-[color:var(--p1-ink-dim)]">

          <span className="mx-2 text-amber-600/60">~</span>

          Awaiting the host to start the game

          <span className="mx-2 text-amber-600/60">~</span>

        </p>

      )}

    </div>

  );

}


