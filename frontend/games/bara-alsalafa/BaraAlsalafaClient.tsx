'use client';

import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { translateBaraError } from '@/lib/bara/translate-error';
import { useGameRoom, useCoreSession } from '@/hooks/useSocket';
import { useLeaveToHub } from '@/lib/hub/useLeaveToHub';
import { useNotifyRouteContentReady } from '@/lib/hub/ViewTransitionProvider';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import { suppressRoomAutoJoinRef } from '@/lib/hub/room-auto-join';
import { setDisplayName, getDisplayName } from '@/lib/player';
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
import BaraMatchOverOverlay from '@/games/bara-alsalafa/components/BaraMatchOverOverlay';
import type { BaraGameState } from '@/games/bara-alsalafa/types';
import GameLobbyPendingOverlay from '@/components/hub/GameLobbyPendingOverlay';
import GameClientFrame from '@/components/ui/GameClientFrame';
import '@/games/bara-alsalafa/bara-alsalafa.css';

export default function BaraAlsalafaClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get('room');

  const baraEnabled = isGameActive('bara-alsalafa');
  const { isHydrated } = useCoreSession();
  const notifyRouteContentReady = useNotifyRouteContentReady();
  const [displayName, setDisplayNameState] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [postMatchBusy, setPostMatchBusy] = useState(false);
  const leaveToHub = useLeaveToHub();
  const hadBaraRoomRef = useRef(false);

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
    baraReveal,
    baraReady,
    baraAdvanceInterrogation,
    baraRequestVoteEnd,
    baraVote,
    baraGuess,
    autoJoined,
    inviteJoin,
    joinCode,
    setJoinCode,
    setAutoJoined,
  } = useGameRoom({
    gameType: 'bara-alsalafa',
    gameEnabled: baraEnabled,
    basePath: '/bara-alsalafa',
    roomParam,
    onAutoJoinLoading: setLoading,
  });
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
    if (baraLobby) hadBaraRoomRef.current = true;
  }, [baraLobby]);

  useEffect(() => {
    if (!hadBaraRoomRef.current || baraLobby || !roomParam) return;
    hadBaraRoomRef.current = false;
    suppressRoomAutoJoinRef.current = true;
    router.replace('/');
    const timer = window.setTimeout(() => {
      suppressRoomAutoJoinRef.current = false;
    }, 500);
    return () => window.clearTimeout(timer);
  }, [baraLobby, roomParam, router]);

  useEffect(() => {
    if (isHydrated) {
      notifyRouteContentReady();
    }
  }, [isHydrated, notifyRouteContentReady]);

  if (!isHydrated) {
    return <HubGameLoadingScreen gameId="bara-alsalafa" />;
  }

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
  const matchOver = baraState?.phase === 'match_over';
  const inGame =
    baraLobby &&
    baraState &&
    (baraLobby.status === 'playing' ||
      baraLobby.status === 'finished' ||
      matchOver);

  const handleReturnToLobby = async () => {
    setPostMatchBusy(true);
    await cancelMatch();
    setPostMatchBusy(false);
  };

  const handleDisbandRoom = async () => {
    setPostMatchBusy(true);
    const ok = await disbandRoom();
    setPostMatchBusy(false);
    if (ok) router.push('/');
  };

  return (
    <>
      <GameClientFrame
        className="bara-shell"
        engagementRoomId={baraLobby?.roomId}
        headerClassName="bara-header border-0 bg-transparent"
        contentClassName={clsx('bara-content', inGame && 'bara-content--game')}
        dir="rtl"
        lang="ar"
        title="برا السالفة"
        subtitle={gameMeta?.tagline}
        connected={connected}
        showConnection={false}
        onCancelMatch={
          isHost && inGame && !matchOver ?
            () => setCancelConfirmOpen(true)
          : undefined
        }
        cancelMatchDisabled={cancelling}
        cancelMatchLabel={cancelling ? 'جاري الإلغاء…' : 'إلغاء الجولة'}
        headerExtra={
          <>
            <ConnectionStatus connected={connected} variant="bara" />
            <PlayerNameControl
              disabled={!!inGame}
              theme="bara"
              disabledReason="لا يمكن تغيير الاسم أثناء المباراة"
            />
          </>
        }
      >
        <BaraAtmosphere />

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
            onLeave={() => void leaveToHub()}
            starting={starting}
          />
        )}

        {inGame && baraState && baraLobby && (
          <>
            <BaraGameBoard
              gameState={baraState}
              lobby={baraLobby}
              playerId={playerId}
              isHost={isHost}
              onReveal={baraReveal}
              onReady={baraReady}
              onAdvanceInterrogation={baraAdvanceInterrogation}
              onRequestVoteEnd={baraRequestVoteEnd}
              onVote={baraVote}
              onGuess={baraGuess}
            />
            {matchOver && (
              <BaraMatchOverOverlay
                gameState={baraState}
                lobby={baraLobby}
                isHost={isHost}
                busy={postMatchBusy}
                onReturnToLobby={() => void handleReturnToLobby()}
                onDisbandRoom={() => void handleDisbandRoom()}
                onLeave={() => void leaveToHub()}
              />
            )}
          </>
        )}
      </GameClientFrame>

      <ErrorToast message={translateBaraError(error)} onDismiss={clearError} />

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
    </>
  );
}
