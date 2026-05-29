"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  LogIn,
  UserPlus,
  OctagonX,
  Loader2,
} from "lucide-react";
import {
  MafiaCard,
  MafiaCardContent,
  MafiaCardHeader,
  MafiaCardTitle,
} from "@/components/mafia/mafia-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MafiaButton } from "@/components/mafia/mafia-button";
import { useGameRoom, useCoreSession } from "@/hooks/useSocket";
import { useLeaveToHub } from "@/lib/hub/useLeaveToHub";
import {
  useNotifyRouteContentReady,
  useViewNavigator,
} from "@/lib/hub/ViewTransitionProvider";
import { navigateToGameLobby } from "@/lib/hub/navigateToGameLobby";
import HubGameLoadingScreen from "@/components/hub/arcade/HubGameLoadingScreen";
import { setDisplayName, getDisplayName } from "@/lib/player";
import ConnectionStatus from "@/components/hub/ConnectionStatus";
import { normalizeRoomCode } from "@/lib/hub/room";
import PlayerNameControl from "@/components/hub/PlayerNameControl";
import ErrorToast from "@/components/shared/ErrorToast";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InactiveGameScreen from "@/components/hub/InactiveGameScreen";
import { getGameEntry, isGameActive } from "@/lib/hub/games-registry";
import MafiaAtmosphere from "@/games/mafia/components/MafiaAtmosphere";
import MafiaAudioProvider from "@/games/mafia/components/MafiaAudioProvider";
import MafiaPhaseTransition from "@/games/mafia/components/MafiaPhaseTransition";
import {
  useMafiaPhaseTransition,
  mafiaPhaseTransitionKey,
} from "@/games/mafia/hooks/useMafiaPhaseTransition";
import MafiaLobby from "@/games/mafia/components/MafiaLobby";
import NarratorDashboard from "@/games/mafia/components/NarratorDashboard";
import PlayerCompanion from "@/games/mafia/components/PlayerCompanion";
import MafiaMatchOverModal from "@/games/mafia/components/MafiaMatchOverModal";
import RoomEngagementLayer from "@/components/engagement/RoomEngagementLayer";
import { mafiaAtmosphereVariant } from "@/games/mafia/lib/atmosphereVariant";
import { stripNarratorSecrets } from "@/games/mafia/lib/redactMafiaState";
import { cn } from "@/lib/utils";
import type {
  MafiaGameState,
  MafiaNarratorGameState,
  MafiaPlayerGameState,
  MafiaSettings,
  MafiaNarratorAction,
} from "@/games/mafia/types";
import GameLobbyPendingOverlay from "@/components/hub/GameLobbyPendingOverlay";
import "@/games/mafia/mafia.css";

