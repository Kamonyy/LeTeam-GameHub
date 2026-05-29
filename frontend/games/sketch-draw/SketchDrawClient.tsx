'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LogIn, Loader2 } from 'lucide-react';
import { useGameRoom, useCoreSession } from '@/hooks/useSocket';
import { useLeaveToHub } from '@/lib/hub/useLeaveToHub';
import { useNotifyRouteContentReady } from '@/lib/hub/ViewTransitionProvider';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import { setDisplayName, getDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import InactiveGameScreen from '@/components/hub/InactiveGameScreen';
import { isGameActive } from '@/lib/hub/games-registry';
import GameLobbyPendingOverlay from '@/components/hub/GameLobbyPendingOverlay';
import GameClientFrame from '@/components/ui/GameClientFrame';
import SketchDrawLobby from '@/games/sketch-draw/components/SketchDrawLobby';
import SketchDrawGameBoard from '@/games/sketch-draw/components/SketchDrawGameBoard';
import type { SketchDrawGameState } from '@/games/sketch-draw/types';
import '@/games/sketch-draw/sketch-draw.css';

export default function SketchDrawClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get('room');

  const gameEnabled = isGameActive('sketch-draw');
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
    error,
    clearError,
    createRoom,
    joinRoom,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    sketchDrawDisbandRoom,
    sketchDrawDisbandAt,
    requestRematch,
    autoJoined,
    inviteJoin,
    joinCode,
    setJoinCode,
  } = useGameRoom({
    gameType: 'sketch-draw',
    gameEnabled,
    basePath: '/sketch-draw',
    roomParam,
    onAutoJoinLoading: setLoading,
  });
  const sketchLobby = lobby?.gameType === 'sketch-draw' ? lobby : null;
  const sketchState: SketchDrawGameState | null =
    sketchLobby &&
    gameState &&
    'gameType' in gameState &&
    gameState.gameType === 'sketch-draw' ?
      (gameState as SketchDrawGameState)
    : null;

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (sketchDrawDisbandAt > 0) {
      router.push('/');
    }
  }, [sketchDrawDisbandAt, router]);

  useEffect(() => {
    if (isHydrated) {
      notifyRouteContentReady();
    }
  }, [isHydrated, notifyRouteContentReady]);

  if (!isHydrated) {
    return <HubGameLoadingScreen gameId="sketch-draw" />;
  }

  const handleCreate = async () => {
    const name = displayName.trim() || getDisplayName();
    if (!name) return;
    setDisplayName(name);
    setLoading(true);
    const roomId = await createRoom(name, 'sketch-draw');
    setLoading(false);
    if (roomId) router.replace(`/sketch-draw?room=${roomId}`, { scroll: false });
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code) return;
    const name = displayName.trim() || getDisplayName();
    if (!name) return;
    setDisplayName(name);
    setLoading(true);
    const ok = await joinRoom(code, name);
    setLoading(false);
    if (ok) router.replace(`/sketch-draw?room=${code}`, { scroll: false });
  };

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    await cancelMatch();
    setCancelling(false);
    setCancelConfirmOpen(false);
  };

  if (!gameEnabled) {
    return <InactiveGameScreen gameId="sketch-draw" />;
  }

  const inLobby = sketchLobby && sketchLobby.status === 'lobby';
  const inGame = sketchLobby && sketchState && sketchLobby.status === 'playing';
  const matchOver = sketchState?.phase === 'match_over';
  const isHost = sketchLobby?.hostId === playerId;

  const roomBody = (
    <>
      {inLobby && (
        <SketchDrawLobby
          lobby={sketchLobby}
          playerId={playerId}
          onStartGame={handleStart}
          onLeave={() => void leaveToHub()}
          onSettingsChange={(s) => updateRoomSettings(s)}
          onKickPlayer={(id) => kickPlayer(id)}
          starting={starting}
        />
      )}

      {inGame && sketchState && (
        <SketchDrawGameBoard
          lobby={sketchLobby}
          state={sketchState}
          playerId={playerId}
          onLeave={() => void leaveToHub()}
          onCancel={() => setCancelConfirmOpen(true)}
          onReturnToLobby={() => void cancelMatch()}
          onDisbandRoom={async () => {
            const ok = await sketchDrawDisbandRoom();
            if (ok) router.push('/');
          }}
        />
      )}
    </>
  );

  return (
    <>
      {!sketchLobby && (
      <main className="min-h-dvh relative sketch-arcade z-10">
        <ErrorToast message={error} onDismiss={clearError} />

        {!sketchLobby && (
          <div className="max-w-md mx-auto px-4 py-16">
            <Link href="/" className="text-sm text-hub-muted hover:text-hub-accent inline-flex items-center gap-1 mb-8">
              <ArrowLeft className="w-4 h-4" />
              Back to hub
            </Link>
            <h1 className="text-3xl font-bold sketch-title mb-2">What is that</h1>
            <p className="text-hub-muted text-sm mb-8">
              Draw and guess with friends — 3 to 12 players.
            </p>
            <label className="block text-sm text-hub-muted mb-2">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayNameState(e.target.value)}
              className="w-full rounded-lg bg-hub-bg border border-hub-border px-3 py-2 text-sm mb-4"
              maxLength={32}
            />
            <div className="space-y-3">
              <button
                type="button"
                disabled={loading || !connected}
                onClick={handleCreate}
                className="hub-btn-primary w-full"
              >
                {loading ?
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                : <Plus className="w-4 h-4 inline mr-1" />}
                Create room
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Room code"
                  className="flex-1 rounded-lg bg-hub-bg border border-hub-border px-3 py-2 text-sm uppercase"
                  maxLength={8}
                />
                <button
                  type="button"
                  disabled={loading || !connected}
                  onClick={handleJoin}
                  className="hub-btn-secondary shrink-0"
                >
                  <LogIn className="w-4 h-4 inline mr-1" />
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && !sketchLobby && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <GameLobbyPendingOverlay message="Connecting to room…" />
          </div>
        )}
      </main>
      )}

      {sketchLobby && (
        <GameClientFrame
          title="What is that"
          subtitle="Draw and guess with friends"
          connected={connected}
          engagementRoomId={sketchLobby?.roomId}
          className="min-h-dvh relative sketch-arcade z-10"
          headerClassName="border-hub-border/60 bg-hub-surface/30"
          contentClassName="p-0"
          onCancelMatch={
            isHost && inGame && !matchOver ?
              () => setCancelConfirmOpen(true)
            : undefined
          }
          cancelMatchDisabled={cancelling}
          cancelMatchLabel={cancelling ? 'Ending…' : 'End match'}
        >
          <ErrorToast message={error} onDismiss={clearError} />
          {roomBody}
        </GameClientFrame>
      )}

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="End match?"
        message="This will end the game for everyone in the room."
        confirmLabel={cancelling ? 'Ending…' : 'End match'}
        variant="danger"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </>
  );
}
