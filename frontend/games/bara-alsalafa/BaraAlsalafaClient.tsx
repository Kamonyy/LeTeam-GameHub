'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LogIn, UserPlus, OctagonX, Loader2 } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { setDisplayName, getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import InactiveGameScreen from '@/components/hub/InactiveGameScreen';
import { getGameEntry, isGameActive } from '@/lib/hub/games-registry';
import BaraAtmosphere from '@/games/bara-alsalafa/components/BaraAtmosphere';
import BaraLobby from '@/games/bara-alsalafa/components/BaraLobby';
import BaraGameBoard from '@/games/bara-alsalafa/components/BaraGameBoard';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import GameLobbyPendingOverlay from '@/components/hub/GameLobbyPendingOverlay';
import '@/games/bara-alsalafa/bara-alsalafa.css';

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
    hardResetInFlight,
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
  const [inviteJoin, setInviteJoin] = useState(false);

  useEffect(() => {
    setInviteJoin(!!roomParam && !hasDisplayName());
  }, [roomParam]);

  const baraEnabled = isGameActive('bara-alsalafa');
  const baraLobby = lobby?.gameType === 'bara-alsalafa' ? lobby : null;
  const baraState: BaraGameState | null =
    baraLobby &&
    gameState &&
    'gameType' in gameState &&
    gameState.gameType === 'bara-alsalafa' ?
      (gameState as BaraGameState)
    :	null;

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (
      !baraEnabled ||
      !connected ||
      hardResetInFlight ||
      !roomParam ||
      lobby?.gameType === 'bara-alsalafa' ||
      autoJoined ||
      inviteJoin
    )
      return;
    if (lobby && lobby.gameType !== 'bara-alsalafa') return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    let cancelled = false;

    const attemptJoin = async () => {
      setLoading(true);
      const ok = await joinRoom(code, getDisplayName());
      if (!cancelled) {
        if (ok) router.replace(`/bara-alsalafa?room=${code}`, { scroll: false });
        setAutoJoined(true);
        setLoading(false);
      }
    };

    attemptJoin();
    return () => {
      cancelled = true;
    };
  }, [
    baraEnabled,
    connected,
    hardResetInFlight,
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

  const isHost = baraLobby?.hostId === playerId;
  const gameMeta = getGameEntry('bara-alsalafa');
  const inLobby = baraLobby?.status === 'lobby';
  const inGame =
    baraLobby &&
    baraState &&
    (baraLobby.status === 'playing' ||
      baraLobby.status === 'finished' ||
      baraState.phase === 'match_over');

  return (
    <main className="bara-shell">
      <BaraAtmosphere />

      <header className="bara-header">
        <div className="bara-header__inner">
          <div className="flex items-center gap-4">
            <Link href="/" className="bara-header__back" aria-label="العودة للرئيسية">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div dir="rtl">
              <h1 className="bara-header__title">برا السالفة</h1>
              {gameMeta && <p className="bara-header__tagline">{gameMeta.tagline}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isHost && inGame && (
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
                className="bara-btn-secondary text-sm py-2 text-red-300 border-red-500/30 hover:bg-red-500/10"
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

      <div className={clsx('bara-content', inGame && 'bara-content--game')}>
        {!baraLobby && !baraEnabled && <InactiveGameScreen gameId="bara-alsalafa" />}

        {!baraLobby && baraEnabled && inviteJoin && (
          <div className="max-w-md mx-auto bara-view-mount" dir="rtl">
            <div className="bara-card">
              <div className="flex items-center gap-2 bara-accent mb-4">
                <UserPlus className="w-5 h-5" />
                <h2 className="text-lg font-semibold">انضم لبرا السالفة</h2>
              </div>
              <p className="text-sm bara-muted mb-4">
                دعوة للغرفة{' '}
                <span className="font-mono font-bold text-white tracking-widest">{roomParam}</span>
              </p>
              <label className="block text-sm bara-muted mb-2">اسم العرض</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                className="bara-input normal-case tracking-normal text-right mb-6"
                placeholder="اسمك"
                maxLength={20}
                autoFocus
              />
              <button
                type="button"
                onClick={handleInviteJoin}
                disabled={!connected || loading || !displayName.trim()}
                className="bara-btn-primary w-full"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'جاري الانضمام…' : 'انضم'}
              </button>
            </div>
          </div>
        )}

        {!baraLobby && baraEnabled && !inviteJoin && (
          <div className="relative max-w-md mx-auto bara-view-mount space-y-6" dir="rtl">
            {!connected && (
              <p
                className="flex items-center justify-center gap-2 text-sm bara-muted"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                جاري الاتصال بالسيرفر…
              </p>
            )}
            {roomParam && loading && !autoJoined && (
              <p className="text-center text-sm bara-muted animate-pulse-soft">
                جاري الانضمام {roomParam}…
              </p>
            )}
            <div className="relative">
              {loading && (
                <GameLobbyPendingOverlay message="جاري إنشاء اللوبي…" />
              )}
              <div className="bara-card">
              <label className="block text-sm bara-muted mb-2">اسم العرض</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onBlur={() => displayName.trim() && setDisplayName(displayName)}
                className="bara-input normal-case tracking-normal text-right mb-6"
                placeholder="اسمك"
                maxLength={20}
              />
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!connected || loading || !displayName.trim()}
                  className="bara-btn-primary w-full"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'جاري الإنشاء…' : 'إنشاء غرفة'}
                </button>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="bara-input font-mono tracking-widest uppercase"
                  placeholder="رمز الغرفة"
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                  className="bara-btn-secondary w-full"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'جاري الانضمام…' : 'انضم لغرفة'}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {inLobby && baraLobby && (
          <BaraLobby
            lobby={baraLobby}
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

        {inGame && baraState && baraLobby && (
          <BaraGameBoard
            gameState={baraState}
            lobby={baraLobby}
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