export default function MafiaClient() {
  const searchParams = useSearchParams();
  const navigateWithTransition = useViewNavigator();
  const roomParam = searchParams.get("room");

  const enabled = isGameActive("mafia");
  const { isHydrated } = useCoreSession();
  const notifyRouteContentReady = useNotifyRouteContentReady();
  const [displayName, setDisplayNameState] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [postMatchBusy, setPostMatchBusy] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const leaveToHub = useLeaveToHub();
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const hadLobbyRef = useRef(false);

  const {
    connected,
    playerId,
    lobby,
    gameState,
    error,
    clearError,
    createRoom,
    joinRoom,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    disbandRoom,
    mafiaAcknowledgeRole,
    mafiaNarratorAction,
    addDevBots,
    removeDevBots,
    autoJoined,
    inviteJoin,
    joinCode,
    setJoinCode,
    setAutoJoined,
  } = useGameRoom({
    gameType: "mafia",
    gameEnabled: enabled,
    basePath: "/mafia",
    roomParam,
    onAutoJoinLoading: setLoading,
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrowViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const tcLobby = lobby?.gameType === "mafia" ? lobby : null;
  const tcState: MafiaGameState | null = useMemo(() => {
    if (
      !tcLobby ||
      !gameState ||
      !("gameType" in gameState) ||
      gameState.gameType !== "mafia"
    ) {
      return null;
    }
    return stripNarratorSecrets(gameState as MafiaGameState);
  }, [tcLobby, gameState]);

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (tcState?.phase === "match_over") {
      setCancelConfirmOpen(false);
    }
  }, [tcState?.phase]);

  useEffect(() => {
    if (tcLobby) hadLobbyRef.current = true;
    if (hadLobbyRef.current && connected && !lobby) {
      hadLobbyRef.current = false;
      navigateWithTransition("/", { replace: true });
    }
  }, [lobby, connected, navigateWithTransition, tcLobby]);

  const handleReturnToLobby = async () => {
    setPostMatchBusy(true);
    await cancelMatch();
    setPostMatchBusy(false);
  };

  const handleExitRoom = async () => {
    setPostMatchBusy(true);
    const ok = await disbandRoom();
    setPostMatchBusy(false);
    if (ok) navigateWithTransition("/", { replace: true });
  };

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName.trim(), "mafia");
    if (roomId) {
      setAutoJoined(true);
      navigateToGameLobby(navigateWithTransition, roomId, 'mafia', {
        replace: true,
      });
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) {
      navigateToGameLobby(navigateWithTransition, code, 'mafia');
    }
    setLoading(false);
  };

  const handleInviteJoin = async () => {
    const code = roomParam ? normalizeRoomCode(roomParam) : null;
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) {
      navigateToGameLobby(navigateWithTransition, code, 'mafia', { replace: true });
    }
    setAutoJoined(true);
    setLoading(false);
  };

  const onNarratorAction = useCallback(
    async (action: MafiaNarratorAction, targetPlayerId?: string | null) => {
      const locksUi = action !== "set_night_target";
      if (locksUi) setActionBusy(true);
      const ok = await mafiaNarratorAction(action, targetPlayerId);
      if (locksUi) setActionBusy(false);
      return ok;
    },
    [mafiaNarratorAction],
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

  const atmosphereReduced = prefersReducedMotion || isNarrowViewport;

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

  const gameViewKey = useMemo(() => {
    if (!tcState) return "idle";
    return (
      mafiaPhaseTransitionKey(
        tcState.phase,
        tcState.dayNumber,
        tcState.nightNumber,
      ) ?? `v-${tcState.stateVersion}`
    );
  }, [tcState]);

  useEffect(() => {
    if (isHydrated) {
      notifyRouteContentReady();
    }
  }, [isHydrated, notifyRouteContentReady]);

  if (!isHydrated) {
    return <HubGameLoadingScreen gameId="mafia" />;
  }

  const gameBody = (
    <>
      {inLobby && tcLobby && (
        <MafiaLobby
          lobby={tcLobby}
          playerId={playerId}
          onKickPlayer={kickPlayer}
          onAddDevBots={addDevBots}
          onRemoveDevBots={removeDevBots}
          onSettingsChange={(s) =>
            updateRoomSettings(s as Partial<MafiaSettings>)
          }
          onStartGame={async () => {
            setStarting(true);
            await startGame();
            setStarting(false);
          }}
          onLeave={() => void leaveToHub()}
          starting={starting}
        />
      )}

      {inGame && tcLobby && tcState && (
        <div key={gameViewKey} className="animate-mf-fade-rise motion-reduce:animate-none">
          {isNarrator ? (
            <NarratorDashboard
              state={tcState as MafiaNarratorGameState}
              lobby={tcLobby}
              onNarratorAction={onNarratorAction}
              busy={actionBusy}
            />
          ) : (
            <PlayerCompanion
              state={tcState as MafiaPlayerGameState}
              lobby={tcLobby}
              playerId={playerId}
              onAcknowledgeRole={async () => {
                setAckBusy(true);
                await mafiaAcknowledgeRole();
                setAckBusy(false);
              }}
              acknowledging={ackBusy}
            />
          )}
        </div>
      )}
    </>
  );

  return (
    <TooltipProvider delayDuration={280}>
    <main
      data-mafia-theme
      className={cn(
        "mf-app-canvas relative min-h-dvh overflow-x-hidden bg-[color:var(--p1-abyss)] text-[color:var(--p1-ink)]",
        atmosphere === "night" && "mf-app-canvas--night",
        atmosphere === "morning" && "mf-app-canvas--morning",
      )}
    >
      <RoomEngagementLayer roomId={tcLobby?.roomId} />
      <MafiaAtmosphere variant={atmosphere} reduced={atmosphereReduced} />

      <header className="mf-app-header sticky top-0 z-40 border-b border-[color:var(--mf-glass-border)] bg-[color:var(--mf-glass-bg)] pt-[env(safe-area-inset-top,0px)] shadow-[var(--mf-shadow-panel)] backdrop-blur-[var(--mf-glass-blur)] before:pointer-events-none before:absolute before:inset-x-[6%] before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-500/70 before:to-transparent">
        <div className="mx-auto flex max-w-[76rem] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5 max-md:gap-y-2 max-md:px-3.5 max-md:py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-transparent p-2.5 text-stone-300 transition-colors hover:border-amber-700/35 hover:bg-amber-500/5 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
              aria-label="Back to hub"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="mf-title-gold font-cinzel text-xl font-bold uppercase tracking-[0.18em] max-md:text-base max-md:tracking-[0.14em]">
                Mafia
              </h1>
              {gameMeta && (
                <p className="font-cormorant max-w-[22rem] text-sm italic text-[color:var(--p1-ink-soft)] max-md:hidden">
                  {gameMeta.tagline}
                </p>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 max-md:w-full max-md:justify-between">
            {isHost && inGame && (
              <MafiaButton
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
                className="min-h-11 gap-1.5 px-3 text-[0.68rem]"
              >
                <OctagonX className="h-4 w-4 shrink-0" aria-hidden />
                {cancelling ? "Ending…" : "End Game"}
              </MafiaButton>
            )}
            <ConnectionStatus connected={connected} variant="mafia" />
            <PlayerNameControl disabled={!!inGame} theme="mafia" />
          </div>
        </div>
      </header>

      <div
        className={cn(
          "relative z-[2] isolate mx-auto max-w-[76rem] pb-10",
          tcLobby?.roomId && "pb-14 sm:pb-16",
          !inLobby && !inGame && "px-4",
        )}
      >
        {!tcLobby && !enabled && <InactiveGameScreen gameId="mafia" />}

        {!tcLobby && enabled && inviteJoin && (
          <div className="mx-auto my-5 max-w-md px-5 py-7">
            <MafiaCard variant="elevated">
              <MafiaCardHeader className="pb-2">
                <MafiaCardTitle className="font-cinzel flex items-center gap-2 text-lg text-amber-100">
                  <UserPlus className="h-5 w-5" />
                  Join Mafia
                </MafiaCardTitle>
              </MafiaCardHeader>
              <MafiaCardContent className="space-y-4">
                <p className="text-sm text-stone-400">
                  Room{" "}
                  <span className="font-mono tracking-widest text-stone-200">
                    {roomParam}
                  </span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="mafia-invite-name">Display name</Label>
                  <Input
                    id="mafia-invite-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayNameState(e.target.value)}
                    placeholder="Your display name"
                    maxLength={32}
                    autoFocus
                  />
                </div>
                <MafiaButton
                  type="button"
                  variant="primary"
                  className="w-full min-h-11"
                  disabled={!connected || loading || !displayName.trim()}
                  onClick={handleInviteJoin}
                >
                  <LogIn className="h-4 w-4" />
                  {loading ? "Joining…" : "Join"}
                </MafiaButton>
              </MafiaCardContent>
            </MafiaCard>
          </div>
        )}

        {!tcLobby && enabled && !inviteJoin && (
          <div className="relative mx-auto my-5 max-w-md px-5 py-7">
            {!connected && (
              <p className="flex items-center justify-center gap-2 font-cormorant text-sm text-stone-400/80 mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </p>
            )}
            {loading && <GameLobbyPendingOverlay message="Opening lobby…" />}
            <MafiaCard variant="elevated">
              <MafiaCardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="mafia-create-name">Display name</Label>
                  <Input
                    id="mafia-create-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayNameState(e.target.value)}
                    onBlur={() =>
                      displayName.trim() && setDisplayName(displayName)
                    }
                    placeholder="Your display name"
                    maxLength={32}
                  />
                </div>
                <MafiaButton
                  type="button"
                  variant="primary"
                  className="w-full min-h-11"
                  disabled={!connected || loading || !displayName.trim()}
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4" />
                  Create room
                </MafiaButton>
                {!connected && (
                  <p className="text-center text-sm text-amber-200/70">
                    Waiting for connection to the game server…
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="mafia-join-code">Room code</Label>
                  <Input
                    id="mafia-join-code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-widest"
                    placeholder="ABCD1234"
                    maxLength={8}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <MafiaButton
                  type="button"
                  variant="outline"
                  className="w-full min-h-11"
                  disabled={
                    !connected ||
                    loading ||
                    !joinCode.trim() ||
                    !displayName.trim()
                  }
                  onClick={handleJoin}
                >
                  <LogIn className="h-4 w-4" />
                  Join room
                </MafiaButton>
              </MafiaCardContent>
            </MafiaCard>
          </div>
        )}

        {inGame ? (
          <MafiaAudioProvider phase={tcState?.phase} deathCount={deathCount}>
            <div className="relative z-[2] pb-8">
              <MafiaPhaseTransition transition={phaseTransition} />
              {gameBody}
            </div>
          </MafiaAudioProvider>
        ) : (
          gameBody
        )}
      </div>

      <MafiaMatchOverModal
        open={!!inGame && tcState?.phase === "match_over" && !!tcState.winnerTeam}
        winnerTeam={tcState?.winnerTeam ?? "good"}
        isHost={!!isHost}
        busy={postMatchBusy}
        onReturnToLobby={
          isHost ? () => void handleReturnToLobby() : undefined
        }
        onExit={isHost ? () => void handleExitRoom() : undefined}
        onLeave={!isHost ? () => void leaveToHub() : undefined}
      />

      <ErrorToast message={error} onDismiss={clearError} />
      <ConfirmDialog
        open={cancelConfirmOpen}
        title="End game?"
        message="Everyone returns to the lobby. Roles will be redealt when the host starts again."
        confirmLabel="End game"
        cancelLabel="Keep playing"
        icon="cancel"
        loading={cancelling}
        variant="danger"
        overlayVariant="warm"
        onConfirm={async () => {
          setCancelling(true);
          await cancelMatch();
          setCancelling(false);
          setCancelConfirmOpen(false);
        }}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </main>
    </TooltipProvider>
  );
}
