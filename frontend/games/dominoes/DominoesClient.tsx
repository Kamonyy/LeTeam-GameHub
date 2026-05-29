'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, LogIn, UserPlus } from 'lucide-react';
import { useGameRoom, useCoreSession } from '@/hooks/useSocket';
import { useLeaveToHub } from '@/lib/hub/useLeaveToHub';
import { useNotifyRouteContentReady } from '@/lib/hub/ViewTransitionProvider';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import { setDisplayName, getDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import { isLobbyPlayer } from '@/lib/hub/resolveClientIsSpectator';
import { useSpectatorAutoLeave } from '@/lib/hub/useSpectatorAutoLeave';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import ChatPanel from '@/components/hub/ChatPanel';
import GameClientFrame from '@/components/ui/GameClientFrame';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Lobby from '@/games/dominoes/components/Lobby';
import GameBoard from '@/games/dominoes/components/GameBoard';
import SpectatorBanner from '@/games/dominoes/components/SpectatorBanner';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import InactiveGameScreen from '@/components/hub/InactiveGameScreen';
import GameLobbyPendingOverlay from '@/components/hub/GameLobbyPendingOverlay';
import { getGameEntry, isGameActive } from '@/lib/hub/games-registry';
import type { GameState } from '@/games/dominoes/types';

export default function DominoesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get('room');
  const spectateParam =
    searchParams.get('spectate') === '1' || searchParams.get('spectate') === 'true';

  const dominoesEnabled = isGameActive('dominoes');
  const dominoesMeta = getGameEntry('dominoes');
  const { isHydrated } = useCoreSession();
  const notifyRouteContentReady = useNotifyRouteContentReady();
  const [displayName, setDisplayNameState] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const leaveToHub = useLeaveToHub();

  const {
    connected,
    playerId,
    lobby,
    gameState,
    isSpectator,
    error,
    clearError,
    createRoom,
    joinRoomOrSpectate,
    spectateRoom,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    playMove,
    drawTile,
    passTurn,
    continueRound,
    requestRematch,
    autoJoined,
    inviteJoin,
    joinCode,
    setJoinCode,
    setAutoJoined,
  } = useGameRoom({
    gameType: 'dominoes',
    gameEnabled: dominoesEnabled,
    basePath: '/dominoes',
    roomParam,
    spectateParam,
    onAutoJoinLoading: setLoading,
  });

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (isHydrated) {
      notifyRouteContentReady();
    }
  }, [isHydrated, notifyRouteContentReady]);

  if (!isHydrated) {
    return <HubGameLoadingScreen gameId="dominoes" />;
  }

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName.trim(), 'dominoes');
    if (roomId) router.push(`/dominoes?room=${roomId}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const result = await joinRoomOrSpectate(code, displayName.trim());
    if (result.ok) {
      router.push(
        result.spectating ? `/dominoes?room=${code}&spectate=1` : `/dominoes?room=${code}`
      );
    }
    setLoading(false);
  };

  const handleSpectate = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await spectateRoom(code, displayName.trim());
    if (ok) router.push(`/dominoes?room=${code}&spectate=1`);
    setLoading(false);
  };

  const handleInviteJoin = async () => {
    const code = roomParam ? normalizeRoomCode(roomParam) : null;
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    if (spectateParam) {
      const ok = await spectateRoom(code, displayName.trim());
      if (ok) router.replace(`/dominoes?room=${code}&spectate=1`, { scroll: false });
    } else {
      const result = await joinRoomOrSpectate(code, displayName.trim());
      if (result.ok) {
        const query = result.spectating ? `?room=${code}&spectate=1` : `?room=${code}`;
        router.replace(`/dominoes${query}`, { scroll: false });
      }
    }
    setAutoJoined(true);
    setLoading(false);
  };

  const handleCancelMatch = async () => {
    setCancelling(true);
    await cancelMatch();
    setCancelling(false);
    setCancelConfirmOpen(false);
  };

  const dominoLobby = lobby?.gameType === 'dominoes' ? lobby : null;
  const isRoomPlayer = isLobbyPlayer(dominoLobby, playerId);
  const viewingAsSpectator = isSpectator && !isRoomPlayer;
  const isHost = dominoLobby?.hostId === playerId;

  useSpectatorAutoLeave({ lobby: dominoLobby, isSpectator: viewingAsSpectator });
  const dominoesState =
    dominoLobby && gameState && 'board' in gameState ? (gameState as GameState) : null;
  const inLobby = dominoLobby?.status === 'lobby' && !viewingAsSpectator;
  const spectatorWaiting =
    viewingAsSpectator && dominoLobby && dominoLobby.status === 'lobby';
  const showGameBoard =
    !!dominoesState &&
    !!dominoLobby &&
    (viewingAsSpectator ?
      dominoLobby.status === 'playing'
    : dominoLobby.status !== 'lobby');
  const waitingForGame =
    dominoLobby?.status === 'playing' && !dominoesState;
  const inActiveMatch =
    dominoLobby?.status === 'playing' && (showGameBoard || waitingForGame);

  const showChatSidebar = dominoLobby?.status === 'playing';

  return (
    <main
      className={clsx(
        'min-h-dvh overflow-x-hidden',
        showChatSidebar && 'lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]',
      )}
    >
      <GameClientFrame
        title="Dominoes"
        subtitle={dominoesMeta?.tagline}
        connected={connected}
        engagementRoomId={dominoLobby?.roomId}
        onCancelMatch={
          isHost && inActiveMatch ? () => setCancelConfirmOpen(true) : undefined
        }
        cancelMatchDisabled={cancelling}
        cancelMatchLabel={cancelling ? 'Cancelling…' : 'Cancel Match'}
        headerExtra={<PlayerNameControl disabled={inActiveMatch} />}
        maxWidthClass={showGameBoard ? 'max-w-7xl' : 'max-w-6xl'}
        className="min-w-0"
      >
        {!dominoLobby && !dominoesEnabled && <InactiveGameScreen gameId="dominoes" />}

        {!dominoLobby && dominoesEnabled && inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in">
            <div className="card mb-6">
              <div className="flex items-center gap-2 text-hub-accent mb-4">
                <UserPlus className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Join Room</h2>
              </div>
              <p className="text-sm text-hub-muted mb-4">
                {spectateParam ?
                  'Enter a display name to watch this match as a spectator.'
                : <>
                    You&apos;ve been invited to room{' '}
                    <span className="font-mono font-bold text-white tracking-widest">
                      {roomParam}
                    </span>
                    . Choose a display name to continue.
                  </>}
              </p>
              <label className="block text-sm text-hub-muted mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                className="input-field normal-case tracking-normal text-left mb-6"
                placeholder="Enter your name"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleInviteJoin}
                disabled={!connected || loading || !displayName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {loading ?
                  spectateParam ? 'Joining as spectator…' : 'Joining…'
                : spectateParam ? 'Watch match' : 'Join Room'}
              </button>
            </div>
            {!connected && (
              <p className="text-center text-sm text-hub-warning animate-pulse-soft">
                Connecting to server…
              </p>
            )}
          </div>
        )}

        {!dominoLobby && dominoesEnabled && !inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in space-y-6">
            <GameAboutPanel gameId="dominoes" />
            {roomParam && loading && !autoJoined && (
              <p className="text-center text-sm text-hub-muted mb-4 animate-pulse-soft">
                {spectateParam ?
                  `Joining as spectator for ${roomParam}…`
                : `Joining room ${roomParam}…`}
              </p>
            )}
            <div className="card mb-6">
              <label className="block text-sm text-hub-muted mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onBlur={() => displayName.trim() && setDisplayName(displayName)}
                className="input-field normal-case tracking-normal text-left mb-6"
                placeholder="Your name"
                maxLength={20}
              />
              <div className="space-y-4">
                <button
                  onClick={handleCreate}
                  disabled={!connected || loading || !displayName.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Creating…' : 'Create Room'}
                </button>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="ROOM CODE"
                  maxLength={8}
                />
                <button
                  onClick={handleJoin}
                  disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Joining…' : 'Join Room'}
                </button>
                <button
                  onClick={handleSpectate}
                  disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-hub-muted border-hub-border/60"
                >
                  Watch match
                </button>
              </div>
            </div>
            {!connected && (
              <p className="text-center text-sm text-hub-warning animate-pulse-soft">
                Connecting to server…
              </p>
            )}
          </div>
        )}

        {spectatorWaiting && dominoLobby && (
          <div className="max-w-md mx-auto text-center animate-fade-in py-16">
            <SpectatorBanner
              roomId={dominoLobby.roomId}
              onLeave={() => void leaveToHub()}
            />
            <p className="text-sm text-hub-muted mt-6">
              Waiting for the host to start the match.
            </p>
          </div>
        )}

        {inLobby && dominoLobby && (
          <Lobby
            lobby={dominoLobby}
            playerId={playerId}
            onSettingsChange={updateRoomSettings}
            onKickPlayer={kickPlayer}
            onStartGame={async () => {
              setStarting(true);
              await startGame();
              setStarting(false);
            }}
            onLeave={() => void leaveToHub()}
            starting={starting}
          />
        )}

        {waitingForGame && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 animate-fade-in">
            <div className="w-10 h-10 border-2 border-hub-accent/30 border-t-hub-accent rounded-full animate-spin" />
            <p className="text-sm text-hub-muted">Loading game…</p>
          </div>
        )}

        {showGameBoard && dominoLobby && (
          <>
            {viewingAsSpectator && (
              <SpectatorBanner
                roomId={dominoLobby.roomId}
                onLeave={() => void leaveToHub()}
              />
            )}
            <GameBoard
              gameState={dominoesState!}
              lobby={dominoLobby}
              playerId={playerId}
              isHost={isHost}
              isSpectator={viewingAsSpectator}
              onPlayMove={playMove}
              onDraw={drawTile}
              onPass={passTurn}
              onContinueRound={continueRound}
              onRematch={requestRematch}
            />
          </>
        )}
      </GameClientFrame>

      {showChatSidebar && (
        <ChatPanel className="hidden lg:flex lg:flex-col lg:col-start-2 lg:row-start-1 border-l border-hub-border bg-hub-surface/80 glass-blur-sm sticky top-0 pt-safe-top h-dvh min-h-0 pb-safe-bottom z-30" />
      )}

      <ErrorToast message={error} onDismiss={clearError} />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel this match?"
        message="Everyone will return to the lobby. Current round progress and scores will be cleared."
        confirmLabel="Cancel Match"
        cancelLabel="Keep Playing"
        variant="danger"
        icon="cancel"
        loading={cancelling}
        onConfirm={handleCancelMatch}
        onCancel={() => !cancelling && setCancelConfirmOpen(false)}
      />
    </main>
  );
}
