'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LogIn, UserPlus, OctagonX } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { setDisplayName, getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import { getGameEntry } from '@/lib/hub/games-registry';
import BaraLobby from '@/games/bara-alsalafa/components/BaraLobby';
import BaraGameBoard from '@/games/bara-alsalafa/components/BaraGameBoard';
import type { BaraGameState } from '@/games/bara-alsalafa/types';

export default function BaraAlsalafaClient() {
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
    baraReveal,
    baraAdvanceInterrogation,
    baraVote,
    baraGuess,
  } = useSocket();

  const [displayName, setDisplayNameState] = useState('');
  const [joinCode, setJoinCode] = useState(roomParam || '');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);

  const inviteJoin = !!roomParam && !hasDisplayName();
  const baraState: BaraGameState | null =
    lobby?.gameType === 'bara-alsalafa' &&
    gameState &&
    'gameType' in gameState &&
    gameState.gameType === 'bara-alsalafa' ?
      (gameState as BaraGameState)
    :	null;

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (!connected || !roomParam || lobby || autoJoined || inviteJoin) return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    const attemptJoin = async () => {
      setLoading(true);
      const ok = await joinRoom(code, getDisplayName());
      if (ok) router.replace(`/bara-alsalafa?room=${code}`, { scroll: false });
      setAutoJoined(true);
      setLoading(false);
    };

    attemptJoin();
  }, [connected, roomParam, lobby, autoJoined, inviteJoin, joinRoom, router]);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName.trim(), 'bara-alsalafa');
    if (roomId) router.push(`/bara-alsalafa?room=${roomId}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) router.push(`/bara-alsalafa?room=${code}`);
    setLoading(false);
  };

  const handleInviteJoin = async () => {
    const code = roomParam ? normalizeRoomCode(roomParam) : null;
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) router.replace(`/bara-alsalafa?room=${code}`, { scroll: false });
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
  const gameMeta = getGameEntry('bara-alsalafa');
  const inLobby = lobby && lobby.status === 'lobby';
  const inGame =
    lobby &&
    baraState &&
    (lobby.status === 'playing' ||
      lobby.status === 'finished' ||
      baraState.phase === 'match_over');

  return (
    <main className="min-h-screen">
      <header className="border-b border-hub-border bg-hub-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-hub-muted hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div dir="rtl">
              <h1 className="text-lg font-semibold">برا السالفة</h1>
              {gameMeta && (
                <p className="text-xs text-hub-muted truncate max-w-[240px] sm:max-w-none">
                  {gameMeta.tagline}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isHost && inGame && (
              <button
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
                className="btn-secondary flex items-center gap-2 text-sm py-2 text-hub-danger border-hub-danger/30 hover:bg-hub-danger/10"
              >
                <OctagonX className="w-4 h-4" />
                {cancelling ? 'جاري الإلغاء…' : 'إلغاء الجولة'}
              </button>
            )}
            <ConnectionStatus connected={connected} />
            <PlayerNameControl disabled={!!inGame} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!lobby && inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in" dir="rtl">
            <div className="card mb-6">
              <div className="flex items-center gap-2 text-hub-accent mb-4">
                <UserPlus className="w-5 h-5" />
                <h2 className="text-lg font-semibold">انضم لبرا السالفة</h2>
              </div>
              <p className="text-sm text-hub-muted mb-4">
                دعوة للغرفة{' '}
                <span className="font-mono font-bold text-white tracking-widest">
                  {roomParam}
                </span>
              </p>
              <label className="block text-sm text-hub-muted mb-2">اسم العرض</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                className="input-field normal-case tracking-normal text-right mb-6"
                placeholder="اسمك"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleInviteJoin}
                disabled={!connected || loading || !displayName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'جاري الانضمام…' : 'انضم'}
              </button>
            </div>
          </div>
        )}

        {!lobby && !inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in space-y-6" dir="rtl">
            <GameAboutPanel gameId="bara-alsalafa" />
            {roomParam && loading && !autoJoined && (
              <p className="text-center text-sm text-hub-muted animate-pulse-soft">
                جاري الانضمام {roomParam}…
              </p>
            )}
            <div className="card">
              <label className="block text-sm text-hub-muted mb-2">اسم العرض</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onBlur={() => displayName.trim() && setDisplayName(displayName)}
                className="input-field normal-case tracking-normal text-right mb-6"
                placeholder="اسمك"
                maxLength={20}
              />
              <div className="space-y-4">
                <button
                  onClick={handleCreate}
                  disabled={!connected || loading || !displayName.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'جاري الإنشاء…' : 'إنشاء غرفة'}
                </button>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="رمز الغرفة"
                  maxLength={8}
                />
                <button
                  onClick={handleJoin}
                  disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'جاري الانضمام…' : 'انضم لغرفة'}
                </button>
              </div>
            </div>
          </div>
        )}

        {inLobby && (
          <BaraLobby
            lobby={lobby}
            playerId={playerId}
            onKickPlayer={kickPlayer}
            onSettingsChange={updateRoomSettings}
            onStartGame={async () => {
              setStarting(true);
              await startGame();
              setStarting(false);
            }}
            onLeave={() => {
              leaveRoom();
              router.push('/bara-alsalafa');
            }}
            starting={starting}
          />
        )}

        {inGame && baraState && (
          <BaraGameBoard
            gameState={baraState}
            lobby={lobby}
            playerId={playerId}
            isHost={isHost}
            onReveal={baraReveal}
            onAdvanceInterrogation={baraAdvanceInterrogation}
            onVote={baraVote}
            onGuess={baraGuess}
          />
        )}
      </div>

      <ErrorToast message={error} onDismiss={clearError} />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="إلغاء هذه الجولة؟"
        message="سيعود الجميع للوبي وتُصفّر النقاط."
        confirmLabel="إلغاء الجولة"
        cancelLabel="متابعة اللعب"
        variant="danger"
        icon="cancel"
        loading={cancelling}
        onConfirm={handleCancelMatch}
        onCancel={() => !cancelling && setCancelConfirmOpen(false)}
      />
    </main>
  );
}
