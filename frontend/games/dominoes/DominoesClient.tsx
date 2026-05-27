'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LogIn, UserPlus, OctagonX } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { setDisplayName, getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Lobby from '@/games/dominoes/components/Lobby';
import GameBoard from '@/games/dominoes/components/GameBoard';
import type { GameState } from '@/games/dominoes/types';

export default function DominoesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get('room');

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
    playMove,
    drawTile,
    passTurn,
  } = useSocket();

  const [displayName, setDisplayNameState] = useState('');
  const [joinCode, setJoinCode] = useState(roomParam || '');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);

  const inviteJoin = !!roomParam && !hasDisplayName();

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (!connected || !roomParam || lobby || autoJoined || inviteJoin) return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    const attemptJoin = async () => {
      setLoading(true);
      const name = getDisplayName();
      const ok = await joinRoom(code, name);
      if (ok) {
        router.replace(`/dominoes?room=${code}`, { scroll: false });
      }
      setAutoJoined(true);
      setLoading(false);
    };

    attemptJoin();
  }, [connected, roomParam, lobby, autoJoined, inviteJoin, joinRoom, router]);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName.trim());
    if (roomId) router.push(`/dominoes?room=${roomId}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) router.push(`/dominoes?room=${code}`);
    setLoading(false);
  };

  const handleInviteJoin = async () => {
    const code = roomParam ? normalizeRoomCode(roomParam) : null;
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) {
      router.replace(`/dominoes?room=${code}`, { scroll: false });
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

  const isHost = lobby?.hostId === playerId;
  const dominoesState =
    lobby?.gameType === 'dominoes' && gameState && 'board' in gameState
      ? (gameState as GameState)
      : null;
  const inGame =
    lobby?.status === 'playing' &&
    dominoesState &&
    dominoesState.phase === 'playing';
  const inPostGame =
    dominoesState &&
    (dominoesState.phase === 'round_over' || dominoesState.phase === 'match_over');
  const inLobby = lobby && lobby.status === 'lobby';
  const inActiveMatch = lobby?.status === 'playing' && (inGame || inPostGame);

  return (
    <main className="min-h-screen">
      <header className="border-b border-hub-border bg-hub-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-hub-muted hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Dominoes</h1>
          </div>
          <div className="flex items-center gap-3">
            {isHost && inActiveMatch && (
              <button
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
                className="btn-secondary flex items-center gap-2 text-sm py-2 text-hub-danger border-hub-danger/30 hover:bg-hub-danger/10"
              >
                <OctagonX className="w-4 h-4" />
                {cancelling ? 'Cancelling…' : 'Cancel Match'}
              </button>
            )}
            <ConnectionStatus connected={connected} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {!lobby && inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in">
            <div className="card mb-6">
              <div className="flex items-center gap-2 text-hub-accent mb-4">
                <UserPlus className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Join Room</h2>
              </div>
              <p className="text-sm text-hub-muted mb-4">
                You&apos;ve been invited to room{' '}
                <span className="font-mono font-bold text-white tracking-widest">
                  {roomParam}
                </span>
                . Choose a display name to continue.
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
                {loading ? 'Joining…' : 'Join Room'}
              </button>
            </div>
            {!connected && (
              <p className="text-center text-sm text-hub-warning animate-pulse-soft">
                Connecting to server…
              </p>
            )}
          </div>
        )}

        {!lobby && !inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in">
            {roomParam && loading && !autoJoined && (
              <p className="text-center text-sm text-hub-muted mb-4 animate-pulse-soft">
                Joining room {roomParam}…
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
              </div>
            </div>
            {!connected && (
              <p className="text-center text-sm text-hub-warning animate-pulse-soft">
                Connecting to server…
              </p>
            )}
          </div>
        )}

        {inLobby && (
          <Lobby
            lobby={lobby}
            playerId={playerId}
            onSettingsChange={updateRoomSettings}
            onKickPlayer={kickPlayer}
            onStartGame={async () => {
              setStarting(true);
              await startGame();
              setStarting(false);
            }}
            onLeave={() => {
              leaveRoom();
              router.push('/dominoes');
            }}
            starting={starting}
          />
        )}

        {(inGame || inPostGame || (lobby?.status === 'finished' && dominoesState)) && (
          <GameBoard
            gameState={dominoesState!}
            lobby={lobby!}
            playerId={playerId}
            onPlayMove={playMove}
            onDraw={drawTile}
            onPass={passTurn}
          />
        )}
      </div>

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
