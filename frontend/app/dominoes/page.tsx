'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LogIn } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { setDisplayName, getDisplayName } from '@/lib/player';
import ConnectionStatus from '@/components/ConnectionStatus';
import ErrorToast from '@/components/ErrorToast';
import Lobby from '@/components/Lobby';
import GameBoard from '@/components/GameBoard';

function DominoesContent() {
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
    startGame,
    playMove,
    drawTile,
    passTurn,
  } = useSocket();

  const [displayName, setDisplayNameState] = useState('');
  const [joinCode, setJoinCode] = useState(roomParam || '');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  /** Auto-join from URL ?room=CODE */
  useEffect(() => {
    if (!connected || !roomParam || lobby || autoJoined) return;

    const attemptJoin = async () => {
      setLoading(true);
      const name = getDisplayName();
      const ok = await joinRoom(roomParam, name);
      if (ok) {
        router.replace(`/dominoes?room=${roomParam.toUpperCase()}`, {
          scroll: false,
        });
      }
      setAutoJoined(true);
      setLoading(false);
    };

    attemptJoin();
  }, [connected, roomParam, lobby, autoJoined, joinRoom, router]);

  const handleCreate = async () => {
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName);
    if (roomId) {
      router.push(`/dominoes?room=${roomId}`);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(joinCode.trim(), displayName);
    if (ok) {
      router.push(`/dominoes?room=${joinCode.trim().toUpperCase()}`);
    }
    setLoading(false);
  };

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  const handleLeave = () => {
    leaveRoom();
    router.push('/dominoes');
  };

  const inGame = lobby?.status === 'playing' && gameState;
  const inLobby = lobby && lobby.status === 'lobby';

  return (
    <main className="min-h-screen">
      <header className="border-b border-hub-border bg-hub-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-hub-muted hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Dominoes</h1>
          </div>
          <ConnectionStatus connected={connected} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {!lobby && (
          <div className="max-w-md mx-auto animate-fade-in">
            <div className="card mb-6">
              <label className="block text-sm text-hub-muted mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onBlur={() => setDisplayName(displayName)}
                className="input-field normal-case tracking-normal text-left mb-6"
                placeholder="Your name"
                maxLength={20}
              />

              <div className="space-y-4">
                <button
                  onClick={handleCreate}
                  disabled={!connected || loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Creating…' : 'Create Room'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-hub-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-hub-card px-3 text-hub-muted">or join</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="ROOM CODE"
                  maxLength={6}
                />

                <button
                  onClick={handleJoin}
                  disabled={!connected || loading || !joinCode.trim()}
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
            onStartGame={handleStart}
            onLeave={handleLeave}
            starting={starting}
          />
        )}

        {inGame && (
          <GameBoard
            gameState={gameState}
            lobby={lobby}
            playerId={playerId}
            onPlayMove={playMove}
            onDraw={drawTile}
            onPass={passTurn}
          />
        )}

        {lobby?.status === 'finished' && gameState && (
          <GameBoard
            gameState={gameState}
            lobby={lobby}
            playerId={playerId}
            onPlayMove={playMove}
            onDraw={drawTile}
            onPass={passTurn}
          />
        )}
      </div>

      <ErrorToast message={error} onDismiss={clearError} />
    </main>
  );
}

export default function DominoesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-hub-muted">
          Loading…
        </div>
      }
    >
      <DominoesContent />
    </Suspense>
  );
}
