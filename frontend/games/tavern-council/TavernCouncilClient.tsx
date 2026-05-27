"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  LogIn,
  UserPlus,
  OctagonX,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import clsx from "clsx";
import { useSocket } from "@/hooks/useSocket";
import { setDisplayName, getDisplayName, hasDisplayName } from "@/lib/player";
import { normalizeRoomCode } from "@/lib/hub/room";
import PlayerNameControl from "@/components/hub/PlayerNameControl";
import ErrorToast from "@/components/shared/ErrorToast";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InactiveGameScreen from "@/components/hub/InactiveGameScreen";
import { getGameEntry, isGameActive } from "@/lib/hub/games-registry";
import MafiaAtmosphere from "@/games/tavern-council/components/MafiaAtmosphere";
import MafiaAudioProvider from "@/games/tavern-council/components/MafiaAudioProvider";
import MafiaPhaseTransition from "@/games/tavern-council/components/MafiaPhaseTransition";
import { useMafiaPhaseTransition } from "@/games/tavern-council/hooks/useMafiaPhaseTransition";
import TavernCouncilLobby from "@/games/tavern-council/components/TavernCouncilLobby";
import NarratorDashboard from "@/games/tavern-council/components/NarratorDashboard";
import PlayerCompanion from "@/games/tavern-council/components/PlayerCompanion";
import { mafiaAtmosphereVariant } from "@/games/tavern-council/lib/atmosphereVariant";
import type {
  TavernCouncilGameState,
  TavernCouncilSettings,
  TavernNarratorAction,
} from "@/games/tavern-council/types";
import GameLobbyPendingOverlay from "@/components/hub/GameLobbyPendingOverlay";
import "@/games/tavern-council/tavern-council.css";

function MafiaConnectionSeal({ connected }: { connected: boolean }) {
  return (
    <div
      className={clsx(
        "tc-connection-seal",
        !connected && "tc-connection-seal--off",
      )}
      role="status"
    >
      <span className={clsx("tc-conn-seal", !connected && "tc-conn-seal--off")}>
        <span
          className="tc-conn-seal__claw tc-conn-seal__claw--left"
          aria-hidden
        />
        <span className="tc-conn-seal__gem" aria-hidden>
          {connected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="tc-conn-seal__label">
          {connected ? "Connected" : "Reconnecting"}
        </span>
        <span
          className="tc-conn-seal__claw tc-conn-seal__claw--right"
          aria-hidden
        />
      </span>
    </div>
  );
}

export default function TavernCouncilClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get("room");

  const {
    connected,
    playerId,
    lobby,
    gameState,
    error,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    tavernAcknowledgeRole,
    tavernNarratorAction,
    addDevBots,
    removeDevBots,
  } = useSocket();

  const [displayName, setDisplayNameState] = useState("");
  const [joinCode, setJoinCode] = useState(roomParam || "");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);
  const [inviteJoin, setInviteJoin] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);

  useEffect(() => {
    setInviteJoin(!!roomParam && !hasDisplayName());
  }, [roomParam]);

  const enabled = isGameActive("mafia");
  const tcLobby = lobby?.gameType === "mafia" ? lobby : null;
  const tcState: TavernCouncilGameState | null =
    tcLobby &&
    gameState &&
    "gameType" in gameState &&
    gameState.gameType === "mafia"
      ? (gameState as TavernCouncilGameState)
      : null;

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (
      !enabled ||
      !connected ||
      !roomParam ||
      lobby?.gameType === "mafia" ||
      autoJoined ||
      inviteJoin
    )
      return;
    if (lobby && lobby.gameType !== "mafia") return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    let cancelled = false;
    const attemptJoin = async () => {
      setLoading(true);
      const ok = await joinRoom(code, getDisplayName());
      if (!cancelled) {
        if (ok) router.replace(`/mafia?room=${code}`, { scroll: false });
        setAutoJoined(true);
        setLoading(false);
      }
    };
    attemptJoin();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    connected,
    roomParam,
    lobby,
    autoJoined,
    inviteJoin,
    joinRoom,
    router,
  ]);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName.trim(), "mafia");
    if (roomId) router.push(`/mafia?room=${roomId}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) router.push(`/mafia?room=${code}`);
    setLoading(false);
  };

  const handleInviteJoin = async () => {
    const code = roomParam ? normalizeRoomCode(roomParam) : null;
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) router.replace(`/mafia?room=${code}`, { scroll: false });
    setAutoJoined(true);
    setLoading(false);
  };

  const onNarratorAction = useCallback(
    async (action: TavernNarratorAction, targetPlayerId?: string | null) => {
      setActionBusy(true);
      const ok = await tavernNarratorAction(action, targetPlayerId);
      setActionBusy(false);
      return ok;
    },
    [tavernNarratorAction],
  );

  const isHost = tcLobby?.hostId === playerId;
  const isNarrator = tcState?.isNarrator ?? false;
  const gameMeta = getGameEntry("mafia");
  const inLobby = tcLobby?.status === "lobby";
  const inGame =
    tcLobby &&
    tcState &&
    (tcLobby.status === "playing" || tcLobby.status === "finished");

  const atmosphere = useMemo(
    () => mafiaAtmosphereVariant(tcState?.phase, !!inLobby || !tcLobby),
    [tcState?.phase, inLobby, tcLobby],
  );

  const deathCount = tcState?.lastMorningSummary?.deaths.length ?? 0;

  const phaseTransition = useMafiaPhaseTransition(
    tcState
      ? {
          phase: tcState.phase,
          dayNumber: tcState.dayNumber,
          nightNumber: tcState.nightNumber,
        }
      : null,
    !!inGame,
  );

  const gameBody = (
    <>
      {inLobby && tcLobby && (
        <TavernCouncilLobby
          lobby={tcLobby}
          playerId={playerId}
          onKickPlayer={kickPlayer}
          onAddDevBots={addDevBots}
          onRemoveDevBots={removeDevBots}
          onSettingsChange={(s) =>
            updateRoomSettings(s as Partial<TavernCouncilSettings>)
          }
          onStartGame={async () => {
            setStarting(true);
            await startGame();
            setStarting(false);
          }}
          onLeave={() => {
            leaveRoom();
            router.push("/mafia");
          }}
          starting={starting}
        />
      )}

      {inGame && tcLobby && tcState && (
        <>
          {isNarrator ? (
            <NarratorDashboard
              state={tcState}
              lobby={tcLobby}
              onNarratorAction={onNarratorAction}
              busy={actionBusy}
            />
          ) : (
            <PlayerCompanion
              state={tcState}
              lobby={tcLobby}
              playerId={playerId}
              onAcknowledgeRole={async () => {
                setAckBusy(true);
                await tavernAcknowledgeRole();
                setAckBusy(false);
              }}
              acknowledging={ackBusy}
            />
          )}
        </>
      )}
    </>
  );

  return (
    <main className="tc-shell min-h-screen">
      <MafiaAtmosphere variant={atmosphere} />

      <header className="tc-header">
        <div className="tc-header__inner">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="tc-header__back shrink-0"
              aria-label="Back to hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="tc-header__title tc-font-display">Mafia</h1>
              {gameMeta && (
                <p className="tc-header__tagline">{gameMeta.tagline}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isHost && inGame && (
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
                className="tc-btn-ghost text-xs flex items-center gap-1 !text-rose-200/90"
              >
                <OctagonX className="w-4 h-4" />
                Cancel
              </button>
            )}
            <MafiaConnectionSeal connected={connected} />
            <div className="tc-profile-locket">
              <PlayerNameControl disabled={!!inGame} />
            </div>
          </div>
        </div>
      </header>

      <div className="tc-shell__content">
        {!tcLobby && !enabled && <InactiveGameScreen gameId="mafia" />}

        {!tcLobby && enabled && inviteJoin && (
          <div className="max-w-md mx-auto p-6 mt-8">
            <div className="tc-stone-panel p-6">
              <div className="flex items-center gap-2 mb-4 tc-display">
                <UserPlus className="w-5 h-5" />
                <h2 className="text-lg tc-font-display">Join Mafia</h2>
              </div>
              <p className="tc-body-sm mb-4">
                Room{" "}
                <span className="font-mono tracking-widest tc-display">
                  {roomParam}
                </span>
              </p>
              <label className="block tc-body-sm mb-2">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                className="tc-input mb-4"
                maxLength={32}
                autoFocus
              />
              <button
                type="button"
                className="tc-btn-royal w-full flex items-center justify-center gap-2"
                disabled={!connected || loading || !displayName.trim()}
                onClick={handleInviteJoin}
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Joining…" : "Join"}
              </button>
            </div>
          </div>
        )}

        {!tcLobby && enabled && !inviteJoin && (
          <div className="max-w-md mx-auto p-6 mt-8 relative">
            {!connected && (
              <p className="flex items-center justify-center gap-2 tc-body-sm mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </p>
            )}
            {loading && <GameLobbyPendingOverlay message="Opening lobby…" />}
            <div className="tc-stone-panel p-6 space-y-4">
              <label className="block tc-body-sm">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onBlur={() => displayName.trim() && setDisplayName(displayName)}
                className="tc-input"
                maxLength={32}
              />
              <button
                type="button"
                className="tc-btn-royal w-full flex items-center justify-center gap-2"
                disabled={!connected || loading || !displayName.trim()}
                onClick={handleCreate}
              >
                <Plus className="w-4 h-4" />
                Create room
              </button>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="tc-input tc-input--mono"
                placeholder="ROOM CODE"
                maxLength={8}
              />
              <button
                type="button"
                className="tc-btn-ghost w-full flex items-center justify-center gap-2"
                disabled={
                  !connected ||
                  loading ||
                  !joinCode.trim() ||
                  !displayName.trim()
                }
                onClick={handleJoin}
              >
                <LogIn className="w-4 h-4" />
                Join room
              </button>
            </div>
          </div>
        )}

        {inGame ? (
          <MafiaAudioProvider
            phase={tcState?.phase}
            stateVersion={tcState?.stateVersion}
            deathCount={deathCount}
          >
            <div className="tc-game-stage">
              <MafiaPhaseTransition transition={phaseTransition} />
              {gameBody}
            </div>
          </MafiaAudioProvider>
        ) : (
          gameBody
        )}
      </div>

      <ErrorToast message={error} onDismiss={clearError} />
      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel match?"
        message="Everyone returns to the lobby. Roles will be redealt on the next start."
        confirmLabel="Cancel match"
        variant="danger"
        onConfirm={async () => {
          setCancelling(true);
          await cancelMatch();
          setCancelling(false);
          setCancelConfirmOpen(false);
        }}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </main>
  );
}
